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

exports.getDailyCode = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    const result = await runQuery(
      `SELECT code, expires_at, created_at
       FROM daily_codes
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [String(userId)]
    );
    return res.json(result.rows[0] || {});
  } catch (error) {
    logger.error('[DailyCode] Fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch daily code' });
  }
};
