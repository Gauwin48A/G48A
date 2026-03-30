/**
 * Channel Service
 *
 * CRUD operations for channels: create, edit, soft-delete,
 * follow/unfollow, and listing (all, owned, followed).
 */

const { runQuery } = require("../utils/dbHelpers");
const { filterProfanity } = require("../utils/profanity");
const logger = require("../utils/logger");
let channelFollowersReadyPromise = null;
let channelAdminsReadyPromise = null;
let channelSchemaReadyPromise = null;
let channelPostsReadyPromise = null;

/* ------------------------------------------------------------------ */
/*  SQL fragments                                                     */
/* ------------------------------------------------------------------ */

const CHANNEL_COLUMNS = `
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
`;

const CHANNEL_ACTIVE_PREDICATE = `
  LOWER(
    COALESCE(
      NULLIF(to_jsonb(c)->>'is_active', ''),
      NULLIF(to_jsonb(c)->>'is_public', ''),
      'true'
    )
  ) IN ('true', 't', '1', 'yes')
`;

const CHANNEL_READ_COLUMNS = `
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
  ${CHANNEL_ACTIVE_PREDICATE} AS is_active,
  c.created_at
`;

const CHANNEL_OWNER_NAME_COLUMN = `
  COALESCE(
    NULLIF(to_jsonb(u)->>'name', ''),
    NULLIF(to_jsonb(u)->>'full_name', ''),
    NULLIF(to_jsonb(u)->>'username', ''),
    c.owner_id::text
  ) AS owner_name
`;

const USER_TIER_COLUMN = `
  LOWER(
    COALESCE(
      NULLIF(to_jsonb(u)->>'current_plan', ''),
      NULLIF(to_jsonb(u)->>'tier', ''),
      NULLIF(to_jsonb(u)->>'tier_plan', ''),
      'basic'
    )
  )
`;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Check if a Postgres error is a missing-relation error for a given table.
 * @param {Error} error
 * @param {string} relationName
 * @returns {boolean}
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
      logger.warn("[ChannelService] Unable to auto-provision channel_followers", {
        message: error.message,
      });
      return false;
    }
  })();

  return channelFollowersReadyPromise;
}

/**
 * Ensure channel_admins table exists (cached).
 * @returns {Promise<boolean>}
 */
async function ensureChannelAdminsTable() {
  if (channelAdminsReadyPromise) {
    return channelAdminsReadyPromise;
  }

  channelAdminsReadyPromise = (async () => {
    try {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS channel_admins (
          channel_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'owner',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (channel_id, user_id)
        )`
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_channel_admins_user ON channel_admins(user_id)"
      );
      return true;
    } catch (error) {
      logger.warn("[ChannelService] Unable to auto-provision channel_admins", {
        message: error.message,
      });
      return false;
    }
  })();

  return channelAdminsReadyPromise;
}

/**
 * Ensure channels table has CentrePage columns (cached).
 * @returns {Promise<boolean>}
 */
async function ensureChannelSchema() {
  if (channelSchemaReadyPromise) {
    return channelSchemaReadyPromise;
  }

  channelSchemaReadyPromise = (async () => {
    try {
      await runQuery(
        "ALTER TABLE channels ADD COLUMN IF NOT EXISTS category TEXT"
      );
      await runQuery(
        "ALTER TABLE channels ADD COLUMN IF NOT EXISTS logo_url TEXT"
      );
      await runQuery(
        "ALTER TABLE channels ADD COLUMN IF NOT EXISTS cover_url TEXT"
      );
      await runQuery(
        "ALTER TABLE channels ADD COLUMN IF NOT EXISTS contact_email TEXT"
      );
      await runQuery(
        "ALTER TABLE channels ADD COLUMN IF NOT EXISTS contact_website TEXT"
      );
      await runQuery(
        "ALTER TABLE channels ADD COLUMN IF NOT EXISTS contact_phone TEXT"
      );
      await runQuery(
        "ALTER TABLE channels ADD COLUMN IF NOT EXISTS location TEXT"
      );
      await runQuery(
        "ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"
      );
      return true;
    } catch (error) {
      logger.warn("[ChannelService] Unable to auto-provision channel columns", {
        message: error.message,
      });
      return false;
    }
  })();

  return channelSchemaReadyPromise;
}

/**
 * Ensure channel_posts table exists (cached).
 * @returns {Promise<boolean>}
 */
async function ensureChannelPostsTable() {
  if (channelPostsReadyPromise) {
    return channelPostsReadyPromise;
  }

  channelPostsReadyPromise = (async () => {
    try {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS channel_posts (
          post_id BIGSERIAL PRIMARY KEY,
          channel_id TEXT NOT NULL,
          owner_id TEXT NOT NULL,
          description TEXT,
          image_url TEXT,
          image_urls JSONB,
          video_url TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );
      await runQuery(
        "ALTER TABLE channel_posts ADD COLUMN IF NOT EXISTS image_urls JSONB"
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_created ON channel_posts(channel_id, created_at DESC)"
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_video ON channel_posts(channel_id) WHERE video_url IS NOT NULL"
      );
      return true;
    } catch (error) {
      logger.warn("[ChannelService] Unable to auto-provision channel_posts", {
        message: error.message,
      });
      return false;
    }
  })();

  return channelPostsReadyPromise;
}

/**
 * Run a query that may reference channel_followers, falling back
 * gracefully if that table does not exist.
 * @param {object} params
 * @param {string} params.contextLabel
 * @param {string} params.primaryQuery
 * @param {Array} [params.primaryValues]
 * @param {string} [params.fallbackQuery]
 * @param {Array} [params.fallbackValues]
 * @returns {Promise<pg.QueryResult>}
 */
async function runFollowerAwareQuery({
  contextLabel,
  primaryQuery,
  primaryValues = [],
  fallbackQuery = "",
  fallbackValues = [],
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
      `[ChannelService] channel_followers relation missing during ${contextLabel}; using fallback.`
    );
    if (!fallbackQuery) {
      return { rows: [] };
    }
    return runQuery(fallbackQuery, fallbackValues);
  }
}

/**
 * Normalize an optional text value (trim, empty -> null).
 * Returns undefined if the input is undefined (field not provided).
 * @param {*} value
 * @returns {string|null|undefined}
 */
function normalizeOptionalText(value) {
  if (value === undefined) return undefined;
  const normalized = String(value || "").trim();
  return normalized ? normalized : null;
}

/**
 * Parse a value to boolean, returning null if unrecognized.
 * @param {*} value
 * @returns {boolean|null}
 */
function parseBoolean(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return null;
}

/**
 * Run a query and return the first row or null.
 * @param {string} text
 * @param {Array} values
 * @returns {Promise<object|null>}
 */
async function oneOrNone(text, values = []) {
  const result = await runQuery(text, values);
  return result.rows[0] || null;
}

/**
 * Run a query and return all rows.
 * @param {string} text
 * @param {Array} values
 * @returns {Promise<object[]>}
 */
async function manyOrNone(text, values = []) {
  const result = await runQuery(text, values);
  return result.rows;
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/**
 * Create a new channel. The creator is automatically added as owner admin.
 * @param {object} params
 * @param {string} params.owner_id
 * @param {string} params.name
 * @param {string} [params.description]
 * @param {string} params.category
 * @param {string} [params.logo_url]
 * @param {string} [params.cover_url]
 * @param {string} [params.contact_email]
 * @param {string} [params.contact_website]
 * @param {string} [params.contact_phone]
 * @param {string} [params.location]
 * @returns {Promise<object>} The created channel row.
 */
async function createChannel({
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
}) {
  await ensureChannelSchema();
  const normalizedName = String(name || "").trim();
  const normalizedCategory = String(category || "").trim();
  const normalizedDescription = description ? String(description).trim() : null;

  if (!normalizedName || !normalizedCategory) {
    throw new Error("Channel name and category are required");
  }

  const existingChannel = await oneOrNone(
    "SELECT 1 FROM channels WHERE LOWER(name) = LOWER($1) LIMIT 1",
    [normalizedName]
  );
  if (existingChannel) {
    throw new Error("Channel name already exists");
  }

  const existingCategory = await oneOrNone(
    `SELECT 1
     FROM channels
     WHERE owner_id::text = $1
       AND LOWER(COALESCE(category, '')) = LOWER($2)
     LIMIT 1`,
    [String(owner_id || "").trim(), normalizedCategory]
  );
  if (existingCategory) {
    throw new Error("Only one CentrePage per category is allowed");
  }

  if (
    filterProfanity(normalizedName) ||
    filterProfanity(normalizedDescription || "")
  ) {
    throw new Error("Profanity detected in channel name or description");
  }

  const inserted = await runQuery(
    `INSERT INTO channels (
       owner_id, name, description, category,
       logo_url, cover_url, contact_email,
       contact_website, contact_phone, location
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING ${CHANNEL_COLUMNS}`,
    [
      owner_id,
      normalizedName,
      normalizedDescription,
      normalizedCategory,
      logo_url || null,
      cover_url || null,
      contact_email || null,
      contact_website || null,
      contact_phone || null,
      location || null,
    ]
  );

  const createdChannel = inserted.rows[0];

  const adminsReady = await ensureChannelAdminsTable();
  if (adminsReady) {
    await runQuery(
      `INSERT INTO channel_admins (channel_id, user_id, role)
       VALUES ($1, $2, 'owner')
       ON CONFLICT DO NOTHING`,
      [createdChannel.channel_id, owner_id]
    );
  }

  return createdChannel;
}

/**
 * Edit an existing channel. Only owners and admins are authorized.
 * @param {object} params
 * @param {string} params.channel_id
 * @param {string} params.user_id
 * @param {string} [params.name]
 * @param {string} [params.description]
 * @param {string} [params.category]
 * @param {string} [params.logo_url]
 * @param {string} [params.cover_url]
 * @param {string} [params.contact_email]
 * @param {string} [params.contact_website]
 * @param {string} [params.contact_phone]
 * @param {string} [params.location]
 * @param {boolean} [params.is_active]
 * @returns {Promise<object>} The updated channel row.
 */
async function editChannel({ channel_id, user_id, ...fields }) {
  const channelId = String(channel_id || "").trim();
  const userId = String(user_id || "").trim();

  if (!channelId || !userId) {
    throw new Error("Channel id and user id are required");
  }

  await ensureChannelSchema();
  await ensureChannelAdminsTable();

  const admin = await oneOrNone(
    "SELECT role FROM channel_admins WHERE channel_id = $1 AND user_id = $2 AND role IN ('owner','admin') LIMIT 1",
    [channelId, userId]
  );
  if (!admin) throw new Error("Not authorized");

  const updates = {
    name: fields.name === undefined ? undefined : String(fields.name || "").trim(),
    description:
      fields.description !== undefined
        ? normalizeOptionalText(fields.description)
        : normalizeOptionalText(fields.bio),
    category:
      fields.category === undefined
        ? undefined
        : String(fields.category || "").trim(),
    logo_url:
      fields.logo_url !== undefined
        ? normalizeOptionalText(fields.logo_url)
        : normalizeOptionalText(fields.profile_pic),
    cover_url: normalizeOptionalText(fields.cover_url),
    contact_email: normalizeOptionalText(fields.contact_email),
    contact_website: normalizeOptionalText(fields.contact_website),
    contact_phone: normalizeOptionalText(fields.contact_phone),
    location: normalizeOptionalText(fields.location),
  };

  if (fields.is_active !== undefined) {
    const parsedActive = parseBoolean(fields.is_active);
    if (parsedActive === null) {
      throw new Error("is_active must be a boolean");
    }
    updates.is_active = parsedActive;
  }

  if (updates.name !== undefined && !updates.name) {
    throw new Error("Channel name is required");
  }
  if (updates.category !== undefined && !updates.category) {
    throw new Error("Channel category is required");
  }

  if (updates.name && filterProfanity(updates.name)) {
    throw new Error("Profanity detected in channel name or description");
  }
  if (updates.description && filterProfanity(updates.description)) {
    throw new Error("Profanity detected in channel name or description");
  }

  if (updates.name) {
    const existingChannel = await oneOrNone(
      "SELECT 1 FROM channels WHERE LOWER(name) = LOWER($1) AND channel_id <> $2 LIMIT 1",
      [updates.name, channelId]
    );
    if (existingChannel) {
      throw new Error("Channel name already exists");
    }
  }

  if (updates.category) {
    const categoryConflict = await oneOrNone(
      `SELECT 1
       FROM channels
       WHERE owner_id::text = $1
         AND LOWER(COALESCE(category, '')) = LOWER($2)
         AND channel_id <> $3
       LIMIT 1`,
      [userId, updates.category, channelId]
    );
    if (categoryConflict) {
      throw new Error("Only one CentrePage per category is allowed");
    }
  }

  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error("No valid fields to update");
  }

  const setFragments = entries.map(
    ([column], index) => `${column} = $${index + 1}`
  );
  const values = entries.map(([, value]) => value);
  values.push(channelId);

  const updated = await runQuery(
    `UPDATE channels
     SET ${setFragments.join(", ")}
     WHERE channel_id = $${values.length}
     RETURNING ${CHANNEL_COLUMNS}`,
    values
  );

  if (!updated.rows[0]) {
    throw new Error("Channel not found");
  }

  return updated.rows[0];
}

/**
 * Soft-delete a channel (set is_active = FALSE). Only the owner can do this.
 * @param {string} channel_id
 * @param {string} user_id
 */
async function deleteChannel(channel_id, user_id) {
  await ensureChannelAdminsTable();
  const owner = await oneOrNone(
    "SELECT role FROM channel_admins WHERE channel_id = $1 AND user_id = $2 AND role = 'owner' LIMIT 1",
    [channel_id, user_id]
  );
  if (!owner) throw new Error("Not authorized");

  await runQuery(
    "UPDATE channels SET is_active = FALSE WHERE channel_id = $1",
    [channel_id]
  );
}

/**
 * Follow a channel.
 * @param {string} channel_id
 * @param {string} user_id
 */
async function followChannel(channel_id, user_id) {
  const ready = await ensureChannelFollowersTable();
  if (!ready) {
    throw new Error("channel_followers table unavailable");
  }
  await runQuery(
    "INSERT INTO channel_followers (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [channel_id, user_id]
  );
}

/**
 * Unfollow a channel.
 * @param {string} channel_id
 * @param {string} user_id
 */
async function unfollowChannel(channel_id, user_id) {
  const ready = await ensureChannelFollowersTable();
  if (!ready) {
    throw new Error("channel_followers table unavailable");
  }
  const result = await runQuery(
    "DELETE FROM channel_followers WHERE channel_id = $1 AND user_id = $2",
    [channel_id, user_id]
  );
  return (result.rowCount || 0) > 0;
}

/**
 * List all active channels with follower counts and follow status for a viewer.
 * @param {string} [viewerUserId=""]
 * @returns {Promise<object[]>}
 */
async function listChannels(viewerUserId = "") {
  const viewerId = String(viewerUserId || "").trim();

  const primaryResult = await runFollowerAwareQuery({
    contextLabel: "list channels",
    primaryQuery: `
      SELECT
        ${CHANNEL_READ_COLUMNS},
        ${CHANNEL_OWNER_NAME_COLUMN},
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
       AND vf.user_id::text = $1::text
      WHERE ${CHANNEL_ACTIVE_PREDICATE}
      ORDER BY c.created_at DESC
    `,
    primaryValues: [viewerId],
    fallbackQuery: `
      SELECT
        ${CHANNEL_READ_COLUMNS},
        ${CHANNEL_OWNER_NAME_COLUMN},
        0::int AS follower_count,
        FALSE AS is_following
      FROM channels c
      LEFT JOIN users u
        ON COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = c.owner_id::text
      WHERE ${CHANNEL_ACTIVE_PREDICATE}
      ORDER BY c.created_at DESC
    `,
  });

  return primaryResult.rows;
}

/**
 * List all active channels owned by users on a specific tier.
 * @param {string} [viewerUserId=""]
 * @param {string} [tier="premium"]
 * @returns {Promise<object[]>}
 */
async function listChannelsByTier(viewerUserId = "", tier = "premium") {
  const viewerId = String(viewerUserId || "").trim();
  const normalizedTier = String(tier || "").trim().toLowerCase();

  if (!normalizedTier) {
    return listChannels(viewerUserId);
  }

  const primaryResult = await runFollowerAwareQuery({
    contextLabel: "list channels by tier",
    primaryQuery: `
      SELECT
        ${CHANNEL_READ_COLUMNS},
        ${CHANNEL_OWNER_NAME_COLUMN},
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
       AND vf.user_id::text = $1::text
      WHERE ${CHANNEL_ACTIVE_PREDICATE}
        AND ${USER_TIER_COLUMN} = $2
      ORDER BY c.created_at DESC
    `,
    primaryValues: [viewerId, normalizedTier],
    fallbackQuery: `
      SELECT
        ${CHANNEL_READ_COLUMNS},
        ${CHANNEL_OWNER_NAME_COLUMN},
        0::int AS follower_count,
        FALSE AS is_following
      FROM channels c
      LEFT JOIN users u
        ON COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = c.owner_id::text
      WHERE ${CHANNEL_ACTIVE_PREDICATE}
        AND ${USER_TIER_COLUMN} = $1
      ORDER BY c.created_at DESC
    `,
    fallbackValues: [normalizedTier],
  });

  return primaryResult.rows;
}

/**
 * List all active channels owned by a user.
 * @param {string} user_id
 * @returns {Promise<object[]>}
 */
async function listUserChannels(user_id) {
  return manyOrNone(
    `SELECT ${CHANNEL_READ_COLUMNS}
     FROM channels c
     WHERE c.owner_id::text = $1
       AND ${CHANNEL_ACTIVE_PREDICATE}
     ORDER BY c.created_at DESC`,
    [String(user_id || "").trim()]
  );
}

/**
 * List all active channels a user is following.
 * @param {string} user_id
 * @returns {Promise<object[]>}
 */
async function listFollowedChannels(user_id) {
  const viewerId = String(user_id || "").trim();

  const followedResult = await runFollowerAwareQuery({
    contextLabel: "list followed channels",
    primaryQuery: `
      SELECT
        ${CHANNEL_READ_COLUMNS},
        ${CHANNEL_OWNER_NAME_COLUMN},
        COALESCE(fc.follower_count, 0)::int AS follower_count,
        TRUE AS is_following
      FROM channels c
      JOIN channel_followers f ON c.channel_id::text = f.channel_id::text
      LEFT JOIN users u
        ON COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = c.owner_id::text
      LEFT JOIN (
        SELECT channel_id::text AS channel_id, COUNT(*)::int AS follower_count
        FROM channel_followers
        GROUP BY channel_id
      ) fc ON fc.channel_id = c.channel_id::text
      WHERE f.user_id::text = $1::text
        AND ${CHANNEL_ACTIVE_PREDICATE}
      ORDER BY c.created_at DESC
    `,
    primaryValues: [viewerId],
  });

  return followedResult.rows;
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

module.exports = {
  createChannel,
  editChannel,
  deleteChannel,
  followChannel,
  unfollowChannel,
  ensureChannelPostsTable,
  listChannels,
  listChannelsByTier,
  listUserChannels,
  listFollowedChannels,
};
