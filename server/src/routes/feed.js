const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/', feedController.getFeed);
router.get('/mine', protect, feedController.getMyFeed);

// NEW: High-Performance Dynamic Feed (Stratified Distribution)
router.get('/dynamic', optionalAuth, feedController.getDynamicFeed);

// NEW: Trending Posts (cached for 5 min)
router.get('/trending', feedController.getTrendingPosts);

// PROTOCOL: CHAOS ENGINE - High-Performance Random Feed (The Architect)
// Uses TABLESAMPLE for O(1) random access - 1000x faster than ORDER BY RANDOM()
router.get('/random', feedController.getRandomFeed);

// GEO-FENCED FEED - Posts near user's location (PostGIS)
// GET /api/feed/nearby?lat=17.38&lng=78.48&radius=10
router.get('/nearby', feedController.getNearbyFeed);

// FULL-TEXT SEARCH - Fuzzy search using tsvector
// GET /api/feed/search?q=iphone&category=1
router.get('/search', feedController.searchPosts);

// NEW: Track feed impressions for exploration analytics
router.post('/impression', feedController.trackImpression);
// Add description length validation (min 5, max 500 chars)
router.post('/add', protect, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId || req.user?.user_id;
    const { description } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const normalizedDescription = description.trim();
    if (normalizedDescription.length < 5 || normalizedDescription.length > 500) {
      return res.status(400).json({ error: 'Description must be 5-500 characters.' });
    }

    // Insert text-only post
    const result = await req.app.get('db').query(
      `
        INSERT INTO posts (user_id, title, description, post_type, created_at)
        VALUES ($1, $2, $2, 'text', NOW())
        RETURNING post_id, user_id, title, description, post_type, status, created_at, updated_at
      `,
      [userId, normalizedDescription]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
