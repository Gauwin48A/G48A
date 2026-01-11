/**
 * Analytics Routes
 */
const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// ============================================
// DEVICE ANALYTICS (No auth - captures all visitors)
// ============================================
router.post('/device', optionalAuth, analyticsController.saveDeviceInfo);

// ============================================
// SELLER ANALYTICS (Auth required)
// ============================================
router.use(protect);

// Get seller analytics overview
router.get('/seller', analyticsController.getSellerAnalytics);

// Get post performance
router.get('/posts', analyticsController.getPostPerformance);

// Get category breakdown
router.get('/categories', analyticsController.getCategoryBreakdown);

// Get device summary (admin only)
router.get('/devices/summary', analyticsController.getDeviceSummary);

module.exports = router;
