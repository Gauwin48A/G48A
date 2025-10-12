const pool = require('../config/db');

async function logAadhaarVerification(userId, requestId, requestType, status) {
  try {
    await pool.query(
      'INSERT INTO aadhaar_verification_logs (user_id, request_id, request_type, status) VALUES ($1, $2, $3, $4)',
      [userId, requestId, requestType, status]
    );
  } catch (err) {
    // Do not throw, just log
    console.error('Aadhaar verification log error:', err.message);
  }
}

module.exports = { logAadhaarVerification };
