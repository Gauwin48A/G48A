const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const ChannelService = require('../services/ChannelService');
const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_CHANNEL_POSTS_LIMIT = 20;
const MAX_CHANNEL_POSTS_LIMIT = 100;
let usersLegacyIdColumnAvailablePromise = null;

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

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

async function hasUsersLegacyIdColumn() {
  if (!usersLegacyIdColumnAvailablePromise) {
    usersLegacyIdColumnAvailablePromise = runQuery(
      `
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'id'
        ) AS available
      `
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch(() => false);
  }

  return usersLegacyIdColumnAvailablePromise;
}

async function resolveCanonicalUserId(rawUserId) {
  const normalizedRawUserId = parseOptionalString(rawUserId);
  if (!normalizedRawUserId) return null;

  try {
    const usersHasLegacyId = await hasUsersLegacyIdColumn();
    const lookup = await runQuery(
      usersHasLegacyId
        ? `
          SELECT user_id::text AS user_id
          FROM users
          WHERE user_id::text = $1 OR id::text = $1
          LIMIT 1
        `
        : `
          SELECT user_id::text AS user_id
          FROM users
          WHERE user_id::text = $1
          LIMIT 1
        `,
      [normalizedRawUserId]
    );
    return parseOptionalString(lookup.rows[0]?.user_id) || normalizedRawUserId;
  } catch (err) {
    logger.warn('[Channels] Failed to resolve canonical user ID, using raw identifier', {
      message: err.message
    });
    return normalizedRawUserId;
  }
}

function isMissingRelationError(error, relationName) {
  return (
    String(error?.code || '').toUpperCase() === '42P01'
    && String(error?.message || '').toLowerCase().includes(String(relationName || '').toLowerCase())
  );
}

async function runChannelLookupWithFollowerFallback({
  contextLabel,
  primaryQuery,
  primaryValues,
  fallbackQuery,
  fallbackValues
}) {
  try {
    return await runQuery(primaryQuery, primaryValues);
  } catch (error) {
    if (!isMissingRelationError(error, 'channel_followers')) {
      throw error;
    }

    logger.warn(
      `[Channels] channel_followers relation missing during ${contextLabel}; using follower metadata fallback.`
    );
    return runQuery(fallbackQuery, fallbackValues);
  }
}

function getUserId(req) {
  return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

async function isAadhaarVerified(userId) {
  if (!userId) return false;

  const user = await runQuery(
    `
      SELECT
        COALESCE(
          CASE
            WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'isAadhaarVerified', ''), '')) IN ('true', '1', 'yes') THEN TRUE
            WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'isAadhaarVerified', ''), '')) IN ('false', '0', 'no') THEN FALSE
            ELSE NULL
          END,
          CASE
            WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'isaadhaarverified', ''), '')) IN ('true', '1', 'yes') THEN TRUE
            WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'isaadhaarverified', ''), '')) IN ('false', '0', 'no') THEN FALSE
            ELSE NULL
          END,
          CASE
            WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'aadhaar_verified', ''), '')) IN ('true', '1', 'yes') THEN TRUE
            WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'aadhaar_verified', ''), '')) IN ('false', '0', 'no') THEN FALSE
            ELSE NULL
          END,
          CASE
            WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'kyc_verified', ''), '')) IN ('true', '1', 'yes') THEN TRUE
            WHEN LOWER(COALESCE(NULLIF(to_jsonb(u)->>'kyc_verified', ''), '')) IN ('false', '0', 'no') THEN FALSE
            ELSE NULL
          END,
          false
        ) AS is_verified
      FROM users u
      WHERE COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = $1
      LIMIT 1
    `,
    [String(userId)]
  );

  return Boolean(user.rows[0]?.is_verified);
}

// Create a channel (Aadhaar-verified users, max 3)
const createChannelHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const verified = await isAadhaarVerified(userId);
    if (!verified) return res.status(403).json({ error: 'Aadhaar verification required' });

    const userChannels = await ChannelService.listUserChannels(userId);
    if (userChannels.length >= 3) return res.status(400).json({ error: 'Channel limit reached' });
    const channel = await ChannelService.createChannel({ owner_id: userId, ...req.body });
    res.json(channel);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

router.post('/', protect, createChannelHandler);
// Legacy compatibility: `/api/channel/create`.
router.post('/create', protect, createChannelHandler);

// List all channels
router.get('/', protect, async (req, res) => {
  const userId = getUserId(req);
  const channels = await ChannelService.listChannels(userId);
  res.json(channels);
});

// List followed channels
router.get('/followed', protect, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const channels = await ChannelService.listFollowedChannels(userId);
  res.json(channels);
});

// Follow a channel
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const channelId = String(req.params.id || '').trim();
    if (!channelId) return res.status(400).json({ error: 'Channel id is required' });

    const channelExists = await runQuery(
      `
        SELECT 1
        FROM channels
        WHERE channel_id = $1
          AND LOWER(
            COALESCE(
              NULLIF(to_jsonb(channels)->>'is_active', ''),
              NULLIF(to_jsonb(channels)->>'is_public', ''),
              'true'
            )
          ) IN ('true', 't', '1', 'yes')
        LIMIT 1
      `,
      [channelId]
    );
    if (!channelExists.rows.length) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const deleted = await runQuery(
      'DELETE FROM channel_followers WHERE channel_id = $1 AND user_id = $2 RETURNING 1',
      [channelId, userId]
    );

    if (deleted.rowCount > 0) {
      return res.json({ success: true, action: 'unfollowed' });
    }

    await ChannelService.followChannel(channelId, userId);
    return res.json({ success: true, action: 'followed' });
  } catch (err) {
    logger.error('Error toggling channel follow:', err);
    return res.status(500).json({ error: 'Failed to update follow state' });
  }
});

// Unfollow a channel
router.post('/:id/unfollow', protect, async (req, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  await ChannelService.unfollowChannel(req.params.id, userId);
  res.json({ success: true });
});

// Update a channel (owner/admin only)
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const updated = await ChannelService.editChannel({
      channel_id: req.params.id,
      user_id: userId,
      ...req.body
    });

    return res.json(updated);
  } catch (err) {
    const message = String(err?.message || 'Failed to update channel');
    if (message === 'Not authorized') {
      return res.status(403).json({ error: message });
    }
    if (message === 'Channel not found') {
      return res.status(404).json({ error: message });
    }
    if (
      message === 'Channel id and user id are required'
      || message === 'is_active must be a boolean'
      || message === 'Channel name is required'
      || message === 'Channel category is required'
      || message === 'Channel name already exists'
      || message === 'Profanity detected in channel name or description'
      || message === 'No valid fields to update'
    ) {
      return res.status(400).json({ error: message });
    }
    logger.error('Error updating channel:', err);
    return res.status(500).json({ error: 'Failed to update channel' });
  }
});

// Get channel by owner user ID (compatibility endpoint for profile/channel badges)
router.get('/owner/:userId', protect, async (req, res) => {
  try {
    const ownerId = String(req.params.userId || '').trim();
    if (!ownerId) return res.status(400).json({ error: 'Owner id is required' });
    const canonicalOwnerId = await resolveCanonicalUserId(ownerId);
    const viewerId = String(getUserId(req) || '').trim();
    const canonicalViewerId = await resolveCanonicalUserId(viewerId);

    const limit = parsePositiveInt(req.query.limit, DEFAULT_CHANNEL_POSTS_LIMIT, MAX_CHANNEL_POSTS_LIMIT);
    const channelPrimaryQuery = `
        SELECT
          c.channel_id,
          c.owner_id,
          c.name,
          c.description,
          COALESCE(
            NULLIF(to_jsonb(c)->>'category', ''),
            NULLIF(to_jsonb(c)->>'channel_category', ''),
            NULLIF(to_jsonb(c)->>'type', '')
          ) AS category,
          NULLIF(to_jsonb(c)->>'logo_url', '') AS logo_url,
          NULLIF(to_jsonb(c)->>'cover_url', '') AS cover_url,
          NULLIF(to_jsonb(c)->>'contact_email', '') AS contact_email,
          NULLIF(to_jsonb(c)->>'contact_website', '') AS contact_website,
          NULLIF(to_jsonb(c)->>'contact_phone', '') AS contact_phone,
          NULLIF(to_jsonb(c)->>'location', '') AS location,
          LOWER(
            COALESCE(
              NULLIF(to_jsonb(c)->>'is_active', ''),
              NULLIF(to_jsonb(c)->>'is_public', ''),
              'true'
            )
          ) IN ('true', 't', '1', 'yes') AS is_active,
          c.created_at,
          COALESCE(
            NULLIF(to_jsonb(u)->>'name', ''),
            NULLIF(to_jsonb(u)->>'full_name', ''),
            NULLIF(to_jsonb(u)->>'username', ''),
            c.owner_id::text
          ) AS owner_name,
          COALESCE(fc.follower_count, 0)::int AS follower_count,
          (vf.user_id IS NOT NULL) AS is_following
        FROM channels c
        LEFT JOIN users u
          ON COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = c.owner_id::text
        LEFT JOIN (
          SELECT channel_id, COUNT(*)::int AS follower_count
          FROM channel_followers
          GROUP BY channel_id
        ) fc ON fc.channel_id = c.channel_id
        LEFT JOIN channel_followers vf
          ON vf.channel_id = c.channel_id
         AND vf.user_id::text = $2
        WHERE c.owner_id::text = $1
          AND LOWER(
            COALESCE(
              NULLIF(to_jsonb(c)->>'is_active', ''),
              NULLIF(to_jsonb(c)->>'is_public', ''),
              'true'
            )
          ) IN ('true', 't', '1', 'yes')
        ORDER BY c.created_at DESC
        LIMIT 1
      `;
    const channelFallbackQuery = `
        SELECT
          c.channel_id,
          c.owner_id,
          c.name,
          c.description,
          COALESCE(
            NULLIF(to_jsonb(c)->>'category', ''),
            NULLIF(to_jsonb(c)->>'channel_category', ''),
            NULLIF(to_jsonb(c)->>'type', '')
          ) AS category,
          NULLIF(to_jsonb(c)->>'logo_url', '') AS logo_url,
          NULLIF(to_jsonb(c)->>'cover_url', '') AS cover_url,
          NULLIF(to_jsonb(c)->>'contact_email', '') AS contact_email,
          NULLIF(to_jsonb(c)->>'contact_website', '') AS contact_website,
          NULLIF(to_jsonb(c)->>'contact_phone', '') AS contact_phone,
          NULLIF(to_jsonb(c)->>'location', '') AS location,
          LOWER(
            COALESCE(
              NULLIF(to_jsonb(c)->>'is_active', ''),
              NULLIF(to_jsonb(c)->>'is_public', ''),
              'true'
            )
          ) IN ('true', 't', '1', 'yes') AS is_active,
          c.created_at,
          COALESCE(
            NULLIF(to_jsonb(u)->>'name', ''),
            NULLIF(to_jsonb(u)->>'full_name', ''),
            NULLIF(to_jsonb(u)->>'username', ''),
            c.owner_id::text
          ) AS owner_name,
          0::int AS follower_count,
          FALSE AS is_following
        FROM channels c
        LEFT JOIN users u
          ON COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = c.owner_id::text
        WHERE c.owner_id::text = $1
          AND LOWER(
            COALESCE(
              NULLIF(to_jsonb(c)->>'is_active', ''),
              NULLIF(to_jsonb(c)->>'is_public', ''),
              'true'
            )
          ) IN ('true', 't', '1', 'yes')
        ORDER BY c.created_at DESC
        LIMIT 1
      `;
    const channelResult = await runChannelLookupWithFollowerFallback({
      contextLabel: 'owner lookup',
      primaryQuery: channelPrimaryQuery,
      primaryValues: [canonicalOwnerId, canonicalViewerId],
      fallbackQuery: channelFallbackQuery,
      fallbackValues: [canonicalOwnerId]
    });

    const channel = channelResult.rows[0];
    if (!channel) {
      return res.json({ channel: null, posts: [] });
    }

    const posts = await runQuery(
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
      [channel.channel_id, limit]
    );

    res.json({ channel, posts: posts.rows });
  } catch (err) {
    logger.error('Error fetching channel by owner:', err);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// Get channel details and posts
router.get('/:id', protect, async (req, res) => {
  try {
    const channelId = req.params.id;
    const viewerId = String(getUserId(req) || '').trim();
    const limit = parsePositiveInt(req.query.limit, DEFAULT_CHANNEL_POSTS_LIMIT, MAX_CHANNEL_POSTS_LIMIT);

    const channelPrimaryQuery = `
          SELECT
            c.channel_id,
            c.owner_id,
            c.name,
            c.description,
            COALESCE(
              NULLIF(to_jsonb(c)->>'category', ''),
              NULLIF(to_jsonb(c)->>'channel_category', ''),
              NULLIF(to_jsonb(c)->>'type', '')
            ) AS category,
            NULLIF(to_jsonb(c)->>'logo_url', '') AS logo_url,
            NULLIF(to_jsonb(c)->>'cover_url', '') AS cover_url,
            NULLIF(to_jsonb(c)->>'contact_email', '') AS contact_email,
            NULLIF(to_jsonb(c)->>'contact_website', '') AS contact_website,
            NULLIF(to_jsonb(c)->>'contact_phone', '') AS contact_phone,
            NULLIF(to_jsonb(c)->>'location', '') AS location,
            LOWER(
              COALESCE(
                NULLIF(to_jsonb(c)->>'is_active', ''),
                NULLIF(to_jsonb(c)->>'is_public', ''),
                'true'
              )
            ) IN ('true', 't', '1', 'yes') AS is_active,
            c.created_at,
            COALESCE(
              NULLIF(to_jsonb(u)->>'name', ''),
              NULLIF(to_jsonb(u)->>'full_name', ''),
              NULLIF(to_jsonb(u)->>'username', ''),
              c.owner_id::text
            ) AS owner_name,
            COALESCE(fc.follower_count, 0)::int AS follower_count,
            (vf.user_id IS NOT NULL) AS is_following
          FROM channels c
          LEFT JOIN users u
            ON COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = c.owner_id::text
          LEFT JOIN (
            SELECT channel_id, COUNT(*)::int AS follower_count
            FROM channel_followers
            GROUP BY channel_id
          ) fc ON fc.channel_id = c.channel_id
          LEFT JOIN channel_followers vf
            ON vf.channel_id = c.channel_id
           AND vf.user_id::text = $2
          WHERE c.channel_id = $1
            AND LOWER(
              COALESCE(
                NULLIF(to_jsonb(c)->>'is_active', ''),
                NULLIF(to_jsonb(c)->>'is_public', ''),
                'true'
              )
            ) IN ('true', 't', '1', 'yes')
          LIMIT 1
        `;
    const channelFallbackQuery = `
          SELECT
            c.channel_id,
            c.owner_id,
            c.name,
            c.description,
            COALESCE(
              NULLIF(to_jsonb(c)->>'category', ''),
              NULLIF(to_jsonb(c)->>'channel_category', ''),
              NULLIF(to_jsonb(c)->>'type', '')
            ) AS category,
            NULLIF(to_jsonb(c)->>'logo_url', '') AS logo_url,
            NULLIF(to_jsonb(c)->>'cover_url', '') AS cover_url,
            NULLIF(to_jsonb(c)->>'contact_email', '') AS contact_email,
            NULLIF(to_jsonb(c)->>'contact_website', '') AS contact_website,
            NULLIF(to_jsonb(c)->>'contact_phone', '') AS contact_phone,
            NULLIF(to_jsonb(c)->>'location', '') AS location,
            LOWER(
              COALESCE(
                NULLIF(to_jsonb(c)->>'is_active', ''),
                NULLIF(to_jsonb(c)->>'is_public', ''),
                'true'
              )
            ) IN ('true', 't', '1', 'yes') AS is_active,
            c.created_at,
            COALESCE(
              NULLIF(to_jsonb(u)->>'name', ''),
              NULLIF(to_jsonb(u)->>'full_name', ''),
              NULLIF(to_jsonb(u)->>'username', ''),
              c.owner_id::text
            ) AS owner_name,
            0::int AS follower_count,
            FALSE AS is_following
          FROM channels c
          LEFT JOIN users u
            ON COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = c.owner_id::text
          WHERE c.channel_id = $1
            AND LOWER(
              COALESCE(
                NULLIF(to_jsonb(c)->>'is_active', ''),
                NULLIF(to_jsonb(c)->>'is_public', ''),
                'true'
              )
            ) IN ('true', 't', '1', 'yes')
          LIMIT 1
        `;
    const [channel, posts] = await Promise.all([
      runChannelLookupWithFollowerFallback({
        contextLabel: 'channel details lookup',
        primaryQuery: channelPrimaryQuery,
        primaryValues: [channelId, viewerId],
        fallbackQuery: channelFallbackQuery,
        fallbackValues: [channelId]
      }),
      runQuery(`
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
      [channelId, limit])
    ]);

    if (!channel.rows[0]) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json({ channel: channel.rows[0], posts: posts.rows });
  } catch (err) {
    logger.error('Error fetching channel details:', err);
    res.status(500).json({ error: 'Failed to fetch channel details' });
  }
});

// Create a channel post (owner only, images/description/limited video)
router.post('/:id/posts', protect, async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = getUserId(req);
    const { description, image_url, video_url } = req.body;

    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const ownerCheck = await runQuery(
      `
        SELECT 1
        FROM channels
        WHERE channel_id = $1
          AND owner_id = $2
          AND LOWER(
            COALESCE(
              NULLIF(to_jsonb(channels)->>'is_active', ''),
              NULLIF(to_jsonb(channels)->>'is_public', ''),
              'true'
            )
          ) IN ('true', 't', '1', 'yes')
        LIMIT 1
      `,
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
