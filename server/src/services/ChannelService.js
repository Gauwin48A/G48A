const db = require('../db');
const { filterProfanity } = require('../utils/profanity');

// Create a channel (with validation, profanity filter, unique name)
async function createChannel({ owner_id, name, description, category, logo_url, cover_url, contact_email, contact_website, contact_phone, location }) {
  if (!name || !category) throw new Error('Channel name and category are required');
  if (await db.oneOrNone('SELECT 1 FROM channels WHERE LOWER(name) = LOWER($1)', [name])) throw new Error('Channel name already exists');
  if (filterProfanity(name) || filterProfanity(description)) throw new Error('Profanity detected in channel name or description');
  const result = await db.one(
    `INSERT INTO channels (owner_id, name, description, category, logo_url, cover_url, contact_email, contact_website, contact_phone, location)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [owner_id, name, description, category, logo_url, cover_url, contact_email, contact_website, contact_phone, location]
  );
  // Add owner as channel admin
  await db.none('INSERT INTO channel_admins (channel_id, user_id, role) VALUES ($1, $2, $3)', [result.id, owner_id, 'owner']);
  return result;
}

// Edit channel (owner/admin only)
async function editChannel({ channel_id, user_id, ...fields }) {
  const admin = await db.oneOrNone('SELECT * FROM channel_admins WHERE channel_id=$1 AND user_id=$2 AND role IN (\'owner\',\'admin\')', [channel_id, user_id]);
  if (!admin) throw new Error('Not authorized');
  // ...update logic (fields: name, desc, logo, cover, etc.)
  // ...profanity filter
  // ...return updated channel
}

// Delete/deactivate channel (owner only)
async function deleteChannel(channel_id, user_id) {
  const owner = await db.oneOrNone('SELECT * FROM channel_admins WHERE channel_id=$1 AND user_id=$2 AND role=\'owner\'', [channel_id, user_id]);
  if (!owner) throw new Error('Not authorized');
  await db.none('UPDATE channels SET is_active=FALSE WHERE id=$1', [channel_id]);
}

// Follow/unfollow channel
async function followChannel(channel_id, user_id) {
  await db.none('INSERT INTO channel_followers (channel_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [channel_id, user_id]);
}
async function unfollowChannel(channel_id, user_id) {
  await db.none('DELETE FROM channel_followers WHERE channel_id=$1 AND user_id=$2', [channel_id, user_id]);
}

// List all channels, user channels, followed channels
async function listChannels() {
  return db.manyOrNone('SELECT * FROM channels WHERE is_active=TRUE');
}
async function listUserChannels(user_id) {
  return db.manyOrNone('SELECT * FROM channels WHERE owner_id=$1 AND is_active=TRUE', [user_id]);
}
async function listFollowedChannels(user_id) {
  return db.manyOrNone('SELECT c.* FROM channels c JOIN channel_followers f ON c.id=f.channel_id WHERE f.user_id=$1 AND c.is_active=TRUE', [user_id]);
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
