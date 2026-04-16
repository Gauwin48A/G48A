function parseBoolean(rawValue, fallback = false) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function parsePositiveInteger(rawValue, fallback) {
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseCommaSeparated(rawValue) {
  return String(rawValue || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isWriteMethod(method = "") {
  const normalized = String(method).toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}

function resolveRuntimeBudgetPolicy(env = process.env) {
  return {
    readBudgetMs: parsePositiveInteger(env.RUNTIME_BUDGET_READ_P95_MS || "220", 220),
    writeBudgetMs: parsePositiveInteger(env.RUNTIME_BUDGET_WRITE_P95_MS || "350", 350),
    egressBudgetKb: parsePositiveInteger(env.RUNTIME_BUDGET_EGRESS_KB || "128", 128),
    logOnly: parseBoolean(env.RUNTIME_BUDGET_LOG_ONLY, true),
    pathPrefixes: parseCommaSeparated(env.RUNTIME_BUDGET_PATH_PREFIXES || "/api"),
  };
}

function runtimeBudgetGuard(req, res, next) {
  const policy = resolveRuntimeBudgetPolicy(process.env);
  const pathToCheck = String(req.originalUrl || req.path || "");
  const shouldTrack = policy.pathPrefixes.some((prefix) => pathToCheck.startsWith(prefix));

  if (!shouldTrack) {
    return next();
  }

  const isWrite = isWriteMethod(req.method);
  const latencyBudgetMs = isWrite ? policy.writeBudgetMs : policy.readBudgetMs;
  const latencyBudgetNs = latencyBudgetMs * 1e6;
  const egressBudgetBytes = policy.egressBudgetKb * 1024;
  const startedAt = process.hrtime.bigint();

  res.setHeader("x-runtime-budget-profile", isWrite ? "write" : "read");
  res.setHeader("x-runtime-budget-ms", String(latencyBudgetMs));
  res.setHeader("x-runtime-egress-budget-kb", String(policy.egressBudgetKb));

  res.on("finish", () => {
    const elapsedNs = Number(process.hrtime.bigint() - startedAt);
    const elapsedMs = Number((elapsedNs / 1e6).toFixed(2));
    const contentLengthHeader = Number.parseInt(String(res.getHeader("content-length") || ""), 10);
    const responseBytes =
      Number.isInteger(contentLengthHeader) && contentLengthHeader >= 0 ? contentLengthHeader : null;

    const latencyBreached = Number.isFinite(elapsedNs) && elapsedNs > latencyBudgetNs;
    const egressBreached = responseBytes !== null && responseBytes > egressBudgetBytes;

    if (!latencyBreached && !egressBreached) {
      return;
    }

    const level = policy.logOnly ? "warn" : "error";
    const details = [
      `[RuntimeBudget] level=${level}`,
      `method=${String(req.method || "").toUpperCase()}`,
      `path=${pathToCheck}`,
      `status=${res.statusCode}`,
      `latency_ms=${elapsedMs}`,
      `latency_budget_ms=${latencyBudgetMs}`,
      `latency_breached=${latencyBreached}`,
      `egress_bytes=${responseBytes === null ? "unknown" : responseBytes}`,
      `egress_budget_bytes=${egressBudgetBytes}`,
      `egress_breached=${egressBreached}`,
      `correlation_id=${req.correlationId || "n/a"}`,
    ];

    if (level === "error") {
      console.error(details.join(" "));
    } else {
      console.warn(details.join(" "));
    }
  });

  return next();
}

module.exports = {
  runtimeBudgetGuard,
  resolveRuntimeBudgetPolicy,
  parseBoolean,
  parsePositiveInteger,
  parseCommaSeparated,
  isWriteMethod,
};
