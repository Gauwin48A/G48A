const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getRewardsByUser = async (req, res) => {
  try {
    const { userId, sort = 'desc', minPoints, maxPoints, reason } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter is required' });
    }

    let query = `SELECT * FROM reward_log WHERE user_id = $1`;
    let params = [userId];
    let conditions = [];

    if (minPoints) {
      conditions.push(`points >= $${params.length + 1}`);
      params.push(minPoints);
    }
    if (maxPoints) {
      conditions.push(`points <= $${params.length + 1}`);
      params.push(maxPoints);
    }
    if (reason) {
      conditions.push(`reason = $${params.length + 1}`);
      params.push(reason);
    }
    if (conditions.length) {
      query += ' AND ' + conditions.join(' AND ');
    }
    query += ` ORDER BY points ${sort === 'asc' ? 'ASC' : 'DESC'}`;

    const { rows } = await pool.query(query, params);
    res.json({ rewards: rows });
  } catch (err) {
    logger.error('getRewardsByUser error:', err);
    res.status(500).json({ error: 'Failed to fetch rewards', fallback: [] });
  }
};
