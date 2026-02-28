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

// Protected: Seller response to review
router.post('/:reviewId/respond', protect, reviewsController.respondToReview);

// Protected: User flags review for abuse
router.post('/:reviewId/flag', protect, reviewsController.flagReview);

// Protected: Admin/moderator hide/unhide
router.patch('/:reviewId/moderate', protect, reviewsController.moderateReviewVisibility);

// Protected: Delete own review
router.delete('/:reviewId', protect, reviewsController.deleteReview);

module.exports = router;
