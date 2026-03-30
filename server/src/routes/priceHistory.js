const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const priceHistoryController = require("../controllers/priceHistoryController");

/**
 * @route Price History routes
 * @description Tracks and exposes price change history for posts
 */

/** @route POST /record - Record a price change (protected) */
router.post("/record", protect, priceHistoryController.recordPriceChange);

/** @route GET /post/:postId - Get full price history for a post (public) */
router.get("/post/:postId", priceHistoryController.getPriceHistory);

/** @route GET /drops - Get recent price drops across all posts (public) */
router.get("/drops", priceHistoryController.getRecentPriceDrops);

module.exports = router;
