const express = require("express");
const router = express.Router();
const feedController = require("../controllers/feedController");
const {
  protect: protect,
  optionalAuth: optionalAuth,
} = require("../middleware/auth");
router.get("/", feedController.getFeed);
router.get("/mine", protect, feedController.getMyFeed);
router.get("/dynamic", optionalAuth, feedController.getDynamicFeed);
router.get("/trending", feedController.getTrendingPosts);
router.get("/random", feedController.getRandomFeed);
router.get("/nearby", feedController.getNearbyFeed);
router.get("/search", feedController.searchPosts);
router.post("/impression", feedController.trackImpression);
router.post("/add", protect, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.user_id;
    const { description: description } = req.body;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (
      !description ||
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({ error: "Description is required" });
    }
    const normalizedDescription = description.trim();
    if (
      normalizedDescription.length < 5 ||
      normalizedDescription.length > 500
    ) {
      return res
        .status(400)
        .json({ error: "Description must be 5-500 characters." });
    }
    const parsedUserId = Number.parseInt(String(userId), 10);
    if (!Number.isFinite(parsedUserId) || parsedUserId <= 0) {
      return res.status(400).json({ error: "Invalid user id" });
    }
    const firstNonEmptyLine = normalizedDescription
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0);
    const normalizedTitle = (firstNonEmptyLine || "Feed Update")
      .slice(0, 120)
      .trim();
    const emptyImagesJson = JSON.stringify([]);
    const result = await req.app.get("db").query(
      `
          INSERT INTO posts (
            user_id,
            title,
            description,
            price,
            post_type,
            status,
            images,
            is_flash_sale,
            created_at
          )
          VALUES ($1, $2, $3, $4, 'text', 'active', $5::jsonb, FALSE, NOW())
          RETURNING
            post_id,
            user_id,
            title,
            description,
            price,
            post_type,
            status,
            images,
            created_at,
            updated_at
        `,
      [
        parsedUserId,
        normalizedTitle,
        normalizedDescription,
        0,
        emptyImagesJson,
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
