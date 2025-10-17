const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { protect } = require('../middleware/auth');

router.get('/', feedController.getFeed);
router.get('/mine', protect, feedController.getMyFeed);
// Add description length validation (min 5, max 500 chars)
router.post('/add', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { description } = req.body;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ error: 'Description is required' });
    }
    if (description.length < 5 || description.length > 500) {
      return res.status(400).json({ error: 'Description must be 5-500 characters.' });
    }
    // Insert text-only post
    const result = await req.app.get('db').query(
      `INSERT INTO posts (user_id, title, description, post_type, created_at) VALUES ($1, $2, $2, 'text', NOW()) RETURNING *`,
      [userId, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
