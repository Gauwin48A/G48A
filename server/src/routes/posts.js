const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const { body, validationResult } = require('express-validator');
const validatePost = require('../middleware/validatePost');
const upload = require('../middleware/upload');

// GET /api/posts/all for legacy support
router.get('/all', postController.getAllPosts);

// GET /api/posts/mine for user posts
router.get('/mine', postController.getUserPosts);

// Main GET /api/posts endpoint (returns { posts, total })
// Supports query params: category, minPrice, maxPrice, minDiscount, lat, lng, sortBy, sortOrder, page, limit
router.get('/', postController.getAllPosts);

// Accept multiple images for post creation
router.post('/', upload.fields([
  { name: 'images', maxCount: 10 }
]),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('price').isNumeric().withMessage('Price must be a positive number'),
    body('category').isInt().withMessage('Category is required'),
    body('description').notEmpty().withMessage('Description is required'),
    // Additional validation as needed
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array().map(e => e.msg) });
    }
    next();
  },
  validatePost,
  postController.createPost
);

router.get('/mine', async (req, res) => {
  // Fetch posts for the logged-in user from the database
  let userId = req.query.userId;
  if (!userId && req.user) {
    userId = req.user.user_id;
  }
  if (!userId) {
    // Try to get from token (for JWT auth)
    try {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
      }
    } catch (err) {
      console.error('❌ Error decoding JWT for /mine:', err);
    }
  }
  if (!userId) {
    console.error('❌ No userId found for /mine');
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    // Use stored procedure for normalized post data
    const result = await pool.query('SELECT * FROM fetch_posts($1, NULL, NULL, 20, 0)', [userId]);
    if (!result.rows || result.rows.length === 0) {
      console.error('❌ No posts found for user', { userId });
      return res.status(404).json({ error: 'No posts found for user' });
    }
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching user posts:', err);
    res.status(500).json({ error: 'Failed to fetch user posts', details: err.message });
  }
});

router.get('/undone', async (req, res) => {
  // Fetch undone sales from the database
  try {
    const result = await pool.query("SELECT * FROM posts WHERE status = 'undone'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch undone sales' });
  }
});

// GET /api/posts/:postId - get post by ID
router.get('/:postId', postController.getPostById);

// GET /api/posts/:id - get post by ID
router.get('/:id', postController.getPostById);

module.exports = router;