const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const { requireAdmin } = require("../middleware/rbac");
const subscriptionController = require("../controllers/subscriptionController");

// Public - list plans
router.get("/plans", subscriptionController.getPlans);

// Public - dynamic pricing (time-of-day discounts)
const withPlanName = (planName) => (req, res, next) => {
  req.params = { ...req.params, planName };
  return subscriptionController.getDynamicPricing(req, res, next);
};
router.get("/plans/silver/price", withPlanName("silver"));
router.get("/plans/:planName/price", subscriptionController.getDynamicPricing);
router.get("/comparison", subscriptionController.getComparison);

// Protected - user subscription management
router.get("/my", authenticateToken, subscriptionController.getMySubscription);
router.get("/history", authenticateToken, subscriptionController.getHistory);
router.post(
  "/subscribe",
  authenticateToken,
  requireAdmin,
  subscriptionController.subscribe,
);
router.get("/quota", authenticateToken, subscriptionController.getQuotaStatus);
router.post("/trial", authenticateToken, subscriptionController.activateTrial);
router.post("/:subscriptionId/cancel", authenticateToken, subscriptionController.cancelSubscription);

// Protected - upsell message for current user
router.get("/upsell", authenticateToken, subscriptionController.getUpsellMessage);

module.exports = router;
