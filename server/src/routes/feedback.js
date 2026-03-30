const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { protect } = require("../middleware/auth");

/**
 * @route GET / - List all feedback
 * @route GET /my - List feedback submitted by the current user
 * @route POST / - Submit new feedback
 */
router.get("/", protect, feedbackController.getFeedback);
router.get("/my", protect, feedbackController.getMyFeedback);
router.post("/", protect, feedbackController.createFeedback);

module.exports = router;
