const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// POST /api/login-audit
router.post('/', async (req, res) => {
  const { user_id, latitude, longitude, ip_address } = req.body;
  if (!user_id || !ip_address) return res.status(400).json({ error: 'Missing fields' });
  try {
    await pool.query('INSERT INTO login_audit (user_id, latitude, longitude, ip_address) VALUES ($1, $2, $3, $4)', [user_id, latitude, longitude, ip_address]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
