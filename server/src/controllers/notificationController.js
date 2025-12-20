const pool = require('../config/db');

exports.getNotifications = async (req, res) => {
  try {
    const { userId } = req.query;
    let result;
    if (userId) {
      result = await pool.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    } else {
      result = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC');
    }
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err.message);
    // Return empty array on error to allow page to load gracefully
    res.json([]);
  }
};
