const pino = require("../config/logger");

/**
 * Lazily require the database pool to break the circular dependency
 * chain: utils/logger -> config/db -> config/dbPool -> utils/logger.
 */
let _pool = null;
function getPool() {
    if (_pool === null) {
        _pool = require("../config/db");
    }
    return _pool;
}

/**
 * Log an Aadhaar verification event to the database.
 * @param {string} userId - The user who initiated the verification.
 * @param {string} requestId - Unique identifier for the verification request.
 * @param {string} requestType - Type of verification (e.g. "otp", "biometric").
 * @param {string} status - Outcome status (e.g. "success", "failure").
 * @returns {Promise<void>}
 */
async function logAadhaarVerification(userId, requestId, requestType, status) {
  try {
    await getPool().query(
      "INSERT INTO aadhaar_verification_logs (user_id, request_id, request_type, status) VALUES ($1, $2, $3, $4)",
      [userId, requestId, requestType, status]
    );
  } catch (err) {
    console.error("Aadhaar verification log error:", err.message);
  }
}

/**
 * Log a warning message to stderr with a [WARN] prefix.
 * @param {...*} args - Values to log.
 */
function warn(...args) {
  pino.warn(args.length === 1 ? args[0] : args.join(" "));
}

/**
 * Log an error message with an [ERROR] prefix.
 * @param {...*} args - Values to log.
 */
function error(...args) {
  pino.error(args.length === 1 ? args[0] : args.join(" "));
}

/**
 * Log an informational message with an [INFO] prefix.
 * @param {...*} args - Values to log.
 */
function info(...args) {
  pino.info(args.length === 1 ? args[0] : args.join(" "));
}

module.exports = {
  logAadhaarVerification,
  warn,
  error,
  info,
};
