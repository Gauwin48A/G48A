const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ChannelService = require('../services/ChannelService');

// Create a channel (Aadhaar-verified users, max 3)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!req.user || !req.user.isAadhaarVerified) return res.status(403).json({ error: 'Aadhaar verification required' });
    const userChannels = await ChannelService.listUserChannels(req.user.user_id);
    if (userChannels.length >= 3) return res.status(400).json({ error: 'Channel limit reached' });
    const channel = await ChannelService.createChannel({ owner_id: req.user.user_id, ...req.body });
    res.json(channel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all channels
router.get('/', requireAuth, async (req, res) => {
  const channels = await ChannelService.listChannels();
  res.json(channels);
});

// List followed channels
router.get('/followed', requireAuth, async (req, res) => {
  const channels = await ChannelService.listFollowedChannels(req.user.user_id);
  res.json(channels);
});

// Follow a channel
router.post('/:id/follow', requireAuth, async (req, res) => {
  await ChannelService.followChannel(req.params.id, req.user.user_id);
  res.json({ success: true });
});

// Unfollow a channel
router.post('/:id/unfollow', requireAuth, async (req, res) => {
  await ChannelService.unfollowChannel(req.params.id, req.user.user_id);
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
