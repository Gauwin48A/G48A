const pool = require('../config/db');
const logger = require('../utils/logger');

// Generate unique referral code
const generateReferralCode = (userId, username) => {
  const prefix = (username || 'U').substring(0, 3).toUpperCase();
  const suffix = userId.toString().padStart(4, '0');
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${prefix}${suffix}${random}`;
};

// Generate daily secret code (changes daily)
const generateDailySecretCode = (userId) => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}${today.getMonth()}${today.getDate()}`;
  const hash = (parseInt(dateStr) + userId * 7) % 9000 + 1000;
  return `SEC-${hash}`;
};

// Calculate referral chain points (A→B→C→D...)
// Direct referral (A→B): A gets 50 points
// Indirect referral (A→B→C): A gets 10 points for each person under B
const calculateChainPoints = async (userId) => {
  let directPoints = 0;
  let indirectPoints = 0;
  let directReferrals = [];
  let indirectReferrals = [];

  try {
    // Get direct referrals (people who used this user's code)
    const directRes = await pool.query(
      `SELECT u.user_id, u.username, u.created_at, p.full_name 
       FROM users u 
       LEFT JOIN profiles p ON u.user_id = p.user_id
       WHERE u.referred_by = $1`,
      [userId]
    );

    directReferrals = directRes.rows;
    directPoints = directReferrals.length * 50; // 50 points per direct referral

    // Get indirect referrals (chain: people referred by my referrals, unlimited depth)
    // Using recursive CTE to traverse the chain
    const indirectRes = await pool.query(
      `WITH RECURSIVE referral_chain AS (
        -- Base: direct referrals
        SELECT user_id, username, referred_by, 1 as depth, created_at
        FROM users WHERE referred_by = $1
        
        UNION ALL
        
        -- Recursive: referrals of referrals (unlimited depth, but limit to 10 levels for safety)
        SELECT u.user_id, u.username, u.referred_by, rc.depth + 1, u.created_at
        FROM users u
        INNER JOIN referral_chain rc ON u.referred_by = rc.user_id
        WHERE rc.depth < 10
      )
      SELECT rc.user_id, rc.username, rc.depth, rc.created_at, p.full_name
      FROM referral_chain rc
      LEFT JOIN profiles p ON rc.user_id = p.user_id
      WHERE rc.depth > 1  -- Exclude direct referrals (depth 1)
      ORDER BY rc.depth, rc.created_at`,
      [userId]
    );

    indirectReferrals = indirectRes.rows;
    indirectPoints = indirectReferrals.length * 10; // 10 points per indirect referral

  } catch (err) {
    logger.error('Error calculating chain points:', err);
  }

  return {
    directReferrals,
    indirectReferrals,
    directPoints,
    indirectPoints,
    totalChainPoints: directPoints + indirectPoints
  };
};

exports.getRewardsByUser = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    // Get user and rewards data - JOIN profiles to get full_name for display
    const [userRes, rewardsRes] = await Promise.all([
      pool.query(`
        SELECT u.user_id, u.username, u.referral_code, p.full_name 
        FROM users u 
        LEFT JOIN profiles p ON u.user_id = p.user_id 
        WHERE u.user_id = $1
      `, [userId]),
      pool.query('SELECT points, tier FROM rewards WHERE user_id = $1', [userId])
    ]);

    const user = userRes.rows[0] || { username: 'Unknown', referral_code: null, full_name: null };
    const rewardsData = rewardsRes.rows[0] || { points: 0, tier: 'Bronze' };

    // Use full_name if available, otherwise fall back to username
    const displayName = user.full_name || user.username || 'Unknown User';

    // Calculate chain referral points
    const chainData = await calculateChainPoints(userId);

    // Total points = saved points + chain points
    const totalPoints = (rewardsData.points || 0) + chainData.totalChainPoints;

    // Dynamic rank based on total points
    let rank = 'Bronze';
    if (totalPoints >= 5000) rank = 'Platinum';
    else if (totalPoints >= 2000) rank = 'Gold';
    else if (totalPoints >= 500) rank = 'Silver';

    // Generate referral code if not exists
    let referralCode = user.referral_code;
    if (!referralCode) {
      referralCode = generateReferralCode(userId, user.username);
      // Update user with new referral code
      await pool.query('UPDATE users SET referral_code = $1 WHERE user_id = $2', [referralCode, userId]);
    }

    // Format referral chain for display
    const referralChain = [
      ...chainData.directReferrals.map((r, i) => ({
        id: r.user_id,
        name: r.full_name || r.username,
        coins: 50, // Direct referral bonus
        type: 'direct',
        joinDate: new Date(r.created_at).toLocaleDateString()
      })),
      ...chainData.indirectReferrals.map((r, i) => ({
        id: r.user_id,
        name: r.full_name || r.username,
        coins: 10, // Indirect referral bonus
        type: 'indirect',
        depth: r.depth,
        joinDate: new Date(r.created_at).toLocaleDateString()
      }))
    ];

    res.json({
      user: {
        id: userId,
        name: displayName,  // Use full_name from profiles, not generic username
        rank: rank,
        level: Math.floor(totalPoints / 100) + 1,
        xpCurrent: totalPoints % 100,
        xpRequired: 100,
        referralCode: referralCode,
        totalReferrals: chainData.directReferrals.length + chainData.indirectReferrals.length,
        directReferrals: chainData.directReferrals.length,
        indirectReferrals: chainData.indirectReferrals.length,
        dailySecretCode: generateDailySecretCode(parseInt(userId)),
        totalCoins: totalPoints,
        directPoints: chainData.directPoints,
        indirectPoints: chainData.indirectPoints,
        streak: 1,
        successfulRefs: chainData.directReferrals.length
      },
      referralChain
    });

  } catch (err) {
    logger.error('Rewards Controller Error:', err);
    res.status(200).json({
      user: { rank: 'Bronze', totalCoins: 0, name: 'Error Loading', referralCode: 'ERROR' },
      referralChain: []
    });
  }
};

// Alias for route compatibility
exports.getRewards = exports.getRewardsByUser;

// Reward log endpoint
exports.getRewardLog = async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json([]);

  try {
    const result = await pool.query(
      `SELECT * FROM reward_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.json([]);
  }
};

