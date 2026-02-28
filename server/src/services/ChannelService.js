const pool = require('../config/db');
const { filterProfanity } = require('../utils/profanity');

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

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
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
  const admin = await oneOrNone(
    "SELECT role FROM channel_admins WHERE channel_id = $1 AND user_id = $2 AND role IN ('owner','admin') LIMIT 1",
    [channel_id, user_id]
  );
  if (!admin) throw new Error('Not authorized');
  // ...update logic (fields: name, desc, logo, cover, etc.)
  // ...profanity filter
  // ...return updated channel
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
async function listChannels() {
  return manyOrNone(
    `
      SELECT ${CHANNEL_COLUMNS}
      FROM channels
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `
  );
}

async function listUserChannels(user_id) {
  return manyOrNone(
    `
      SELECT ${CHANNEL_COLUMNS}
      FROM channels
      WHERE owner_id = $1 AND is_active = TRUE
      ORDER BY created_at DESC
    `,
    [user_id]
  );
}

async function listFollowedChannels(user_id) {
  return manyOrNone(
    `
      SELECT
        c.channel_id,
        c.owner_id,
        c.name,
        c.description,
        c.category,
        c.logo_url,
        c.cover_url,
        c.contact_email,
        c.contact_website,
        c.contact_phone,
        c.location,
        c.is_active,
        c.created_at
      FROM channels c
      JOIN channel_followers f ON c.channel_id = f.channel_id
      WHERE f.user_id = $1
        AND c.is_active = TRUE
      ORDER BY c.created_at DESC
    `,
    [user_id]
  );
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
