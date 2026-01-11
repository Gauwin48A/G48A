/**
 * Payment Routes
 * Zero-Cost UPI Verification System
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public - Get UPI payment details (for QR code display)
router.get('/upi-details', paymentController.getUpiDetails);

// User routes (require authentication)
router.post('/submit', protect, paymentController.submitPayment);
router.get('/status', protect, paymentController.getPaymentStatus);

// Admin routes (require authentication + admin check could be added)
router.get('/pending', protect, paymentController.getPendingPayments);
router.post('/:id/verify', protect, paymentController.verifyPayment);
router.post('/:id/reject', protect, paymentController.rejectPayment);
router.get('/stats', protect, paymentController.getPaymentStats);

module.exports = router;
