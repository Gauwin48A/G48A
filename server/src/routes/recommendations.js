const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/recommendations?userId=1
router.get('/', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const recs = await pool.query(
      `SELECT p.* FROM recommendations r
       JOIN posts p ON r.post_id = p.post_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`, [userId]);
    res.json(recs.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
