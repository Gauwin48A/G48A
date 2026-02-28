const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ChannelService = require('../services/ChannelService');
const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_CHANNEL_POSTS_LIMIT = 20;
const MAX_CHANNEL_POSTS_LIMIT = 100;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function getUserId(req) {
  return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

// Create a channel (Aadhaar-verified users, max 3)
router.post('/', requireAuth, async (req, res) => {
  try {
    if (!req.user || !req.user.isAadhaarVerified) return res.status(403).json({ error: 'Aadhaar verification required' });
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const userChannels = await ChannelService.listUserChannels(userId);
    if (userChannels.length >= 3) return res.status(400).json({ error: 'Channel limit reached' });
    const channel = await ChannelService.createChannel({ owner_id: userId, ...req.body });
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
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const channels = await ChannelService.listFollowedChannels(userId);
  res.json(channels);
});

// Follow a channel
router.post('/:id/follow', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  await ChannelService.followChannel(req.params.id, userId);
  res.json({ success: true });
});

// Unfollow a channel
router.post('/:id/unfollow', requireAuth, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  await ChannelService.unfollowChannel(req.params.id, userId);
  res.json({ success: true });
});

// Get channel details and posts
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const channelId = req.params.id;
    const limit = parsePositiveInt(req.query.limit, DEFAULT_CHANNEL_POSTS_LIMIT, MAX_CHANNEL_POSTS_LIMIT);

    const [channel, posts] = await Promise.all([
      runQuery(
        `
          SELECT
            channel_id,
            owner_id,
            name,
            description,
            category,
            logo_url,
            cover_url,
            contact_email,
            contact_website,
            contact_phone,
            location,
            is_active,
            created_at
          FROM channels
          WHERE channel_id = $1
          LIMIT 1
        `,
        [channelId]
      ),
      runQuery(
        `
          SELECT
            post_id,
            channel_id,
            owner_id,
            description,
            image_url,
            video_url,
            created_at
          FROM channel_posts
          WHERE channel_id = $1
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [channelId, limit]
      )
    ]);

    res.json({ channel: channel.rows[0] || null, posts: posts.rows });
  } catch (err) {
    logger.error('Error fetching channel details:', err);
    res.status(500).json({ error: 'Failed to fetch channel details' });
  }
});

// Create a channel post (owner only, images/description/limited video)
router.post('/:id/posts', requireAuth, async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = getUserId(req);
    const { description, image_url, video_url } = req.body;

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const ownerCheck = await runQuery(
      'SELECT 1 FROM channels WHERE channel_id = $1 AND owner_id = $2 LIMIT 1',
      [channelId, userId]
    );
    if (!ownerCheck.rows.length) return res.status(403).json({ error: 'Not channel owner' });

    if (video_url) {
      const videoCount = await runQuery(
        'SELECT COUNT(*)::int AS count FROM channel_posts WHERE channel_id = $1 AND video_url IS NOT NULL',
        [channelId]
      );
      if (Number.parseInt(videoCount.rows[0].count, 10) >= 3) {
        return res.status(400).json({ error: 'Video limit reached' });
      }
    }

    const result = await runQuery(
      `
        INSERT INTO channel_posts (channel_id, owner_id, description, image_url, video_url)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING post_id, channel_id, owner_id, description, image_url, video_url, created_at
      `,
      [channelId, userId, description, image_url, video_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Error creating channel post:', err);
    res.status(500).json({ error: 'Failed to create channel post' });
  }
});

module.exports = router;
