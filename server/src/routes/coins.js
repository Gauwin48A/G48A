const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const { publicReadSlowDown, rewardRedeemLimiter } = require("../middleware/rateLimiter");
const coinController = require("../controllers/coinController");

router.get("/balance", authenticateToken, coinController.getBalance);
router.get("/history", authenticateToken, coinController.getCoinHistory);
router.get(
  "/rewards-config",
  publicReadSlowDown,
  coinController.getRewardsConfig,
); // public — no auth needed
router.post("/redeem", authenticateToken, rewardRedeemLimiter, coinController.redeemCoins);
router.get("/engagement", authenticateToken, coinController.getEngagementStatus);
router.post("/daily-checkin", authenticateToken, rewardRedeemLimiter, coinController.claimDailyCheckIn);
router.post("/spin", authenticateToken, rewardRedeemLimiter, coinController.spinWheel);
router.post("/store-redeem", authenticateToken, rewardRedeemLimiter, coinController.redeemStoreReward);
router.post("/referral-milestones", authenticateToken, rewardRedeemLimiter, coinController.claimReferralMilestones);
router.post("/daily-code", authenticateToken, rewardRedeemLimiter, coinController.claimDailySecretCode);

module.exports = router;
