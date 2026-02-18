const pool = require('../config/db');

// GET /api/referral — Get referral info for a user
exports.getReferral = async (req, res) => {
  const userId = req.query.userId || req.user?.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const result = await pool.query(
      `SELECT u.user_id, u.referral_code, u.referred_by,
              (SELECT COUNT(*) FROM users WHERE referred_by = u.user_id) as referral_count
       FROM users u WHERE u.user_id = $1`, [userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get referral error:', err);
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
};

// POST /api/referral/create — Generate a referral code for the user
exports.createReferral = async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  try {
    // Check if user already has referral code
    const existing = await pool.query('SELECT referral_code FROM users WHERE user_id = $1', [userId]);
    if (existing.rows[0]?.referral_code) {
      return res.json({ referralCode: existing.rows[0].referral_code, message: 'Referral code already exists' });
    }

    // Generate unique code
    const username = (await pool.query('SELECT username FROM users WHERE user_id = $1', [userId])).rows[0]?.username || 'U';
    const prefix = username.substring(0, 3).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const code = `${prefix}-${random}`;

    await pool.query('UPDATE users SET referral_code = $1 WHERE user_id = $2', [code, userId]);

    res.status(201).json({ referralCode: code, message: 'Referral code generated' });
  } catch (err) {
    console.error('Create referral error:', err);
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
    // Find referrer by code
    const referrer = await pool.query('SELECT user_id FROM users WHERE referral_code = $1', [referralCode]);
    if (referrer.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    const referrerId = referrer.rows[0].user_id;

    // Prevent self-referral
    if (referrerId === newUserId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }

    // Mark the new user as referred
    await pool.query('UPDATE users SET referred_by = $1 WHERE user_id = $2', [referrerId, newUserId]);

    // Award referral bonus to referrer
    await pool.query(`
      INSERT INTO reward_log (user_id, action, points, description, created_at)
      VALUES ($1, 'referral_bonus', 50, 'Direct referral bonus', NOW())
    `, [referrerId]);

    // Try to update rewards table
    await pool.query(`
      INSERT INTO rewards (user_id, points, tier)
      VALUES ($1, 50, 'Bronze')
      ON CONFLICT (user_id) DO UPDATE SET points = rewards.points + 50
    `, [referrerId]);

    res.json({ message: 'Referral tracked successfully', referrerId });
  } catch (err) {
    console.error('Track referral error:', err);
    res.status(500).json({ error: 'Failed to track referral' });
  }
};

// GET /api/referral/leaderboard — Top referrers (monthly)
exports.getLeaderboard = async (req, res) => {
  const { period = 'monthly', limit = 20 } = req.query;

  try {
    let interval = "INTERVAL '30 days'";
    if (period === 'weekly') interval = "INTERVAL '7 days'";
    else if (period === 'all') interval = "INTERVAL '100 years'";

    const result = await pool.query(`
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
    `, [parseInt(limit)]);

    res.json({ leaderboard: result.rows, period });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
};
