const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.query;
    // Use correct column name based on schema (user_id or id)
    const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error fetching profile:', err);
    res.status(500).json({ error: err.message });
  }
};

// Update profile endpoint
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    const { full_name, phone, address, avatar_url, bio } = req.body;
    // Use correct column name based on schema (user_id or id)
    const result = await pool.query(
      `UPDATE profiles SET full_name = $1, phone = $2, address = $3, avatar_url = $4, bio = $5
       WHERE user_id = $6 RETURNING *`,
      [full_name, phone, address, avatar_url, bio, userId]
    );
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating profile:', err);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/profile/preferences?userId=1
exports.getPreferences = async (req, res) => {
  try {
    const { userId } = req.query;
    const result = await pool.query('SELECT * FROM preferences WHERE user_id = $1', [userId]);
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Preferences not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error fetching preferences:', err);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/profile/preferences/update
exports.updatePreferences = async (req, res) => {
  try {
    const { userId, location, minPrice, maxPrice, date } = req.body;
    const result = await pool.query(
      `UPDATE preferences SET location = $1, min_price = $2, max_price = $3, date = $4
       WHERE user_id = $5 RETURNING *`,
      [location, minPrice, maxPrice, date, userId]
    );
    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Preferences not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating preferences:', err);
    res.status(500).json({ error: err.message });
  }
};
