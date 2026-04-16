function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") return fallback;
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parseCommaSeparated(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function evaluateEdgeArchitecture({ env, isProduction }) {
  const trustProxyConfigured = String(env.TRUST_PROXY || "").trim() !== "";
  const corsOrigins = parseCommaSeparated(env.CORS_ORIGINS || env.CORS_ORIGIN || env.ALLOWED_ORIGINS);
  const status = isProduction && (!trustProxyConfigured || corsOrigins.length === 0) ? "warn" : "pass";

  return {
    status,
    checks: {
      trustProxyConfigured,
      corsOriginsConfigured: corsOrigins.length > 0,
      corsOriginCount: corsOrigins.length,
    },
  };
}

function evaluateApiContract({ env }) {
  const versions = parseCommaSeparated(env.API_SUPPORTED_VERSIONS || "1");
  const status = versions.length > 0 ? "pass" : "fail";
  return {
    status,
    checks: {
      supportedVersions: versions,
      requireVersionForWrites: parseBoolean(env.API_REQUIRE_VERSION_FOR_WRITES, false),
    },
  };
}

function evaluateTenantIsolation({ env, isProduction }) {
  const requiredForWrites = parseBoolean(env.TENANT_CONTEXT_REQUIRED_WRITE, false);
  const requiredForAll = parseBoolean(env.TENANT_CONTEXT_REQUIRED_ALL, false);
  const criticalWriteRouteEnforcement = parseBoolean(
    env.TENANT_CONTEXT_ENFORCE_CRITICAL_WRITE_ROUTES,
    false
  );
  const status = isProduction && !requiredForWrites && !requiredForAll ? "warn" : "pass";

  return {
    status,
    checks: {
      tenantRequiredForWrites: requiredForWrites,
      tenantRequiredForAll: requiredForAll,
      criticalWriteRouteEnforcement,
    },
  };
}

function evaluateSecrets({ env }) {
  const jwtSecretLength = String(env.JWT_SECRET || "").length;
  const refreshSecretLength = String(env.REFRESH_SECRET || "").length;
  const minSecretLength = Number.parseInt(String(env.SECRET_MIN_LENGTH || "32"), 10) || 32;
  const weakSecrets = [];
  if (jwtSecretLength > 0 && jwtSecretLength < minSecretLength) weakSecrets.push("JWT_SECRET");
  if (refreshSecretLength > 0 && refreshSecretLength < minSecretLength) weakSecrets.push("REFRESH_SECRET");

  const missing = [];
  if (!String(env.JWT_SECRET || "").trim()) missing.push("JWT_SECRET");
  if (!String(env.REFRESH_SECRET || "").trim()) missing.push("REFRESH_SECRET");

  const status = missing.length > 0 || weakSecrets.length > 0 ? "fail" : "pass";
  return {
    status,
    checks: {
      minSecretLength,
      missing,
      weakSecrets,
    },
  };
}

function evaluateRuntimeBudgets({ env, isProduction }) {
  const readBudgetMsRaw = env.RUNTIME_BUDGET_READ_P95_MS;
  const writeBudgetMsRaw = env.RUNTIME_BUDGET_WRITE_P95_MS;
  const egressBudgetKbRaw = env.RUNTIME_BUDGET_EGRESS_KB;

  const readBudgetMs = parsePositiveInteger(readBudgetMsRaw || "220", 220);
  const writeBudgetMs = parsePositiveInteger(writeBudgetMsRaw || "350", 350);
  const egressBudgetKb = parsePositiveInteger(egressBudgetKbRaw || "128", 128);

  const invalid = [];
  if (readBudgetMsRaw !== undefined && parsePositiveInteger(readBudgetMsRaw, null) === null) {
    invalid.push("RUNTIME_BUDGET_READ_P95_MS");
  }
  if (writeBudgetMsRaw !== undefined && parsePositiveInteger(writeBudgetMsRaw, null) === null) {
    invalid.push("RUNTIME_BUDGET_WRITE_P95_MS");
  }
  if (egressBudgetKbRaw !== undefined && parsePositiveInteger(egressBudgetKbRaw, null) === null) {
    invalid.push("RUNTIME_BUDGET_EGRESS_KB");
  }

  const readWithinEpicTarget = readBudgetMs <= 220;
  const writeWithinEpicTarget = writeBudgetMs <= 350;
  const status =
    invalid.length > 0
      ? "fail"
      : isProduction && (!readWithinEpicTarget || !writeWithinEpicTarget)
      ? "warn"
      : "pass";

  return {
    status,
    checks: {
      readBudgetMs,
      writeBudgetMs,
      egressBudgetKb,
      readWithinEpicTarget,
      writeWithinEpicTarget,
      logOnly: parseBoolean(env.RUNTIME_BUDGET_LOG_ONLY, true),
      pathPrefixes: parseCommaSeparated(env.RUNTIME_BUDGET_PATH_PREFIXES || "/api"),
      invalid,
    },
  };
}

function evaluatePromotion({ env }) {
  const promotionEnv = String(env.PROMOTION_ENV || env.NODE_ENV || "development").trim().toLowerCase();
  const allowed = new Set(["development", "staging", "production", "test"]);
  const status = allowed.has(promotionEnv) ? "pass" : "warn";
  return {
    status,
    checks: {
      promotionEnv,
      strictSchemaContract: parseBoolean(env.STRICT_SCHEMA_CONTRACT, false),
      opsGateStrict: parseBoolean(env.OPS_GATE_STRICT, false),
    },
  };
}

function summarizeStatus(sections) {
  const statuses = Object.values(sections).map((section) => section.status);
  if (statuses.includes("fail")) return "fail";
  if (statuses.includes("warn")) return "warn";
  return "pass";
}

function evaluateFoundationConfig({ env = process.env, isProduction } = {}) {
  const resolvedIsProduction =
    typeof isProduction === "boolean"
      ? isProduction
      : String(env.NODE_ENV || "").trim().toLowerCase() === "production";

  const sections = {
    edgeArchitecture: evaluateEdgeArchitecture({ env, isProduction: resolvedIsProduction }),
    apiContract: evaluateApiContract({ env }),
    tenantIsolation: evaluateTenantIsolation({ env, isProduction: resolvedIsProduction }),
    runtimeBudgets: evaluateRuntimeBudgets({ env, isProduction: resolvedIsProduction }),
    secrets: evaluateSecrets({ env }),
    promotion: evaluatePromotion({ env }),
  };

  return {
    status: summarizeStatus(sections),
    isProduction: resolvedIsProduction,
    sections,
  };
}

function assertFoundationConfig({ env = process.env, strict } = {}) {
  const report = evaluateFoundationConfig({ env });
  const strictMode =
    typeof strict === "boolean"
      ? strict
      : parseBoolean(env.FOUNDATION_STRICT_MODE, report.isProduction);

  if (strictMode && report.status !== "pass") {
    const error = new Error(`Foundation config check failed with status ${report.status}`);
    error.report = report;
    throw error;
  }

  return report;
}

module.exports = {
  evaluateFoundationConfig,
  assertFoundationConfig,
  parseBoolean,
  parsePositiveInteger,
};
