const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const coinController = require("../controllers/coinController");

router.get("/balance", authenticateToken, coinController.getBalance);
router.get("/history", authenticateToken, coinController.getCoinHistory);
router.post("/redeem", authenticateToken, coinController.redeemCoins);
router.get("/engagement", authenticateToken, coinController.getEngagementStatus);
router.post("/daily-checkin", authenticateToken, coinController.claimDailyCheckIn);
router.post("/spin", authenticateToken, coinController.spinWheel);
router.post("/scratch", authenticateToken, coinController.claimScratchCard);
router.post("/store-redeem", authenticateToken, coinController.redeemStoreReward);
router.post("/referral-milestones", authenticateToken, coinController.claimReferralMilestones);

module.exports = router;
