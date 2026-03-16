const express = require("express");
const router = express.Router();
const twoFactorController = require("../controllers/twoFactorController");
const { protect } = require("../middleware/auth");

/**
 * Protected 2FA management routes
 * Setup, verify, disable, and status all require authentication.
 */
router.use("/setup", protect);
router.use("/verify", protect);
router.use("/disable", protect);
router.use("/status", protect);

/** @route POST /setup - Initialize 2FA setup and generate secret/QR code */
router.post("/setup", twoFactorController.setup2FA);

/** @route POST /verify - Verify a 2FA token to complete setup */
router.post("/verify", twoFactorController.verify2FA);

/** @route POST /disable - Disable 2FA for the current user */
router.post("/disable", twoFactorController.disable2FA);

/** @route GET /status - Check whether 2FA is enabled for the current user */
router.get("/status", twoFactorController.get2FAStatus);

/** @route POST /validate - Validate a 2FA code during login (unauthenticated) */
router.post("/validate", twoFactorController.validate2FA);

module.exports = router;
