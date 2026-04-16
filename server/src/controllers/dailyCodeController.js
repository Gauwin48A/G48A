const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require('../utils/logger');

exports.getDailyCode = async (req, res) => {
  const authUserId = getAuthUserId(req);
  if (!authUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const userId = req.query.userId || authUserId;
  // Users can only view their own daily code
  if (String(userId) !== String(authUserId)) {
    return res.status(403).json({ error: 'Forbidden' });
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
