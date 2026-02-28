const pool = require('../config/db');
const crypto = require('crypto');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const REFERRAL_CODE_MAX_ATTEMPTS = 5;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function runClientQuery(client, text, values = []) {
  return client.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function isAdmin(req) {
  const role = parseOptionalString(req.user?.role)?.toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

function generateReferralSuffix(length = 5) {
  const max = 36 ** length;
  return crypto.randomInt(0, max).toString(36).toUpperCase().padStart(length, '0');
}

function isUniqueViolation(error) {
  return String(error?.code || '') === '23505';
}

// GET /api/referral — Get referral info for a user
exports.getReferral = async (req, res) => {
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const requestedUserId = parseOptionalString(req.query.userId) || authenticatedUserId;
  if (requestedUserId !== authenticatedUserId && !isAdmin(req)) {
    return res.status(403).json({ error: 'Cannot access another user referral info' });
  }

  try {
    const result = await runQuery(
      `SELECT u.user_id, u.referral_code, u.referred_by,
              (SELECT COUNT(*) FROM users WHERE referred_by = u.user_id) as referral_count
       FROM users u WHERE u.user_id = $1`, [String(requestedUserId)]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Get referral error:', err);
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
};

// POST /api/referral/create — Generate a referral code for the user
exports.createReferral = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  try {
    const normalizedUserId = String(userId);
    const userResult = await runQuery(
      'SELECT username, referral_code FROM users WHERE user_id = $1 LIMIT 1',
      [normalizedUserId]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingCode = userResult.rows[0]?.referral_code;
    if (existingCode) {
      return res.json({ referralCode: existingCode, message: 'Referral code already exists' });
    }

    const username = userResult.rows[0]?.username || 'U';
    const prefix = username.substring(0, 3).toUpperCase();
    for (let attempt = 0; attempt < REFERRAL_CODE_MAX_ATTEMPTS; attempt += 1) {
      const code = `${prefix}-${generateReferralSuffix(5)}`;
      try {
        const updateResult = await runQuery(
          'UPDATE users SET referral_code = $1 WHERE user_id = $2 AND referral_code IS NULL RETURNING referral_code',
          [code, normalizedUserId]
        );
        if (updateResult.rows[0]?.referral_code) {
          return res.status(201).json({ referralCode: updateResult.rows[0].referral_code, message: 'Referral code generated' });
        }

        const latest = await runQuery('SELECT referral_code FROM users WHERE user_id = $1 LIMIT 1', [normalizedUserId]);
        if (latest.rows[0]?.referral_code) {
          return res.json({ referralCode: latest.rows[0].referral_code, message: 'Referral code already exists' });
        }
      } catch (err) {
        if (isUniqueViolation(err)) {
          continue;
        }
        throw err;
      }
    }

    return res.status(503).json({ error: 'Failed to allocate referral code, please retry' });
  } catch (err) {
    logger.error('Create referral error:', err);
    res.status(500).json({ error: 'Failed to create referral code' });
  }
};

// POST /api/referral/track — Record a referral (used during signup)
exports.trackReferral = async (req, res) => {
  const { referralCode, newUserId } = req.body;

  if (!referralCode || !newUserId) {
    return res.status(400).json({ error: 'referralCode and newUserId required' });
  }

  try {
    const normalizedNewUserId = String(newUserId);
    const normalizedReferralCode = String(referralCode).trim();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const referrer = await runClientQuery(
        client,
        'SELECT user_id FROM users WHERE referral_code = $1 LIMIT 1',
        [normalizedReferralCode]
      );
      if (referrer.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Invalid referral code' });
      }

      const referrerId = String(referrer.rows[0].user_id);

      // Prevent self-referral
      if (referrerId === normalizedNewUserId) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Cannot refer yourself' });
      }

      const updateResult = await runClientQuery(
        client,
        'UPDATE users SET referred_by = $1 WHERE user_id = $2 AND referred_by IS NULL RETURNING user_id',
        [referrerId, normalizedNewUserId]
      );

      if (updateResult.rowCount === 0) {
        const existingResult = await runClientQuery(
          client,
          'SELECT referred_by FROM users WHERE user_id = $1 LIMIT 1',
          [normalizedNewUserId]
        );

        await client.query('ROLLBACK');

        if (existingResult.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const existingReferrer = parseOptionalString(existingResult.rows[0]?.referred_by);
        if (existingReferrer === referrerId) {
          return res.json({ message: 'Referral already tracked', referrerId });
        }

        return res.status(409).json({ error: 'Referral already assigned for this user' });
      }

      await runClientQuery(
        client,
        `
          INSERT INTO reward_log (user_id, action, points, description, created_at)
          VALUES ($1, 'referral_bonus', 50, 'Direct referral bonus', NOW())
        `,
        [referrerId]
      );

      await runClientQuery(
        client,
        `
          INSERT INTO rewards (user_id, points, tier)
          VALUES ($1, 50, 'Bronze')
          ON CONFLICT (user_id) DO UPDATE SET points = rewards.points + 50
        `,
        [referrerId]
      );

      await client.query('COMMIT');
      return res.json({ message: 'Referral tracked successfully', referrerId });
    } catch (innerErr) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // noop
      }
      throw innerErr;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error('Track referral error:', err);
    res.status(500).json({ error: 'Failed to track referral' });
  }
};

// GET /api/referral/leaderboard — Top referrers (monthly)
exports.getLeaderboard = async (req, res) => {
  const { period = 'monthly', limit = 20 } = req.query;

  try {
    const normalizedLimit = parsePositiveInt(limit, 20, 100);
    let interval = "INTERVAL '30 days'";
    if (period === 'weekly') interval = "INTERVAL '7 days'";
    else if (period === 'all') interval = "INTERVAL '100 years'";

    const result = await runQuery(`
      SELECT u.user_id, u.username, p.full_name, p.avatar_url,
             COUNT(ref.user_id) as referral_count,
             COALESCE(r.points, 0) as total_points
      FROM users u
      LEFT JOIN profiles p ON u.user_id = p.user_id
      LEFT JOIN users ref ON ref.referred_by = u.user_id AND ref.created_at > NOW() - ${interval}
      LEFT JOIN rewards r ON u.user_id = r.user_id
      WHERE u.referral_code IS NOT NULL
      GROUP BY u.user_id, u.username, p.full_name, p.avatar_url, r.points
      HAVING COUNT(ref.user_id) > 0
      ORDER BY referral_count DESC
      LIMIT $1
    `, [normalizedLimit]);

    res.json({ leaderboard: result.rows, period });
  } catch (err) {
    logger.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
