const express = require("express");
const router = express.Router();
const profileController = require('../controllers/profileController');

// GET /api/profile?userId=1
router.get('/', profileController.getProfile);

// POST /api/profile/update
router.post('/update', profileController.updateProfile);

// GET /api/profile/preferences?userId=1
router.get('/preferences', profileController.getPreferences);

// POST /api/profile/preferences/update
router.post('/preferences/update', profileController.updatePreferences);

module.exports = router;