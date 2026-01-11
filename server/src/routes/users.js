const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const optimizeLocalImages = require('../middleware/imageOptimizer');

// Profile Management
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, userController.updateProfile);

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [req.params.id]);
    if (!result.rows || result.rows.length === 0) {
      console.error('❌ No user found for id', req.params.id);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Error fetching user profile:', err);
    res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

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

module.exports = router;
