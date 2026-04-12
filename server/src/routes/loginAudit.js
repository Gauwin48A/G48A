const express = require('express');
const router = express.Router();
const { runQuery, getAuthUserId } = require('../utils/dbHelpers');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');
const geoip = require('geoip-lite');
const { verifyLocationPayload } = require('../services/locationVerificationService');

// All login-audit routes require authentication
router.use(protect);

// POST /api/login-audit
router.post('/', async (req, res) => {
  const authUserId = getAuthUserId(req);
  if (!authUserId) return res.status(401).json({ error: 'Authentication required' });

  const { locationPayload } = req.body || {};
  // Derive IP from request, not from user-supplied body (prevents spoofing)
  const ip_address = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection?.remoteAddress || 'unknown';

  let safeLatitude = null;
  let safeLongitude = null;

  if (locationPayload && typeof locationPayload === 'object') {
    try {
      await verifyLocationPayload({ payload: locationPayload, req, userId: authUserId });
      const parsedLatitude = Number.parseFloat(locationPayload.latitude ?? locationPayload.lat);
      const parsedLongitude = Number.parseFloat(locationPayload.longitude ?? locationPayload.lng);
      if (Number.isFinite(parsedLatitude) && parsedLatitude >= -90 && parsedLatitude <= 90) {
        safeLatitude = parsedLatitude;
      }
      if (Number.isFinite(parsedLongitude) && parsedLongitude >= -180 && parsedLongitude <= 180) {
        safeLongitude = parsedLongitude;
      }
    } catch (error) {
      logger.warn('[LoginAudit] Location payload verification failed', {
        message: error?.message || String(error),
      });
    }
  }

  if (safeLatitude === null || safeLongitude === null) {
    const lookup = geoip.lookup(ip_address);
    if (lookup?.ll && lookup.ll.length === 2) {
      const [lat, lng] = lookup.ll;
      safeLatitude = Number.isFinite(lat) ? lat : safeLatitude;
      safeLongitude = Number.isFinite(lng) ? lng : safeLongitude;
    }
  }

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
