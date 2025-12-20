const { body, validationResult } = require('express-validator');

// 1. Universal Error Handler
// Stops the request immediately if validation fails
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Return 400 Bad Request with the specific error message
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

// 2. Auth Rules (Paranoid Security)
const authValidation = {
    register: [
        body('username')
            .trim()
            .notEmpty().withMessage('Username is required')
            .isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters')
            .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),

        body('email')
            .isEmail().withMessage('Invalid email format')
            .normalizeEmail(), // Sanitizes email (e.g. converts to lowercase)

        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
            .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
            .matches(/[0-9]/).withMessage('Password must contain a number')
            .matches(/[!@#$%^&*]/).withMessage('Password must contain a special char (!@#$%^&*)'),
    ],
    login: [
        body('email').isEmail().withMessage('Invalid email format'),
        body('password').exists().withMessage('Password is required'),
    ]
};

// 3. Post Rules (Data Integrity & XSS Prevention)
const postValidation = {
    create: [
        body('title')
            .trim()
            .isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters')
            .escape(), // ESCAPES HTML CHARACTERS (Prevents XSS)

        body('price')
            .isFloat({ min: 1 }).withMessage('Price must be a positive number'),

        body('description')
            .trim()
            .isLength({ min: 10 }).withMessage('Description must be detailed (min 10 chars)')
            .escape(), // ESCAPES HTML

        body('category_id')
            .isInt().withMessage('Invalid Category ID'),
    ]
};

// 4. Profile Validation Rules
const profileValidation = {
    update: [
        body('email').optional().isEmail().withMessage('Invalid email format').normalizeEmail(),
        body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
        body('full_name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
        body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must be under 500 characters').escape(),
    ]
};

// 5. Location Validation Rules
const locationValidation = {
    save: [
        body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
        body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    ]
};

// 6. Feedback/Complaints Validation
const feedbackValidation = {
    create: [
        body('message')
            .trim()
            .notEmpty().withMessage('Message is required')
            .isLength({ min: 10, max: 1000 }).withMessage('Message must be 10-1000 characters')
            .escape(),
        body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
    ]
};

module.exports = {
    validate,
    authValidation,
    postValidation,
    profileValidation,
    locationValidation,
    feedbackValidation
};
