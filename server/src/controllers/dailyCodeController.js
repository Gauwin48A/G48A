const pool = require('../config/db');

exports.getDailyCode = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const result = await pool.query('SELECT * FROM daily_codes WHERE user_id = $1', [userId]);
  res.json(result.rows[0] || {});
};
