const express = require('express');
const router = express.Router();

// TODO: Add sale confirmation workflow endpoints

router.post('/confirm', (req, res) => {
  // Sale confirmation logic
  res.send('Sale confirmation endpoint');
});

const pool = require('../config/db');
router.get('/undone', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM posts WHERE status = 'undone'");
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error fetching undone sales:', err);
    res.status(500).json({ error: 'Failed to fetch undone sales', details: err.message });
  }
});

module.exports = router;
