const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middleware/auth");
const recentlyViewedController = require("../controllers/recentlyViewedController");

// ---------------------------------------------------------------------------
// Recently Viewed routes
// ---------------------------------------------------------------------------

/**
 * @route   POST /track
 * @desc    Track a post view for the current user (works for both
 *          authenticated and anonymous users via optionalAuth).
 * @access  Optional auth
 */
router.post("/track", optionalAuth, recentlyViewedController.addRecentlyViewed);

/**
 * @route   GET /
 * @desc    Retrieve the authenticated user's recently viewed posts.
 * @access  Protected
 */
router.get("/", protect, recentlyViewedController.getRecentlyViewed);

/**
 * @route   GET /post/:postId
 * @desc    Get the list of viewers for a specific post.
 * @access  Protected
 */
router.get("/post/:postId", protect, recentlyViewedController.getViewersForPost);

/**
 * @route   DELETE /clear
 * @desc    Clear the authenticated user's entire recently-viewed history.
 * @access  Protected
 */
router.delete("/clear", protect, recentlyViewedController.clearHistory);

/**
 * @route   DELETE /bulk
 * @desc    Bulk remove posts from recently-viewed history.
 * @access  Protected
 */
router.delete("/bulk", protect, recentlyViewedController.bulkRemoveFromHistory);

/**
 * @route   DELETE /:postId
 * @desc    Remove a single post from the user's recently-viewed history.
 * @access  Protected
 */
router.delete("/:postId", protect, recentlyViewedController.removeFromHistory);

module.exports = router;
