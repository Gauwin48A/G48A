const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const saleController = require('../controllers/saleController');
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

function getUserId(req) {
  return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

function isAdmin(req) {
  const role = String(req.user?.role || '').toLowerCase();
  return role === 'admin' || role === 'superadmin';
}

// Keep this route family authenticated by default.
router.use(protect);

// Backward-compatible aliases for sale workflow.
router.post('/initiate', saleController.initiateSale);
router.post('/confirm', saleController.confirmSale);
router.post('/cancel', saleController.cancelSale);
router.get('/pending', saleController.getPendingSales);

// Fetch undone posts for current user (or another user if caller is admin).
router.get('/undone', async (req, res) => {
  try {
    const requesterId = getUserId(req);
    if (!requesterId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const requestedUserId = req.query.userId ? String(req.query.userId).trim() : null;
    let targetUserId = String(requesterId);

    if (requestedUserId && requestedUserId !== targetUserId) {
      if (!isAdmin(req)) {
        return res.status(403).json({ error: "Not authorized to fetch other users' undone posts" });
      }
      targetUserId = requestedUserId;
    }

    const result = await runQuery(
      `
        SELECT
          post_id,
          title,
          description,
          category_id,
          post_type,
          condition,
          price,
          status,
          images,
          location,
          created_at,
          updated_at
        FROM posts
        WHERE status = 'undone'
          AND user_id::text = $1
        ORDER BY COALESCE(updated_at, created_at) DESC
        LIMIT 200
      `,
      [targetUserId]
    );

    return res.json(result.rows);
  } catch (err) {
    logger.error('[Transactions] Error fetching undone sales:', err);
    return res.status(500).json({ error: 'Failed to fetch undone sales', details: err.message });
  }
});

module.exports = router;
