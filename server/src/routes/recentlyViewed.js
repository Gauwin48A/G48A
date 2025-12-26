/**
 * Recently Viewed Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const recentlyViewedController = require('../controllers/recentlyViewedController');

// Track a view (requires auth optional for anonymous tracking)
router.post('/track', recentlyViewedController.addRecentlyViewed);

// Get user's recently viewed (auth required)
router.get('/', protect, recentlyViewedController.getRecentlyViewed);


// Clear all history
router.delete('/clear', protect, recentlyViewedController.clearHistory);

// Remove single item
router.delete('/:postId', protect, recentlyViewedController.removeFromHistory);


module.exports = router;
