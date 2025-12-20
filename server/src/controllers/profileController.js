const pool = require('../config/db');
const logger = require('../utils/logger');

exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      logger.warn('Profile request missing userId');
      return res.status(400).json({ code: 400, message: 'userId required', fallback: null });
    }
    const result = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
    if (!result.rows || result.rows.length === 0) {
      logger.error('Profile not found for user:', userId);
      return res.status(404).json({ code: 404, message: 'Profile not found', fallback: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error fetching profile:', err);
    res.status(500).json({ code: 500, message: 'Failed to fetch profile', details: err.message, fallback: null });
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
      logger.error('Profile not found for update:', userId);
      return res.status(404).json({ error: 'Profile not found', fallback: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating profile:', err);
    res.status(500).json({ error: err.message, fallback: null });
  }
};

// GET /api/profile/preferences?userId=1
exports.getPreferences = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      logger.warn('Preferences request missing userId');
      return res.status(400).json({ code: 400, message: 'userId required', fallback: null });
    }
    const result = await pool.query('SELECT * FROM preferences WHERE user_id = $1', [userId]);

    if (!result.rows || result.rows.length === 0) {
      // Return empty defaults instead of 404 to prevent frontend error
      logger.info('No preferences found for user, returning defaults:', userId);
      return res.json({
        userId: parseInt(userId),
        location: '',
        minPrice: 0,
        maxPrice: 100000,
        categories: [],
        date: null
      });
    }

    // Convert snake_case to camelCase for frontend compatibility
    const pref = result.rows[0];
    res.json({
      userId: pref.user_id,
      location: pref.location || '',
      minPrice: parseFloat(pref.min_price) || 0,
      maxPrice: parseFloat(pref.max_price) || 100000,
      categories: pref.categories || [],
      date: pref.date || null,
      notificationEnabled: pref.notification_enabled
    });
  } catch (err) {
    logger.error('Error fetching preferences:', err);
    res.status(500).json({ code: 500, message: 'Failed to fetch preferences', details: err.message, fallback: null });
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

// POST /api/profile/upload-avatar - Handle profile picture upload
exports.uploadAvatar = async (req, res) => {
  try {
    const userId = req.body.userId || req.user?.id;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Convert file to base64 data URI for simple storage
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const avatar_url = `data:${mimeType};base64,${base64}`;

    // Update profile with new avatar URL
    const result = await pool.query(
      'UPDATE profiles SET avatar_url = $1 WHERE user_id = $2 RETURNING avatar_url',
      [avatar_url, userId]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    logger.info('Avatar updated for user:', userId);
    res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (err) {
    logger.error('Error uploading avatar:', err);
    res.status(500).json({ error: err.message });
  }
};
