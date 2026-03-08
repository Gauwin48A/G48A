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
    onboardingTargetMinutes: parsePositiveInteger(
      process.env.LAUNCH_ONBOARDING_TARGET_MINUTES || "30",
      30
    ),
    billingAccuracyTargetPercent: parsePositiveNumber(
      process.env.BILLING_ACCURACY_TARGET_PERCENT || "99.9",
      99.9
    ),
    certMinScore: parsePositiveNumber(process.env.LAUNCH_CERT_MIN_SCORE || "85", 85),
    usageLedgerMax: parsePositiveInteger(process.env.LAUNCH_USAGE_LEDGER_MAX || "5000", 5000),
    evidenceLogMax: parsePositiveInteger(process.env.LAUNCH_EVIDENCE_LOG_MAX || "2000", 2000),
  };
}

const onboardingByTenantId = new Map();
const usageLedgerByTenantId = new Map();
const complianceEvidenceLog = [];
const certificationsByTenantId = new Map();
const integrationsById = new Map();

function startTenantOnboarding(input = {}) {
  const tenantId = String(input.tenantId || input.tenant_id || "").trim();
  const plan = String(input.plan || "starter").trim();
  const region = String(input.region || "global").trim();
  if (!tenantId) {
    return {
      status: "invalid",
      message: "tenantId is required.",
    };
  }

  const existing = onboardingByTenantId.get(tenantId);
  if (existing) {
    return {
      status: "replayed",
      onboarding: existing,
    };
  }

  const onboarding = {
    tenantId,
    plan,
    region,
    status: "IN_PROGRESS",
    startedAt: new Date().toISOString(),
    firstTelemetryAt: null,
    steps: {},
  };
  onboardingByTenantId.set(tenantId, onboarding);
  return {
    status: "started",
    onboarding,
  };
}

function updateOnboardingStep(input = {}) {
  const tenantId = String(input.tenantId || input.tenant_id || "").trim();
  const step = String(input.step || "").trim();
  const stepStatus = String(input.status || "done")
    .trim()
    .toLowerCase();
  if (!tenantId || !step) {
    return {
      status: "invalid",
      message: "tenantId and step are required.",
    };
  }

  const existing = onboardingByTenantId.get(tenantId);
  if (!existing) {
    return {
      status: "not_found",
      message: "Onboarding record not found.",
    };
  }

  const now = new Date().toISOString();
  const next = {
    ...existing,
    steps: {
      ...existing.steps,
      [step]: {
        status: stepStatus,
        updatedAt: now,
      },
    },
  };

  if (step === "first_telemetry" && stepStatus === "done" && !next.firstTelemetryAt) {
    next.firstTelemetryAt = now;
  }

  if (next.firstTelemetryAt) {
    next.status = "ACTIVE";
  }
  onboardingByTenantId.set(tenantId, next);
  return {
    status: "updated",
    onboarding: next,
  };
}

function getOnboarding(tenantId) {
  const normalized = String(tenantId || "").trim();
  if (!normalized) return null;
  const onboarding = onboardingByTenantId.get(normalized);
  if (!onboarding) return null;

  const policy = resolvePolicy();
  const startedAtMs = Date.parse(onboarding.startedAt);
  const firstTelemetryMs = Date.parse(onboarding.firstTelemetryAt || "");
  const activationMinutes = Number.isFinite(firstTelemetryMs)
    ? Number(((firstTelemetryMs - startedAtMs) / (60 * 1000)).toFixed(2))
    : null;

  return {
    ...onboarding,
    onboardingTargetMinutes: policy.onboardingTargetMinutes,
    withinTarget: activationMinutes === null ? null : activationMinutes <= policy.onboardingTargetMinutes,
    activationMinutes,
  };
}

function recordUsage(input = {}) {
  const tenantId = String(input.tenantId || input.tenant_id || "").trim();
  const metric = String(input.metric || "").trim();
  const amount = parsePositiveNumber(input.amount || "0", 0);
  const planLimit = parsePositiveNumber(input.planLimit || input.plan_limit || "0", 0);
  if (!tenantId || !metric || !amount) {
    return {
      status: "invalid",
      message: "tenantId, metric, and amount are required.",
    };
  }

  const existing = usageLedgerByTenantId.get(tenantId) || {
    tenantId,
    metrics: {},
    entries: 0,
    breaches: 0,
    updatedAt: null,
  };
  const nextMetricValue = Number((((existing.metrics[metric] || 0) + amount)).toFixed(4));
  const breached = planLimit > 0 ? nextMetricValue > planLimit : false;
  const next = {
    ...existing,
    metrics: {
      ...existing.metrics,
      [metric]: nextMetricValue,
    },
    entries: existing.entries + 1,
    breaches: existing.breaches + (breached ? 1 : 0),
    updatedAt: new Date().toISOString(),
  };
  usageLedgerByTenantId.set(tenantId, next);

  const policy = resolvePolicy();
  const totalEntries = Array.from(usageLedgerByTenantId.values()).reduce((sum, item) => sum + item.entries, 0);
  if (totalEntries > policy.usageLedgerMax) {
    const overflow = totalEntries - policy.usageLedgerMax;
    for (const ledger of usageLedgerByTenantId.values()) {
      if (overflow <= 0) break;
      if (ledger.entries > 1) {
        ledger.entries -= 1;
      }
    }
  }

  return {
    status: "recorded",
    usage: {
      tenantId,
      metric,
      total: nextMetricValue,
      planLimit: planLimit || null,
      breached,
      updatedAt: next.updatedAt,
    },
  };
}

function getTenantUsage(tenantId) {
  const normalized = String(tenantId || "").trim();
  if (!normalized) return null;
  return usageLedgerByTenantId.get(normalized) || null;
}

function registerComplianceEvidence(input = {}) {
  const controlDomain = String(input.controlDomain || input.control_domain || "").trim();
  const evidenceType = String(input.evidenceType || input.evidence_type || "").trim();
  const uri = String(input.uri || "").trim();
  const actorId = String(input.actorId || input.actor_id || "").trim() || null;
  if (!controlDomain || !evidenceType || !uri) {
    return {
      status: "invalid",
      message: "controlDomain, evidenceType, and uri are required.",
    };
  }

  const evidence = {
    evidenceId: createId("evidence"),
    controlDomain,
    evidenceType,
    uri,
    actorId,
    registeredAt: new Date().toISOString(),
  };
  complianceEvidenceLog.push(evidence);
  const policy = resolvePolicy();
  if (complianceEvidenceLog.length > policy.evidenceLogMax) {
    complianceEvidenceLog.splice(0, complianceEvidenceLog.length - policy.evidenceLogMax);
  }
  return {
    status: "registered",
    evidence,
  };
}

function listComplianceEvidence({ controlDomain = null, limit = 100 } = {}) {
  const normalizedControlDomain = String(controlDomain || "").trim().toLowerCase();
  const max = parsePositiveInteger(limit, 100);
  return complianceEvidenceLog
    .filter((entry) => !normalizedControlDomain || entry.controlDomain.toLowerCase() === normalizedControlDomain)
    .slice(-max)
    .reverse();
}

function runCertification(input = {}) {
  const tenantId = String(input.tenantId || input.tenant_id || "").trim();
  const scores = toObject(input.scores);
  if (!tenantId || Object.keys(scores).length === 0) {
    return {
      status: "invalid",
      message: "tenantId and scores are required.",
    };
  }

  const scoreValues = Object.values(scores)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
  if (scoreValues.length === 0) {
    return {
      status: "invalid",
      message: "scores must contain numeric values.",
    };
  }

  const averageScore = Number((scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length).toFixed(2));
  const policy = resolvePolicy();
  const certification = {
    certificationId: createId("cert"),
    tenantId,
    scores,
    averageScore,
    minScore: policy.certMinScore,
    passed: averageScore >= policy.certMinScore,
    evaluatedAt: new Date().toISOString(),
  };
  certificationsByTenantId.set(tenantId, certification);
  return {
    status: "evaluated",
    certification,
  };
}

function registerIntegration(input = {}) {
  const integrationId = String(input.integrationId || input.integration_id || "").trim() || createId("integration");
  const name = String(input.name || "").trim();
  const category = String(input.category || "general").trim();
  const status = String(input.status || "active")
    .trim()
    .toUpperCase();
  if (!name) {
    return {
      status: "invalid",
      message: "name is required.",
    };
  }

  const integration = {
    integrationId,
    name,
    category,
    status,
    updatedAt: new Date().toISOString(),
  };
  integrationsById.set(integrationId, integration);
  return {
    status: "registered",
    integration,
  };
}

function getSummary() {
  const certificationPass = Array.from(certificationsByTenantId.values()).filter((item) => item.passed).length;
  return {
    onboardingTenants: onboardingByTenantId.size,
    activeTenants: Array.from(onboardingByTenantId.values()).filter((item) => item.status === "ACTIVE").length,
    usageTenants: usageLedgerByTenantId.size,
    evidenceEntries: complianceEvidenceLog.length,
    certifications: certificationsByTenantId.size,
    certificationPass,
    integrations: integrationsById.size,
    billingAccuracyTargetPercent: resolvePolicy().billingAccuracyTargetPercent,
    generatedAt: new Date().toISOString(),
  };
}

function resetForTests() {
  onboardingByTenantId.clear();
  usageLedgerByTenantId.clear();
  complianceEvidenceLog.splice(0, complianceEvidenceLog.length);
  certificationsByTenantId.clear();
  integrationsById.clear();
}

module.exports = {
  startTenantOnboarding,
  updateOnboardingStep,
  getOnboarding,
  recordUsage,
  getTenantUsage,
  registerComplianceEvidence,
  listComplianceEvidence,
  runCertification,
  registerIntegration,
  getSummary,
  resetForTests,
};
