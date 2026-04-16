const crypto = require("crypto");

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parsePositiveNumber(rawValue, fallback) {
  const parsed = Number.parseFloat(String(rawValue));
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function toObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function resolvePolicy() {
  return {
    traceBufferMax: parsePositiveInteger(process.env.RELIABILITY_TRACE_BUFFER_MAX || "500", 500),
    chaosMinPassPercent: parsePositiveNumber(process.env.RELIABILITY_CHAOS_MIN_PASS_PERCENT || "98", 98),
    rtoTargetMinutes: parsePositiveInteger(process.env.RELIABILITY_RTO_TARGET_MINUTES || "30", 30),
    rpoTargetMinutes: parsePositiveInteger(process.env.RELIABILITY_RPO_TARGET_MINUTES || "5", 5),
    defaultWindowDays: parsePositiveInteger(process.env.RELIABILITY_ERROR_BUDGET_WINDOW_DAYS || "30", 30),
  };
}

const slosByService = new Map();
const traces = [];
const chaosRuns = [];
const backupRestoreDrills = [];
const incidentsById = new Map();

function registerSlo(input = {}) {
  const serviceName = String(input.serviceName || input.service_name || "").trim().toLowerCase();
  const targetPercent = Number.parseFloat(String(input.targetPercent || input.target_percent || ""));
  const windowDays = parsePositiveInteger(input.windowDays || input.window_days || "0", resolvePolicy().defaultWindowDays);
  if (!serviceName || !Number.isFinite(targetPercent) || targetPercent <= 0 || targetPercent >= 100) {
    return {
      status: "invalid",
      message: "serviceName and targetPercent (0-100 exclusive) are required.",
    };
  }

  const explicitBudget = parsePositiveInteger(
    input.errorBudgetMinutes || input.error_budget_minutes || "0",
    0
  );
  const derivedBudget =
    explicitBudget ||
    Math.max(1, Math.round((windowDays * 24 * 60 * (100 - targetPercent)) / 100));

  const existing = slosByService.get(serviceName);
  const next = {
    serviceName,
    targetPercent,
    windowDays,
    errorBudgetMinutes: derivedBudget,
    consumedErrorMinutes: existing?.consumedErrorMinutes || 0,
    remainingErrorMinutes: Math.max(0, derivedBudget - (existing?.consumedErrorMinutes || 0)),
    burnRate:
      derivedBudget > 0 ? Number(((existing?.consumedErrorMinutes || 0) / derivedBudget).toFixed(4)) : 0,
    updatedAt: new Date().toISOString(),
  };
  slosByService.set(serviceName, next);
  return {
    status: "registered",
    slo: next,
  };
}

function recordAvailabilitySample(input = {}) {
  const serviceName = String(input.serviceName || input.service_name || "").trim().toLowerCase();
  const minutesObserved = parsePositiveInteger(
    input.minutesObserved || input.minutes_observed || "0",
    0
  );
  const minutesError = parsePositiveInteger(input.minutesError || input.minutes_error || "0", 0);
  if (!serviceName || minutesObserved <= 0) {
    return {
      status: "invalid",
      message: "serviceName and minutesObserved are required.",
    };
  }

  const slo = slosByService.get(serviceName);
  if (!slo) {
    return {
      status: "not_found",
      message: "SLO not found.",
    };
  }

  const nextConsumed = slo.consumedErrorMinutes + Math.min(minutesObserved, minutesError);
  const next = {
    ...slo,
    consumedErrorMinutes: nextConsumed,
    remainingErrorMinutes: Math.max(0, slo.errorBudgetMinutes - nextConsumed),
    burnRate: slo.errorBudgetMinutes > 0 ? Number((nextConsumed / slo.errorBudgetMinutes).toFixed(4)) : 0,
    updatedAt: new Date().toISOString(),
  };
  slosByService.set(serviceName, next);
  return {
    status: "recorded",
    slo: next,
  };
}

function getSlo(serviceName) {
  const normalized = String(serviceName || "").trim().toLowerCase();
  if (!normalized) return null;
  return slosByService.get(normalized) || null;
}

function ingestTrace(input = {}) {
  const serviceName = String(input.serviceName || input.service_name || "").trim().toLowerCase();
  const traceId = String(input.traceId || input.trace_id || "").trim() || createId("trace");
  const severity = String(input.severity || "info").trim().toLowerCase();
  const latencyMs = parsePositiveNumber(input.latencyMs || input.latency_ms || "1", 1);
  if (!serviceName) {
    return {
      status: "invalid",
      message: "serviceName is required.",
    };
  }

  const trace = {
    traceId,
    serviceName,
    severity,
    latencyMs,
    attributes: toObject(input.attributes),
    ingestedAt: new Date().toISOString(),
  };
  traces.push(trace);
  const policy = resolvePolicy();
  if (traces.length > policy.traceBufferMax) {
    traces.splice(0, traces.length - policy.traceBufferMax);
  }
  return {
    status: "ingested",
    trace,
  };
}

function listRecentTraces(limit = 100) {
  const max = parsePositiveInteger(limit, 100);
  return traces.slice(-max).reverse();
}

function runChaosExperiment(input = {}) {
  const name = String(input.name || "").trim();
  const scope = String(input.scope || "service").trim();
  const failureType = String(input.failureType || input.failure_type || "").trim() || "dependency";
  const observedPassPercent = parsePositiveNumber(
    input.observedPassPercent || input.observed_pass_percent || "99",
    99
  );
  if (!name) {
    return {
      status: "invalid",
      message: "name is required.",
    };
  }

  const policy = resolvePolicy();
  const run = {
    experimentId: createId("chaos"),
    name,
    scope,
    failureType,
    observedPassPercent,
    requiredPassPercent: policy.chaosMinPassPercent,
    status: observedPassPercent >= policy.chaosMinPassPercent ? "PASS" : "FAIL",
    executedAt: new Date().toISOString(),
  };
  chaosRuns.push(run);
  return {
    status: "executed",
    run,
  };
}

function recordBackupRestoreDrill(input = {}) {
  const region = String(input.region || "").trim() || "primary";
  const rtoMinutes = parsePositiveInteger(input.rtoMinutes || input.rto_minutes || "0", 0);
  const rpoMinutes = parsePositiveInteger(input.rpoMinutes || input.rpo_minutes || "0", 0);
  if (!rtoMinutes || !rpoMinutes) {
    return {
      status: "invalid",
      message: "rtoMinutes and rpoMinutes are required.",
    };
  }
  const policy = resolvePolicy();
  const drill = {
    drillId: createId("drill"),
    region,
    rtoMinutes,
    rpoMinutes,
    rtoTargetMinutes: policy.rtoTargetMinutes,
    rpoTargetMinutes: policy.rpoTargetMinutes,
    status:
      rtoMinutes <= policy.rtoTargetMinutes && rpoMinutes <= policy.rpoTargetMinutes
        ? "PASS"
        : "FAIL",
    recordedAt: new Date().toISOString(),
  };
  backupRestoreDrills.push(drill);
  return {
    status: "recorded",
    drill,
  };
}

function openIncidentCommand(input = {}) {
  const title = String(input.title || "").trim();
  const severity = String(input.severity || "SEV3")
    .trim()
    .toUpperCase();
  const commanderId = String(input.commanderId || input.commander_id || "").trim() || null;
  if (!title) {
    return {
      status: "invalid",
      message: "title is required.",
    };
  }

  const incidentId = createId("inc");
  const incident = {
    incidentId,
    title,
    severity,
    commanderId,
    status: "OPEN",
    timeline: [
      {
        at: new Date().toISOString(),
        event: "Incident opened",
      },
    ],
    postmortem: null,
    createdAt: new Date().toISOString(),
  };
  incidentsById.set(incidentId, incident);
  return {
    status: "opened",
    incident,
  };
}

function publishPostmortem(input = {}) {
  const incidentId = String(input.incidentId || input.incident_id || "").trim();
  const summary = String(input.summary || "").trim();
  const actionItems = Array.isArray(input.actionItems || input.action_items)
    ? input.actionItems || input.action_items
    : [];
  if (!incidentId || !summary) {
    return {
      status: "invalid",
      message: "incidentId and summary are required.",
    };
  }

  const incident = incidentsById.get(incidentId);
  if (!incident) {
    return {
      status: "not_found",
      message: "Incident not found.",
    };
  }
  if (incident.postmortem) {
    return {
      status: "replayed",
      incident,
    };
  }

  const nextIncident = {
    ...incident,
    status: "CLOSED",
    timeline: [
      ...incident.timeline,
      {
        at: new Date().toISOString(),
        event: "Postmortem published",
      },
    ],
    postmortem: {
      summary,
      actionItems,
      publishedAt: new Date().toISOString(),
    },
  };
  incidentsById.set(incidentId, nextIncident);
  return {
    status: "published",
    incident: nextIncident,
  };
}

function getSummary() {
  const serviceBudgets = Array.from(slosByService.values()).map((item) => ({
    serviceName: item.serviceName,
    burnRate: item.burnRate,
    remainingErrorMinutes: item.remainingErrorMinutes,
  }));
  const chaosFailures = chaosRuns.filter((run) => run.status === "FAIL").length;
  const failedDrills = backupRestoreDrills.filter((drill) => drill.status === "FAIL").length;
  const openIncidents = Array.from(incidentsById.values()).filter((incident) => incident.status !== "CLOSED").length;

  return {
    slosTracked: slosByService.size,
    serviceBudgets,
    tracesBuffered: traces.length,
    chaosRuns: chaosRuns.length,
    chaosFailures,
    backupDrills: backupRestoreDrills.length,
    failedDrills,
    openIncidents,
    generatedAt: new Date().toISOString(),
  };
}

function resetForTests() {
  slosByService.clear();
  traces.splice(0, traces.length);
  chaosRuns.splice(0, chaosRuns.length);
  backupRestoreDrills.splice(0, backupRestoreDrills.length);
  incidentsById.clear();
}

module.exports = {
  registerSlo,
  recordAvailabilitySample,
  getSlo,
  ingestTrace,
  listRecentTraces,
  runChaosExperiment,
  recordBackupRestoreDrill,
  openIncidentCommand,
  publishPostmortem,
  getSummary,
  resetForTests,
};
