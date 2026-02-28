// Middleware for validating user registration input
const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

module.exports = (req, res, next) => {
  // Use DB validation function for all fields
  const { name, phone, email, password, dob, aadhaar, pan } = req.body;
  runQuery(
    'SELECT * FROM validate_signup_fields($1, $2, $3, $4, $5, $6, $7)',
    [name, email, password, phone, dob, aadhaar, pan]
  ).then(result => {
    const invalid = result.rows.find(row => !row.valid);
    if (invalid) {
      return res.status(400).json({ error: invalid.message, field: invalid.field });
    }
    next();
  }).catch(err => {
    logger.error('[validateUser] Validation failed:', err);
    return res.status(500).json({ error: 'Validation failed', details: err.message });
  });
};
