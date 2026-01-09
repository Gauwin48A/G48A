/**
 * GDPR Routes
 * Data export and account deletion endpoints
 */
const express = require('express');
const router = express.Router();
const gdprController = require('../controllers/gdprController');
const { protect } = require('../middleware/auth');

// Export user data (GDPR Right to Access)
router.get('/export', protect, gdprController.exportUserData);

// Delete user account (GDPR Right to Erasure)
router.delete('/delete', protect, gdprController.deleteUserData);

module.exports = router;
