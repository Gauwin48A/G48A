const express = require("express");
const router = express.Router();
const profileController = require('../controllers/profileController');

// GET /api/profile?userId=1
router.get('/', profileController.getProfile);

// POST /api/profile/update
const { body, validationResult } = require('express-validator');

const validateProfileUpdate = [
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

// POST /api/profile/update
router.post('/update', validateProfileUpdate, profileController.updateProfile);

// GET /api/profile/preferences?userId=1
router.get('/preferences', profileController.getPreferences);

// POST /api/profile/preferences/update
router.post('/preferences/update', profileController.updatePreferences);

module.exports = router;