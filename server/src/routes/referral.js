const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const referralController = require('../controllers/referralController');

// GET /api/referral — Get referral info
router.get('/', protect, referralController.getReferral);

// POST /api/referral/create — Generate a referral code
router.post('/create', protect, referralController.createReferral);

// POST /api/referral/track — Record a referral during signup
router.post('/track', referralController.trackReferral);

// GET /api/referral/leaderboard — Top referrers
router.get('/leaderboard', referralController.getLeaderboard);

module.exports = router;
