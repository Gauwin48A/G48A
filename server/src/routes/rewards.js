const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');

// GET /api/rewards?userId=1
router.get('/', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    logger.warn('Rewards request missing userId');
    return res.status(400).json({ code: 400, message: 'userId required' });
  }
  try {
    const result = await pool.query('SELECT * FROM rewards WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (err) {
    logger.error('Error fetching rewards:', err);
    res.status(500).json({ code: 500, message: 'Failed to fetch rewards', details: err.message });
  }
});

module.exports = router;
