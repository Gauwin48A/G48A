const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getDashboard = async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    logger.warn('Dashboard request missing userId');
    return res.status(400).json({ code: 400, message: 'userId required' });
  }
  try {
    const userStats = await pool.query('SELECT * FROM user_dashboard_stats WHERE user_id = $1', [userId]);
    res.json(userStats.rows[0] || {});
  } catch (err) {
    logger.error('Error fetching dashboard:', err);
    res.status(500).json({ code: 500, message: 'Failed to fetch dashboard', details: err.message });
  }
};
