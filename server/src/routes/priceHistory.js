/**
 * Price History Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const priceHistoryController = require('../controllers/priceHistoryController');

// Record price change (usually called internally when updating post)
router.post('/record', protect, priceHistoryController.recordPriceChange);

// Get price history for a post
router.get('/post/:postId', priceHistoryController.getPriceHistory);

// Get posts with recent price drops
router.get('/drops', priceHistoryController.getRecentPriceDrops);

module.exports = router;
