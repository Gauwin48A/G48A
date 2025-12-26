/**
 * Price Alerts Routes
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const priceAlertsController = require('../controllers/priceAlertsController');

// Subscribe to price alert
router.post('/subscribe', protect, priceAlertsController.subscribeAlert);

// Get user's alerts
router.get('/', protect, priceAlertsController.getAlerts);

// Unsubscribe from alert (keeps record)
router.put('/unsubscribe/:postId', protect, priceAlertsController.unsubscribeAlert);

// Delete alert completely
router.delete('/:postId', protect, priceAlertsController.deleteAlert);

// Check for price drops (admin/cron job)
router.get('/check-drops', priceAlertsController.checkPriceDrops);

module.exports = router;
