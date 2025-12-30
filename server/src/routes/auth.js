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
const { protect } = require('../middleware/auth');

// Apply security logging to all auth routes
router.use(securityLogger);

// Apply input sanitization to all auth routes
router.use(sanitizeInput);

// ============================================
// PUBLIC ROUTES
// ============================================

// REGISTER: Create new account
router.post("/register", authController.register);

// LOGIN: Authenticate user
router.post("/login",
    loginLimiter,           // Max 5 attempts per 15 min
    checkAccountLockout,    // Check if account is locked
    authController.login
);

// EMAIL VERIFICATION
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);

// FORGOT PASSWORD
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// REFRESH TOKEN
router.post("/refresh-token", authController.refreshToken);

// LOGOUT
router.post("/logout", authController.logout);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// CHANGE PASSWORD (requires authentication)
router.post("/change-password", protect, authController.changePassword);

// ============================================
// DEV ONLY ROUTES (Remove in production)
// ============================================
router.post("/reset-passwords", authController.resetAllPasswords);
router.get("/list-users", authController.listUsers);

// Legacy OTP routes (stub)
router.post("/send-otp", (req, res) => res.json({ message: "OTP Sent" }));
router.post("/verify-otp", (req, res) => res.json({ token: "mock-token" }));

module.exports = router;