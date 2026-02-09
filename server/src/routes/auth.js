const router = require('express').Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/security');

// SECURITY: Brute Force Protection (RELAXED FOR TESTING)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50, // Increased from 5 for testing
    message: { error: "Too many login attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP Rate Limiter (10 requests per 10 minutes - relaxed for testing)
const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10, // Increased from 3 for testing
    message: { error: "Too many OTP requests. Please wait 10 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// VALIDATION RULES
const signupValidation = [
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('fullName').notEmpty().withMessage('Name is required')
];

// === PUBLIC ROUTES ===

// Password-based auth
router.post('/signup', signupValidation, authController.signup);
router.post('/login', authLimiter, authController.login);

// OTP-based auth (Flipkart style)
router.post('/send-otp', otpLimiter, authController.sendOTP);
router.post('/verify-otp', authLimiter, authController.verifyOTP);

// Token management
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// === PROTECTED ROUTES ===
router.get('/me', authenticateToken, authController.getMe);
router.get('/validate', authenticateToken, (req, res) => res.json({ valid: true, user: req.user }));
router.post('/set-password', authenticateToken, authController.setPassword);

// === PASSWORD RECOVERY ===
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);

module.exports = router;
