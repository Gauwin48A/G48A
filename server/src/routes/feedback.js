const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { protect } = require('../middleware/auth');

// Public/admin listing endpoint
router.get('/', protect, feedbackController.getFeedback);
// User feedback endpoints
router.get('/my', protect, feedbackController.getMyFeedback);
router.post('/', protect, feedbackController.createFeedback);

module.exports = router;
