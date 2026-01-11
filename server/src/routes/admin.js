/**
 * Admin Routes
 * Includes verification document viewing
 */

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminDocController = require('../controllers/adminDocController');

// All routes require authentication
router.use(protect);

// Existing placeholder
router.get('/users', (req, res) => {
  res.send('Admin get users endpoint');
});

// View verification document (admin only)
router.get('/view-doc/:id', adminDocController.viewDocument);

// List pending verifications (admin only)
router.get('/verifications', adminDocController.listVerifications);

// Review verification (admin only)
router.post('/verifications/:id/review', adminDocController.reviewVerification);

module.exports = router;

