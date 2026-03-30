const {
  body,
  query,
  param,
  validationResult
} = require("express-validator");

/**
 * Express middleware that checks for validation errors from express-validator.
 * Returns a 400 response with error details if validation fails,
 * otherwise passes control to the next middleware.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn("⚠️ Validation failed:", errors.array());
    return res.status(400).json({
      error: "Validation Failed",
      details: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
        value: e.value
      }))
    });
  }
  next();
};

/**
 * Validation chains for authentication-related routes.
 * @property {Array} signup - Validates email, password strength, and optional username.
 * @property {Array} login  - Validates email and password presence.
 */
const authValidation = {
  signup: [
    body("email")
      .isEmail()
      .withMessage("Valid email required")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters")
      .matches(/[A-Z]/)
      .withMessage("Password must contain uppercase letter")
      .matches(/[0-9]/)
      .withMessage("Password must contain a number"),
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 })
      .withMessage("Username must be 3-50 characters")
      .escape()
  ],
  login: [
    body("email")
      .isEmail()
      .normalizeEmail(),
    body("password")
      .notEmpty()
      .withMessage("Password required")
  ]
};

/**
 * Validation chains for post/listing CRUD routes.
 * @property {Array} create  - Validates title, description, price, category, geo coords, location.
 * @property {Array} update  - Validates postId param, optional title/price/status.
 * @property {Array} nearby  - Validates lat/long query params and optional radius.
 * @property {Array} getById - Validates postId param.
 */
const postValidation = {
  create: [
    body("title")
      .trim()
      .notEmpty()
      .withMessage("Title is required")
      .isLength({ max: 200 })
      .withMessage("Title too long")
      .escape(),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 5e3 })
      .withMessage("Description too long")
      .escape(),
    body("price")
      .isFloat({ gt: 0 })
      .withMessage("Price must be a positive number"),
    body("category_id")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Invalid category"),
    body("subcategory_id")
      .optional({ checkFalsy: true })
      .isInt({ min: 1 })
      .withMessage("Invalid subcategory"),
    body("latitude")
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    body("longitude")
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
    body("location")
      .optional()
      .trim()
      .escape()
  ],
  update: [
    param("postId")
      .isInt({ min: 1 })
      .withMessage("Invalid post ID"),
    body("title")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .escape(),
    body("price")
      .optional()
      .isFloat({ gt: 0 })
      .withMessage("Price must be positive"),
    body("status")
      .optional()
      .isIn(["active", "sold", "inactive"])
      .withMessage("Invalid status")
  ],
  nearby: [
    query("lat")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    query("long")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
    query("radius")
      .optional()
      .isFloat({ min: .1, max: 100 })
      .withMessage("Radius must be 0.1-100 km"),
    query("category_id")
      .optional({ checkFalsy: true })
      .isInt({ min: 1 })
      .withMessage("Invalid category"),
    query("subcategory_id")
      .optional({ checkFalsy: true })
      .isInt({ min: 1 })
      .withMessage("Invalid subcategory")
  ],
  getById: [
    param("postId")
      .isInt({ min: 1 })
      .withMessage("Invalid post ID")
  ]
};

/**
 * Validation chains for user profile update routes.
 * @property {Array} update - Validates optional full_name, phone, and address fields.
 */
const profileValidation = {
  update: [
    body("full_name")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .escape(),
    body("phone")
      .optional()
      .matches(/^[0-9]{10,15}$/)
      .withMessage("Invalid phone number"),
    body("address")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .escape()
  ]
};

/**
 * Validation chains for confirming a sale transaction.
 * @property {Array} confirm - Validates postId, optional buyerId/sellerId, and secretCode.
 */
const saleDoneValidation = {
  confirm: [
    body("postId")
      .isInt({ min: 1 })
      .withMessage("Invalid post ID"),
    body("buyerId")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Invalid buyer ID"),
    body("sellerId")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Invalid seller ID"),
    body("secretCode")
      .optional()
      .isLength({ min: 4, max: 10 })
      .withMessage("Invalid secret code")
  ]
};

module.exports = {
  validate,
  authValidation,
  postValidation,
  profileValidation,
  saleDoneValidation
};
