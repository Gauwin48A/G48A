/**
 * Analytics Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

router.use(protect);

// Get seller analytics overview
router.get('/seller', analyticsController.getSellerAnalytics);

// Get post performance
router.get('/posts', analyticsController.getPostPerformance);

// Get category breakdown
router.get('/categories', analyticsController.getCategoryBreakdown);

module.exports = router;
