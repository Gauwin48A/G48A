const { runQuery } = require("../utils/dbHelpers");
const logger = require('../utils/logger');

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
