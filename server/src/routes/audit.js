const express = require('express');
const router = express.Router();
const { runQuery, getAuthUserId } = require('../utils/dbHelpers');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

// All audit routes require authentication
router.use(protect);

// POST /api/audit
router.post('/', async (req, res) => {
  const authUserId = getAuthUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

  const { latitude, longitude, event_type } = req.body;
  if (!latitude || !longitude || !event_type) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const normalizedEventType = String(event_type || "").trim();
  if (!normalizedEventType || normalizedEventType.length > 64 || !/^[a-z0-9_:-]+$/i.test(normalizedEventType)) {
    return res.status(400).json({ error: 'Invalid event_type' });
  }

  // Enforce: user can only log audit events for themselves
  try {
    await runQuery(
      'INSERT INTO audit (user_id, latitude, longitude, event_type) VALUES ($1, $2, $3, $4)',
      [String(authUserId), latitude, longitude, normalizedEventType]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('[Audit] Insert failed:', err);
    res.status(500).json({ error: 'Audit log failed' });
  }
});

module.exports = router;
