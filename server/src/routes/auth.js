const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/security');

const validationGuard = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

const signupLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many signup attempts. Please try again in 15 minutes.' }
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again in 15 minutes.' }
});

const otpSendLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many OTP requests. Please wait 10 minutes.' }
});

const otpVerifyLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many OTP attempts. Please wait 10 minutes.' }
});

const refreshLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many token refresh attempts. Please try again shortly.' }
});

const recoveryLimiter = rateLimit({
    windowMs: 30 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many password recovery attempts. Please wait 30 minutes.' }
});

const signupValidation = [
    body('phone')
        .trim()
        .isMobilePhone('any', { strictMode: false })
        .withMessage('Invalid phone number'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 chars'),
    body('fullName')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name is required')
];

const loginValidation = [
    body().custom((value) => {
        const hasIdentifier = Boolean(value?.identifier || value?.email || value?.phone);
        if (!hasIdentifier) {
            throw new Error('Email, phone, or identifier is required');
        }
        if (!value?.password) {
            throw new Error('Password is required');
        }
        return true;
    })
];

// Public routes
router.post('/signup', signupLimiter, signupValidation, validationGuard, authController.signup);
router.post('/login', loginLimiter, loginValidation, validationGuard, authController.login);
router.post('/send-otp', otpSendLimiter, authController.sendOTP);
router.post('/verify-otp', otpVerifyLimiter, authController.verifyOTP);
router.post('/refresh-token', refreshLimiter, authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/forgot-password', recoveryLimiter, authController.forgotPassword);
router.post('/reset-password', recoveryLimiter, authController.resetPassword);

// Protected routes
router.get('/me', authenticateToken, authController.getMe);
router.get('/validate', authenticateToken, (req, res) => res.json({ valid: true, user: req.user }));
router.post('/set-password', authenticateToken, authController.setPassword);

module.exports = router;
