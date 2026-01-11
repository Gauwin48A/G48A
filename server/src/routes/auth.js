const router = require('express').Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/security');

// SECURITY: Brute Force Protection (Ironclad)
// Limit login attempts to 5 per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many login attempts. Please try again in 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
});

// VALIDATION RULES
const signupValidation = [
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 chars'),
    body('fullName').notEmpty().withMessage('Name is required')
];

// ROUTES
router.post('/signup', signupValidation, authController.signup);
router.post('/login', authLimiter, authController.login);

// Protected Routes
router.get('/me', authenticateToken, authController.getMe);
router.get('/validate', authenticateToken, (req, res) => res.json({ valid: true, user: req.user }));

// Verify/One-time OTP (Legacy/Hybrid support)
// router.post('/send-otp', ...); // If needed later

module.exports = router;