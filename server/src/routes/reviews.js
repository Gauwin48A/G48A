const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const reviewsController = require("../controllers/reviewsController");

/** @route GET /user/:userId - Fetch all reviews for a given user (public) */
router.get("/user/:userId", reviewsController.getReviewsForUser);

/** @route POST / - Create a new review */
router.post("/", protect, reviewsController.createReview);

/** @route PATCH /:reviewId/helpful - Mark a review as helpful */
router.patch("/:reviewId/helpful", protect, reviewsController.markReviewHelpful);

/** @route POST /:reviewId/respond - Respond to a review */
router.post("/:reviewId/respond", protect, reviewsController.respondToReview);

/** @route POST /:reviewId/flag - Flag a review for moderation */
router.post("/:reviewId/flag", protect, reviewsController.flagReview);

/** @route PATCH /:reviewId/moderate - Moderate review visibility */
router.patch("/:reviewId/moderate", protect, reviewsController.moderateReviewVisibility);

/** @route DELETE /:reviewId - Delete a review */
router.delete("/:reviewId", protect, reviewsController.deleteReview);

module.exports = router;
