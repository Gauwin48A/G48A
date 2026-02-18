/**
 * Reviews Routes
 * Ratings, reviews, and seller reputation
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const reviewsController = require('../controllers/reviewsController');

// Public: Get reviews for a user (seller)
router.get('/user/:userId', reviewsController.getReviewsForUser);

// Protected: Create a review
router.post('/', protect, reviewsController.createReview);

// Protected: Mark review as helpful
router.patch('/:reviewId/helpful', protect, reviewsController.markReviewHelpful);

// Protected: Delete own review
router.delete('/:reviewId', protect, reviewsController.deleteReview);

module.exports = router;
