const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { protect, optionalAuth } = require('../middleware/auth');

// POST /api/inquiries - Submit buyer interest (auth optional for guests)
router.post('/', optionalAuth, inquiryController.createInquiry);

// GET /api/inquiries/seller - Get all inquiries for logged-in seller
router.get('/seller', protect, inquiryController.getInquiriesForSeller);

// GET /api/inquiries/post/:postId - Get inquiries for a specific post
router.get('/post/:postId', protect, inquiryController.getInquiriesForPost);

// PATCH /api/inquiries/:inquiryId/status - Update inquiry status
router.patch('/:inquiryId/status', protect, inquiryController.updateInquiryStatus);

module.exports = router;
