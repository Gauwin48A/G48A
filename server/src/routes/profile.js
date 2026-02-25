const express = require("express");
const router = express.Router();
const multer = require('multer');
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/auth');

// Multer setup for avatar uploads (store in memory for base64 conversion)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// GET /api/profile?userId=1
router.get('/', protect, profileController.getProfile);

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
router.post('/update', protect, validateProfileUpdate, profileController.updateProfile);

// POST /api/profile/upload-avatar
router.post('/upload-avatar', protect, upload.single('avatar'), profileController.uploadAvatar);

// GET /api/profile/preferences?userId=1
router.get('/preferences', protect, profileController.getPreferences);

// POST /api/profile/preferences/update
router.post('/preferences/update', protect, profileController.updatePreferences);

module.exports = router;
