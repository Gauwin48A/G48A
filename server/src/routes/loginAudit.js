const express = require('express');
const router = express.Router();
const { runQuery, getAuthUserId } = require('../utils/dbHelpers');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

// All login-audit routes require authentication
router.use(protect);

// POST /api/login-audit
router.post('/', async (req, res) => {
  const authUserId = getAuthUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

  const { latitude, longitude } = req.body;
  const parsedLatitude = Number.parseFloat(latitude);
  const parsedLongitude = Number.parseFloat(longitude);
  const safeLatitude =
    Number.isFinite(parsedLatitude) && parsedLatitude >= -90 && parsedLatitude <= 90
      ? parsedLatitude
      : null;
  const safeLongitude =
    Number.isFinite(parsedLongitude) && parsedLongitude >= -180 && parsedLongitude <= 180
      ? parsedLongitude
      : null;
  // Derive IP from request, not from user-supplied body (prevents spoofing)
  const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';

  try {
    await runQuery(
      'INSERT INTO login_audit (user_id, latitude, longitude, ip_address) VALUES ($1, $2, $3, $4)',
      [String(authUserId), safeLatitude, safeLongitude, ip_address]
    );
    res.json({ success: true });
  } catch (err) {
    logger.error('[LoginAudit] Insert failed:', err);
    res.status(500).json({ error: 'Login audit failed' });
  }
});

module.exports = router;
