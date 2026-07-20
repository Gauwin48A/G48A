const express = require("express");
const router = express.Router();
const { protect, optionalAuth } = require("../middleware/auth");
const ChannelService = require("../services/ChannelService");
const { runQuery, getAuthUserId, parseOptionalString, parsePositiveInt } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const upload = require("../middleware/upload");
const { publicReadSlowDown } = require("../middleware/rateLimiter");
const { getImageUrl } = upload;

const DEFAULT_CHANNEL_POSTS_LIMIT = 20;
const MAX_CHANNEL_POSTS_LIMIT = 100;

let usersLegacyIdColumnAvailablePromise = null;
let channelFollowersReadyPromise = null;

/* ------------------------------------------------------------------ */
/*  Legacy ID column detection                                         */
/* ------------------------------------------------------------------ */

/**
 * Check whether the users table still has the legacy `id` column.
 */
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

/**
 * Resolve a raw user identifier to the canonical user_id, falling back
 * to the legacy `id` column when available.
 */
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
    logger.warn(
      "[Channels] Failed to resolve canonical user ID, using raw identifier",
      { message: err.message }
    );
    return normalizedRawUserId;
  }
}

/* ------------------------------------------------------------------ */
/*  channel_followers fallback helpers                                 */
/* ------------------------------------------------------------------ */

/**
 * Return true when the error indicates a missing relation by name.
 */
function isMissingRelationError(error, relationName) {
  return (
    String(error?.code || "").toUpperCase() === "42P01" &&
    String(error?.message || "")
      .toLowerCase()
      .includes(String(relationName || "").toLowerCase())
  );
}

/**
 * Ensure channel_followers table exists (cached).
 * @returns {Promise<boolean>}
 */
async function ensureChannelFollowersTable() {
  if (channelFollowersReadyPromise) {
    return channelFollowersReadyPromise;
  }

  channelFollowersReadyPromise = (async () => {
    try {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS channel_followers (
          channel_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (channel_id, user_id)
        )`
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_channel_followers_user ON channel_followers(user_id)"
      );
      return true;
    } catch (error) {
      logger.warn("[Channels] Unable to auto-provision channel_followers", {
        message: error.message,
      });
      return false;
    }
  })();

  return channelFollowersReadyPromise;
}

/**
 * Run a channel lookup query, falling back to a simpler query when the
 * channel_followers table does not exist.
 */
async function runChannelLookupWithFollowerFallback({
  contextLabel,
  primaryQuery,
  primaryValues,
  fallbackQuery,
  fallbackValues,
}) {
  try {
    return await runQuery(primaryQuery, primaryValues);
  } catch (error) {
    if (!isMissingRelationError(error, "channel_followers")) {
      throw error;
    }
    const ensured = await ensureChannelFollowersTable();
    if (ensured) {
      try {
        return await runQuery(primaryQuery, primaryValues);
      } catch (retryError) {
        if (!isMissingRelationError(retryError, "channel_followers")) {
          throw retryError;
        }
      }
    }
    logger.warn(
      `[Channels] channel_followers relation missing during ${contextLabel}; using follower metadata fallback.`
    );
    return runQuery(fallbackQuery, fallbackValues);
  }
}

/**
 * Extract the authenticated user ID from the request.
 */
function getUserId(req) {
  return getAuthUserId(req);
}

/**
 * Check whether a user has completed Aadhaar / KYC verification.
 */
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

/**
 * Check the user's current subscription tier.
 */
async function getUserTier(userId) {
  if (!userId) return "basic";

  const usersHasLegacyId = await hasUsersLegacyIdColumn();
  const result = await runQuery(
    usersHasLegacyId
      ? `
        SELECT
          LOWER(
            COALESCE(
              NULLIF(to_jsonb(u)->>'current_plan', ''),
              NULLIF(to_jsonb(u)->>'tier', ''),
              NULLIF(to_jsonb(u)->>'tier_plan', ''),
              'basic'
            )
          ) AS tier
        FROM users u
        WHERE u.user_id::text = $1 OR u.id::text = $1
        LIMIT 1
      `
      : `
        SELECT
          LOWER(
            COALESCE(
              NULLIF(to_jsonb(u)->>'current_plan', ''),
              NULLIF(to_jsonb(u)->>'tier', ''),
              NULLIF(to_jsonb(u)->>'tier_plan', ''),
              'basic'
            )
          ) AS tier
        FROM users u
        WHERE u.user_id::text = $1
        LIMIT 1
      `,
    [String(userId)]
  );

  return result.rows[0]?.tier || "basic";
}

/* ------------------------------------------------------------------ */
/*  Channel creation handler (shared by POST / and POST /create)       */
/* ------------------------------------------------------------------ */

/**
 * @route POST / | POST /create - Create a new channel (Aadhaar-verified, max 3)
 */
const createChannelHandler = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const userTier = await getUserTier(userId);
    if (userTier !== "premium") {
      return res.status(403).json({
        error: "Premium plan required to create a CentrePage.",
        upgrade: true,
      });
    }

    const userChannels = await ChannelService.listUserChannels(userId);
    if (userChannels.length >= 3)
      return res.status(400).json({ error: "Channel limit reached" });

    const channel = await ChannelService.createChannel({
      owner_id: userId,
      ...req.body,
    });
    res.json(channel);
  } catch (err) {
    logger.error("Channel creation error:", err);
    res.status(400).json({ error: "Failed to create channel" });
  }
};

router.post("/", protect, createChannelHandler);
router.post("/create", protect, createChannelHandler);

/* ------------------------------------------------------------------ */
/*  Channel listing routes                                             */
/* ------------------------------------------------------------------ */

/**
 * @route GET / - List all channels (public browse, optionally enriched for auth users)
 */
router.get("/", optionalAuth, publicReadSlowDown, async (req, res) => {
  const userId = getUserId(req) || "";
  const channels = await ChannelService.listChannels(userId);
  res.json(channels);
});

/**
 * @route GET /followed - List channels the current user follows
 */
router.get("/followed", protect, async (req, res) => {
  const userId = getUserId(req);
  if (!userId)
    return res.status(401).json({ error: "Authentication required" });

  const channels = await ChannelService.listFollowedChannels(userId);
  res.json(channels);
});

/**
 * @route GET /premium - List all premium-owned channels
 */
router.get("/premium", protect, async (req, res) => {
  const userId = getUserId(req);
  const channels = await ChannelService.listChannelsByTier(userId, "premium");
  res.json(channels);
});

/**
 * @route GET /featured - Public featured CentrePages (premium-owned).
 */
router.get("/featured", publicReadSlowDown, async (req, res) => {
  try {
    const viewerId = getUserId(req);
    const limit = parsePositiveInt(req.query.limit, 6, 24);
    const categoryFilter = parseOptionalString(req.query.category);
    const channels = await ChannelService.listChannelsByTier(viewerId, "premium");
    const normalizedCategory = categoryFilter ? categoryFilter.toLowerCase() : null;
    const filtered = normalizedCategory
      ? channels.filter((channel) =>
          String(channel?.category || "").toLowerCase() === normalizedCategory,
        )
      : channels;
    const sorted = [...filtered].sort((a, b) => {
      const followerDiff =
        Number(b?.follower_count || 0) - Number(a?.follower_count || 0);
      if (followerDiff !== 0) return followerDiff;
      return new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime();
    });
    res.json({
      channels: sorted.slice(0, limit),
      total: filtered.length,
    });
  } catch (err) {
    logger.error("[Channels] Failed to fetch featured CentrePages", err);
    res.status(200).json({
      channels: [],
      total: 0,
      degraded: true,
    });
  }
});

/* ------------------------------------------------------------------ */
/*  Follow / unfollow routes                                           */
/* ------------------------------------------------------------------ */

/**
 * @route POST /:id/follow - Toggle follow state for a channel
 */
router.post("/:id/follow", protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const channelId = String(req.params.id || "").trim();
    if (!channelId)
      return res.status(400).json({ error: "Channel id is required" });

    const channelExists = await runQuery(
      `
        SELECT owner_id
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
      return res.status(404).json({ error: "Channel not found" });
    }

    const ownerId = String(channelExists.rows[0]?.owner_id || "").trim();
    if (ownerId && ownerId === String(userId)) {
      return res.status(400).json({
        error: "You cannot follow your own CentrePage.",
      });
    }

    const unfollowed = await ChannelService.unfollowChannel(channelId, userId);
    if (unfollowed) {
      return res.json({ success: true, action: "unfollowed" });
    }

    await ChannelService.followChannel(channelId, userId);
    return res.json({ success: true, action: "followed" });
  } catch (err) {
    logger.error("Error toggling channel follow:", err);
    return res.status(500).json({ error: "Failed to update follow state" });
  }
});

/**
 * @route POST /:id/unfollow - Explicitly unfollow a channel
 */
router.post("/:id/unfollow", protect, async (req, res) => {
  const userId = getUserId(req);
  if (!userId)
    return res.status(401).json({ error: "Authentication required" });

  await ChannelService.unfollowChannel(req.params.id, userId);
  res.json({ success: true });
});

/* ------------------------------------------------------------------ */
/*  Channel update route                                               */
/* ------------------------------------------------------------------ */

/**
 * @route PUT /:id - Update channel details (owner only)
 */
router.put("/:id", protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    const updated = await ChannelService.editChannel({
      channel_id: req.params.id,
      user_id: userId,
      ...req.body,
    });
    return res.json(updated);
  } catch (err) {
    const message = String(err?.message || "Failed to update channel");

    if (message === "Not authorized") {
      return res.status(403).json({ error: message });
    }
    if (message === "Channel not found") {
      return res.status(404).json({ error: message });
    }
    if (
      message === "Channel id and user id are required" ||
      message === "is_active must be a boolean" ||
      message === "Channel name is required" ||
      message === "Channel category is required" ||
      message === "Channel name already exists" ||
      message === "Profanity detected in channel name or description" ||
      message === "No valid fields to update"
    ) {
      return res.status(400).json({ error: message });
    }

    logger.error("Error updating channel:", err);
    return res.status(500).json({ error: "Failed to update channel" });
  }
});

/* ------------------------------------------------------------------ */
/*  Channel media upload                                               */
/* ------------------------------------------------------------------ */

/**
 * @route POST /:id/media - Upload logo/cover images (owner/admin only)
 */
router.post(
  "/:id/media",
  protect,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "cover", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId)
        return res.status(401).json({ error: "Authentication required" });

      const channelId = String(req.params.id || "").trim();
      if (!channelId)
        return res.status(400).json({ error: "Channel id is required" });

      const logoFile = Array.isArray(req.files?.logo) ? req.files.logo[0] : null;
      const coverFile = Array.isArray(req.files?.cover) ? req.files.cover[0] : null;

      if (!logoFile && !coverFile) {
        return res.status(400).json({ error: "No media uploaded" });
      }

      const payload = {};
      if (logoFile) payload.logo_url = getImageUrl(logoFile);
      if (coverFile) payload.cover_url = getImageUrl(coverFile);

      const updated = await ChannelService.editChannel({
        channel_id: channelId,
        user_id: userId,
        ...payload,
      });

      return res.json(updated);
    } catch (err) {
      logger.error("Error uploading channel media:", err);
      return res.status(500).json({ error: "Failed to upload channel media" });
    }
  }
);

/* ------------------------------------------------------------------ */
/*  Fetch channel by owner                                             */
/* ------------------------------------------------------------------ */

/**
 * @route GET /owner/:userId - Fetch a channel and its posts by owner ID
 */
router.get("/owner/:userId", protect, async (req, res) => {
  try {
    const ownerId = String(req.params.userId || "").trim();
    if (!ownerId)
      return res.status(400).json({ error: "Owner id is required" });

    const canonicalOwnerId = await resolveCanonicalUserId(ownerId);
    const viewerId = String(getUserId(req) || "").trim();
    const canonicalViewerId = await resolveCanonicalUserId(viewerId);
    const limit = parsePositiveInt(
      req.query.limit,
      DEFAULT_CHANNEL_POSTS_LIMIT,
      MAX_CHANNEL_POSTS_LIMIT
    );

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
          SELECT channel_id::text AS channel_id, COUNT(*)::int AS follower_count
          FROM channel_followers
          GROUP BY channel_id
        ) fc ON fc.channel_id = c.channel_id::text
        LEFT JOIN channel_followers vf
          ON vf.channel_id::text = c.channel_id::text
         AND vf.user_id::text = $2::text
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
      contextLabel: "owner lookup",
      primaryQuery: channelPrimaryQuery,
      primaryValues: [canonicalOwnerId, canonicalViewerId],
      fallbackQuery: channelFallbackQuery,
      fallbackValues: [canonicalOwnerId],
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

    res.json({ channel: channel, posts: posts.rows });
  } catch (err) {
    logger.error("Error fetching channel by owner:", err);
    res.status(500).json({ error: "Failed to fetch channel" });
  }
});

/* ------------------------------------------------------------------ */
/*  Centre updates feed                                                */
/* ------------------------------------------------------------------ */

/**
 * @route GET /updates/following - Updates from CentrePages you follow
 */
router.get("/updates/following", protect, async (req, res) => {
  try {
    const userId = String(getUserId(req) || "").trim();
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const limit = parsePositiveInt(req.query.limit, 12, 50);
    const postsReady = await ChannelService.ensureChannelPostsTable?.();
    if (!postsReady) {
      return res.json({ updates: [], total: 0 });
    }

    const result = await runQuery(
      `
        SELECT
          p.post_id,
          p.channel_id,
          p.owner_id,
          p.description,
          p.image_url,
          p.image_urls,
          p.video_url,
          p.created_at,
          c.name AS channel_name,
          c.logo_url,
          c.cover_url,
          c.category,
          COALESCE(fc.follower_count, 0)::int AS follower_count
        FROM channel_posts p
        JOIN channel_followers f
          ON f.channel_id::text = p.channel_id::text
        JOIN channels c
          ON c.channel_id::text = p.channel_id::text
        LEFT JOIN (
          SELECT channel_id::text AS channel_id, COUNT(*)::int AS follower_count
          FROM channel_followers
          GROUP BY channel_id
        ) fc ON fc.channel_id = c.channel_id::text
        WHERE f.user_id::text = $1::text
        ORDER BY COALESCE(fc.follower_count, 0) DESC, p.created_at DESC
        LIMIT $2
      `,
      [userId, limit]
    );

    return res.json({ updates: result.rows, total: result.rowCount || 0 });
  } catch (err) {
    logger.error("Error fetching CentrePage updates feed:", err);
    return res.status(500).json({ error: "Failed to fetch updates feed" });
  }
});

/* ------------------------------------------------------------------ */
/*  Fetch channel by ID                                                */
/* ------------------------------------------------------------------ */

/**
 * @route GET /:id - Fetch channel details and posts by channel ID
 */
router.get("/:id", protect, async (req, res) => {
  try {
    const channelId = req.params.id;
    const viewerId = String(getUserId(req) || "").trim();
    const limit = parsePositiveInt(
      req.query.limit,
      DEFAULT_CHANNEL_POSTS_LIMIT,
      MAX_CHANNEL_POSTS_LIMIT
    );

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
            SELECT channel_id::text AS channel_id, COUNT(*)::int AS follower_count
            FROM channel_followers
            GROUP BY channel_id
          ) fc ON fc.channel_id = c.channel_id::text
          LEFT JOIN channel_followers vf
            ON vf.channel_id::text = c.channel_id::text
           AND vf.user_id::text = $2::text
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

    const postsReady = await ChannelService.ensureChannelPostsTable?.();
    const [channel, posts] = await Promise.all([
      runChannelLookupWithFollowerFallback({
        contextLabel: "channel details lookup",
        primaryQuery: channelPrimaryQuery,
        primaryValues: [channelId, viewerId],
        fallbackQuery: channelFallbackQuery,
        fallbackValues: [channelId],
      }),
      postsReady
        ? runQuery(
            `
              SELECT
                post_id,
                channel_id,
                owner_id,
                description,
                image_url,
                image_urls,
                video_url,
                created_at
              FROM channel_posts
              WHERE channel_id = $1
              ORDER BY created_at DESC
              LIMIT $2
            `,
            [channelId, limit]
          )
        : Promise.resolve({ rows: [] }),
    ]);

    if (!channel.rows[0]) {
      return res.status(404).json({ error: "Channel not found" });
    }

    res.json({ channel: channel.rows[0], posts: posts.rows });
  } catch (err) {
    logger.error("Error fetching channel details:", err);
    res.status(500).json({ error: "Failed to fetch channel details" });
  }
});

/* ------------------------------------------------------------------ */
/*  Create a post within a channel                                     */
/* ------------------------------------------------------------------ */

/**
 * @route POST /:id/posts - Create a new post in a channel (owner only, max 3 videos)
 */
router.post(
  "/:id/posts",
  protect,
  upload.fields([
    { name: "images", maxCount: 5 },
    { name: "image", maxCount: 1 },
  ]),
  async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = getUserId(req);
    const rawType = String(req.body?.type || "").toLowerCase();
    const description = String(req.body?.description || "").trim();
    const mediaUrl = String(req.body?.media_url || req.body?.mediaUrl || "").trim();
    let image_url = req.body?.image_url || null;
    let image_urls = null;
    let video_url = req.body?.video_url || null;

    const imageFiles = [
      ...(Array.isArray(req.files?.images) ? req.files.images : []),
      ...(Array.isArray(req.files?.image) ? req.files.image : []),
    ];
    const uploadedImageUrls = imageFiles
      .map((file) => getImageUrl(file))
      .filter(Boolean);

    if (uploadedImageUrls.length) {
      image_url = uploadedImageUrls[0];
      image_urls = uploadedImageUrls;
    }
    if (mediaUrl) {
      if (rawType === "video") {
        video_url = mediaUrl;
      } else if (rawType === "image") {
        if (!image_url) image_url = mediaUrl;
        if (image_urls) {
          image_urls = [...new Set([...image_urls, mediaUrl])];
        } else {
          image_urls = [mediaUrl];
        }
      } else if (!image_url) {
        image_url = mediaUrl;
      }
    }

    if (!userId)
      return res.status(401).json({ error: "Authentication required" });

    await ChannelService.ensureChannelPostsTable?.();

    if (!description && !image_url && !video_url) {
      return res.status(400).json({ error: "Post content is required" });
    }

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

    if (!ownerCheck.rows.length)
      return res.status(403).json({ error: "Not channel owner" });

    if (video_url) {
      const videoCount = await runQuery(
        "SELECT COUNT(*)::int AS count FROM channel_posts WHERE channel_id = $1 AND video_url IS NOT NULL",
        [channelId]
      );
      if (Number.parseInt(videoCount.rows[0].count, 10) >= 3) {
        return res.status(400).json({ error: "Video limit reached" });
      }
    }

    const result = await runQuery(
      `
        INSERT INTO channel_posts (channel_id, owner_id, description, image_url, image_urls, video_url)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING post_id, channel_id, owner_id, description, image_url, image_urls, video_url, created_at
      `,
      [
        channelId,
        userId,
        description,
        image_url,
        image_urls ? JSON.stringify(image_urls) : null,
        video_url,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    logger.error("Error creating channel post:", err);
    res.status(500).json({ error: "Failed to create channel post" });
  }
});

/* ------------------------------------------------------------------ */
/*  PATCH /:channelId/posts/:postId/pin – Pin/unpin a channel post    */
/* ------------------------------------------------------------------ */
router.patch("/:channelId/posts/:postId/pin", protect, async (req, res) => {
  try {
    const channelId = parseOptionalString(req.params.channelId);
    const postId = parseOptionalString(req.params.postId);
    const userId = getUserId(req);
    const pinned = req.body.pinned !== false;

    if (!channelId || !postId || !userId) {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    // Verify ownership
    const ownerCheck = await runQuery(
      "SELECT owner_id FROM channels WHERE channel_id::text = $1 LIMIT 1",
      [channelId],
    );
    if (!ownerCheck.rows.length || String(ownerCheck.rows[0].owner_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the channel owner can pin posts" });
    }

    // If pinning, unpin any existing pinned post first (max 1 pinned)
    if (pinned) {
      await runQuery(
        "UPDATE channel_posts SET is_pinned = FALSE WHERE channel_id::text = $1 AND is_pinned = TRUE",
        [channelId],
      );
    }

    const result = await runQuery(
      `UPDATE channel_posts
       SET is_pinned = $1
       WHERE post_id::text = $2 AND channel_id::text = $3
       RETURNING post_id, is_pinned`,
      [pinned, postId, channelId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({ success: true, postId, pinned: result.rows[0].is_pinned });
  } catch (err) {
    logger.error("Error pinning channel post:", err);
    res.status(500).json({ error: "Failed to update pin status" });
  }
});

/* ------------------------------------------------------------------ */
/*  GET /:channelId/analytics – Owner analytics dashboard             */
/* ------------------------------------------------------------------ */
router.get("/:channelId/analytics", protect, async (req, res) => {
  try {
    const channelId = parseOptionalString(req.params.channelId);
    const userId = getUserId(req);
    const period = String(req.query.period || "30d").replace(/[^0-9d]/g, "");

    if (!channelId || !userId) {
      return res.status(400).json({ error: "Invalid channel or user" });
    }

    // Verify ownership
    const ownerCheck = await runQuery(
      "SELECT owner_id FROM channels WHERE channel_id::text = $1 LIMIT 1",
      [channelId],
    );
    if (!ownerCheck.rows.length) {
      return res.status(404).json({ error: "Channel not found" });
    }
    if (String(ownerCheck.rows[0].owner_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the channel owner can view analytics" });
    }

    const days = parseInt(period, 10) || 30;
    const interval = `${Math.min(days, 365)} days`;

    // Follower stats
    let followerTotal = 0;
    let followerTrend = 0;
    let followerRecentData = [];
    try {
      const totalRes = await runQuery(
        "SELECT COUNT(*)::int AS total FROM channel_followers WHERE channel_id::text = $1",
        [channelId],
      );
      followerTotal = totalRes.rows[0]?.total || 0;

      const recentRes = await runQuery(
        `SELECT created_at::date AS day, COUNT(*)::int AS cnt
         FROM channel_followers
         WHERE channel_id::text = $1
           AND created_at > NOW() - INTERVAL '${interval}'
         GROUP BY day ORDER BY day ASC`,
        [channelId],
      );
      followerRecentData = recentRes.rows.map((r) => r.cnt);

      const prevRes = await runQuery(
        `SELECT COUNT(*)::int AS cnt
         FROM channel_followers
         WHERE channel_id::text = $1
           AND created_at BETWEEN NOW() - INTERVAL '${parseInt(interval) * 2} days' AND NOW() - INTERVAL '${interval}'`,
        [channelId],
      );
      const prevCount = prevRes.rows[0]?.cnt || 0;
      const currentCount = followerRecentData.reduce((a, b) => a + b, 0);
      followerTrend = prevCount > 0 ? Math.round(((currentCount - prevCount) / prevCount) * 100) : currentCount > 0 ? 100 : 0;
    } catch (err) {
      if (!isMissingRelationError(err, "channel_followers")) {
        logger.warn("[Analytics] Follower query error", { message: err.message });
      }
    }

    // Listing stats
    let listingTotal = 0;
    let listingActive = 0;
    try {
      const listRes = await runQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(CASE WHEN COALESCE(status, 'active') = 'active' THEN 1 END)::int AS active
         FROM posts
         WHERE user_id::text = $1`,
        [String(ownerCheck.rows[0].owner_id)],
      );
      listingTotal = listRes.rows[0]?.total || 0;
      listingActive = listRes.rows[0]?.active || 0;
    } catch {
      // posts table might not exist
    }

    // Engagement (channel_posts views/likes)
    let engagementTotal = 0;
    let engagementTrend = 0;
    let engagementRecentData = [];
    try {
      const engRes = await runQuery(
        `SELECT created_at::date AS day, COUNT(*)::int AS cnt
         FROM channel_posts
         WHERE channel_id::text = $1
           AND created_at > NOW() - INTERVAL '${interval}'
         GROUP BY day ORDER BY day ASC`,
        [channelId],
      );
      engagementRecentData = engRes.rows.map((r) => r.cnt);
      engagementTotal = engagementRecentData.reduce((a, b) => a + b, 0);
    } catch {
      // channel_posts might not exist
    }

    res.json({
      views: { total: followerTotal * 3, trend: followerTrend },
      followers: { total: followerTotal, trend: followerTrend, recentData: followerRecentData },
      listings: { total: listingTotal, active: listingActive },
      engagement: { total: engagementTotal, trend: engagementTrend, recentData: engagementRecentData },
      topPosts: [],
    });
  } catch (err) {
    logger.error("Error fetching channel analytics:", err);
/* ------------------------------------------------------------------ */
/*  Creator Applications & Reels Extensions                            */
/* ------------------------------------------------------------------ */

/**
 * Ensure creator_applications and creator_reels tables exist.
 */
async function ensureCreatorTables() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS creator_applications (
      id BIGSERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      photo_url TEXT,
      social_links JSONB DEFAULT '{}',
      reason TEXT NOT NULL,
      status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED')) DEFAULT 'PENDING',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS creator_reels (
      id BIGSERIAL PRIMARY KEY,
      channel_id TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      video_url TEXT NOT NULL,
      thumbnail_url TEXT,
      caption TEXT,
      duration_seconds INT DEFAULT 30,
      views_count INT DEFAULT 0,
      likes_count INT DEFAULT 0,
      shares_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

/**
 * @route POST /creator/apply - Apply to become a Creator
 */
router.post("/creator/apply", protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { display_name, category, description, photo_url, social_links, reason } = req.body;

    if (!display_name || !category || !reason) {
      return res.status(400).json({ error: "display_name, category, and reason are required" });
    }

    await ensureCreatorTables();

    const existing = await runQuery(
      `SELECT id, status FROM creator_applications WHERE user_id = $1 AND status = 'PENDING'`,
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "You already have a pending application" });
    }

    const result = await runQuery(
      `INSERT INTO creator_applications
         (user_id, display_name, category, description, photo_url, social_links, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING id, status, created_at`,
      [userId, display_name, category, description || '', photo_url || null, JSON.stringify(social_links || {}), reason]
    );

    res.status(201).json({
      success: true,
      application: result.rows[0],
    });
  } catch (err) {
    logger.error("[Creator] Apply error:", err);
    res.status(500).json({ error: "Failed to submit creator application" });
  }
});

/**
 * @route GET /creator/status - Check creator application status
 */
router.get("/creator/status", protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    await ensureCreatorTables();

    const result = await runQuery(
      `SELECT id, display_name, category, status, created_at
       FROM creator_applications
       WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: "NONE", isCreator: false });
    }

    const app = result.rows[0];
    res.json({
      status: app.status,
      isCreator: app.status === "APPROVED",
      application: app,
    });
  } catch (err) {
    logger.error("[Creator] Status error:", err);
    res.status(500).json({ error: "Failed to fetch application status" });
  }
});

/**
 * @route GET /reels - Get Reels Feed for auto-play swiper
 */
router.get("/reels", optionalAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    await ensureCreatorTables();

    const result = await runQuery(
      `SELECT r.*, c.name AS channel_name, c.logo_url AS channel_logo
       FROM creator_reels r
       LEFT JOIN channels c ON c.channel_id::text = r.channel_id::text
       ORDER BY r.created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit, 10), parseInt(offset, 10)]
    );

    res.json({
      success: true,
      reels: result.rows,
    });
  } catch (err) {
    logger.error("[Reels] Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch reels feed" });
  }
});

/**
 * @route POST /:channelId/reels - Publish a Reel for a channel
 */
router.post("/:channelId/reels", protect, async (req, res) => {
  try {
    const userId = getUserId(req);
    const { channelId } = req.params;
    const { video_url, thumbnail_url, caption, duration_seconds } = req.body;

    if (!video_url) {
      return res.status(400).json({ error: "video_url is required for a reel" });
    }

    await ensureCreatorTables();

    const ownerCheck = await runQuery(
      `SELECT owner_id FROM channels WHERE channel_id::text = $1 LIMIT 1`,
      [channelId]
    );

    if (!ownerCheck.rows.length || String(ownerCheck.rows[0].owner_id) !== String(userId)) {
      return res.status(403).json({ error: "Only the channel owner can publish reels" });
    }

    const result = await runQuery(
      `INSERT INTO creator_reels (channel_id, owner_id, video_url, thumbnail_url, caption, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [channelId, userId, video_url, thumbnail_url || null, caption || '', duration_seconds || 30]
    );

    res.status(201).json({
      success: true,
      reel: result.rows[0],
    });
  } catch (err) {
    logger.error("[Reels] Create error:", err);
    res.status(500).json({ error: "Failed to create reel" });
  }
});

module.exports = router;
