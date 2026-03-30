const pool = require("../config/db");

const MAX_AUDIT_LOG_LIMIT = 200;

/**
 * Parse a value to a positive integer, clamped to a maximum.
 * @param {*} value
 * @param {number} fallback
 * @param {number} [max]
 * @returns {number}
 */
function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/** Recognised audit action constants. */
const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  TWO_FACTOR_ENABLED: "TWO_FACTOR_ENABLED",
  TWO_FACTOR_DISABLED: "TWO_FACTOR_DISABLED",
  TWO_FACTOR_FAILED: "TWO_FACTOR_FAILED",
  ACCOUNT_CREATED: "ACCOUNT_CREATED",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
  PROFILE_UPDATED: "PROFILE_UPDATED",
  EMAIL_CHANGED: "EMAIL_CHANGED",
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  BRUTE_FORCE_DETECTED: "BRUTE_FORCE_DETECTED",
  NEW_DEVICE_LOGIN: "NEW_DEVICE_LOGIN",
  DATA_EXPORTED: "DATA_EXPORTED",
  SENSITIVE_DATA_ACCESSED: "SENSITIVE_DATA_ACCESSED",
};

/**
 * Extract the client IP address from an Express request.
 * @param {import('express').Request} req
 * @returns {string}
 */
const getClientIP = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.headers["x-real-ip"] ||
  req.socket?.remoteAddress ||
  req.ip ||
  "unknown";

/**
 * Build a simple device fingerprint from request headers.
 * @param {import('express').Request} req
 * @returns {string}
 */
const getDeviceFingerprint = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  const acceptLang = req.headers["accept-language"] || "";
  const acceptEnc = req.headers["accept-encoding"] || "";
  const fingerprint = Buffer.from(
    `${userAgent}|${acceptLang}|${acceptEnc}`
  )
    .toString("base64")
    .substring(0, 32);
  return fingerprint;
};

/**
 * Write an audit log entry for a user action.
 * @param {object} options
 * @param {string|null} [options.userId] - The acting user (null for anonymous)
 * @param {string} options.action - One of AUDIT_ACTIONS
 * @param {import('express').Request} options.req - Express request
 * @param {object} [options.details={}] - Extra context to persist
 */
const logAudit = async ({ userId = null, action, req, details = {} }) => {
  try {
    const ip = getClientIP(req);
    const userAgent = req.headers["user-agent"] || "unknown";
    const fingerprint = getDeviceFingerprint(req);

    const enrichedDetails = {
      ...details,
      deviceFingerprint: fingerprint,
      timestamp: new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, ip, userAgent, JSON.stringify(enrichedDetails)]
    );

    if (
      ["BRUTE_FORCE_DETECTED", "SUSPICIOUS_ACTIVITY", "LOGIN_FAILED"].includes(
        action
      )
    ) {
      console.warn(
        `[SECURITY AUDIT] ${action} - IP: ${ip} - User: ${userId || "anonymous"}`
      );
    }
  } catch (err) {
    console.error("[AUDIT LOGGER] Failed to log:", err.message);
  }
};

/**
 * Record a security event with severity level.
 * @param {object} options
 * @param {string} options.eventType - Event type identifier
 * @param {string|null} [options.userId] - Related user
 * @param {string} options.ip - Source IP address
 * @param {string} [options.severity="MEDIUM"] - Severity: LOW, MEDIUM, HIGH, CRITICAL
 * @param {object} [options.details={}] - Extra context
 */
const logSecurityEvent = async ({
  eventType,
  userId = null,
  ip,
  severity = "MEDIUM",
  details = {},
}) => {
  try {
    await pool.query(
      `INSERT INTO security_events (event_type, user_id, ip_address, severity, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [eventType, userId, ip, severity, JSON.stringify(details)]
    );

    if (severity === "CRITICAL") {
      console.error(`[CRITICAL SECURITY EVENT] ${eventType} - IP: ${ip}`);
    }
  } catch (err) {
    console.error("[SECURITY EVENT LOGGER] Failed:", err.message);
  }
};

/**
 * Retrieve recent audit log entries for a user.
 * @param {string} userId - The user whose logs to fetch
 * @param {number} [limit=50] - Maximum rows to return (capped at 200)
 * @returns {Promise<object[]>}
 */
const getUserAuditLogs = async (userId, limit = 50) => {
  try {
    const safeLimit = parsePositiveInt(limit, 50, MAX_AUDIT_LOG_LIMIT);
    const result = await pool.query(
      `SELECT action, ip_address, user_agent, details, created_at
       FROM audit_logs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, safeLimit]
    );
    return result.rows;
  } catch (err) {
    console.error("[AUDIT LOGGER] Failed to fetch logs:", err.message);
    return [];
  }
};

module.exports = {
  logAudit,
  logSecurityEvent,
  getUserAuditLogs,
  getClientIP,
  getDeviceFingerprint,
  AUDIT_ACTIONS,
};
