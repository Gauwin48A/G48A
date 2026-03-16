// =============================================================================
// Audit Logger - Security Event Logging
// =============================================================================

const fs = require("fs");
const path = require("path");
const pool = require("./db");

// =============================================================================
// Log Directory Setup
// =============================================================================

const LOG_DIR = path.join(__dirname, "../../logs");
const AUDIT_LOG_FILE = path.join(LOG_DIR, "audit.log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// =============================================================================
// Core Logging Function
// =============================================================================

/**
 * Logs a security event to both a local audit log file and the database.
 * In non-production environments, also prints to the console.
 *
 * @param {string} event - Event name (use an EVENTS constant).
 * @param {Object} [details={}] - Additional context for the event.
 * @param {string|number} [details.userId] - ID of the user involved.
 * @param {string} [details.ip] - Client IP address.
 * @param {string} [details.userAgent] - Client User-Agent string.
 * @returns {Promise<void>}
 */
const logSecurityEvent = async (event, details = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    event: event,
    ...details,
    ip: details.ip || "unknown",
    userAgent: details.userAgent?.substring(0, 200) || "unknown",
  };

  // --- File log ---
  const logLine = JSON.stringify(entry) + "\n";
  fs.appendFile(AUDIT_LOG_FILE, logLine, (err) => {
    if (err) console.error("[AuditLogger] File write failed:", err.message);
  });

  // --- Database log ---
  try {
    await pool.query(
      `
            INSERT INTO audit_logs (user_id, action, ip_address, user_agent, details)
            VALUES ($1, $2, $3, $4, $5)
        `,
      [
        details.userId || null,
        event,
        entry.ip,
        entry.userAgent,
        JSON.stringify(details),
      ]
    );
  } catch (err) {
    console.error("[AuditLogger] DB write failed:", err.message);
  }

  // --- Dev console log ---
  if (process.env.NODE_ENV !== "production") {
    console.log(`[AUDIT] ${event}:`, JSON.stringify(details));
  }
};

// =============================================================================
// Event Name Constants
// =============================================================================

/**
 * @enum {string} Canonical audit event names.
 */
const EVENTS = {
  LOGIN_SUCCESS: "LOGIN_SUCCESS",
  LOGIN_FAILED: "LOGIN_FAILED",
  LOGOUT: "LOGOUT",
  PASSWORD_CHANGE: "PASSWORD_CHANGE",
  PASSWORD_RESET_REQUEST: "PASSWORD_RESET_REQUEST",
  PASSWORD_RESET_COMPLETE: "PASSWORD_RESET_COMPLETE",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  ACCOUNT_UNLOCKED: "ACCOUNT_UNLOCKED",
  TWO_FA_ENABLED: "TWO_FA_ENABLED",
  TWO_FA_DISABLED: "TWO_FA_DISABLED",
  SUSPICIOUS_ACTIVITY: "SUSPICIOUS_ACTIVITY",
  NEW_DEVICE_LOGIN: "NEW_DEVICE_LOGIN",
  NEW_LOCATION_LOGIN: "NEW_LOCATION_LOGIN",
  DATA_EXPORT: "DATA_EXPORT",
  ACCOUNT_DELETED: "ACCOUNT_DELETED",
};

// =============================================================================
// Module Exports
// =============================================================================

module.exports = {
  logSecurityEvent: logSecurityEvent,
  EVENTS: EVENTS,
};
