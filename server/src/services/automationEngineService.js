const crypto = require("crypto");

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function toObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function resolvePolicy() {
  return {
    alertDedupeMs: parsePositiveInteger(process.env.AUTOMATION_ALERT_DEDUPE_SECONDS || "120", 120) * 1000,
    alertSilenceMs:
      parsePositiveInteger(process.env.AUTOMATION_ALERT_SILENCE_SECONDS || "0", 0) * 1000,
    escalationMinutes: parsePositiveInteger(
      process.env.AUTOMATION_DEFAULT_ESCALATION_MINUTES || "15",
      15
    ),
    maxExecutionLog: parsePositiveInteger(process.env.AUTOMATION_EXECUTION_LOG_MAX || "500", 500),
    replayEnabled: parseBoolean(process.env.AUTOMATION_REPLAY_ENABLED, true),
  };
}

function normalizeOperator(rawOperator) {
  const normalized = String(rawOperator || "").trim();
  if (!normalized) return "==";
  return normalized;
}

function getValueByPath(payload, fieldPath) {
  const normalizedFieldPath = String(fieldPath || "").trim();
  if (!normalizedFieldPath) return undefined;
  return normalizedFieldPath.split(".").reduce((acc, segment) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[segment];
  }, payload);
}

function evaluateCondition(condition, event) {
  const safeCondition = toObject(condition);
  const field = String(safeCondition.field || "").trim();
  const operator = normalizeOperator(safeCondition.op);
  const expected = safeCondition.value;
  const actual = getValueByPath(event.payload || {}, field);

  if (!field) {
    return {
      matched: false,
      reason: "Condition field is required.",
    };
  }

  switch (operator) {
    case ">":
      return { matched: Number(actual) > Number(expected), actual, expected };
    case ">=":
      return { matched: Number(actual) >= Number(expected), actual, expected };
    case "<":
      return { matched: Number(actual) < Number(expected), actual, expected };
    case "<=":
      return { matched: Number(actual) <= Number(expected), actual, expected };
    case "!=":
      return { matched: actual !== expected, actual, expected };
    case "contains":
      if (Array.isArray(actual)) {
        return { matched: actual.includes(expected), actual, expected };
      }
      if (typeof actual === "string") {
        return { matched: String(actual).includes(String(expected)), actual, expected };
      }
      return { matched: false, actual, expected };
    case "==":
    default:
      return { matched: actual === expected, actual, expected };
  }
}

const rulesById = new Map();
const alertDeduplicationByKey = new Map();
const alertsById = new Map();
const twinByDeviceId = new Map();
const executionLog = [];

function normalizeRuleInput(rawRule) {
  const rule = toObject(rawRule);
  const name = String(rule.name || "").trim();
  const version = String(rule.version || "").trim();
  const condition = toObject(rule.condition);
  const action = toObject(rule.action);
  const priority = parsePositiveInteger(rule.priority || "100", 100);
  const enabled = rule.enabled === undefined ? false : Boolean(rule.enabled);
  const ruleId = String(rule.ruleId || rule.rule_id || "").trim() || createId("rule");

  if (!name || !version) {
    return {
      ok: false,
      message: "Rule name and version are required.",
    };
  }
  if (!condition.field) {
    return {
      ok: false,
      message: "Rule condition.field is required.",
    };
  }
  if (!action.type) {
    return {
      ok: false,
      message: "Rule action.type is required.",
    };
  }

  return {
    ok: true,
    rule: {
      ruleId,
      name,
      version,
      priority,
      enabled,
      condition,
      action,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

function registerRule(rawRule) {
  const normalized = normalizeRuleInput(rawRule);
  if (!normalized.ok) {
    return {
      status: "invalid",
      message: normalized.message,
    };
  }

  const incomingRule = normalized.rule;
  const existingRule = rulesById.get(incomingRule.ruleId);
  if (existingRule) {
    const sameVersion = existingRule.version === incomingRule.version;
    const sameRule =
      sameVersion &&
      existingRule.name === incomingRule.name &&
      JSON.stringify(existingRule.condition) === JSON.stringify(incomingRule.condition) &&
      JSON.stringify(existingRule.action) === JSON.stringify(incomingRule.action) &&
      existingRule.priority === incomingRule.priority;
    if (sameRule) {
      return {
        status: "replayed",
        rule: existingRule,
      };
    }
  }

  const ruleToStore = {
    ...incomingRule,
    enabled: existingRule ? existingRule.enabled : incomingRule.enabled,
    createdAt: existingRule ? existingRule.createdAt : incomingRule.createdAt,
    updatedAt: new Date().toISOString(),
  };
  rulesById.set(ruleToStore.ruleId, ruleToStore);

  return {
    status: "registered",
    rule: ruleToStore,
  };
}

function setRuleActivation(ruleId, enabled) {
  const normalizedRuleId = String(ruleId || "").trim();
  if (!normalizedRuleId) {
    return {
      status: "invalid",
      message: "ruleId is required.",
    };
  }
  const existing = rulesById.get(normalizedRuleId);
  if (!existing) {
    return {
      status: "not_found",
      message: "Rule not found.",
    };
  }

  const nextRule = {
    ...existing,
    enabled: Boolean(enabled),
    updatedAt: new Date().toISOString(),
  };
  rulesById.set(normalizedRuleId, nextRule);
  return {
    status: nextRule.enabled ? "activated" : "deactivated",
    rule: nextRule,
  };
}

function resolveActiveRulesSorted() {
  const active = [];
  for (const rule of rulesById.values()) {
    if (rule.enabled) active.push(rule);
  }
  active.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority - right.priority;
    if (left.name !== right.name) return left.name.localeCompare(right.name);
    return left.ruleId.localeCompare(right.ruleId);
  });
  return active;
}

function resolveDefaultTwin(deviceId, tenantId) {
  return {
    deviceId,
    tenantId: tenantId || null,
    state: {},
    version: 0,
    updatedAt: null,
    lastEventAt: null,
  };
}

function raiseAlert({
  deviceId,
  tenantId,
  rule,
  event,
  severity = "P3",
  message,
  policy,
  channels,
}) {
  const nowMs = Date.now();
  const alertKey = `${deviceId}:${rule.ruleId}:${severity}`;
  const dedupeEntry = alertDeduplicationByKey.get(alertKey);
  if (dedupeEntry && nowMs < dedupeEntry.untilMs) {
    return {
      status: "deduped",
      alertId: dedupeEntry.alertId,
    };
  }

  const alertId = createId("alert");
  const createdAtIso = new Date(nowMs).toISOString();
  const routeChannels = Array.isArray(channels) && channels.length > 0 ? channels : ["in-app"];
  const alert = {
    alertId,
    key: alertKey,
    ruleId: rule.ruleId,
    ruleName: rule.name,
    deviceId,
    tenantId: tenantId || null,
    severity: String(severity || "P3").trim().toUpperCase(),
    message: String(message || `${rule.name} triggered`).trim(),
    status: "OPEN",
    createdAt: createdAtIso,
    acknowledgedAt: null,
    eventType: event.eventType,
    eventPayload: event.payload,
    routeChannels,
    escalateAt: new Date(nowMs + policy.escalationMinutes * 60 * 1000).toISOString(),
  };

  alertsById.set(alertId, alert);
  alertDeduplicationByKey.set(alertKey, {
    alertId,
    untilMs: nowMs + policy.alertDedupeMs + policy.alertSilenceMs,
  });

  return {
    status: "created",
    alertId,
    alert,
  };
}

function applyRuleAction(rule, event, twin, policy) {
  const action = toObject(rule.action);
  const actionType = String(action.type || "").trim().toLowerCase();
  if (!actionType) {
    return {
      actionType: "none",
      status: "ignored",
      reason: "Missing action type.",
    };
  }

  if (actionType === "set_twin_state") {
    const patch = toObject(action.patch);
    twin.state = {
      ...twin.state,
      ...patch,
    };
    return {
      actionType,
      status: "applied",
      patch,
    };
  }

  if (actionType === "raise_alert") {
    const alertResult = raiseAlert({
      deviceId: event.deviceId,
      tenantId: event.tenantId,
      rule,
      event,
      severity: action.severity,
      message: action.message,
      channels: action.channels,
      policy,
    });
    return {
      actionType,
      status: alertResult.status,
      alertId: alertResult.alertId || null,
    };
  }

  if (actionType === "emit_command") {
    return {
      actionType,
      status: "queued",
      commandType: String(action.commandType || action.command_type || "generic").trim(),
      commandPayload: toObject(action.commandPayload || action.command_payload || {}),
    };
  }

  return {
    actionType,
    status: "ignored",
    reason: "Unsupported action type.",
  };
}

function normalizeEvent(rawEvent) {
  const event = toObject(rawEvent);
  const deviceId = String(event.deviceId || event.device_id || "").trim();
  const eventType = String(event.eventType || event.event_type || "").trim();
  const occurredAtRaw = event.occurredAt || event.occurred_at || event.timestamp || new Date().toISOString();
  const occurredAtMs = Date.parse(occurredAtRaw);

  if (!deviceId || !eventType || !Number.isFinite(occurredAtMs)) {
    return {
      ok: false,
      message: "deviceId, eventType, and valid occurredAt/timestamp are required.",
    };
  }

  return {
    ok: true,
    event: {
      eventId: String(event.eventId || event.event_id || "").trim() || createId("event"),
      deviceId,
      tenantId: String(event.tenantId || event.tenant_id || "").trim() || null,
      eventType,
      payload: toObject(event.payload),
      occurredAt: new Date(occurredAtMs).toISOString(),
      occurredAtMs,
    },
  };
}

function recordExecution(entry, policy) {
  executionLog.push(entry);
  if (executionLog.length > policy.maxExecutionLog) {
    executionLog.splice(0, executionLog.length - policy.maxExecutionLog);
  }
}

function evaluateEvent(rawEvent) {
  const normalized = normalizeEvent(rawEvent);
  if (!normalized.ok) {
    return {
      status: "invalid",
      message: normalized.message,
    };
  }

  const event = normalized.event;
  const policy = resolvePolicy();
  const activeRules = resolveActiveRulesSorted();
  const twin = twinByDeviceId.get(event.deviceId) || resolveDefaultTwin(event.deviceId, event.tenantId);
  const previousEventMs = Date.parse(twin.lastEventAt || "");
  if (Number.isFinite(previousEventMs) && event.occurredAtMs < previousEventMs) {
    return {
      status: "ignored",
      reason: "Event is older than current twin state.",
      twin,
      executedRules: [],
    };
  }

  const executedRules = [];
  for (const rule of activeRules) {
    const conditionResult = evaluateCondition(rule.condition, event);
    if (!conditionResult.matched) {
      continue;
    }
    const actionResult = applyRuleAction(rule, event, twin, policy);
    executedRules.push({
      ruleId: rule.ruleId,
      ruleName: rule.name,
      condition: conditionResult,
      action: actionResult,
    });
  }

  twin.tenantId = event.tenantId || twin.tenantId || null;
  twin.state = {
    ...twin.state,
    lastPayload: event.payload,
    lastEventType: event.eventType,
  };
  twin.version += 1;
  twin.lastEventAt = event.occurredAt;
  twin.updatedAt = new Date().toISOString();
  twinByDeviceId.set(event.deviceId, twin);

  const executionEntry = {
    executionId: createId("exec"),
    eventId: event.eventId,
    deviceId: event.deviceId,
    tenantId: event.tenantId,
    occurredAt: event.occurredAt,
    evaluatedRuleCount: activeRules.length,
    matchedRuleCount: executedRules.length,
    executedRules,
    recordedAt: new Date().toISOString(),
  };
  recordExecution(executionEntry, policy);

  return {
    status: "processed",
    event,
    twin,
    executedRules,
  };
}

function replayExecution(executionId) {
  const policy = resolvePolicy();
  if (!policy.replayEnabled) {
    return {
      status: "disabled",
      message: "Automation replay is disabled.",
    };
  }
  const normalizedExecutionId = String(executionId || "").trim();
  const entry = executionLog.find((item) => item.executionId === normalizedExecutionId);
  if (!entry) {
    return {
      status: "not_found",
      message: "Execution entry not found.",
    };
  }
  return {
    status: "replayed",
    execution: entry,
  };
}

function acknowledgeAlert(alertId, actorId) {
  const normalizedAlertId = String(alertId || "").trim();
  if (!normalizedAlertId) {
    return {
      status: "invalid",
      message: "alertId is required.",
    };
  }
  const alert = alertsById.get(normalizedAlertId);
  if (!alert) {
    return {
      status: "not_found",
      message: "Alert not found.",
    };
  }
  if (alert.status === "ACKED") {
    return {
      status: "replayed",
      alert,
    };
  }

  const nextAlert = {
    ...alert,
    status: "ACKED",
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: String(actorId || "").trim() || null,
  };
  alertsById.set(normalizedAlertId, nextAlert);
  return {
    status: "acknowledged",
    alert: nextAlert,
  };
}

function simulateRuleChange({ rule, sampleEvents = [] }) {
  const normalizedRule = normalizeRuleInput(rule);
  if (!normalizedRule.ok) {
    return {
      status: "invalid",
      message: normalizedRule.message,
    };
  }

  const eventList = Array.isArray(sampleEvents) ? sampleEvents : [];
  const evaluations = [];
  let matchedCount = 0;
  for (const rawEvent of eventList) {
    const normalizedEvent = normalizeEvent(rawEvent);
    if (!normalizedEvent.ok) {
      evaluations.push({
        event: rawEvent,
        valid: false,
        reason: normalizedEvent.message,
      });
      continue;
    }
    const condition = evaluateCondition(normalizedRule.rule.condition, normalizedEvent.event);
    if (condition.matched) {
      matchedCount += 1;
    }
    evaluations.push({
      eventId: normalizedEvent.event.eventId,
      valid: true,
      matched: condition.matched,
      actual: condition.actual,
      expected: condition.expected,
    });
  }

  return {
    status: "simulated",
    result: {
      ruleName: normalizedRule.rule.name,
      version: normalizedRule.rule.version,
      sampleEventCount: eventList.length,
      matchedCount,
      pass: true,
      evaluations,
      simulatedAt: new Date().toISOString(),
    },
  };
}

function listRules() {
  const rules = Array.from(rulesById.values()).sort((left, right) => left.name.localeCompare(right.name));
  return rules;
}

function listAlerts({ status = null, limit = 100 } = {}) {
  const normalizedStatus = String(status || "").trim().toUpperCase();
  const max = parsePositiveInteger(limit, 100);
  const alerts = Array.from(alertsById.values())
    .filter((alert) => !normalizedStatus || alert.status === normalizedStatus)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, max);
  return alerts;
}

function getTwinState(deviceId) {
  const normalizedDeviceId = String(deviceId || "").trim();
  if (!normalizedDeviceId) return null;
  return twinByDeviceId.get(normalizedDeviceId) || null;
}

function getSummary() {
  const summary = {
    totalRules: rulesById.size,
    activeRules: resolveActiveRulesSorted().length,
    totalTwins: twinByDeviceId.size,
    totalAlerts: alertsById.size,
    openAlerts: listAlerts({ status: "OPEN", limit: 100000 }).length,
    ackedAlerts: listAlerts({ status: "ACKED", limit: 100000 }).length,
    executionLogSize: executionLog.length,
    generatedAt: new Date().toISOString(),
  };
  return summary;
}

function resetForTests() {
  rulesById.clear();
  alertDeduplicationByKey.clear();
  alertsById.clear();
  twinByDeviceId.clear();
  executionLog.splice(0, executionLog.length);
}

module.exports = {
  registerRule,
  setRuleActivation,
  evaluateEvent,
  replayExecution,
  acknowledgeAlert,
  simulateRuleChange,
  listRules,
  listAlerts,
  getTwinState,
  getSummary,
  resetForTests,
};
