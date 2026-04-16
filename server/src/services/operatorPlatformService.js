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

function resolvePolicy() {
  return {
    taskClickBudget: parsePositiveInteger(process.env.OPERATOR_TASK_CLICK_BUDGET || "3", 3),
    widgetStalenessTargetSeconds: parsePositiveInteger(
      process.env.OPERATOR_WIDGET_STALENESS_TARGET_SECONDS || "5",
      5
    ),
    playbookMaxSteps: parsePositiveInteger(process.env.OPERATOR_PLAYBOOK_MAX_STEPS || "30", 30),
    requireWcagAa: parseBoolean(process.env.OPERATOR_ACCESSIBILITY_REQUIRE_WCAG_AA, true),
    developerKeyPrefix: String(process.env.OPERATOR_DEVKEY_PREFIX || "opk").trim() || "opk",
  };
}

const taskFlowsById = new Map();
const widgetsById = new Map();
const playbooksById = new Map();
const playbookExecutions = [];
const developerAppsById = new Map();
const accessibilityAudits = [];

function upsertTaskFlow(input = {}) {
  const flowId = String(input.flowId || input.flow_id || "").trim() || createId("flow");
  const name = String(input.name || "").trim();
  const clickCount = parsePositiveInteger(input.clickCount || input.click_count || "0", 0);
  if (!name || !clickCount) {
    return {
      status: "invalid",
      message: "name and clickCount are required.",
    };
  }

  const policy = resolvePolicy();
  const flow = {
    flowId,
    name,
    clickCount,
    clickBudget: policy.taskClickBudget,
    compliant: clickCount <= policy.taskClickBudget,
    updatedAt: new Date().toISOString(),
  };
  taskFlowsById.set(flowId, flow);
  return {
    status: "upserted",
    flow,
  };
}

function upsertFleetWidget(input = {}) {
  const widgetId = String(input.widgetId || input.widget_id || "").trim() || createId("widget");
  const name = String(input.name || "").trim();
  const stalenessSeconds = parsePositiveInteger(
    input.stalenessSeconds || input.staleness_seconds || "0",
    0
  );
  if (!name || !stalenessSeconds) {
    return {
      status: "invalid",
      message: "name and stalenessSeconds are required.",
    };
  }

  const policy = resolvePolicy();
  const widget = {
    widgetId,
    name,
    stalenessSeconds,
    stalenessTargetSeconds: policy.widgetStalenessTargetSeconds,
    healthy: stalenessSeconds <= policy.widgetStalenessTargetSeconds,
    updatedAt: new Date().toISOString(),
  };
  widgetsById.set(widgetId, widget);
  return {
    status: "upserted",
    widget,
  };
}

function upsertPlaybook(input = {}) {
  const playbookId = String(input.playbookId || input.playbook_id || "").trim() || createId("playbook");
  const name = String(input.name || "").trim();
  const steps = Array.isArray(input.steps) ? input.steps : [];
  if (!name || steps.length === 0) {
    return {
      status: "invalid",
      message: "name and at least one step are required.",
    };
  }

  const policy = resolvePolicy();
  if (steps.length > policy.playbookMaxSteps) {
    return {
      status: "invalid",
      message: `steps exceed maximum of ${policy.playbookMaxSteps}.`,
    };
  }

  const playbook = {
    playbookId,
    name,
    steps: [...steps],
    stepCount: steps.length,
    updatedAt: new Date().toISOString(),
  };
  playbooksById.set(playbookId, playbook);
  return {
    status: "upserted",
    playbook,
  };
}

function runPlaybook(input = {}) {
  const playbookId = String(input.playbookId || input.playbook_id || "").trim();
  const actorId = String(input.actorId || input.actor_id || "").trim() || null;
  if (!playbookId) {
    return {
      status: "invalid",
      message: "playbookId is required.",
    };
  }
  const playbook = playbooksById.get(playbookId);
  if (!playbook) {
    return {
      status: "not_found",
      message: "Playbook not found.",
    };
  }

  const execution = {
    executionId: createId("play_exec"),
    playbookId,
    actorId,
    stepCount: playbook.stepCount,
    context: input.context && typeof input.context === "object" ? input.context : {},
    status: "completed",
    executedAt: new Date().toISOString(),
  };
  playbookExecutions.push(execution);
  return {
    status: "executed",
    execution,
  };
}

function listPlaybooks() {
  return Array.from(playbooksById.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function registerDeveloperApp(input = {}) {
  const appName = String(input.appName || input.app_name || "").trim();
  const ownerId = String(input.ownerId || input.owner_id || "").trim() || null;
  const scopes = Array.isArray(input.scopes) ? input.scopes.map((scope) => String(scope || "").trim()).filter(Boolean) : [];
  if (!appName || scopes.length === 0) {
    return {
      status: "invalid",
      message: "appName and at least one scope are required.",
    };
  }

  const appId = createId("dev_app");
  const apiKey = `${resolvePolicy().developerKeyPrefix}_${crypto.randomBytes(12).toString("hex")}`;
  const app = {
    appId,
    appName,
    ownerId,
    scopes,
    apiKey,
    registeredAt: new Date().toISOString(),
  };
  developerAppsById.set(appId, app);
  return {
    status: "registered",
    app,
  };
}

function recordAccessibilityAudit(input = {}) {
  const journeyId = String(input.journeyId || input.journey_id || "").trim();
  const locale = String(input.locale || "en").trim();
  const wcagAaPass = Boolean(input.wcagAaPass ?? input.wcag_aa_pass);
  const mobileReady = Boolean(input.mobileReady ?? input.mobile_ready);
  if (!journeyId) {
    return {
      status: "invalid",
      message: "journeyId is required.",
    };
  }

  const policy = resolvePolicy();
  const audit = {
    auditId: createId("ux_audit"),
    journeyId,
    locale,
    wcagAaPass,
    mobileReady,
    pass: (!policy.requireWcagAa || wcagAaPass) && mobileReady,
    recordedAt: new Date().toISOString(),
  };
  accessibilityAudits.push(audit);
  return {
    status: "recorded",
    audit,
  };
}

function getSummary() {
  const flowCompliant = Array.from(taskFlowsById.values()).filter((flow) => flow.compliant).length;
  const widgetHealthy = Array.from(widgetsById.values()).filter((widget) => widget.healthy).length;
  const accessibilityPass = accessibilityAudits.filter((audit) => audit.pass).length;

  return {
    taskFlows: taskFlowsById.size,
    flowCompliant,
    widgets: widgetsById.size,
    widgetHealthy,
    playbooks: playbooksById.size,
    playbookExecutions: playbookExecutions.length,
    developerApps: developerAppsById.size,
    accessibilityAudits: accessibilityAudits.length,
    accessibilityPass,
    generatedAt: new Date().toISOString(),
  };
}

function resetForTests() {
  taskFlowsById.clear();
  widgetsById.clear();
  playbooksById.clear();
  playbookExecutions.splice(0, playbookExecutions.length);
  developerAppsById.clear();
  accessibilityAudits.splice(0, accessibilityAudits.length);
}

module.exports = {
  upsertTaskFlow,
  upsertFleetWidget,
  upsertPlaybook,
  runPlaybook,
  listPlaybooks,
  registerDeveloperApp,
  recordAccessibilityAudit,
  getSummary,
  resetForTests,
};
