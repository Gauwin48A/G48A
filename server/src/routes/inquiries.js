const express = require('express');
const router = express.Router();
const inquiryController = require('../controllers/inquiryController');
const { protect, optionalAuth } = require('../middleware/auth');

// POST /api/inquiries - Submit buyer interest (auth optional for guests)
router.post('/', optionalAuth, inquiryController.createInquiry);

// GET /api/inquiries/seller - Get all inquiries for logged-in seller (with search/filter)
router.get('/seller', protect, inquiryController.getInquiriesForSeller);

// GET /api/inquiries/templates - Quick-reply templates
router.get('/templates', protect, inquiryController.getQuickReplyTemplates);

// GET /api/inquiries/analytics - Seller inquiry analytics
router.get('/analytics', protect, inquiryController.getInquiryAnalytics);

// GET /api/inquiries/post/:postId - Get inquiries for a specific post
router.get('/post/:postId', protect, inquiryController.getInquiriesForPost);

// PATCH /api/inquiries/:inquiryId/status - Update inquiry status
router.patch('/:inquiryId/status', protect, inquiryController.updateInquiryStatus);

// POST /api/inquiries/:inquiryId/reply - Seller quick-reply
router.post('/:inquiryId/reply', protect, inquiryController.replyToInquiry);

// PATCH /api/inquiries/:inquiryId/spam - Mark as spam
router.patch('/:inquiryId/spam', protect, inquiryController.markAsSpam);

module.exports = router;
