const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/audit
router.post('/', async (req, res) => {
  const { user_id, latitude, longitude, event_type } = req.body;
  if (!user_id || !latitude || !longitude || !event_type) return res.status(400).json({ error: 'Missing fields' });
  try {
    await pool.query('INSERT INTO audit (user_id, latitude, longitude, event_type) VALUES ($1, $2, $3, $4)', [user_id, latitude, longitude, event_type]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
