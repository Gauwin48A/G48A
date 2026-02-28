const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

// POST /api/audit
router.post('/', async (req, res) => {
  const { user_id, latitude, longitude, event_type } = req.body;
  if (!user_id || !latitude || !longitude || !event_type) return res.status(400).json({ error: 'Missing fields' });
  try {
    await runQuery('INSERT INTO audit (user_id, latitude, longitude, event_type) VALUES ($1, $2, $3, $4)', [user_id, latitude, longitude, event_type]);
    res.json({ success: true });
  } catch (err) {
    logger.error('[Audit] Insert failed:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
