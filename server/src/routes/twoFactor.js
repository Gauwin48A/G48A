/**
 * Two-Factor Authentication Routes
 */

const express = require('express');
const router = express.Router();
const twoFactorController = require('../controllers/twoFactorController');
const { protect } = require('../middleware/auth');

// All 2FA routes require authentication (except validate)
router.use('/setup', protect);
router.use('/verify', protect);
router.use('/disable', protect);
router.use('/status', protect);

// Setup 2FA - Get QR code and secret
router.post('/setup', twoFactorController.setup2FA);

// Verify 2FA setup - Enable 2FA
router.post('/verify', twoFactorController.verify2FA);

// Disable 2FA
router.post('/disable', twoFactorController.disable2FA);

// Get 2FA status
router.get('/status', twoFactorController.get2FAStatus);

// Validate 2FA code (for login flow - doesn't require auth)
router.post('/validate', twoFactorController.validate2FA);

module.exports = router;
