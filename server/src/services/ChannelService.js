const pool = require('../config/db');
const { filterProfanity } = require('../utils/profanity');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
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

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function isMissingRelationError(error, relationName) {
  return (
    String(error?.code || '').toUpperCase() === '42P01'
    && String(error?.message || '').toLowerCase().includes(String(relationName || '').toLowerCase())
  );
}

async function runFollowerAwareQuery({
  contextLabel,
  primaryQuery,
  primaryValues = [],
  fallbackQuery = '',
  fallbackValues = []
}) {
  try {
    return await runQuery(primaryQuery, primaryValues);
  } catch (error) {
    if (!isMissingRelationError(error, 'channel_followers')) {
      throw error;
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

function normalizeOptionalText(value) {
  if (value === undefined) return undefined;
  const normalized = String(value || '').trim();
  return normalized ? normalized : null;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
    return null;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }
  return null;
}

async function oneOrNone(text, values = []) {
  const result = await runQuery(text, values);
  return result.rows[0] || null;
}

async function manyOrNone(text, values = []) {
  const result = await runQuery(text, values);
  return result.rows;
}

// Create a channel (with validation, profanity filter, unique name)
async function createChannel({ owner_id, name, description, category, logo_url, cover_url, contact_email, contact_website, contact_phone, location }) {
  const normalizedName = String(name || '').trim();
  const normalizedCategory = String(category || '').trim();
  const normalizedDescription = description ? String(description).trim() : null;

  if (!normalizedName || !normalizedCategory) {
    throw new Error('Channel name and category are required');
  }

  const existingChannel = await oneOrNone(
    'SELECT 1 FROM channels WHERE LOWER(name) = LOWER($1) LIMIT 1',
    [normalizedName]
  );
  if (existingChannel) {
    throw new Error('Channel name already exists');
  }

  if (filterProfanity(normalizedName) || filterProfanity(normalizedDescription || '')) {
    throw new Error('Profanity detected in channel name or description');
  }

  const inserted = await runQuery(
    `
      INSERT INTO channels (
        owner_id,
        name,
        description,
        category,
        logo_url,
        cover_url,
        contact_email,
        contact_website,
        contact_phone,
        location
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING ${CHANNEL_COLUMNS}
    `,
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
      location || null
    ]
  );

  const createdChannel = inserted.rows[0];
  await runQuery(
    `
      INSERT INTO channel_admins (channel_id, user_id, role)
      VALUES ($1, $2, 'owner')
      ON CONFLICT DO NOTHING
    `,
    [createdChannel.channel_id, owner_id]
  );

  return createdChannel;
}

// Edit channel (owner/admin only)
async function editChannel({ channel_id, user_id, ...fields }) {
  const channelId = String(channel_id || '').trim();
  const userId = String(user_id || '').trim();
  if (!channelId || !userId) {
    throw new Error('Channel id and user id are required');
  }

  const admin = await oneOrNone(
    "SELECT role FROM channel_admins WHERE channel_id = $1 AND user_id = $2 AND role IN ('owner','admin') LIMIT 1",
    [channelId, userId]
  );
  if (!admin) throw new Error('Not authorized');

  const updates = {
    name: fields.name === undefined ? undefined : String(fields.name || '').trim(),
    description: fields.description !== undefined ? normalizeOptionalText(fields.description) : normalizeOptionalText(fields.bio),
    category: fields.category === undefined ? undefined : String(fields.category || '').trim(),
    logo_url: fields.logo_url !== undefined ? normalizeOptionalText(fields.logo_url) : normalizeOptionalText(fields.profile_pic),
    cover_url: normalizeOptionalText(fields.cover_url),
    contact_email: normalizeOptionalText(fields.contact_email),
    contact_website: normalizeOptionalText(fields.contact_website),
    contact_phone: normalizeOptionalText(fields.contact_phone),
    location: normalizeOptionalText(fields.location)
  };

  if (fields.is_active !== undefined) {
    const parsedActive = parseBoolean(fields.is_active);
    if (parsedActive === null) {
      throw new Error('is_active must be a boolean');
    }
    updates.is_active = parsedActive;
  }

  if (updates.name !== undefined && !updates.name) {
    throw new Error('Channel name is required');
  }
  if (updates.category !== undefined && !updates.category) {
    throw new Error('Channel category is required');
  }
  if (updates.name && filterProfanity(updates.name)) {
    throw new Error('Profanity detected in channel name or description');
  }
  if (updates.description && filterProfanity(updates.description)) {
    throw new Error('Profanity detected in channel name or description');
  }

  if (updates.name) {
    const existingChannel = await oneOrNone(
      'SELECT 1 FROM channels WHERE LOWER(name) = LOWER($1) AND channel_id <> $2 LIMIT 1',
      [updates.name, channelId]
    );
    if (existingChannel) {
      throw new Error('Channel name already exists');
    }
  }

  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error('No valid fields to update');
  }

  const setFragments = entries.map(([column], index) => `${column} = $${index + 1}`);
  const values = entries.map(([, value]) => value);
  values.push(channelId);

  const updated = await runQuery(
    `
      UPDATE channels
      SET ${setFragments.join(', ')}
      WHERE channel_id = $${values.length}
      RETURNING ${CHANNEL_COLUMNS}
    `,
    values
  );

  if (!updated.rows[0]) {
    throw new Error('Channel not found');
  }

  return updated.rows[0];
}

// Delete/deactivate channel (owner only)
async function deleteChannel(channel_id, user_id) {
  const owner = await oneOrNone(
    "SELECT role FROM channel_admins WHERE channel_id = $1 AND user_id = $2 AND role = 'owner' LIMIT 1",
    [channel_id, user_id]
  );
  if (!owner) throw new Error('Not authorized');

  await runQuery(
    'UPDATE channels SET is_active = FALSE WHERE channel_id = $1',
    [channel_id]
  );
}

// Follow/unfollow channel
async function followChannel(channel_id, user_id) {
  await runQuery(
    'INSERT INTO channel_followers (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [channel_id, user_id]
  );
}

async function unfollowChannel(channel_id, user_id) {
  await runQuery(
    'DELETE FROM channel_followers WHERE channel_id = $1 AND user_id = $2',
    [channel_id, user_id]
  );
}

// List all channels, user channels, followed channels
async function listChannels(viewerUserId = '') {
  const viewerId = String(viewerUserId || '').trim();
  const primaryResult = await runFollowerAwareQuery({
    contextLabel: 'list channels',
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
        SELECT channel_id, COUNT(*)::int AS follower_count
        FROM channel_followers
        GROUP BY channel_id
      ) fc ON fc.channel_id = c.channel_id
      LEFT JOIN channel_followers vf
        ON vf.channel_id = c.channel_id
       AND vf.user_id::text = $1
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
    `
  });

  return primaryResult.rows;
}

async function listUserChannels(user_id) {
  return manyOrNone(
    `
      SELECT ${CHANNEL_READ_COLUMNS}
      FROM channels c
      WHERE c.owner_id::text = $1
        AND ${CHANNEL_ACTIVE_PREDICATE}
      ORDER BY c.created_at DESC
    `,
    [String(user_id || '').trim()]
  );
}

async function listFollowedChannels(user_id) {
  const viewerId = String(user_id || '').trim();
  const followedResult = await runFollowerAwareQuery({
    contextLabel: 'list followed channels',
    primaryQuery: `
      SELECT
        ${CHANNEL_READ_COLUMNS},
        ${CHANNEL_OWNER_NAME_COLUMN},
        COALESCE(fc.follower_count, 0)::int AS follower_count,
        TRUE AS is_following
      FROM channels c
      JOIN channel_followers f ON c.channel_id = f.channel_id
      LEFT JOIN users u
        ON COALESCE(NULLIF(to_jsonb(u)->>'user_id', ''), NULLIF(to_jsonb(u)->>'id', '')) = c.owner_id::text
      LEFT JOIN (
        SELECT channel_id, COUNT(*)::int AS follower_count
        FROM channel_followers
        GROUP BY channel_id
      ) fc ON fc.channel_id = c.channel_id
      WHERE f.user_id::text = $1
        AND ${CHANNEL_ACTIVE_PREDICATE}
      ORDER BY c.created_at DESC
    `,
    primaryValues: [viewerId]
  });

  return followedResult.rows;
}

module.exports = {
  createChannel,
  editChannel,
  deleteChannel,
  followChannel,
  unfollowChannel,
  listChannels,
  listUserChannels,
  listFollowedChannels
};
