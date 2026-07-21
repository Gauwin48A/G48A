const router = require("express").Router();
const { authenticateToken } = require("../middleware/security");
const subscriptionController = require("../controllers/subscriptionController");

// Public - list plans
router.get("/plans", subscriptionController.getPlans);

// Protected - user subscription management
router.get("/my", authenticateToken, subscriptionController.getMySubscription);

module.exports = router;
