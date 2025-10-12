const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/rewards?userId=1
router.get('/', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const result = await pool.query('SELECT * FROM rewards WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
