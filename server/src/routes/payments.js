const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middleware/auth");
const { transactionLimiter, webhookLimiter } = require("../middleware/rateLimiter");

/**
 * @route Payment routes
 * @description Handles Razorpay order creation and webhooks
 */

/** @route POST /webhook - Handle Razorpay webhooks */
router.post("/webhook", webhookLimiter, paymentController.handleWebhook);

/** @route POST /razorpay/order - Create Razorpay order for instant payment */
router.post("/razorpay/order", protect, transactionLimiter, paymentController.createRazorpayOrder);

/** @route POST /razorpay/verify - Verify Razorpay payment signature and capture */
router.post("/razorpay/verify", protect, transactionLimiter, paymentController.verifyRazorpayPayment);

// ---------------------------------------------------------------------------
// Gateway & manual-UPI payment endpoints (were defined but never mounted)
// ---------------------------------------------------------------------------

// GET /api/payments/gateway-config — Razorpay key + boost pricing for the web gateway
router.get("/gateway-config", paymentController.getGatewayConfig);

// GET /api/payments/upi-details — manual UPI target + boost pricing (zero-cost mode)
router.get("/upi-details", paymentController.getUpiDetails);

// GET /api/payments/status — list a user's manual payment submissions
router.get("/status", paymentController.getPaymentStatus);
router.get("/status/:id", paymentController.getPaymentStatus);
router.post("/status", paymentController.getPaymentStatus);
router.post("/status/:id", paymentController.getPaymentStatus);

// POST /api/payments/submit — submit a manual UPI payment reference
router.post("/submit", paymentController.submitPayment);

// POST /api/payments/retry/:id — regenerate the expiry for a pending payment
router.post("/retry/:id", paymentController.retryPayment);

// POST /api/payments/reject/:id — admin reject a manual payment
router.post("/reject/:id", paymentController.rejectPayment);

// POST /api/payments/:id/verify — admin verify a manual payment
router.post("/:id/verify", paymentController.verifyPayment);

module.exports = router;
