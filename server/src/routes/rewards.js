const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const rewardsController = require('../controllers/rewardsController');
const rewardController = require('../controllers/rewardController');

router.use(protect);

// GET /api/rewards?userId=X
// Returns full rewards data with user profile, rank, and referral chain
router.get('/', rewardsController.getRewards);

// GET /api/rewards/log?userId=X
// Returns reward history/log entries
router.get('/log', rewardsController.getRewardLog);

// Protected: Get my rewards summary
router.get('/my', rewardController.getMyRewards);

// Protected: Redeem rewards for credits
router.post('/redeem', rewardController.redeemRewards);

// Legacy endpoint for backwards compatibility
router.get('/by-user', rewardsController.getRewardsByUser);

// GET /api/rewards/user/:userId
router.get('/user/:userId', rewardsController.getRewardsByUser);

module.exports = router;
