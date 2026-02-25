const pool = require('../config/db');
const logger = require('../utils/logger');

const toInt = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const getAuthenticatedUserId = (req) => toInt(req.user?.userId ?? req.user?.id);

const requireSameUser = (requestedUserId, authenticatedUserId, res) => {
  if (!authenticatedUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  if (requestedUserId !== authenticatedUserId) {
    logger.warn(
      `SECURITY: IDOR attempt - User ${authenticatedUserId} tried to access/modify user ${requestedUserId}`
    );
    res.status(403).json({
      error: 'You cannot access another user\'s data',
      code: 'FORBIDDEN'
    });
    return false;
  }

  return true;
};

exports.getProfile = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = toInt(req.query.userId ?? authenticatedUserId);

    if (!requestedUserId) {
      logger.warn('Profile request missing userId');
      return res.status(400).json({ code: 400, message: 'userId required', fallback: null });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    const result = await pool.query(
      `SELECT
         u.user_id,
         u.name AS user_name,
         u.username,
         u.email,
         u.role,
         u.created_at,
         p.profile_id,
         p.full_name,
         p.phone,
         p.address,
         p.avatar_url,
         p.bio,
         COALESCE(p.verified, false) AS verified
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.user_id
       WHERE u.user_id = $1
       LIMIT 1`,
      [requestedUserId]
    );

    if (!result.rows || result.rows.length === 0) {
      logger.error('User not found for profile request:', requestedUserId);
      return res.status(404).json({ code: 404, message: 'User not found', fallback: null });
    }

    const row = result.rows[0];

    // Self-heal: ensure profile row exists for accounts created before profile upsert.
    if (!row.profile_id) {
      await pool.query(
        `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, verified)
         VALUES ($1, $2, $3, $4, $5, $6, false)
         ON CONFLICT (user_id) DO NOTHING`,
        [requestedUserId, row.user_name || row.username || 'User', null, null, null, null]
      );
    }

    const displayName = row.full_name || row.user_name || row.username || 'User';

    res.json({
      user_id: row.user_id,
      full_name: displayName,
      name: displayName,
      phone: row.phone || '',
      address: row.address || '',
      avatar_url: row.avatar_url || '',
      bio: row.bio || '',
      verified: Boolean(row.verified),
      email: row.email || '',
      role: row.role || 'user',
      created_at: row.created_at
    });
  } catch (err) {
    logger.error('Error fetching profile:', err);
    res.status(500).json({ code: 500, message: 'Failed to fetch profile', details: err.message, fallback: null });
  }
};

// Update profile endpoint
// SECURITY FIX: Added authorization check to prevent IDOR vulnerability
exports.updateProfile = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = toInt(req.body.userId ?? authenticatedUserId);
    const { full_name, phone, address, avatar_url, bio } = req.body;

    if (!requestedUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    const result = await pool.query(
      `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
       SET full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
           phone = COALESCE(EXCLUDED.phone, profiles.phone),
           address = COALESCE(EXCLUDED.address, profiles.address),
           avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
           bio = COALESCE(EXCLUDED.bio, profiles.bio)
       RETURNING *`,
      [
        requestedUserId,
        full_name || null,
        phone || null,
        address || null,
        avatar_url || null,
        bio || null
      ]
    );

    if (!result.rows || result.rows.length === 0) {
      logger.error('Profile upsert returned no rows for user:', requestedUserId);
      return res.status(500).json({ error: 'Failed to update profile', fallback: null });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating profile:', err);
    res.status(500).json({ error: err.message, fallback: null });
  }
};

// GET /api/profile/preferences?userId=1
// SECURITY FIX: Added authorization check to prevent IDOR vulnerability
exports.getPreferences = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = toInt(req.query.userId ?? authenticatedUserId);

    if (!requestedUserId) {
      logger.warn('Preferences request missing userId');
      return res.status(400).json({ code: 400, message: 'userId required', fallback: null });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    const result = await pool.query('SELECT * FROM preferences WHERE user_id = $1', [requestedUserId]);

    if (!result.rows || result.rows.length === 0) {
      // Return empty defaults instead of 404 to prevent frontend error
      logger.info('No preferences found for user, returning defaults:', requestedUserId);
      return res.json({
        userId: requestedUserId,
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
// SECURITY FIX: Added authorization check to prevent IDOR vulnerability
exports.updatePreferences = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = toInt(req.body.userId ?? authenticatedUserId);
    const { location, minPrice, maxPrice, categories } = req.body;

    if (!requestedUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    // Ensure categories is properly formatted for PostgreSQL JSONB
    const categoriesJson = JSON.stringify(Array.isArray(categories) ? categories : []);

    logger.info('Saving preferences for user:', requestedUserId, { location, minPrice, maxPrice, categories: categoriesJson });

    // Use UPSERT pattern - insert if not exists, update if exists
    // Note: preferences table has: user_id, location, min_price, max_price, categories, notification_enabled
    const result = await pool.query(
      `INSERT INTO preferences (user_id, location, min_price, max_price, categories)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (user_id)
       DO UPDATE SET location = $2, min_price = $3, max_price = $4, categories = $5::jsonb
       RETURNING *`,
      [requestedUserId, location || '', parseFloat(minPrice) || 0, parseFloat(maxPrice) || 100000, categoriesJson]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Failed to save preferences' });
    }

    logger.info('Preferences saved successfully for user:', requestedUserId);
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating preferences:', err);
    res.status(500).json({ error: err.message });
  }
};



// POST /api/profile/upload-avatar - Handle profile picture upload
exports.uploadAvatar = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = toInt(req.body.userId ?? authenticatedUserId);

    if (!requestedUserId) {
      return res.status(400).json({ error: 'userId required' });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Convert file to base64 data URI for simple storage
    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const avatar_url = `data:${mimeType};base64,${base64}`;

    const result = await pool.query(
      `INSERT INTO profiles (user_id, full_name, avatar_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET avatar_url = EXCLUDED.avatar_url
       RETURNING avatar_url`,
      [requestedUserId, 'User', avatar_url]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to update avatar' });
    }

    logger.info('Avatar updated for user:', requestedUserId);
    res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (err) {
    logger.error('Error uploading avatar:', err);
    res.status(500).json({ error: err.message });
  }
};
