const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { validate, postValidation } = require('../middleware/validators');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');
const pool = require('../config/db');

// GET /api/posts/all for legacy support
router.get('/all', postController.getAllPosts);

// GET /api/posts/mine for user posts
router.get('/mine', postController.getUserPosts);

// Main GET /api/posts endpoint (returns { posts, total })
router.get('/', postController.getAllPosts);

// CREATE POST: Token Required + Input Sanitization + Validation
router.post('/',
  protect,
  upload.fields([{ name: 'images', maxCount: 10 }]),
  postValidation.create,
  validate,
  postController.createPost
);

// Alternative create endpoint
router.post('/create',
  protect,
  upload.fields([{ name: 'images', maxCount: 10 }]),
  postValidation.create,
  validate,
  postController.createPost
);

router.get('/undone', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM posts WHERE status = 'undone'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch undone sales' });
  }
});

// POST /api/posts/:postId/view - Increment view count
router.post('/:postId/view', async (req, res) => {
  const { postId } = req.params;

  try {
    // Increment views column in posts table
    const result = await pool.query(
      `UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE post_id = $1 RETURNING views`,
      [postId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ success: true, views: result.rows[0].views });
  } catch (err) {
    console.error('View increment error:', err);
    res.status(500).json({ error: 'Failed to record view' });
  }
});

// POST /api/posts/:postId/share - Track share action
router.post('/:postId/share', async (req, res) => {
  const { postId } = req.params;

  try {
    await pool.query(
      `UPDATE posts SET shares = COALESCE(shares, 0) + 1 WHERE post_id = $1`,
      [postId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Share tracking error:', err);
    res.json({ success: true, warning: 'Share not tracked' });
  }
});

// GET /api/posts/:postId - get post by ID
router.get('/:postId', postController.getPostById);

// DELETE /api/posts/:postId - delete a post (owner only)
router.delete('/:postId', protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.userId || req.user?.id;

  console.log('[DELETE] Attempting delete - postId:', postId, 'userId from token:', userId);

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ownerCheck = await pool.query(
      'SELECT user_id FROM posts WHERE post_id = $1',
      [postId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postOwnerId = ownerCheck.rows[0].user_id;

    if (postOwnerId !== parseInt(userId)) {
      return res.status(403).json({ error: `Not authorized (owner: ${postOwnerId}, you: ${userId})` });
    }

    await pool.query('DELETE FROM posts WHERE post_id = $1', [postId]);
    res.json({ message: 'Post deleted successfully', postId });
  } catch (err) {
    console.error('Delete post error:', err);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// PUT /api/posts/:postId - update a post (owner only)
router.put('/:postId', protect, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user?.userId || req.user?.id;
  const { title, description, price, location, status } = req.body;

  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const ownerCheck = await pool.query(
      'SELECT user_id, created_at FROM posts WHERE post_id = $1',
      [postId]
    );

    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (ownerCheck.rows[0].user_id !== parseInt(userId)) {
      return res.status(403).json({ error: 'Not authorized to edit this post' });
    }

    const result = await pool.query(`
      UPDATE posts SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        location = COALESCE($4, location),
        status = COALESCE($5, status),
        updated_at = NOW()
      WHERE post_id = $6
      RETURNING *
    `, [title, description, price, location, status, postId]);

    res.json({ message: 'Post updated successfully', post: result.rows[0] });
  } catch (err) {
    console.error('Update post error:', err);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

module.exports = router;