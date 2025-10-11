const { pool } = require('../index');

exports.getTiers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tiers ORDER BY tier_order ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
