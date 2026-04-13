const express = require("express");
const router = express.Router();
const inquiryController = require("../controllers/inquiryController");
const { protect, optionalAuth } = require("../middleware/auth");

/**
 * @route Inquiry routes
 * @description Handles buyer inquiries on posts, seller replies, and inquiry analytics
 */

/** @route POST / - Create a new inquiry (requires auth to prevent spam) */
router.post("/", protect, inquiryController.createInquiry);

/** @route GET /seller - Get all inquiries received by the authenticated seller */
router.get("/seller", protect, inquiryController.getInquiriesForSeller);

/** @route GET /templates - Get quick-reply templates for the seller */
router.get("/templates", protect, inquiryController.getQuickReplyTemplates);

/** @route GET /analytics - Get inquiry analytics for the seller */
router.get("/analytics", protect, inquiryController.getInquiryAnalytics);

/** @route GET /post/:postId - Get all inquiries for a specific post */
router.get("/post/:postId", protect, inquiryController.getInquiriesForPost);

/** @route PATCH /:inquiryId/status - Update the status of an inquiry */
router.patch("/:inquiryId/status", protect, inquiryController.updateInquiryStatus);

/** @route POST /:inquiryId/reply - Reply to an inquiry */
router.post("/:inquiryId/reply", protect, inquiryController.replyToInquiry);

/** @route PATCH /:inquiryId/spam - Mark an inquiry as spam */
router.patch("/:inquiryId/spam", protect, inquiryController.markAsSpam);

module.exports = router;
