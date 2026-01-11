const pool = require('../config/db');
const { getTierRules, getSubscriptionExpiry } = require('../config/tierRules');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PROTOCOL: VALUE HIERARCHY - Tier Upgrade
 * POST /api/users/upgrade-tier
 * 
 * In production: This would be called AFTER successful payment via Razorpay/Stripe webhook
 * For MVP: Simulates instant activation
 */
exports.upgradeTier = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { tier } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!tier || !['basic', 'silver', 'premium'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier. Must be: basic, silver, or premium' });
    }

    const rules = getTierRules(tier);

    let updateData = {};

    if (tier === 'premium') {
      // Premium: 1 year subscription
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      updateData = {
        tier: 'premium',
        subscription_expiry: expiry.toISOString()
      };
    } else if (tier === 'silver') {
      // Silver: 6 months subscription
      const expiry = new Date();
      expiry.setMonth(expiry.getMonth() + 6);
      updateData = {
        tier: 'silver',
        subscription_expiry: expiry.toISOString()
      };
    } else {
      // Basic: Add 1 post credit
      const currentCredits = await pool.query(
        'SELECT post_credits FROM users WHERE user_id = $1',
        [userId]
      );
      const credits = (currentCredits.rows[0]?.post_credits || 0) + 1;
      updateData = {
        tier: 'basic',
        post_credits: credits
      };
    }

    // Update user tier
    const result = await pool.query(
      `UPDATE users SET tier = $1, subscription_expiry = $2, post_credits = COALESCE($3, post_credits)
       WHERE user_id = $4
       RETURNING user_id, tier, subscription_expiry, post_credits`,
      [
        updateData.tier,
        updateData.subscription_expiry || null,
        updateData.post_credits || null,
        userId
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`[Tier] User ${userId} upgraded to ${tier.toUpperCase()}`);

    // Send upgrade notification
    try {
      const { sendUpgradeNotification, sendRenewalSuccessNotification } = require('../services/subscriptionNotifications');
      if (tier !== 'basic') {
        await sendRenewalSuccessNotification(userId, tier, updateData.subscription_expiry);
      }
    } catch (notifErr) {
      console.error('[Tier] Notification error (non-fatal):', notifErr.message);
    }

    res.json({
      success: true,
      message: `Successfully activated ${tier.toUpperCase()} plan!`,
      user: result.rows[0],
      tier: tier,
      features: rules.features,
      expiresAt: updateData.subscription_expiry || null
    });

  } catch (err) {
    console.error('[Tier] Upgrade error:', err);
    res.status(500).json({ error: 'Failed to upgrade tier' });
  }
};

/**
 * Get user's current tier status
 * GET /api/users/tier-status
 */
exports.getTierStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.query.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(
      `SELECT tier, subscription_expiry, post_credits FROM users WHERE user_id = $1`,
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const tier = user.tier || 'basic';
    const rules = getTierRules(tier);

    // Check if subscription is expired
    let isActive = true;
    if (tier !== 'basic' && user.subscription_expiry) {
      isActive = new Date(user.subscription_expiry) > new Date();
    }

    res.json({
      tier: tier,
      tierName: rules.name,
      isActive: isActive,
      subscriptionExpiry: user.subscription_expiry,
      postCredits: user.post_credits || 0,
      features: rules.features,
      visibilityDays: rules.visibilityDays,
      dailyLimit: rules.dailyLimit,
      priority: rules.priority
    });

  } catch (err) {
    console.error('[Tier] Status error:', err);
    res.status(500).json({ error: 'Failed to get tier status' });
  }
};

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * GET /api/users/profile
 * Get user's profile information
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id || req.query.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await pool.query(`
      SELECT 
        u.user_id, u.email, u.tier, u.subscription_expiry, u.post_credits,
        p.full_name, p.bio, p.avatar_url, p.phone, p.location, p.created_at,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.user_id AND status = 'active') as active_posts,
        (SELECT COUNT(*) FROM posts WHERE user_id = u.user_id AND status = 'sold') as sold_posts
      FROM users u
      LEFT JOIN profiles p ON u.user_id = p.user_id
      WHERE u.user_id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      profile: result.rows[0]
    });

  } catch (err) {
    console.error('[Profile] Get error:', err);
    res.status(500).json({ error: 'Failed to get profile' });
  }
};

/**
 * PUT /api/users/profile
 * Update user's profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { full_name, bio, avatar_url, phone, location } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if profile exists
    const existingProfile = await pool.query(
      'SELECT user_id FROM profiles WHERE user_id = $1',
      [userId]
    );

    if (existingProfile.rows.length === 0) {
      // Create profile if doesn't exist
      await pool.query(
        `INSERT INTO profiles (user_id, full_name, bio, avatar_url, phone, location, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [userId, full_name || 'User', bio || null, avatar_url || null, phone || null, location || null]
      );
    } else {
      // Update existing profile
      await pool.query(
        `UPDATE profiles SET 
           full_name = COALESCE($1, full_name),
           bio = COALESCE($2, bio),
           avatar_url = COALESCE($3, avatar_url),
           phone = COALESCE($4, phone),
           location = COALESCE($5, location),
           updated_at = NOW()
         WHERE user_id = $6`,
        [full_name, bio, avatar_url, phone, location, userId]
      );
    }

    // Fetch updated profile
    const result = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );

    console.log(`[Profile] Updated for user ${userId}`);

    res.json({
      success: true,
      message: 'Profile updated',
      profile: result.rows[0]
    });

  } catch (err) {
    console.error('[Profile] Update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// ... (existing functions)

/**
 * SUBMIT KYC
 * Securely receive ID proofs and update status
 */
const { getImageUrl } = require('../middleware/upload');

exports.submitKYC = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { aadhaar_number, pan_number } = req.body;

    // 1. Validation
    if (!aadhaar_number || !pan_number) {
      return res.status(400).json({ error: 'Aadhaar and PAN numbers are required' });
    }

    // 2. Process Files
    // Uses 'kyc_docs' field from upload middleware
    const files = req.files || {};
    const kycDocuments = {};

    // Handle Front Image
    if (files['kyc_front'] && files['kyc_front'][0]) {
      kycDocuments.front = getImageUrl(files['kyc_front'][0]);
    }

    // Handle Back Image
    if (files['kyc_back'] && files['kyc_back'][0]) {
      kycDocuments.back = getImageUrl(files['kyc_back'][0]);
    }

    if (!kycDocuments.front) {
      return res.status(400).json({ error: 'Front ID image is required' });
    }

    // 3. Update Database
    // Set status to PENDING
    const result = await pool.query(
      `UPDATE users 
       SET aadhaar_number = $1, 
           pan_number = $2, 
           kyc_documents = $3, 
           aadhaar_status = 'PENDING',
           rejection_reason = NULL 
       WHERE user_id = $4 
       RETURNING aadhaar_status, kyc_documents`,
      [aadhaar_number, pan_number, JSON.stringify(kycDocuments), userId]
    );

    res.json({
      success: true,
      message: 'KYC Submitted successfully. Verification pending.',
      status: result.rows[0].aadhaar_status
    });

  } catch (err) {
    console.error('[KYC] Submission failed:', err);
    res.status(500).json({ error: 'KYC Submission failed', details: err.message });
  }
};

exports.getKYCStatus = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const result = await pool.query(
      `SELECT aadhaar_status, rejection_reason, aadhaar_number, pan_number, kyc_documents 
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });

    // Mask sensitive numbers for display
    const data = result.rows[0];
    const maskedAadhaar = data.aadhaar_number ? 'XXXX-XXXX-' + data.aadhaar_number.slice(-4) : null;
    const maskedPan = data.pan_number ? 'XXXXX' + data.pan_number.slice(-4) : null;

    res.json({
      status: data.aadhaar_status,
      rejection_reason: data.rejection_reason,
      aadhaar_number: maskedAadhaar,
      pan_number: maskedPan,
      documents: data.kyc_documents
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch KYC status' });
  }
};
