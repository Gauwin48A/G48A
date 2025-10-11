const express = require('express');
const router = express.Router();
const { requireAuth, requirePremium } = require('../middleware/auth');
const db = require('../db');

// Create a channel (premium users only)
router.post('/', requireAuth, requirePremium, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const { userId } = req.user;
  const result = await db.query(
    'INSERT INTO channels (owner_id, name, description, is_premium) VALUES ($1, $2, $3, TRUE) RETURNING *',
    [userId, name, description]
  );
  res.json(result.rows[0]);
});

// List all channels
router.get('/', requireAuth, async (req, res) => {
  const { rows } = await db.query('SELECT c.*, u.username as owner FROM channels c JOIN users u ON c.owner_id = u.user_id ORDER BY c.created_at DESC');
  res.json(rows);
});

// Follow a channel
router.post('/:id/follow', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const channelId = req.params.id;
  await db.query('INSERT INTO channel_followers (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [channelId, userId]);
  res.json({ success: true });
});

// Unfollow a channel
router.post('/:id/unfollow', requireAuth, async (req, res) => {
  const { userId } = req.user;
  const channelId = req.params.id;
  await db.query('DELETE FROM channel_followers WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
  res.json({ success: true });
});

// Get channel details and posts
router.get('/:id', requireAuth, async (req, res) => {
  const channelId = req.params.id;
  const channel = await db.query('SELECT * FROM channels WHERE channel_id = $1', [channelId]);
  const posts = await db.query('SELECT * FROM channel_posts WHERE channel_id = $1 ORDER BY created_at DESC', [channelId]);
  res.json({ channel: channel.rows[0], posts: posts.rows });
});

// Create a channel post (owner only, images/description/limited video)
router.post('/:id/posts', requireAuth, async (req, res) => {
  const channelId = req.params.id;
  const { userId } = req.user;
  const { description, image_url, video_url } = req.body;
  // Check ownership
  const { rows } = await db.query('SELECT * FROM channels WHERE channel_id = $1 AND owner_id = $2', [channelId, userId]);
  if (!rows.length) return res.status(403).json({ error: 'Not channel owner' });
  // Limit videos per channel (e.g., max 3)
  if (video_url) {
    const { rows: videoCount } = await db.query('SELECT COUNT(*) FROM channel_posts WHERE channel_id = $1 AND video_url IS NOT NULL', [channelId]);
    if (parseInt(videoCount[0].count) >= 3) return res.status(400).json({ error: 'Video limit reached' });
  }
  const result = await db.query(
    'INSERT INTO channel_posts (channel_id, owner_id, description, image_url, video_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [channelId, userId, description, image_url, video_url]
  );
  res.json(result.rows[0]);
});

module.exports = router;
