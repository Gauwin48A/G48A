const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');

// GET /api/rewards?userId=1
router.get('/', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    logger.warn('Rewards request missing userId');
    return res.status(400).json({ code: 400, message: 'userId required' });
  }
  try {
    // Get user data
    const userResult = await pool.query(
      `SELECT id, name, email, referral_code, created_at FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.rows[0];

    // Try to get referrals - may not exist yet
    let referrals = [];
    try {
      const referralResult = await pool.query(
        `SELECT u.id, u.name, r.created_at as join_date
         FROM referrals r 
         JOIN users u ON u.id = r.referred_user_id 
         WHERE r.referrer_id = $1 
         ORDER BY r.created_at DESC`,
        [userId]
      );
      referrals = referralResult.rows;
    } catch (refErr) {
      // Referrals table might not exist - continue with empty array
      logger.info('Referrals query failed, using empty array:', refErr.message);
    }

    // Build response in the format the frontend expects
    res.json({
      user: {
        id: userData.id,
        name: userData.name || 'User',
        referralCode: userData.referral_code || `REF${userData.id}`,
        level: 1,
        rank: 'Bronze',
        totalCoins: 0,
        streak: 0,
        xpCurrent: 0,
        xpRequired: 100,
        dailySecretCode: `DSC${Date.now().toString(36).toUpperCase().slice(-6)}`,
        totalReferrals: referrals.length,
        successfulRefs: referrals.length
      },
      referralChain: referrals.map((r, idx) => ({
        id: r.id,
        name: r.name || `User ${r.id}`,
        coins: 10,
        joinDate: r.join_date ? new Date(r.join_date).toLocaleDateString() : 'Unknown'
      }))
    });
  } catch (err) {
    logger.error('Error fetching rewards:', err);
    res.status(500).json({ code: 500, message: 'Failed to fetch rewards', details: err.message });
  }
});

module.exports = router;

