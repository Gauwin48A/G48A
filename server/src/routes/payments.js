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

module.exports = router;
