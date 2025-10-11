const express = require('express');
const router = express.Router();
const { requireAuth, requirePremium } = require('../middleware/auth');
const db = require('../db');

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
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const { rows } = await db.query(
    'SELECT f.*, u.username FROM feeds f JOIN users u ON f.user_id = u.user_id ORDER BY f.created_at DESC LIMIT $1 OFFSET $2',
    [limit, offset]
  );
  res.json(rows);
});

// Get logged-in user's feed posts
router.get('/my', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const { rows } = await db.query('SELECT * FROM feeds WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  res.json(rows);
});

module.exports = router;
