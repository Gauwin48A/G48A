const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const subscriptionController = require("../controllers/subscriptionController");

// Public - list plans
router.get("/plans", subscriptionController.getPlans);

// Public - dynamic pricing (time-of-day discounts)
router.get("/plans/:planName/price", subscriptionController.getDynamicPricing);

// Protected - user subscription management
router.get("/my", authenticateToken, subscriptionController.getMySubscription);
router.post("/subscribe", authenticateToken, subscriptionController.subscribe);
router.get("/quota", authenticateToken, subscriptionController.getQuotaStatus);
router.post("/trial", authenticateToken, subscriptionController.activateTrial);

// Protected - upsell message for current user
router.get("/upsell", authenticateToken, subscriptionController.getUpsellMessage);

module.exports = router;
