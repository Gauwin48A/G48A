const express = require("express");
const router = express.Router();
const gdprController = require("../controllers/gdprController");
const { protect } = require("../middleware/auth");

/**
 * @route GDPR routes
 * @description Handles user data export and deletion for GDPR compliance
 */

/** @route GET /export - Export all user data */
router.get("/export", protect, gdprController.exportUserData);

/** @route DELETE /delete - Permanently delete user data */
router.delete("/delete", protect, gdprController.deleteUserData);

module.exports = router;
