const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");
const { transactionLimiter, webhookLimiter } = require("../middleware/rateLimiter");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: "Validation failed", details: errors.array().map(e => ({ field: e.path, message: e.msg })) });
  }
  next();
};

/**
 * @route Payment routes
 * @description Handles Razorpay order creation and webhooks
 */

/** @route POST /webhook - Handle Razorpay webhooks (no auth — verified by Razorpay signature) */
router.post("/webhook", webhookLimiter, paymentController.handleWebhook);

/** @route POST /razorpay/order - Create Razorpay order for instant payment */
router.post("/razorpay/order", protect, transactionLimiter, paymentController.createRazorpayOrder);

/** @route POST /razorpay/verify - Verify Razorpay payment signature and capture */
router.post("/razorpay/verify", protect, transactionLimiter, paymentController.verifyRazorpayPayment);

// ---------------------------------------------------------------------------
// Gateway & manual-UPI payment endpoints
// ---------------------------------------------------------------------------

// GET /api/payments/gateway-config — Razorpay key + boost pricing for the web gateway (public)
router.get("/gateway-config", paymentController.getGatewayConfig);

// GET /api/payments/upi-details — manual UPI target + boost pricing (public)
router.get("/upi-details", paymentController.getUpiDetails);

// All user-facing payment status/submit/retry endpoints require auth
router.use(protect);

// GET /api/payments/status — list a user's manual payment submissions
router.get("/status", paymentController.getPaymentStatus);
router.get("/status/:id",
  param("id").notEmpty().withMessage("Payment ID is required"),
  validate,
  paymentController.getPaymentStatus
);
router.post("/status", paymentController.getPaymentStatus);
router.post("/status/:id",
  param("id").notEmpty().withMessage("Payment ID is required"),
  validate,
  paymentController.getPaymentStatus
);

// POST /api/payments/submit — submit a manual UPI payment reference
router.post("/submit",
  transactionLimiter,
  body("amount").isFloat({ gt: 0, max: 1000000 }).withMessage("Amount must be positive (max 10,00,000)"),
  body("utr_number").optional().trim().isLength({ min: 6, max: 30 }).withMessage("UTR must be 6-30 chars"),
  validate,
  paymentController.submitPayment
);

// POST /api/payments/retry/:id — regenerate the expiry for a pending payment
router.post("/retry/:id",
  param("id").notEmpty().withMessage("Payment ID is required"),
  transactionLimiter,
  validate,
  paymentController.retryPayment
);

// POST /api/payments/reject/:id — admin reject a manual payment
router.post("/reject/:id",
  param("id").notEmpty().withMessage("Payment ID is required"),
  validate,
  paymentController.rejectPayment
);

// POST /api/payments/:id/verify — admin verify a manual payment
router.post("/:id/verify",
  param("id").notEmpty().withMessage("Payment ID is required"),
  validate,
  paymentController.verifyPayment
);

module.exports = router;
