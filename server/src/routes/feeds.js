const express = require('express');
const router = express.Router();
const { requireAuth, requirePremium } = require('../middleware/auth');
const db = require('../db');

const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 100;

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

// Create a feed post (description only)
router.post('/', requireAuth, async (req, res) => {
  const { description } = req.body;
  if (!description || description.length < 1) return res.status(400).json({ error: 'Description required' });
  const { userId } = req.user;
  await db.query('INSERT INTO feeds (user_id, description) VALUES ($1, $2)', [userId, description]);
  res.json({ success: true });
});

// Get all feed posts (paginated)
router.get('/', requireAuth, async (req, res) => {
  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT);
  const offset = (page - 1) * limit;

  const { rows } = await db.query(
    `
      SELECT
        f.feed_id,
        f.user_id,
        f.description,
        f.created_at,
        u.username
      FROM feeds f
      JOIN users u ON f.user_id = u.user_id
      ORDER BY f.created_at DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  );
  res.json(rows);
});

// Get logged-in user's feed posts
router.get('/my', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const limit = parsePositiveInt(req.query.limit, DEFAULT_FEED_LIMIT, MAX_FEED_LIMIT);
  const { rows } = await db.query(
    `
      SELECT
        feed_id,
        user_id,
        description,
        created_at
      FROM feeds
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );
  res.json(rows);
});

module.exports = router;
