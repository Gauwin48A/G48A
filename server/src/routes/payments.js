const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect, optionalAuth } = require("../middleware/auth");
const { transactionLimiter, webhookLimiter } = require("../middleware/rateLimiter");

/**
 * @route Payment routes
 * @description Handles UPI payments, webhooks, promo codes, reconciliation, and payment management
 */

/* ── Public routes (no auth required) ──────────────────── */

/** @route GET /upi-details - Get UPI payment details */
router.get("/upi-details", paymentController.getUpiDetails);

/** @route POST /webhook - Handle payment provider webhook callbacks */
router.post("/webhook", webhookLimiter, paymentController.handleWebhook);

/** @route POST /validate-promo - Validate a promotional code */
router.post("/validate-promo", transactionLimiter, paymentController.validatePromoCode);

/* ── Protected routes (auth required) ──────────────────── */

/** @route POST /submit - Submit a new payment */
router.post("/submit", protect, transactionLimiter, paymentController.submitPayment);

/** @route POST /razorpay/order - Create Razorpay order for instant payment */
router.post("/razorpay/order", protect, transactionLimiter, paymentController.createRazorpayOrder);

/** @route POST /razorpay/verify - Verify Razorpay payment signature */
router.post("/razorpay/verify", protect, transactionLimiter, paymentController.verifyRazorpayPayment);

/** @route GET /status - Get payment status for the current user */
router.get("/status", protect, paymentController.getPaymentStatus);

/** @route GET /reconciliation/report - Get payment reconciliation report */
router.get("/reconciliation/report", protect, paymentController.getReconciliationReport);

/** @route POST /reconciliation/run - Trigger a reconciliation run */
router.post("/reconciliation/run", protect, paymentController.runReconciliation);

/** @route POST /:id/retry - Retry a failed payment */
router.post("/:id/retry", protect, transactionLimiter, paymentController.retryPayment);

/** @route GET /pending - Get all pending payments */
router.get("/pending", protect, paymentController.getPendingPayments);

/** @route POST /:id/verify - Verify a payment */
router.post("/:id/verify", protect, paymentController.verifyPayment);

/** @route POST /:id/reject - Reject a payment */
router.post("/:id/reject", protect, paymentController.rejectPayment);

/** @route GET /stats - Get payment statistics */
router.get("/stats", protect, paymentController.getPaymentStats);

module.exports = router;
