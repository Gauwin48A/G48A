const { pool } = require('../index');
const logger = require('../utils/logger');

exports.getComplaints = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM complaints ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching complaints:', err);
    res.status(500).json({ error: err.message });
  }
};
