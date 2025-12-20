const pool = require('../config/db');

exports.getFeedback = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM feedback ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching feedback:', err.message);
    // Return empty array on error to allow page to load gracefully
    res.json([]);
  }
};
