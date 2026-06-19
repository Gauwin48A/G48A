const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getRatingHistory } = require("../services/ratingService");
const { publicReadSlowDown } = require("../middleware/rateLimiter");

/**
 * GET /api/ratings/history/:userId
 * Fetch paginated rating history for a user (protected).
 */
router.get("/history/:userId", protect, publicReadSlowDown, async (req, res) => {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const result = await getRatingHistory(userId, { page, limit });

    return res.json(result);
  } catch (err) {
    console.error("[Ratings] Error fetching history:", err.message);
    return res.status(500).json({ error: "Failed to fetch rating history" });
  }
});

module.exports = router;
