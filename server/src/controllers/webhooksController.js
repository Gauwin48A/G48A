const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const crypto = require("crypto");

/** Normalise a plan display name ("Starter Plan"/"Premium") into a tier slug. */
function tierSlug(planName) {
  const raw = String(planName || "basic").trim().toLowerCase();
  if (raw.includes("starter")) return "starter";
  if (raw.includes("premium")) return "premium";
  if (raw.includes("gold")) return "gold";
  if (raw.includes("silver")) return "silver";
  if (raw.includes("bronze")) return "bronze";
  if (raw.includes("basic")) return "basic";
  return raw || "basic";
}

/**
 * POST /api/v1/webhooks/razorpay
 * Handle Razorpay webhook events (payment captured, subscription activated, refund processed)
 */
exports.razorpay = async (req, res) => {
  const webhookSecret =
    process.env.RAZORPAY_WEBHOOK_SECRET || "razorpay_webhook_secret_placeholder";
  const signature = req.headers["x-razorpay-signature"];

  // Verify signature (constant-time comparison; required when a secret is set)
  if (signature) {
    // Verify against the RAW body exactly as the gateway signed it.
    // index.js captures req.rawBody via express.json's verify hook.
    const rawBody =
      req.rawBody && req.rawBody.length
        ? req.rawBody.toString()
        : JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    const valid =
      expectedSignature.length === String(signature).length &&
      crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(String(signature))
      );

    if (!valid) {
      logger.warn("[Webhooks] Invalid Razorpay signature");
      return res.status(401).json({ error: "Invalid signature" });
    }
  } else {
    logger.warn("[Webhooks] Missing x-razorpay-signature header");
    return res.status(400).json({ error: "Missing signature" });
  }

  const event = req.body;
  const eventType = event.event;
  const eventId = event.id || event.event_id;
  // STABLE dedup key: the provider's own event ID. Never append Date.now() —
  // that would break replay idempotency (a redelivered webhook would get a
  // fresh key and be re-processed, double-freezing/double-alerting).
  const gatewayEventId = `razorpay_${eventId || eventType}`;

  try {
    // Store webhook event for idempotency — dedupe on the provider event ID.
    // (Live schema stores gateway_event_id; older schemas used idempotency_key,
    // handled via the preflight-safe query below.)
    try {
      const existing = await runQuery(
        `SELECT id FROM webhook_events WHERE gateway_event_id = $1`,
        [gatewayEventId]
      );
      if (existing.rows.length > 0) {
        return res.status(200).json({ status: "duplicate" });
      }
    } catch (dedupErr) {
      // Older webhook_events schema (idempotency_key) — fall back gracefully
      try {
        const existing = await runQuery(
          `SELECT webhook_event_id FROM webhook_events WHERE idempotency_key = $1`,
          [`razorpay_${eventId}`]
        );
        if (existing.rows.length > 0) {
          return res.status(200).json({ status: "duplicate" });
        }
      } catch {
        // No webhook_events table at all — continue processing (dedup best-effort)
      }
    }

    try {
      // Atomic dedup: the live schema has UNIQUE(gateway_event_id). If the
      // insert affects 0 rows the event was already processed — skip handling.
      const inserted = await runQuery(
        `INSERT INTO webhook_events (gateway_event_id, event_type, payload, status)
         VALUES ($1, $2, $3::jsonb, 'PROCESSED')
         ON CONFLICT (gateway_event_id) DO NOTHING`,
        [gatewayEventId, eventType, JSON.stringify(event)]
      );
      if (inserted.rowCount === 0) {
        return res.status(200).json({ status: "duplicate" });
      }
    } catch (insertErr) {
      // Older schema fallback (provider / event_id_raw / idempotency_key)
      try {
        await runQuery(
          `INSERT INTO webhook_events (provider, event_type, event_id_raw, payload, signature, signature_verified, idempotency_key, processed)
           VALUES ('razorpay', $1, $2, $3, $4, $5, $6, false)`,
          [eventType, eventId, JSON.stringify(event), signature || null, !!webhookSecret, `razorpay_${eventId}`]
        );
      } catch (legacyErr) {
        logger.warn("[Webhooks] Could not persist webhook event (non-fatal):", legacyErr.message);
      }
    }

    // Process based on event type
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload);
        break;
      case "payment.failed":
        await handlePaymentFailed(event.payload);
        break;
      case "subscription.activated":
        await handleSubscriptionActivated(event.payload);
        break;
      case "subscription.completed":
        await handleSubscriptionCompleted(event.payload);
        break;
      case "subscription.charged":
        await handleSubscriptionCharged(event.payload);
        break;
      case "refund.created":
        await handleRefundCreated(event.payload);
        break;
      case "transfer.processed":
      case "payout.processed":
        await handlePayoutProcessed(event.payload);
        break;
      case "transfer.failed":
      case "payout.failed":
      case "payout.reversed":
        await handlePayoutFailed(event.payload);
        break;
      case "chargeback.created":
      case "dispute.created":
        await handleChargebackCreated(event.payload);
        break;
      case "chargeback.resolved":
      case "dispute.resolved":
        await handleChargebackResolved(event.payload);
        break;
      default:
        logger.info(`[Webhooks] Unhandled Razorpay event: ${eventType}`);
    }

    res.status(200).json({ status: "received" });
  } catch (err) {
    logger.error("[Webhooks] razorpay processing error:", err);
    res.status(200).json({ status: "error", message: err.message });
  }
};

/**
 * Handle payout/transfer processed webhook events.
 * Marks the payout record PAYOUT_SUCCESS (idempotent state guard).
 */
async function handlePayoutProcessed(payload) {
  const entity = payload?.transfer?.entity || payload?.payout?.entity || {};
  const referenceId = entity.notes?.reference_id || entity.reference_id;
  const gatewayId = entity.id;

  if (!referenceId) return;

  await runQuery(
    `UPDATE payout_records
     SET status = 'PAYOUT_SUCCESS', gateway_payout_id = $1, updated_at = NOW()
     WHERE reference_id = $2 AND status IN ('PAYOUT_PENDING', 'PAYOUT_PROCESSING')`,
    [gatewayId, referenceId]
  );
  logger.info(`[Webhooks] Payout ${referenceId} marked PAYOUT_SUCCESS via webhook.`);
}

/**
 * Handle payout/transfer failed or reversed webhook events.
 * Out-of-order safe: never downgrades an already-successful payout.
 */
async function handlePayoutFailed(payload) {
  const entity = payload?.transfer?.entity || payload?.payout?.entity || {};
  const referenceId = entity.notes?.reference_id || entity.reference_id;
  const errorDesc = entity.error_description || "Payout failed/reversed";

  if (!referenceId) return;

  await runQuery(
    `UPDATE payout_records
     SET status = 'PAYOUT_REVERSED', last_error = $1, updated_at = NOW()
     WHERE reference_id = $2 AND status != 'PAYOUT_SUCCESS'`,
    [errorDesc, referenceId]
  );
  logger.warn(`[Webhooks] Payout ${referenceId} updated to PAYOUT_REVERSED: ${errorDesc}`);
}

/**
 * Handle gateway chargeback / dispute creation.
 * Chargebacks are distinct from internal disputes: flag the order, hold funds,
 * freeze both parties, and raise a CRITICAL reconciliation alert.
 */
async function handleChargebackCreated(payload) {
  const disputeEntity = payload?.dispute?.entity || payload?.payment?.dispute || {};
  const paymentEntity = payload?.payment?.entity || {};
  const paymentId = disputeEntity.payment_id || paymentEntity.id || disputeEntity.id;

  if (!paymentId) {
    logger.warn("[Webhooks] Chargeback event without payment_id — ignored.");
    return;
  }

  // Look up the matching order — resilient to environments where the orders
  // table has not been provisioned. A chargeback ALWAYS surfaces as a
  // reconciliation alert even when no order can be found.
  let order = null;
  try {
    let orderRes = await runQuery(
      `SELECT order_id, buyer_id, seller_id, total_amount FROM orders
       WHERE razorpay_payment_id = $1`,
      [paymentId]
    );

    if (orderRes.rows.length === 0) {
      try {
        const altRes = await runQuery(
          `SELECT order_id, buyer_id, seller_id, total_amount FROM orders
           WHERE payment_intent_id = $1`,
          [paymentId]
        );
        if (altRes.rows.length > 0) orderRes.rows = altRes.rows;
      } catch (altErr) {
        logger.info("[Webhooks] payment_intent_id lookup unavailable:", altErr.message);
      }
    }
    order = orderRes.rows[0] || null;
  } catch (lookupErr) {
    logger.warn(`[Webhooks] Order lookup unavailable for chargeback ${paymentId}:`, lookupErr.message);
  }

  if (!order) {
    logger.warn(`[Webhooks] Chargeback for payment ${paymentId} — no matching order (or orders table unavailable).`);
    try {
      const { raiseFinancialAlert } = require("../services/financialAlertsService");
      await raiseFinancialAlert({
        type: "RECONCILIATION_MISMATCH",
        severity: "CRITICAL",
        entityType: "PAYMENT",
        entityId: String(paymentId),
        message: `Gateway chargeback received for payment ${paymentId} — no matching order in system. Funds must be reconciled.`,
        metadata: { event_id: paymentId },
      });
    } catch (alertErr) {
      logger.warn("[Webhooks] Unknown-chargeback alert failed:", alertErr.message);
    }
    return;
  }
  await runQuery(
    `UPDATE orders SET status = 'CHARGEBACK', payment_status = 'DISPUTED', updated_at = NOW()
     WHERE order_id::text = $1`,
    [order.order_id]
  );
  await runQuery(
    `UPDATE sales SET razorpay_hold = true, updated_at = NOW()
     WHERE buyer_id::text = $1 AND seller_id::text = $2 AND status IN ('requested','approved','received')`,
    [String(order.buyer_id), String(order.seller_id)]
  ).catch(() => {});

  try {
    const { transitionAccountState } = require("../services/accountStateService");
    await transitionAccountState(order.buyer_id, "FROZEN_DISPUTE", { reason: `Gateway chargeback on order ${order.order_id}` }).catch((e) => logger.warn('[Webhooks] Failed to freeze buyer', { message: e.message }));
    await transitionAccountState(order.seller_id, "FROZEN_DISPUTE", { reason: `Gateway chargeback on order ${order.order_id}` }).catch((e) => logger.warn('[Webhooks] Failed to freeze seller', { message: e.message }));
  } catch (freezeErr) {
    logger.warn("[Webhooks] Chargeback freeze error (non-blocking):", freezeErr.message);
  }

  try {
    const { raiseFinancialAlert } = require("../services/financialAlertsService");
    await raiseFinancialAlert({
      type: "RECONCILIATION_MISMATCH",
      severity: "CRITICAL",
      entityType: "ORDER",
      entityId: String(order.order_id),
      message: `Gateway chargeback received for order ${order.order_id} (payment ${paymentId}). Funds held, accounts frozen.`,
      metadata: { payment_id: paymentId, amount: order.total_amount },
    });
  } catch (alertErr) {
    logger.warn("[Webhooks] Chargeback alert failed:", alertErr.message);
  }

  logger.warn(
    `[Webhooks] Chargeback on order ${order.order_id} (${paymentId}) — order flagged, funds held, accounts frozen.`
  );
}

/**
 * Handle gateway chargeback / dispute resolution.
 * Outcome-aware: merchant-favourable releases hold + unfreezes; buyer-favourable
 * keeps the hold and raises an alert; pending/unknown does nothing.
 */
async function handleChargebackResolved(payload) {
  const disputeEntity = payload?.dispute?.entity || payload?.payment?.dispute || {};
  const paymentId = disputeEntity.payment_id || payload?.payment?.entity?.id || disputeEntity.id;
  const outcome = String(disputeEntity.outcome || disputeEntity.status || "resolved").toLowerCase();

  const merchantFavourable = ["won", "resolved", "closed", "success", "accepted"].includes(outcome);
  const buyerFavourable = ["lost", "reversed", "declined", "failed"].includes(outcome);

  if (!paymentId) return;

  // Resilient order lookup — no order (or no orders table) means nothing to update.
  let order = null;
  try {
    let orderRes = await runQuery(
      `SELECT order_id, buyer_id, seller_id FROM orders WHERE razorpay_payment_id = $1`,
      [paymentId]
    );
    if (orderRes.rows.length === 0) {
      try {
        const altRes = await runQuery(
          `SELECT order_id, buyer_id, seller_id FROM orders WHERE payment_intent_id = $1`,
          [paymentId]
        );
        if (altRes.rows.length > 0) orderRes.rows = altRes.rows;
      } catch (altErr) {
        logger.info("[Webhooks] payment_intent_id lookup unavailable:", altErr.message);
      }
    }
    order = orderRes.rows[0] || null;
  } catch (lookupErr) {
    logger.info(`[Webhooks] Chargeback-resolved lookup skipped (${paymentId}):`, lookupErr.message);
  }

  if (!order) return;

  if (merchantFavourable) {
    await runQuery(
      `UPDATE orders SET payment_status = 'CAPTURED', status = 'COMPLETED', updated_at = NOW()
       WHERE order_id::text = $1 AND status = 'CHARGEBACK'`,
      [order.order_id]
    );
    await runQuery(
      `UPDATE sales SET razorpay_hold = false, updated_at = NOW()
       WHERE buyer_id::text = $1 AND seller_id::text = $2`,
      [String(order.buyer_id), String(order.seller_id)]
    ).catch(() => {});
    try {
      const { transitionAccountState } = require("../services/accountStateService");
      await transitionAccountState(order.buyer_id, "ACTIVE", { reason: `Chargeback resolved in merchant favour (order ${order.order_id})` }).catch((e) => logger.warn('[Webhooks] Failed to unfreeze buyer', { message: e.message }));
      await transitionAccountState(order.seller_id, "ACTIVE", { reason: `Chargeback resolved in merchant favour (order ${order.order_id})` }).catch((e) => logger.warn('[Webhooks] Failed to unfreeze seller', { message: e.message }));
    } catch (unfreezeErr) {
      logger.warn("[Webhooks] Chargeback unfreeze error (non-blocking):", unfreezeErr.message);
    }
    logger.info(`[Webhooks] Chargeback for order ${order.order_id} resolved in merchant favour (${outcome}). Hold released, accounts unfrozen.`);
  } else if (buyerFavourable) {
    await runQuery(
      `UPDATE orders SET payment_status = 'REFUNDED', updated_at = NOW()
       WHERE order_id::text = $1`,
      [order.order_id]
    );
    try {
      const { raiseFinancialAlert } = require("../services/financialAlertsService");
      await raiseFinancialAlert({
        type: "UNUSUAL_REFUND_ACTIVITY",
        severity: "HIGH",
        entityType: "ORDER",
        entityId: String(order.order_id),
        message: `Chargeback lost for order ${order.order_id} (outcome: ${outcome}). Buyer refunded via gateway; held funds must be reconciled.`,
        metadata: { payment_id: paymentId, outcome },
      });
    } catch (alertErr) {
      logger.warn("[Webhooks] Lost-chargeback alert failed:", alertErr.message);
    }
    logger.warn(`[Webhooks] Chargeback for order ${order.order_id} LOST (${outcome}). Hold maintained for reconciliation.`);
  } else {
    logger.info(`[Webhooks] Chargeback for order ${order.order_id} outcome '${outcome}' — no action (gateway still deciding).`);
  }
}

/**
 * POST /api/v1/webhooks/surepass
 * Handle Surepass KYC webhook events
 */
exports.surepass = async (req, res) => {
  try {
    const event = req.body;
    logger.info("[Webhooks] Surepass event received:", event.type || "unknown");
    res.status(200).json({ status: "received" });
  } catch (err) {
    logger.error("[Webhooks] surepass error:", err);
    res.status(200).json({ status: "error" });
  }
};

/**
 * GET /api/v1/webhooks/log
 * View recent webhook events
 */
exports.log = async (req, res) => {
  try {
    const result = await runQuery(
      `SELECT id AS webhook_event_id, gateway_event_id, event_type, status, payload, processed_at
       FROM webhook_events
       ORDER BY processed_at DESC LIMIT 100`
    );
    res.json({ success: true, events: result.rows });
  } catch (err) {
    logger.error("[Webhooks] log error:", err);
    res.status(500).json({ error: "Failed to fetch webhook logs" });
  }
};

// ---- Internal event handlers ----

async function handlePaymentCaptured(payload) {
  const payment = payload.payment?.entity;
  const order = payload.order?.entity;
  if (!payment) return;

  await runQuery(
    `UPDATE payment_transactions SET status = 'CAPTURED', razorpay_payment_id = $1, updated_at = NOW()
     WHERE razorpay_order_id = $2`,
    [payment.id, order?.id || payment.order_id]
  );

  await runQuery(
    `UPDATE payment_orders SET status = 'PAID', updated_at = NOW() WHERE razorpay_order_id = $1`,
    [order?.id || payment.order_id]
  );

  // If this is an order payment, mark order as PAID and write ledger entries
  if (order?.receipt) {
    const updateRes = await runQuery(
      `UPDATE orders SET status = 'PAID', payment_status = 'PAID', razorpay_payment_id = $1, updated_at = NOW()
       WHERE order_number = $2 RETURNING *`,
      [payment.id, order.receipt]
    );
    const orderRow = updateRes.rows[0];
    if (orderRow) {
      // 1. Log BUYER_PAYMENT into financial_ledger
      await runQuery(
        `INSERT INTO financial_ledger (reference_id, order_id, user_id, event_type, direction, amount, status, provider_reference)
         VALUES ($1, $2, $3, 'BUYER_PAYMENT', 'CREDIT', $4, 'COMPLETED', $5)`,
        [orderRow.order_number, String(orderRow.order_id), orderRow.buyer_id, orderRow.total_amount, payment.id]
      );
      // 2. Log PLATFORM_FEE into financial_ledger
      if (orderRow.platform_fee && parseFloat(orderRow.platform_fee) > 0) {
        await runQuery(
          `INSERT INTO financial_ledger (reference_id, order_id, user_id, event_type, direction, amount, status, provider_reference)
           VALUES ($1, $2, $3, 'PLATFORM_FEE', 'CREDIT', $4, 'COMPLETED', $5)`,
          [orderRow.order_number, String(orderRow.order_id), orderRow.seller_id, orderRow.platform_fee, payment.id]
        );
      }
      // 3. Log SELLER_TRANSFER into financial_ledger
      if (orderRow.seller_payout && parseFloat(orderRow.seller_payout) > 0) {
        await runQuery(
          `INSERT INTO financial_ledger (reference_id, order_id, user_id, event_type, direction, amount, status, provider_reference)
           VALUES ($1, $2, $3, 'SELLER_TRANSFER', 'DEBIT', $4, 'COMPLETED', $5)`,
          [orderRow.order_number, String(orderRow.order_id), orderRow.seller_id, orderRow.seller_payout, payment.id]
        );
      }
    }
  }
}

async function handlePaymentFailed(payload) {
  const payment = payload.payment?.entity;
  if (!payment) return;

  await runQuery(
    `UPDATE payment_transactions SET status = 'FAILED', error_code = $1, error_description = $2, updated_at = NOW()
     WHERE razorpay_order_id = $3`,
    [payment.error_code || null, payment.error_description || null, payment.order_id]
  );
}

async function handleSubscriptionActivated(payload) {
  const subscription = payload.subscription?.entity;
  if (!subscription) return;

  // Check if this is a recurring subscription (Razorpay subscription_id known)
  const existing = await runQuery(
    `SELECT * FROM user_subscriptions WHERE razorpay_subscription_id = $1`,
    [subscription.id]
  );

  if (existing.rows.length > 0) {
    // Update existing subscription record
    await runQuery(
      `UPDATE user_subscriptions SET status = 'ACTIVE', start_date = NOW(),
              end_date = $1, updated_at = NOW()
       WHERE razorpay_subscription_id = $2`,
      [new Date(subscription.end_at * 1000), subscription.id]
    );

    const sub = existing.rows[0];
    // Sync user tier
    const planResult = await runQuery(
      `SELECT plan_name FROM subscription_plans WHERE plan_id = $1`,
      [sub.plan_id]
    );
    const planName = planResult.rows[0]?.plan_name || "ACTIVE";
    await runQuery(
      `UPDATE users SET current_tier = $1, current_plan = $1, tier = $1, subscription_expiry = $2, updated_at = NOW()
       WHERE user_id::text = $3`,
      [tierSlug(planName), new Date(subscription.end_at * 1000), sub.user_id]
    );

    await runQuery(
      `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
       VALUES ($1, $2, 'ACTIVATED', $3)`,
      [sub.user_id, sub.sub_id, JSON.stringify({ razorpay_subscription_id: subscription.id })]
    );
  } else {
    // This is a new subscription from Razorpay recurring — create a record
    // (The plan_id will need to be looked up via notes or a webhook order reference)
    const subscriptionPlanId = subscription.notes?.plan_id || null;
    const userId = subscription.notes?.user_id || null;

    if (subscriptionPlanId && userId) {
      const planResult = await runQuery(
        `SELECT * FROM subscription_plans WHERE plan_id::text = $1`,
        [subscriptionPlanId]
      );
      if (planResult.rows.length > 0) {
        const plan = planResult.rows[0];
        const endDate = new Date(subscription.end_at * 1000);

        const subResult = await runQuery(
          `INSERT INTO user_subscriptions (user_id, plan_id, razorpay_subscription_id, status, start_date, end_date)
           VALUES ($1, $2, $3, 'ACTIVE', NOW(), $4) RETURNING *`,
          [userId, subscriptionPlanId, subscription.id, endDate]
        );

        await runQuery(
          `UPDATE users SET current_tier = $1, current_plan = $1, tier = $1, subscription_expiry = $2, updated_at = NOW()
           WHERE user_id::text = $3`,
          [tierSlug(plan.plan_name), endDate, userId]
        );

        await runQuery(
          `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
           VALUES ($1, $2, 'ACTIVATED', $3)`,
          [userId, subResult.rows[0].sub_id, JSON.stringify({ razorpay_subscription_id: subscription.id })]
        );
      }
    }
  }
}

async function handleSubscriptionCompleted(payload) {
  const subscription = payload.subscription?.entity;
  if (!subscription) return;

  const result = await runQuery(
    `UPDATE user_subscriptions SET status = 'EXPIRED', updated_at = NOW()
     WHERE razorpay_subscription_id = $1 RETURNING *`,
    [subscription.id]
  );

  if (result.rows.length > 0) {
    const sub = result.rows[0];
    await runQuery(
      `UPDATE users SET current_tier = 'basic', current_plan = 'basic', tier = 'basic', subscription_expiry = NULL, updated_at = NOW()
       WHERE user_id::text = $1`,
      [sub.user_id]
    );

    await runQuery(
      `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
       VALUES ($1, $2, 'EXPIRED', $3)`,
      [sub.user_id, sub.sub_id, JSON.stringify({ razorpay_subscription_id: subscription.id })]
    );
  }
}

async function handleSubscriptionCharged(payload) {
  const subscription = payload.subscription?.entity;
  const payment = payload.payment?.entity;
  if (!subscription || !payment) return;

  // Renew the subscription period
  const subResult = await runQuery(
    `UPDATE user_subscriptions SET status = 'ACTIVE', end_date = $1, updated_at = NOW()
     WHERE razorpay_subscription_id = $2 AND status IN ('ACTIVE', 'EXPIRED')
     RETURNING *`,
    [new Date(subscription.end_at * 1000), subscription.id]
  );

  if (subResult.rows.length > 0) {
    const sub = subResult.rows[0];

    await runQuery(
      `INSERT INTO payment_transactions (user_id, plan_id, razorpay_order_id, razorpay_payment_id, amount, currency, status)
       VALUES ($1, $2, $3, $4, $5, 'INR', 'CAPTURED')`,
      [sub.user_id, sub.plan_id, payment.order_id, payment.id, parseFloat((payment.amount || 0) / 100)]
    );

    await runQuery(
      `INSERT INTO subscription_events (user_id, sub_id, event_type, metadata)
       VALUES ($1, $2, 'RENEWED', $3)`,
      [sub.user_id, sub.sub_id, JSON.stringify({ amount: payment.amount, payment_id: payment.id })]
    );
  }
}

async function handleRefundCreated(payload) {
  const refund = payload.refund?.entity;
  if (!refund) return;

  await runQuery(
    `UPDATE payment_refunds SET status = 'PROCESSED', razorpay_refund_id = $1, processed_at = NOW()
     WHERE razorpay_refund_id = $1`,
    [refund.id]
  );

  await runQuery(
    `UPDATE payment_transactions SET status = 'REFUNDED', updated_at = NOW()
     WHERE razorpay_payment_id = $1`,
    [refund.payment_id]
  );
}
