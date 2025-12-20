const express = require('express');
const router = express.Router();
const rewardsController = require('../controllers/rewardsController');

// GET /api/rewards?userId=X
// Returns full rewards data with user profile, rank, and referral chain
router.get('/', rewardsController.getRewards);

// GET /api/rewards/log?userId=X
// Returns reward history/log entries
router.get('/log', rewardsController.getRewardLog);

// Legacy endpoint for backwards compatibility
router.get('/by-user', rewardsController.getRewardsByUser);

module.exports = router;
