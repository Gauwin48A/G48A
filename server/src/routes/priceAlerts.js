/**
 * Price Alerts Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const priceAlertsController = require('../controllers/priceAlertsController');

function requireAdminRole(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'admin' && role !== 'superadmin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  return next();
}

// Subscribe to price alert
router.post('/subscribe', protect, priceAlertsController.subscribeAlert);

// Get user's alerts
router.get('/', protect, priceAlertsController.getAlerts);

// Unsubscribe from alert (keeps record)
router.put('/unsubscribe/:postId', protect, priceAlertsController.unsubscribeAlert);

// Delete alert completely
router.delete('/:postId', protect, priceAlertsController.deleteAlert);

// Check for price drops (admin/cron job)
router.get('/check-drops', protect, requireAdminRole, priceAlertsController.checkPriceDrops);

module.exports = router;
