const pool = require("../config/db");

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
    await pool.query(
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
  console.warn("[WARN]", ...args);
}

/**
 * Log an error message to stderr with an [ERROR] prefix.
 * @param {...*} args - Values to log.
 */
function error(...args) {
  console.error("[ERROR]", ...args);
}

/**
 * Log an informational message to stdout with an [INFO] prefix.
 * @param {...*} args - Values to log.
 */
function info(...args) {
  console.log("[INFO]", ...args);
}

module.exports = {
  logAadhaarVerification,
  warn,
  error,
  info,
};
