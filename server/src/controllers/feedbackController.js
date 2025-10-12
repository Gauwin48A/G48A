const { pool } = require('../index');
const logger = require('../utils/logger');

exports.getFeedback = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching feedback:', err);
    res.status(500).json({ error: err.message });
  }
};
