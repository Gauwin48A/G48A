const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middleware/auth");
const analyticsController = require("../controllers/analyticsController");

/**
 * @route POST /device - Save device info (optional auth)
 * @route POST /client-error - Log client-side errors (optional auth)
 * @route POST /client-event - Log client-side events (optional auth)
 */
router.post("/device", optionalAuth, analyticsController.saveDeviceInfo);
router.post("/client-error", optionalAuth, analyticsController.saveClientError);
router.post("/client-event", optionalAuth, analyticsController.saveClientEvent);

/** Protected analytics routes - require authentication */
router.use(protect);

/**
 * @route GET /seller - Get seller analytics
 * @route GET /posts - Get post performance metrics
 * @route GET /categories - Get category breakdown
 * @route GET /devices/summary - Get device usage summary
 */
router.get("/seller", analyticsController.getSellerAnalytics);
router.get("/posts", analyticsController.getPostPerformance);
router.get("/categories", analyticsController.getCategoryBreakdown);
router.get("/devices/summary", analyticsController.getDeviceSummary);

module.exports = router;
