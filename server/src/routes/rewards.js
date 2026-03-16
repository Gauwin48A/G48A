const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const rewardsController = require("../controllers/rewardsController");
const rewardController = require("../controllers/rewardController");

/** All reward routes require authentication */
router.use(protect);

/** @route GET / - Get rewards overview */
router.get("/", rewardsController.getRewards);

/** @route GET /log - Get reward activity log */
router.get("/log", rewardsController.getRewardLog);

/** @route GET /stream - Stream real-time reward updates (SSE) */
router.get("/stream", rewardsController.streamRewardUpdates);

/** @route GET /my - Get the current user's rewards */
router.get("/my", rewardController.getMyRewards);

/** @route POST /redeem - Redeem accumulated rewards */
router.post("/redeem", rewardController.redeemRewards);

/** @route GET /by-user - Get rewards filtered by user (query param) */
router.get("/by-user", rewardsController.getRewardsByUser);

/** @route GET /user/:userId - Get rewards for a specific user */
router.get("/user/:userId", rewardsController.getRewardsByUser);

module.exports = router;
