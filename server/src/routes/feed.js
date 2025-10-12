const express = require('express');
const router = express.Router();
const feedController = require('../controllers/feedController');
const { authenticate } = require('../middleware/auth');

router.get('/', feedController.getFeed);
router.get('/mine', authenticate, feedController.getMyFeed);

module.exports = router;
