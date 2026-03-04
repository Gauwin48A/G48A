const rateLimit = require("express-rate-limit");
const JWT_CONFIG = require("../config/jwtConfig");
const logger = require("../utils/logger");
const {
  verifyToken: verifyToken,
} = require("../services/tokenVerificationCache");
const {
  getAccessTokenFromRequest: getAccessTokenFromRequest,
} = require("../utils/requestAuth");
const authDebugEnabled = process.env.AUTH_DEBUG === "true";
const LOAD_TEST_SCENARIOS = new Set(["normal", "abuse", "authenticated"]);
const RATE_LIMIT_CONTEXT_SYMBOL = Symbol("rate-limit-context");
function parsePositiveIntEnv(envName, fallback) {
  const parsed = Number.parseInt(process.env[envName], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
const API_LIMIT_WINDOW_MS = parsePositiveIntEnv(
  "API_RATE_LIMIT_WINDOW_MS",
  15 * 60 * 1e3,
);
const API_RATE_LIMIT_MAX = parsePositiveIntEnv("API_RATE_LIMIT_MAX", 3e3);
const API_RATE_LIMIT_AUTHENTICATED_MAX = parsePositiveIntEnv(
  "API_RATE_LIMIT_AUTHENTICATED_MAX",
  process.env.API_RATE_LIMIT_MAX
    ? API_RATE_LIMIT_MAX
    : Math.max(API_RATE_LIMIT_MAX, 6e3),
);
const API_RATE_LIMIT_NORMAL_SCENARIO_MAX = parsePositiveIntEnv(
  "API_RATE_LIMIT_NORMAL_SCENARIO_MAX",
  12e3,
);
const RATE_LIMIT_ALLOW_SIMULATED_IDS =
  process.env.RATE_LIMIT_ALLOW_SIMULATED_IDS === undefined
    ? process.env.NODE_ENV !== "production"
    : process.env.RATE_LIMIT_ALLOW_SIMULATED_IDS === "true";
const READY_PATHS = new Set(["/health", "/api/health", "/api/ready"]);
function getLoadScenario(req) {
  return String(req.headers["x-load-test-scenario"] || "").toLowerCase();
}
function isTrustedSimulatedLoadRequest(req) {
  return (
    RATE_LIMIT_ALLOW_SIMULATED_IDS &&
    LOAD_TEST_SCENARIOS.has(getLoadScenario(req))
  );
}
function getAuthenticatedRateLimitKey(req) {
  if (req[RATE_LIMIT_CONTEXT_SYMBOL]) {
    return req[RATE_LIMIT_CONTEXT_SYMBOL].authenticatedKey;
  }
  const context = { authenticatedKey: null };
  const token = getAccessTokenFromRequest(req, { preferCookie: true });
  if (token) {
    try {
      const payload = verifyToken(token, JWT_CONFIG.SECRET);
      const userId =
        payload?.userId ??
        payload?.id ??
        payload?.user_id ??
        payload?.sub ??
        null;
      if (userId !== null && userId !== undefined && userId !== "") {
        context.authenticatedKey = `user:${String(userId)}`;
      }
    } catch {}
  }
  req[RATE_LIMIT_CONTEXT_SYMBOL] = context;
  return context.authenticatedKey;
}
exports.apiLimiter = rateLimit({
  windowMs: API_LIMIT_WINDOW_MS,
  max: (req) => {
    const scenario = getLoadScenario(req);
    if (
      isTrustedSimulatedLoadRequest(req) &&
      ["normal", "authenticated"].includes(scenario)
    ) {
      return API_RATE_LIMIT_NORMAL_SCENARIO_MAX;
    }
    if (getAuthenticatedRateLimitKey(req)) {
      return API_RATE_LIMIT_AUTHENTICATED_MAX;
    }
    return API_RATE_LIMIT_MAX;
  },
  keyGenerator: (req) => {
    const simulatedUser = req.headers["x-simulated-user"];
    if (isTrustedSimulatedLoadRequest(req) && simulatedUser) {
      return `simulated:${String(simulatedUser)}`;
    }
    const authenticatedKey = getAuthenticatedRateLimitKey(req);
    if (authenticatedKey) {
      return authenticatedKey;
    }
    const ipAddress =
      req.ip ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      "127.0.0.1";
    return rateLimit.ipKeyGenerator(ipAddress);
  },
  skip: (req) => READY_PATHS.has(req.path),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. System locked for 15 minutes.",
    retryAfter: "15 minutes",
  },
});
exports.authenticateToken = (req, res, next) => {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    if (authDebugEnabled) {
      logger.info("[AUTH] No token for protected route:", req.path);
    }
    return res.status(401).json({ error: "Access denied. No token." });
  }
  try {
    const user = verifyToken(token, JWT_CONFIG.SECRET);
    req.user = user;
    return next();
  } catch (err) {
    logger.error(
      "[AUTH] Token verify failed:",
      err.message,
      "| Path:",
      req.path,
    );
    return res.status(401).json({ error: "Invalid or expired token." });
  }
};
exports.sanitizeInput = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === "string") {
        req.body[key] = req.body[key]
          .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
          .replace(/javascript:/gi, "")
          .replace(/onload=/gi, "")
          .replace(/onerror=/gi, "");
      }
    }
  }
  next();
};
const helmet = require("helmet");
exports.securityHeaders = helmet({
  // Allow media loaded from API origin (5001) to render in frontend origin (8081).
  crossOriginResourcePolicy: { policy: "cross-origin" },
});
exports.loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please try again after 15 minutes.",
  },
});
const pool = require("../config/db");
const DB_QUERY_TIMEOUT_MS =
  Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 1e4;
function runQuery(text, values = []) {
  return pool.query({
    text: text,
    values: values,
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });
}
exports.checkAccountLockout = async (req, res, next) => {
  const { email: email } = req.body;
  if (!email) return next();
  try {
    const result = await runQuery(
      "SELECT lock_until, locked_until FROM users WHERE LOWER(email) = LOWER($1)",
      [email.trim()],
    );
    const lockUntil =
      result.rows[0]?.lock_until || result.rows[0]?.locked_until;
    if (lockUntil) {
      const lockedUntil = new Date(lockUntil);
      if (lockedUntil > new Date()) {
        return res.status(403).json({
          error: "Account Locked",
          message: "Too many failed attempts. Try again later.",
        });
      }
    }
    next();
  } catch (err) {
    logger.error("Lockout check error:", err);
    next();
  }
};
exports.securityLogger = (req, res, next) => {
  next();
};
