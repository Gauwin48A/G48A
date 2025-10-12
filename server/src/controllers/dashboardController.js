const pool = require('../config/db');

exports.getDashboard = async (req, res) => {
  try {
    const { userId } = req.query;
    // Example: Fetch user dashboard stats
    const userStats = await pool.query('SELECT * FROM user_dashboard_stats WHERE user_id = $1', [userId]);
    res.json(userStats.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
