const fs = require("fs");
const path = require("path");

const pool = require("../config/db");
const logger = require("../utils/logger");

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const AUDIT_FALLBACK_LOG_PATH =
  process.env.AUTH_AUDIT_FALLBACK_PATH ||
  path.join(process.cwd(), "logs", "auth-audit-fallback.ndjson");

let lastFailureAlertAtMs = 0;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });
}

function ensureFallbackDirectory() {
  const dir = path.dirname(AUDIT_FALLBACK_LOG_PATH);
  fs.mkdirSync(dir, { recursive: true });
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || "unknown";
}

function parseOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function parseRequestUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function emitFailureAlert(reason) {
  const now = Date.now();
  if (now - lastFailureAlertAtMs < 60 * 1000) {
    return;
  }
  lastFailureAlertAtMs = now;
  logger.error("[AUTH AUDIT] Primary audit logging failed; using fallback sink", {
    reason,
    fallbackPath: AUDIT_FALLBACK_LOG_PATH,
  });
}

async function writeAuthAudit({
  req,
  action,
  success,
  details = {},
}) {
  const userId = parseRequestUserId(req);
  const ipAddress = getClientIp(req);
  const userAgent = req.headers["user-agent"] || "unknown";

  try {
    await runQuery(
      `
        INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details, created_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, NOW())
      `,
      [
        userId,
        String(action || "AUTH_EVENT"),
        ipAddress,
        userAgent,
        JSON.stringify({
          ...details,
          success: Boolean(success),
          path: req.originalUrl,
          method: req.method,
        }),
      ],
    );
    return;
  } catch (error) {
    emitFailureAlert(error?.message || "unknown_error");
  }

  try {
    ensureFallbackDirectory();
    const payload = {
      ts: new Date().toISOString(),
      action: String(action || "AUTH_EVENT"),
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      success: Boolean(success),
      path: req.originalUrl,
      method: req.method,
      details,
    };
    fs.appendFileSync(AUDIT_FALLBACK_LOG_PATH, `${JSON.stringify(payload)}\n`, "utf8");
  } catch (fallbackError) {
    logger.error("[AUTH AUDIT] Fallback sink write failed", {
      reason: fallbackError?.message,
    });
  }
}

module.exports = {
  writeAuthAudit,
};
