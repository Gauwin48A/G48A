const pool = require('../config/db');
const logger = require('../utils/logger');
const cacheService = require('../services/cacheService');

const PROFILE_CACHE_TTL_SECONDS = 60;
const PREFERENCES_CACHE_TTL_SECONDS = 60;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
let preferencesDateColumnAvailablePromise = null;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

async function hasPreferencesDateColumn() {
  if (!preferencesDateColumnAvailablePromise) {
    preferencesDateColumnAvailablePromise = runQuery(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'preferences'
            AND column_name = 'date'
        ) AS available
      `
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((err) => {
        logger.warn('[Profile] Failed to inspect preferences.date column, using created_at fallback', {
          message: err.message
        });
        return false;
      });
  }

  return preferencesDateColumnAvailablePromise;
}

function getPreferencesDateSelectExpression(hasDateColumn, tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  return hasDateColumn ? `${prefix}date` : `${prefix}created_at AS date`;
}

function getScalarValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function parseOptionalString(value) {
  const scalar = getScalarValue(value);
  if (scalar === undefined || scalar === null) return null;
  const normalized = String(scalar).trim();
  return normalized.length ? normalized : null;
}

function parseOptionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeUserId(value) {
  return parseOptionalString(value);
}

function getAuthenticatedUserId(req) {
  return normalizeUserId(req.user?.userId ?? req.user?.id ?? req.user?.user_id);
}

function idsEqual(left, right) {
  if (!left || !right) return false;
  return String(left) === String(right);
}

function requireSameUser(requestedUserId, authenticatedUserId, res) {
  if (!authenticatedUserId) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }

  if (!idsEqual(requestedUserId, authenticatedUserId)) {
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
}

function buildProfileCacheKey(userId) {
  return `profile:${userId}:detail`;
}

function buildPreferencesCacheKey(userId) {
  return `profile:${userId}:preferences`;
}

function invalidateProfileCache(userId) {
  if (!userId) return;
  cacheService.clearPattern(`profile:${userId}:*`);
}

exports.getProfile = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.query.userId ?? authenticatedUserId);

    if (!requestedUserId) {
      logger.warn('Profile request missing userId');
      return res.status(400).json({ code: 400, message: 'userId required', fallback: null });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    const cacheKey = buildProfileCacheKey(requestedUserId);
    if (req.query.refresh === 'true') {
      cacheService.del(cacheKey);
    }

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
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
           LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
           WHERE u.user_id::text = $1
           LIMIT 1`,
          [requestedUserId]
        );

        if (!result.rows?.length) {
          return null;
        }

        const row = result.rows[0];

        // Self-heal: ensure profile row exists for older accounts.
        if (!row.profile_id) {
          await runQuery(
            `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, verified)
             VALUES ($1, $2, $3, $4, $5, $6, false)
             ON CONFLICT (user_id) DO NOTHING`,
            [requestedUserId, row.user_name || row.username || 'User', null, null, null, null]
          );
        }

        const displayName = row.full_name || row.user_name || row.username || 'User';

        return {
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
        };
      },
      PROFILE_CACHE_TTL_SECONDS
    );

    if (!payload) {
      logger.error('User not found for profile request:', requestedUserId);
      return res.status(404).json({ code: 404, message: 'User not found', fallback: null });
    }

    return res.json(payload);
  } catch (err) {
    logger.error('Error fetching profile:', err);
    return res.status(500).json({
      code: 500,
      message: 'Failed to fetch profile',
      details: err.message,
      fallback: null
    });
  }
};

// SECURITY FIX: Added authorization check to prevent IDOR vulnerability
exports.updateProfile = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.body.userId ?? authenticatedUserId);
    const { full_name, phone, address, avatar_url, bio } = req.body;

    if (!requestedUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    const result = await runQuery(
      `INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
           phone = COALESCE(EXCLUDED.phone, profiles.phone),
           address = COALESCE(EXCLUDED.address, profiles.address),
           avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
           bio = COALESCE(EXCLUDED.bio, profiles.bio),
           updated_at = NOW()
       RETURNING
         profile_id,
         user_id,
         full_name,
         phone,
         address,
         avatar_url,
         bio,
         verified,
         created_at,
         updated_at`,
      [
        requestedUserId,
        parseOptionalString(full_name),
        parseOptionalString(phone),
        parseOptionalString(address),
        parseOptionalString(avatar_url),
        parseOptionalString(bio)
      ]
    );

    if (!result.rows?.length) {
      logger.error('Profile upsert returned no rows for user:', requestedUserId);
      return res.status(500).json({ error: 'Failed to update profile', fallback: null });
    }

    invalidateProfileCache(requestedUserId);
    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating profile:', err);
    return res.status(500).json({ error: err.message, fallback: null });
  }
};

// GET /api/profile/preferences?userId=1
// SECURITY FIX: Added authorization check to prevent IDOR vulnerability
exports.getPreferences = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.query.userId ?? authenticatedUserId);
    const hasDateColumn = await hasPreferencesDateColumn();

    if (!requestedUserId) {
      logger.warn('Preferences request missing userId');
      return res.status(400).json({ code: 400, message: 'userId required', fallback: null });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    const cacheKey = buildPreferencesCacheKey(requestedUserId);
    if (req.query.refresh === 'true') {
      cacheService.del(cacheKey);
    }

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `SELECT
             user_id,
             location,
             min_price,
             max_price,
             categories,
             ${getPreferencesDateSelectExpression(hasDateColumn)},
             notification_enabled
           FROM preferences
           WHERE user_id::text = $1
           LIMIT 1`,
          [requestedUserId]
        );

        if (!result.rows?.length) {
          logger.info('No preferences found for user, returning defaults:', requestedUserId);
          return {
            userId: requestedUserId,
            location: '',
            minPrice: 0,
            maxPrice: 100000,
            categories: [],
            date: null
          };
        }

        const pref = result.rows[0];
        return {
          userId: pref.user_id,
          location: pref.location || '',
          minPrice: parseOptionalNumber(pref.min_price) || 0,
          maxPrice: parseOptionalNumber(pref.max_price) || 100000,
          categories: pref.categories || [],
          date: pref.date || null,
          notificationEnabled: pref.notification_enabled
        };
      },
      PREFERENCES_CACHE_TTL_SECONDS
    );

    return res.json(payload);
  } catch (err) {
    logger.error('Error fetching preferences:', err);
    return res.status(500).json({
      code: 500,
      message: 'Failed to fetch preferences',
      details: err.message,
      fallback: null
    });
  }
};

// POST /api/profile/preferences/update
// SECURITY FIX: Added authorization check to prevent IDOR vulnerability
exports.updatePreferences = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.body.userId ?? authenticatedUserId);
    const { location, categories } = req.body;
    const hasDateColumn = await hasPreferencesDateColumn();

    if (!requestedUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    let minPrice = parseOptionalNumber(req.body.minPrice);
    let maxPrice = parseOptionalNumber(req.body.maxPrice);

    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 100000;
    if (minPrice > maxPrice) {
      [minPrice, maxPrice] = [maxPrice, minPrice];
    }

    const categoriesJson = JSON.stringify(Array.isArray(categories) ? categories : []);

    logger.info('Saving preferences for user:', requestedUserId, {
      location,
      minPrice,
      maxPrice,
      categories: categoriesJson
    });

    const result = await runQuery(
      `INSERT INTO preferences (user_id, location, min_price, max_price, categories)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (user_id)
       DO UPDATE SET location = $2, min_price = $3, max_price = $4, categories = $5::jsonb
       RETURNING
         user_id,
         location,
         min_price,
         max_price,
         categories,
         ${getPreferencesDateSelectExpression(hasDateColumn)},
         notification_enabled`,
      [requestedUserId, parseOptionalString(location) || '', minPrice, maxPrice, categoriesJson]
    );

    if (!result.rows?.length) {
      return res.status(404).json({ error: 'Failed to save preferences' });
    }

    logger.info('Preferences saved successfully for user:', requestedUserId);
    invalidateProfileCache(requestedUserId);
    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error updating preferences:', err);
    return res.status(500).json({ error: err.message });
  }
};

// POST /api/profile/upload-avatar - Handle profile picture upload
exports.uploadAvatar = async (req, res) => {
  try {
    const authenticatedUserId = getAuthenticatedUserId(req);
    const requestedUserId = normalizeUserId(req.body.userId ?? authenticatedUserId);

    if (!requestedUserId) {
      return res.status(400).json({ error: 'userId required' });
    }

    if (!requireSameUser(requestedUserId, authenticatedUserId, res)) {
      return;
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const base64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype;
    const avatarUrl = `data:${mimeType};base64,${base64}`;

    const result = await runQuery(
      `INSERT INTO profiles (user_id, full_name, avatar_url, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET avatar_url = EXCLUDED.avatar_url,
           updated_at = NOW()
       RETURNING avatar_url`,
      [requestedUserId, 'User', avatarUrl]
    );

    if (!result.rows?.length) {
      return res.status(500).json({ error: 'Failed to update avatar' });
    }

    logger.info('Avatar updated for user:', requestedUserId);
    invalidateProfileCache(requestedUserId);
    return res.json({ avatar_url: result.rows[0].avatar_url });
  } catch (err) {
    logger.error('Error uploading avatar:', err);
    return res.status(500).json({ error: err.message });
  }
};
