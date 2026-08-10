const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/rbac");
const reviewsController = require("../controllers/reviewsController");
const { publicReadSlowDown } = require("../middleware/rateLimiter");

/** @route GET /user/:userId - Fetch all reviews for a given user (public) */
router.get("/user/:userId", publicReadSlowDown, reviewsController.getReviewsForUser);

/** @route GET /buyer/:userId - Fetch buyer reviews for a given user (public) */
router.get("/buyer/:userId", publicReadSlowDown, reviewsController.getBuyerReviews);

/** @route GET /stats/:userId - Comprehensive rating stats (seller + buyer) */
router.get("/stats/:userId", publicReadSlowDown, reviewsController.getUserRatingStats);

/** @route POST / - Create a new review */
router.post("/", protect, reviewsController.createReview);

/** @route POST /purchase - Rate a completed purchase (buyer only) */
router.post("/purchase", protect, reviewsController.ratePurchase);

/** @route PATCH /:reviewId/helpful - Mark a review as helpful */
router.patch("/:reviewId/helpful", protect, reviewsController.markReviewHelpful);

/** @route POST /:reviewId/respond - Respond to a review */
router.post("/:reviewId/respond", protect, reviewsController.respondToReview);

/** @route POST /:reviewId/flag - Flag a review for moderation */
router.post("/:reviewId/flag", protect, reviewsController.flagReview);

/** @route PATCH /:reviewId/moderate - Moderate review visibility */
router.patch("/:reviewId/moderate", protect, requireAdmin, reviewsController.moderateReviewVisibility);

/** @route DELETE /:reviewId - Delete a review */
router.delete("/:reviewId", protect, reviewsController.deleteReview);

module.exports = router;
