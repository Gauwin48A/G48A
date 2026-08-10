const express = require("express");
const router = express.Router();
const multer = require("multer");
const profileController = require("../controllers/profileController");
const { protect } = require("../middleware/auth");
const { body, validationResult } = require("express-validator");

/**
 * @route Profile routes
 * @description Manages user profile retrieval, updates, avatar uploads, and preferences
 */

/* ── Multer config for avatar uploads (5 MB, images only) ── */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/* ── Validation middleware for profile updates ───────────── */
const validateProfileUpdate = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Invalid email format"),
  body("phone")
    .optional()
    .isMobilePhone()
    .withMessage("Invalid phone number"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

/** @route GET / - Get the authenticated user's profile */
router.get("/", protect, profileController.getProfile);

/** @route POST /update - Update profile fields (with validation) */
router.post("/update", protect, validateProfileUpdate, profileController.updateProfile);

/** @route POST /upload-avatar - Upload a new avatar image */
router.post("/upload-avatar", protect, upload.single("avatar"), profileController.uploadAvatar);

/** @route GET /preferences - Get user preferences */
router.get("/preferences", protect, profileController.getPreferences);

/** @route POST /preferences/update - Update user preferences */
router.post("/preferences/update", protect, profileController.updatePreferences);

/** @route POST /payout-link - Link a Razorpay payout account (bank/UPI) */
router.post("/payout-link", protect, profileController.linkPayoutAccount);

/** @route GET /payout-status - Get the user's payout account status */
router.get("/payout-status", protect, profileController.getPayoutStatus);

module.exports = router;
