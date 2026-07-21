const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { verifyRazorpaySignature } = require("../services/paymentGateway");
const logger = require("../utils/logger");
const axios = require("axios");
const crypto = require("crypto");

const RAZORPAY_API_BASE = process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

/**
 * POST /api/payments/create-order
 * Create a Razorpay Order and initialize payment_transactions
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { planId } = req.body;

    if (!userId) return res.status(401).json({ error: "Authentication required" });
    if (!planId) return res.status(400).json({ error: "planId is required" });

    // Validate plan
    const planResult = await runQuery(
      `SELECT plan_id, plan_name, price, duration_days FROM subscription_plans WHERE plan_id = $1 AND is_active = true`,
      [planId]
    );

    if (planResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid or inactive plan" });
    }

    const plan = planResult.rows[0];
    const amountInr = Number(plan.price);
    const amountPaise = Math.round(amountInr * 100);
    const receipt = `order_${userId.replace(/-/g, "").substring(0, 8)}_${Date.now()}`;

    const credentials = getRazorpayCredentials();

    let razorpayOrderId = `mock_order_${crypto.randomBytes(8).toString("hex")}`;
    let mock = true;

    if (credentials) {
      const response = await axios.post(
        `${RAZORPAY_API_BASE}/orders`,
        { amount: amountPaise, currency: "INR", receipt, payment_capture: 1 },
        { auth: { username: credentials.keyId, password: credentials.keySecret } }
      );
      razorpayOrderId = response.data.id;
      mock = false;
    } else {
      logger.info(`[PAYMENT MOCK] Created mock order for plan ${plan.plan_name}`);
    }

    // Insert into payment_transactions
    await runQuery(
      `INSERT INTO payment_transactions (user_id, plan_id, razorpay_order_id, amount, status)
       VALUES ($1, $2, $3, $4, 'CREATED')`,
      [userId, planId, razorpayOrderId, amountInr]
    );

    return res.json({
      success: true,
      orderId: razorpayOrderId,
      amount: amountPaise,
      currency: "INR",
      mock
    });
  } catch (err) {
    logger.error("[PAYMENT] createRazorpayOrder failed:", err);
    return res.status(500).json({ error: "Failed to create order" });
  }
};

/**
 * POST /api/payments/webhook
 * Handle Razorpay Webhooks (payment.captured, payment.failed)
 */
exports.handleWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const payload = JSON.stringify(req.body);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET;

    if (secret && signature) {
      if (!verifyRazorpaySignature(payload, signature, secret)) {
        return res.status(400).json({ error: "Invalid signature" });
      }
    }

    const event = req.body.event;
    const paymentEntity = req.body.payload?.payment?.entity || {};
    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    if (!orderId) {
      return res.json({ status: "ignored", reason: "no order_id" });
    }

    // Find the transaction
    const txResult = await runQuery(
      `SELECT transaction_id, user_id, plan_id, status FROM payment_transactions WHERE razorpay_order_id = $1`,
      [orderId]
    );

    if (txResult.rows.length === 0) {
      return res.json({ status: "ignored", reason: "transaction not found" });
    }

    const tx = txResult.rows[0];

    // Already processed?
    if (tx.status === 'CAPTURED') {
      return res.json({ status: "ok", reason: "already processed" });
    }

    if (event === "payment.captured" || event === "order.paid") {
      // Mark transaction as captured
      await runQuery(
        `UPDATE payment_transactions 
         SET status = 'CAPTURED', razorpay_payment_id = $1, raw_response = $2, updated_at = NOW() 
         WHERE transaction_id = $3`,
        [paymentId, req.body, tx.transaction_id]
      );

      // Fetch plan duration
      const planResult = await runQuery(
        `SELECT duration_days, plan_name FROM subscription_plans WHERE plan_id = $1`,
        [tx.plan_id]
      );
      
      let durationDays = 30;
      let planName = "PREMIUM";
      if (planResult.rows.length > 0) {
        durationDays = planResult.rows[0].duration_days;
        planName = planResult.rows[0].plan_name;
      }

      // Deactivate old subscriptions
      await runQuery(
        `UPDATE user_subscriptions SET status = 'EXPIRED' WHERE user_id::text = $1 AND status = 'ACTIVE'`,
        [tx.user_id]
      );

      // Create new subscription
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      await runQuery(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
         VALUES ($1, $2, 'ACTIVE', NOW(), $3)`,
        [tx.user_id, tx.plan_id, endDate]
      );

      // Update user tier
      await runQuery(
        `UPDATE users SET current_tier = $1 WHERE user_id::text = $2`,
        [planName, tx.user_id]
      );

      logger.info(`[WEBHOOK] Successfully activated subscription for user ${tx.user_id}`);
    } else if (event === "payment.failed") {
      await runQuery(
        `UPDATE payment_transactions 
         SET status = 'FAILED', raw_response = $1, updated_at = NOW() 
         WHERE transaction_id = $2`,
        [req.body, tx.transaction_id]
      );
    }

    return res.json({ status: "ok" });
  } catch (err) {
    logger.error("[WEBHOOK] Webhook error:", err);
    return res.status(500).json({ error: "Webhook failed" });
  }
};
