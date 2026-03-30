// Post actions controller (2025-09-02)
const db = require('../../../config/db');

exports.likePost = async (req, res) => {
  const userId = req.user?.id; // You must have auth middleware to set req.user
  const postId = req.params.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // Toggle like
    const [like] = await db.query('SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
    if (like.length > 0) {
      await db.query('DELETE FROM post_likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
      await db.query('UPDATE posts SET likes = likes - 1 WHERE id = ?', [postId]);
      return res.json({ liked: false });
    } else {
      await db.query('INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      await db.query('UPDATE posts SET likes = likes + 1 WHERE id = ?', [postId]);
      return res.json({ liked: true });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Failed to like post' });
  }
};

exports.viewPost = async (req, res) => {
  const postId = req.params.id;
  try {
    await db.query('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to increment view' });
  }
};

exports.sharePost = async (req, res) => {
  const userId = req.user?.id || null;
  const postId = req.params.id;
  try {
    await db.query('INSERT INTO post_shares (user_id, post_id, shared_at) VALUES (?, ?, NOW())', [userId, postId]);
    await db.query('UPDATE posts SET shares = shares + 1 WHERE id = ?', [postId]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to share post' });
  }
};
