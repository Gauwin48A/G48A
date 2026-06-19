const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { transactionLimiter } = require("../middleware/rateLimiter");
const priceAlertsController = require("../controllers/priceAlertsController");

/**
 * @route Price Alert routes
 * @description Manages user subscriptions to price-drop alerts on posts
 */

/**
 * Middleware to restrict access to admin/superadmin users.
 */
function requireAdminRole(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "admin" && role !== "superadmin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  return next();
}

/** @route POST /subscribe - Subscribe to price alerts for a post (rate limited) */
router.post("/subscribe", protect, transactionLimiter, priceAlertsController.subscribeAlert);

/** @route GET / - Get all active price alerts for the authenticated user */
router.get("/", protect, priceAlertsController.getAlerts);

/** @route PUT /unsubscribe/:postId - Unsubscribe from alerts for a post */
router.put("/unsubscribe/:postId", protect, priceAlertsController.unsubscribeAlert);

/** @route DELETE /:postId - Delete a price alert */
router.delete("/:postId", protect, priceAlertsController.deleteAlert);

/** @route GET /check-drops - Admin-only: trigger a check for recent price drops */
router.get("/check-drops", protect, requireAdminRole, priceAlertsController.checkPriceDrops);

module.exports = router;
