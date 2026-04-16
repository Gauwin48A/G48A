const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { evaluateSchemaContract } = require("./schemaGuard");

/**
 * Parse a value to boolean with a fallback.
 * Recognises "1", "true", "yes", "on" as true and their opposites as false.
 * @param {*} value - The value to parse
 * @param {boolean} [fallback=false] - Default when value is empty/unrecognised
 * @returns {boolean}
 */
function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

/**
 * Verify that all required environment variables are present and non-empty.
 * @param {object} [env=process.env] - Environment variables to check
 * @returns {{status: string, required: string[], missing: string[]}}
 */
function evaluateRequiredConfig(env = process.env) {
  const required = [
    "JWT_SECRET",
    "REFRESH_SECRET",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME",
    "DB_USER",
  ];

  const missing = required.filter((key) => {
    const value = env[key];
    return value === undefined || value === null || String(value).trim() === "";
  });

  return {
    status: missing.length === 0 ? "pass" : "fail",
    required,
    missing,
  };
}

/**
 * Evaluate freshness of the directory snapshot file.
 * @param {object} [env=process.env] - Environment variables
 * @param {Date} [now=new Date()] - Current timestamp for age calculation
 * @returns {Promise<{status: string, configured: boolean, [key: string]: *}>}
 */
async function evaluateSnapshot(env = process.env, now = new Date()) {
  const snapshotPathRaw = env.DIRECTORY_SNAPSHOT_PATH;

  if (!snapshotPathRaw) {
    return {
      status: "skip",
      configured: false,
      reason: "DIRECTORY_SNAPSHOT_PATH not configured",
    };
  }

  const snapshotPath = path.isAbsolute(snapshotPathRaw)
    ? snapshotPathRaw
    : path.resolve(process.cwd(), snapshotPathRaw);

  let stats;
  try {
    await fsp.access(snapshotPath, fs.constants.F_OK);
    stats = await fsp.stat(snapshotPath);
  } catch {
    return {
      status: "fail",
      configured: true,
      path: snapshotPath,
      reason: "snapshot file not found",
    };
  }

  const ageHours =
    (now.getTime() - stats.mtime.getTime()) / (1e3 * 60 * 60);

  const parsedMaxAgeHours = Number.parseInt(
    env.DIRECTORY_SNAPSHOT_MAX_AGE_HOURS || "72",
    10
  );
  const maxAgeHours =
    Number.isFinite(parsedMaxAgeHours) && parsedMaxAgeHours >= 0
      ? parsedMaxAgeHours
      : 72;

  const fresh = Number.isFinite(ageHours) && ageHours <= maxAgeHours;

  return {
    status: fresh ? "pass" : "warn",
    configured: true,
    path: snapshotPath,
    lastModified: stats.mtime.toISOString(),
    ageHours: Number(ageHours.toFixed(2)),
    maxAgeHours,
  };
}

/**
 * Ping the database with a trivial query and measure latency.
 * @param {object} pool - pg Pool instance
 * @returns {Promise<{status: string, latencyMs: number, [error]: string}>}
 */
async function evaluateDb(pool) {
  const started = Date.now();
  try {
    await pool.query("SELECT 1");
    return { status: "pass", latencyMs: Date.now() - started };
  } catch (err) {
    return { status: "fail", latencyMs: Date.now() - started, error: err.message };
  }
}

/**
 * Check the health of the cache layer (Redis or in-memory fallback).
 * @param {object} cacheService - Cache service with a healthCheck method
 * @param {object} [env=process.env] - Environment variables
 * @returns {Promise<{status: string, [details]: object, [reason]: string}>}
 */
async function evaluateCache(cacheService, env = process.env) {
  if (!cacheService || typeof cacheService.healthCheck !== "function") {
    return { status: "skip", reason: "cache health check unavailable" };
  }

  try {
    const health = await cacheService.healthCheck();
    const normalizedStatus = String(health?.status || "")
      .trim()
      .toLowerCase();
    const hasBooleanHealthy = typeof health?.healthy === "boolean";

    const isPass = hasBooleanHealthy
      ? health.healthy
      : normalizedStatus === "healthy" || normalizedStatus === "pass";

    const usingMemoryFallback =
      String(health?.type || "").toLowerCase() === "memory";
    const allowMemoryFallback = parseBoolean(
      env.READINESS_ALLOW_MEMORY_CACHE_FALLBACK,
      env.NODE_ENV !== "production"
    );

    if (usingMemoryFallback && !allowMemoryFallback) {
      return {
        status: env.NODE_ENV === "production" ? "fail" : "warn",
        details: health,
        reason: "memory cache fallback is not allowed by readiness policy",
      };
    }

    return { status: isPass ? "pass" : "warn", details: health };
  } catch (err) {
    return { status: "warn", error: err.message };
  }
}

/**
 * Validate the database schema against the expected contract.
 * @returns {Promise<{status: string, details: object, [warning]: string|null}>}
 */
async function evaluateSchema() {
  try {
    const report = await evaluateSchemaContract({
      autoCreateTwoFactorFallback: false,
    });
    const status = report.status === "warn" ? "pass" : report.status;
    return {
      status,
      details: report,
      warning: report.status === "warn" ? report.twoFactor?.warning : null,
    };
  } catch (err) {
    return { status: "fail", error: err.message };
  }
}

/**
 * Check whether the session store (Redis or memory fallback) is available.
 * @param {object} sessionStore - Session store with isRedisAvailable method
 * @param {object} [env=process.env] - Environment variables
 * @returns {{status: string, mode: string, [reason]: string}}
 */
function evaluateSessionStore(sessionStore, env = process.env) {
  if (
    !sessionStore ||
    typeof sessionStore.isRedisAvailable !== "function"
  ) {
    return {
      status: "skip",
      mode: "unknown",
      reason: "session store capability unavailable",
    };
  }

  const redisAvailable = Boolean(sessionStore.isRedisAvailable());
  const allowMemoryFallback = parseBoolean(
    env.READINESS_ALLOW_MEMORY_SESSION_FALLBACK,
    env.NODE_ENV !== "production"
  );

  if (!redisAvailable && allowMemoryFallback) {
    return {
      status: "pass",
      mode: "memory-fallback",
      reason: "memory fallback explicitly allowed for readiness scenario",
    };
  }

  return {
    status: redisAvailable
      ? "pass"
      : env.NODE_ENV === "production"
        ? "fail"
        : "warn",
    mode: redisAvailable ? "redis" : "memory-fallback",
  };
}

/**
 * Run all readiness checks and return an aggregate status.
 * @param {object} options
 * @param {object} options.pool - pg Pool instance
 * @param {object} options.cacheService - Cache service
 * @param {object} options.sessionStore - Session store
 * @param {object} [options.env=process.env] - Environment variables
 * @param {Date} [options.now=new Date()] - Current timestamp
 * @returns {Promise<{status: string, checks: object, checkedAt: string}>}
 */
async function runReadinessChecks({
  pool,
  cacheService,
  sessionStore,
  env = process.env,
  now = new Date(),
}) {
  const checks = {
    requiredConfig: evaluateRequiredConfig(env),
    db: await evaluateDb(pool),
    schema: await evaluateSchema(),
    cache: await evaluateCache(cacheService, env),
    sessionStore: evaluateSessionStore(sessionStore, env),
    snapshot: await evaluateSnapshot(env, now),
  };

  const hasHardFailure =
    checks.requiredConfig.status === "fail" ||
    checks.db.status === "fail" ||
    checks.schema.status === "fail" ||
    checks.cache.status === "fail" ||
    checks.sessionStore.status === "fail";

  const hasWarn = Object.values(checks).some((value) => value.status === "warn");

  const status = hasHardFailure ? "not_ready" : hasWarn ? "degraded" : "ready";

  return {
    status,
    checks,
    checkedAt: new Date().toISOString(),
  };
}

module.exports = {
  evaluateRequiredConfig,
  evaluateSnapshot,
  runReadinessChecks,
};
