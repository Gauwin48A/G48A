const express = require("express");
const router = express.Router();
const { computeTrustScore } = require("../services/trustScoreService");

// GET /api/trust/score/:userId
router.get("/score/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const result = await computeTrustScore(userId);
    if (!result) {
      return res.json({ trustScore: 0, level: "new", badge: "New Seller" });
    }
    return res.json({
      trustScore: result.score,
      level: result.level,
      badge: result.badge,
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to compute trust score" });
  }
});

module.exports = router;
