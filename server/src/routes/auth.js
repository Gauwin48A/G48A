const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { validate, authValidation } = require('../middleware/validators');
const {
    loginLimiter,
    checkAccountLockout,
    sanitizeInput,
    securityLogger
} = require('../middleware/security');

// Apply security logging to all auth routes
router.use(securityLogger);

// Apply input sanitization to all auth routes
router.use(sanitizeInput);

// REGISTER: Apply rules -> Validate -> Controller
router.post("/register",
    authValidation.register,
    validate,
    authController.register
);

// LOGIN: Rate Limit -> Account Lockout Check -> Validate -> Controller
router.post("/login",
    loginLimiter,           // Pillar 1: Max 5 attempts per 15 min
    checkAccountLockout,    // Pillar 2: Check if account is locked
    authValidation.login,
    validate,
    authController.login
);

// Stub routes for OTP (Future Expansion)
router.post("/send-otp", (req, res) => res.json({ message: "OTP Sent" }));
router.post("/verify-otp", (req, res) => res.json({ token: "mock-token" }));

// SECURITY: Debug endpoints removed for production
// reset-passwords and list-users endpoints have been removed for security
// To manage users, use database admin tools directly

module.exports = router;