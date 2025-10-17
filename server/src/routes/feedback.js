const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');

// Dummy feedback endpoint
router.get('/', feedbackController.getFeedback);

module.exports = router;
