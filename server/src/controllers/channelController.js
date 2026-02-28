const pool = require('../config/db');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function getUserId(req) {
  return req.user?.id || req.user?.userId || req.user?.user_id || null;
}

exports.createChannel = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    // Check if user is premium
    const userRes = await runQuery(
      'SELECT role, name, username, bio, profile_pic FROM users WHERE id = $1',
      [userId]
    );
    if (!userRes.rows[0] || userRes.rows[0].role !== 'premium') {
      return res.status(403).json({ error: 'Channel creation is available for Premium Users only.' });
    }
    // Check if channel already exists
    const existing = await runQuery('SELECT 1 FROM channels WHERE user_id = $1 LIMIT 1', [userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Channel already exists.' });
    }
    // Use profile info
    const { name, username, bio, profile_pic } = userRes.rows[0];
    const result = await runQuery(
      `
        INSERT INTO channels (user_id, name, username, bio, profile_pic)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, user_id, name, username, bio, profile_pic, created_at, updated_at
      `,
      [userId, name, username, bio, profile_pic]
    );
    // Assign role
    await runQuery('UPDATE users SET role = $1 WHERE id = $2', ['content_creator', userId]);
    res.json({ channel: result.rows[0], message: 'Channel created successfully.' });
  } catch (err) {
    logger.error('Create channel error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getChannelByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await runQuery(
      `
        SELECT id, user_id, name, username, bio, profile_pic, created_at, updated_at
        FROM channels
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );
    if (!result.rows[0]) {
      logger.error('Channel not found for user:', userId);
      return res.status(404).json({ error: 'Channel not found', fallback: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Get channel by user error:', err);
    res.status(500).json({ error: err.message, fallback: null });
  }
};

exports.updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = getUserId(req);
    // Only owner can update
    const channel = await runQuery('SELECT user_id FROM channels WHERE id = $1', [channelId]);
    if (!channel.rows[0] || String(channel.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { name, bio, profile_pic } = req.body;
    const result = await runQuery(
      `
        UPDATE channels
        SET name = $1, bio = $2, profile_pic = $3
        WHERE id = $4
        RETURNING id, user_id, name, username, bio, profile_pic, created_at, updated_at
      `,
      [name, bio, profile_pic, channelId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Update channel error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.createChannelPost = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = getUserId(req);
    // Only owner can post
    const channel = await runQuery('SELECT user_id FROM channels WHERE id = $1', [channelId]);
    if (!channel.rows[0] || String(channel.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Enforce daily limits (1 video, multiple images)
    const today = new Date();
    today.setHours(0,0,0,0);
    const videoCount = await runQuery(
      `SELECT COUNT(*) FROM posts WHERE channel_id = $1 AND type = 'video' AND posted_date >= $2`,
      [channelId, today]
    );
    if (req.body.type === 'video' && Number.parseInt(videoCount.rows[0].count, 10) >= 1) {
      return res.status(400).json({ error: 'Daily video upload limit reached.' });
    }
    // Insert post
    const { content, type, media_url } = req.body;
    const result = await runQuery(
      `
        INSERT INTO posts (user_id, channel_id, content, type, media_url, posted_date)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING post_id, user_id, channel_id, content, type, media_url, posted_date
      `,
      [userId, channelId, content, type, media_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    logger.error('Create channel post error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllChannels = async (req, res) => {
  try {
    const result = await runQuery(`
      SELECT
        c.*,
        u.name AS owner_name,
        COALESCE(fc.follower_count, 0) AS follower_count
      FROM channels c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN (
        SELECT channel_id, COUNT(*)::int AS follower_count
        FROM channel_followers
        GROUP BY channel_id
      ) fc ON fc.channel_id = c.id
    `);
    res.json(result.rows);
  } catch (err) {
    logger.error('Get all channels error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.followChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const deleted = await runQuery(
      'DELETE FROM channel_followers WHERE channel_id = $1 AND user_id = $2 RETURNING 1',
      [channelId, userId]
    );
    if (deleted.rowCount > 0) {
      return res.json({ message: 'Unfollowed channel' });
    }

    await runQuery(
      'INSERT INTO channel_followers (channel_id, user_id) VALUES ($1, $2)',
      [channelId, userId]
    );
    return res.json({ message: 'Followed channel' });
  } catch (err) {
    logger.error('Follow channel error:', err);
    res.status(500).json({ error: err.message });
  }
};
