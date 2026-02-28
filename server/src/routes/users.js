const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const optimizeLocalImages = require('../middleware/imageOptimizer');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function isAdmin(req) {
  const role = String(req.user?.role || '').toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

// Profile Management
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, userController.updateProfile);

// PROTOCOL: VALUE HIERARCHY - Tier Management Routes
router.post('/upgrade-tier', protect, userController.upgradeTier);
router.get('/tier-status', protect, userController.getTierStatus);

// ============================================
// KYC ROUTES (Identity Verification)
// ============================================
router.post('/kyc/submit',
  protect,
  upload.fields([{ name: 'kyc_front', maxCount: 1 }, { name: 'kyc_back', maxCount: 1 }]),
  optimizeLocalImages,
  userController.submitKYC
);
router.get('/kyc/status', protect, userController.getKYCStatus);

// GET /api/users/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const requesterId = getAuthenticatedUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const targetUserId = parseOptionalString(req.params.id);
    if (!targetUserId) {
      return res.status(400).json({ error: 'User id is required' });
    }

    if (targetUserId !== requesterId && !isAdmin(req)) {
      return res.status(403).json({ error: 'Not authorized to access this user profile' });
    }

    const result = await runQuery(
      `
        SELECT
          user_id,
          username,
          name,
          email,
          phone_number,
          role,
          tier,
          COALESCE(email_verified, false) AS is_verified,
          created_at,
          updated_at
        FROM users
        WHERE user_id = $1
        LIMIT 1
      `,
      [targetUserId]
    );
    if (!result.rows || result.rows.length === 0) {
      logger.error('No user found for id', req.params.id);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

module.exports = router;

