const express = require("express");
const router = express.Router();
const { pool } = require("../../index");
const { protect } = require("../middleware/auth");

// Get user profile
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, username, email, rating, created_at FROM users WHERE user_id = $1",
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error("Profile retrieval error:", err);
    res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});

module.exports = router;