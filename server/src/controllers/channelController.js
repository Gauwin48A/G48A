const pool = require('../config/db');

exports.createChannel = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    // Check if user is premium
    const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (!userRes.rows[0] || userRes.rows[0].role !== 'premium') {
      return res.status(403).json({ error: 'Channel creation is available for Premium Users only.' });
    }
    // Check if channel already exists
    const existing = await pool.query('SELECT * FROM channels WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Channel already exists.' });
    }
    // Use profile info
    const { name, username, bio, profile_pic } = userRes.rows[0];
    const result = await pool.query(
      'INSERT INTO channels (user_id, name, username, bio, profile_pic) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, name, username, bio, profile_pic]
    );
    // Assign role
    await pool.query('UPDATE users SET role = $1 WHERE id = $2', ['content_creator', userId]);
    res.json({ channel: result.rows[0], message: 'Channel created successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getChannelByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pool.query('SELECT * FROM channels WHERE user_id = $1', [userId]);
    if (!result.rows[0]) {
      console.error('Channel not found for user:', userId);
      return res.status(404).json({ error: 'Channel not found', fallback: null });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Channel API error:', err);
    res.status(500).json({ error: err.message, fallback: null });
  }
};

exports.updateChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?.id;
    // Only owner can update
    const channel = await pool.query('SELECT * FROM channels WHERE id = $1', [channelId]);
    if (!channel.rows[0] || channel.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { name, bio, profile_pic } = req.body;
    const result = await pool.query(
      'UPDATE channels SET name = $1, bio = $2, profile_pic = $3 WHERE id = $4 RETURNING *',
      [name, bio, profile_pic, channelId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createChannelPost = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?.id;
    // Only owner can post
    const channel = await pool.query('SELECT * FROM channels WHERE id = $1', [channelId]);
    if (!channel.rows[0] || channel.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    // Enforce daily limits (1 video, multiple images)
    const today = new Date();
    today.setHours(0,0,0,0);
    const videoCount = await pool.query(
      `SELECT COUNT(*) FROM posts WHERE channel_id = $1 AND type = 'video' AND posted_date >= $2`,
      [channelId, today]
    );
    if (req.body.type === 'video' && parseInt(videoCount.rows[0].count) >= 1) {
      return res.status(400).json({ error: 'Daily video upload limit reached.' });
    }
    // Insert post
    const { content, type, media_url } = req.body;
    const result = await pool.query(
      'INSERT INTO posts (user_id, channel_id, content, type, media_url, posted_date) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *',
      [userId, channelId, content, type, media_url]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllChannels = async (req, res) => {
  try {
    const result = await pool.query('SELECT c.*, u.name as owner_name, (SELECT COUNT(*) FROM channel_followers f WHERE f.channel_id = c.id) as follower_count FROM channels c JOIN users u ON c.user_id = u.id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.followChannel = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    // Check if already following
    const existing = await pool.query('SELECT * FROM channel_followers WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
    if (existing.rows.length > 0) {
      // Unfollow
      await pool.query('DELETE FROM channel_followers WHERE channel_id = $1 AND user_id = $2', [channelId, userId]);
      return res.json({ message: 'Unfollowed channel' });
    } else {
      // Follow
      await pool.query('INSERT INTO channel_followers (channel_id, user_id) VALUES ($1, $2)', [channelId, userId]);
      return res.json({ message: 'Followed channel' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
