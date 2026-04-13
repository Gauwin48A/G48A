const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const dailyCodeController = require('../controllers/dailyCodeController');

// GET /api/dailycode
router.get('/', protect, dailyCodeController.getDailyCode);

module.exports = router;
