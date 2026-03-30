const express = require('express');
const router = express.Router();
const dailyCodeController = require('../controllers/dailyCodeController');

// GET /api/dailycode
router.get('/', dailyCodeController.getDailyCode);

module.exports = router;
