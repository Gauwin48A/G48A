/**
 * Sale Routes - Dual-Handshake Logic
 * Blue Team Gap 1: Verified Sale Process
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const saleController = require('../controllers/saleController');

// All routes require authentication
router.use(protect);

// Seller initiates a sale
router.post('/initiate', saleController.initiateSale);

// Buyer confirms with OTP
router.post('/confirm', saleController.confirmSale);

// Either party cancels
router.post('/cancel', saleController.cancelSale);

// Get pending sales
router.get('/pending', saleController.getPendingSales);

module.exports = router;
