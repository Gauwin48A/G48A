// Middleware for validating post creation input
// Validation is now handled by PostgreSQL stored procedure
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

module.exports = async (req, res, next) => {
  const { category, brand, model, price, location, contact } = req.body;
  try {
    const result = await runQuery(
      'SELECT * FROM validate_post_fields($1, $2, $3, $4, $5, $6)',
      [category, brand, model, price, location, contact]
    );
    const errors = result.rows.filter(r => !r.valid);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    next();
  } catch (err) {
    logger.error('[validatePost] Validation failed:', err);
    return res.status(500).json({ error: err.message });
  }
};
