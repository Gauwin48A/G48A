const crypto = require("crypto");

const redisSession = require("../config/redisSession");

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const GLOBAL_WINDOW_SECONDS = parsePositiveInt(
  process.env.AUTH_ANOMALY_WINDOW_SECONDS,
  15 * 60,
);
const GLOBAL_LIMIT = parsePositiveInt(process.env.AUTH_ANOMALY_GLOBAL_LIMIT, 120);
const SUBJECT_LIMIT = parsePositiveInt(process.env.AUTH_ANOMALY_SUBJECT_LIMIT, 20);

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"] ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

function parseOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function hashSubject(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 20);
}

function resolveSubject(req) {
  const body = req.body || {};
  const source =
    parseOptionalString(body.identifier) ||
    parseOptionalString(body.email) ||
    parseOptionalString(body.phone) ||
    parseOptionalString(body.userId) ||
    null;
  if (!source) {
    return null;
  }
  return hashSubject(source.toLowerCase());
}

function createThrottleKeys(req, actionKey) {
  const ip = String(getClientIp(req)).split(",")[0].trim();
  const subject = resolveSubject(req);
  return {
    global: `AUTH:ANOMALY:${actionKey}:IP:${ip}`,
    subject: subject ? `AUTH:ANOMALY:${actionKey}:SUBJECT:${subject}` : null,
  };
}

function authAnomalyThrottle(actionKey) {
  if (!actionKey) {
    throw new Error("authAnomalyThrottle(actionKey) is required");
  }

  return async (req, res, next) => {
    try {
      const keys = createThrottleKeys(req, actionKey);
      const globalCount = await redisSession.incr(keys.global, GLOBAL_WINDOW_SECONDS);
      if (Number(globalCount) > GLOBAL_LIMIT) {
        return res.status(429).json({
          error: "Too many requests. Please retry later.",
          code: "AUTH_ANOMALY_GLOBAL_LIMIT",
          retryAfter: GLOBAL_WINDOW_SECONDS,
        });
      }

      if (keys.subject) {
        const subjectCount = await redisSession.incr(
          keys.subject,
          GLOBAL_WINDOW_SECONDS,
        );
        if (Number(subjectCount) > SUBJECT_LIMIT) {
          return res.status(429).json({
            error: "Too many attempts for this account. Please retry later.",
            code: "AUTH_ANOMALY_SUBJECT_LIMIT",
            retryAfter: GLOBAL_WINDOW_SECONDS,
          });
        }
      }
    } catch {
      // Fail-open if cache unavailable; other protections still apply.
    }

    return next();
  };
}

module.exports = {
  authAnomalyThrottle,
};
