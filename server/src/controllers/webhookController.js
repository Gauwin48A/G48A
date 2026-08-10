/**
 * webhookController.js - Razorpay Webhook Controller with Signature Verification & Replay Protection
 *
 * Implements:
 * 1. Cryptographic HMAC SHA-256 signature verification (`x-razorpay-signature`).
 * 2. Event deduplication via database `webhook_events` table (`UNIQUE(gateway_event_id)`).
 * 3. Out-of-Order event handling with explicit state machine transition checks.
 */

const crypto = require("crypto");
const logger = require("../utils/logger");
const { runQuery } = require("../utils/dbHelpers");

const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "razorpay_webhook_secret_placeholder";

/**
 * Verify Razorpay HMAC SHA-256 webhook signature.
 */
const verifyWebhookSignature = (rawBody, signature, secret) => {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (err) {
    logger.error("[Webhook] Signature verification error:", err.message);
    return false;
  }
};

/**
 * POST /api/v1/webhooks/razorpay
 * Process incoming Razorpay financial webhooks safely.
 */
exports.handleRazorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});

  // 1. Verify Signature if secret is configured
  if (process.env.RAZORPAY_WEBHOOK_SECRET) {
    const isValid = verifyWebhookSignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);
    if (!isValid) {
      logger.warn("[Webhook] Invalid signature received from IP:", req.ip);
      return res.status(400).json({ error: "Invalid webhook signature" });
    }
  }

  const payload = typeof req.body === "object" ? req.body : JSON.parse(rawBody || "{}");
  const eventId = payload.event_id || payload.id || `evt_${Date.now()}_${Math.random()}`;
  const eventType = payload.event || "unknown";

  try {
    // 2. Event Deduplication: Ensure gateway_event_id processed exactly once.
    //    Atomic UPSERT: a previously-FAILED event is re-claimed (status ->
    //    'PROCESSED') so a transient processing error can be recovered on
    //    replay, while already-processed events return no row (replay ignored).
    //    A single statement avoids the TOCTOU race of SELECT-then-UPDATE.
    const dedupeCheck = await runQuery(
      `INSERT INTO webhook_events (gateway_event_id, event_type, payload, status, processed_at)
       VALUES ($1, $2, $3::jsonb, 'PROCESSED', NOW())
       ON CONFLICT (gateway_event_id) DO UPDATE
       SET status = 'PROCESSED',
           payload = EXCLUDED.payload,
           event_type = EXCLUDED.event_type,
           processed_at = NOW()
       WHERE webhook_events.status = 'FAILED'
       RETURNING *`,
      [eventId, eventType, JSON.stringify(payload)]
    );

    if (dedupeCheck.rows.length === 0) {
      logger.info(`[Webhook] Event ${eventId} already processed (idempotent replay ignored).`);
      return res.status(200).json({ status: "already_processed", event_id: eventId });
    }

    // 3. Process Financial Webhook Event Types
    switch (eventType) {
      case "transfer.processed":
      case "payout.processed": {
        const entity = payload.payload?.transfer?.entity || payload.payload?.payout?.entity || {};
        const referenceId = entity.notes?.reference_id || entity.reference_id;
        const gatewayId = entity.id;

        if (referenceId) {
          await runQuery(
            `UPDATE payout_records
             SET status = 'PAYOUT_SUCCESS', gateway_payout_id = $1, updated_at = NOW()
             WHERE reference_id = $2 AND status IN ('PAYOUT_PENDING', 'PAYOUT_PROCESSING')`,
            [gatewayId, referenceId]
          );
          logger.info(`[Webhook] Payout ${referenceId} marked PAYOUT_SUCCESS via webhook.`);
        }
        break;
      }

      case "transfer.failed":
      case "payout.failed":
      case "payout.reversed": {
        const entity = payload.payload?.transfer?.entity || payload.payload?.payout?.entity || {};
        const referenceId = entity.notes?.reference_id || entity.reference_id;
        const errorDesc = entity.error_description || "Payout failed/reversed";

        if (referenceId) {
          // Verify out-of-order check: do not reverse if already marked successful manually
          await runQuery(
            `UPDATE payout_records
             SET status = 'PAYOUT_REVERSED', last_error = $1, updated_at = NOW()
             WHERE reference_id = $2 AND status != 'PAYOUT_SUCCESS'`,
            [errorDesc, referenceId]
          );
          logger.warn(`[Webhook] Payout ${referenceId} updated to PAYOUT_REVERSED: ${errorDesc}`);
        }
        break;
      }

      case "payment.captured": {
        const paymentEntity = payload.payload?.payment?.entity || {};
        const orderId = paymentEntity.notes?.order_id;
        if (orderId) {
          await runQuery(
            `UPDATE orders SET payment_status = 'CAPTURED', updated_at = NOW() WHERE order_id::text = $1`,
            [orderId]
          );
          logger.info(`[Webhook] Order ${orderId} payment status updated to CAPTURED.`);
        }
        break;
      }

      // ── Phase 5, item 35: Gateway chargeback handling ───────────────
      // Gateway chargebacks (from the card/bank network via Razorpay) are a
      // DIFFERENT financial event from an internal dispute. Handle them
      // separately: flag the order/sale, freeze hold, and raise an alert.
      case "chargeback.created":
      case "dispute.created": {
        const disputeEntity =
          payload.payload?.dispute?.entity || payload.payload?.payment?.dispute || {};
        const paymentEntity = payload.payload?.payment?.entity || {};
        const paymentId =
          disputeEntity.payment_id || paymentEntity.id || disputeEntity.id;

        if (!paymentId) {
          logger.warn("[Webhook] Chargeback event without a payment_id — ignored.");
          break;
        }

        // Find the affected order via payment_id.
        // NOTE: only query the guaranteed razorpay_payment_id column — an
        // optional payment_intent_id column is checked separately & guarded
        // so an unknown column can never fail the whole webhook.
        const orderRes = await runQuery(
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
            // payment_intent_id column may not exist on this schema — non-fatal
            logger.info("[Webhook] payment_intent_id lookup unavailable:", altErr.message);
          }
        }

        if (orderRes.rows.length > 0) {
          const order = orderRes.rows[0];
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

          // Freeze both parties pending resolution
          try {
            const { transitionAccountState } = require("../services/accountStateService");
            await transitionAccountState(order.buyer_id, "FROZEN_DISPUTE", { reason: `Gateway chargeback on order ${order.order_id}` }).catch(() => {});
            await transitionAccountState(order.seller_id, "FROZEN_DISPUTE", { reason: `Gateway chargeback on order ${order.order_id}` }).catch(() => {});
          } catch (freezeErr) {
            logger.warn("[Webhook] Chargeback freeze error (non-blocking):", freezeErr.message);
          }

          // Raise financial alert
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
            logger.warn("[Webhook] Chargeback alert failed:", alertErr.message);
          }

          logger.warn(
            `[Webhook] Chargeback on order ${order.order_id} (${paymentId}) — order flagged, funds held, accounts frozen.`
          );
        } else {
          logger.warn(`[Webhook] Chargeback for unknown payment ${paymentId} — no matching order.`);
          // Unknown-payment chargebacks are a financial anomaly worth an alert
          try {
            const { raiseFinancialAlert } = require("../services/financialAlertsService");
            await raiseFinancialAlert({
              type: "RECONCILIATION_MISMATCH",
              severity: "CRITICAL",
              entityType: "PAYMENT",
              entityId: String(paymentId),
              message: `Gateway chargeback for unknown payment ${paymentId} — no matching order in system.`,
              metadata: { event_id: eventId, event_type: eventType },
            });
          } catch (alertErr) {
            logger.warn("[Webhook] Unknown-chargeback alert failed:", alertErr.message);
          }
        }
        break;
      }      case "chargeback.resolved":
      case "dispute.resolved": {
        const disputeEntity =
          payload.payload?.dispute?.entity || payload.payload?.payment?.dispute || {};
        const paymentId =
          disputeEntity.payment_id || payload.payload?.payment?.entity?.id || disputeEntity.id;
        const outcome = String(disputeEntity.outcome || disputeEntity.status || "resolved").toLowerCase();
        // Merchant/platform favourable outcomes release the held funds.
        // Buyer-favourable outcomes (lost) mean the money returns to the
        // buyer — the hold must stay and an alert must be raised.
        // Pending/unknown outcomes are left untouched (gateway still deciding).
        const merchantFavourable = ["won", "resolved", "closed", "success", "accepted"].includes(outcome);
        const buyerFavourable = ["lost", "reversed", "declined", "failed"].includes(outcome);

        if (paymentId) {
          const orderRes = await runQuery(
            `SELECT order_id, buyer_id, seller_id FROM orders
             WHERE razorpay_payment_id = $1`,
            [paymentId]
          );

          if (orderRes.rows.length === 0) {
            try {
              const altRes = await runQuery(
                `SELECT order_id, buyer_id, seller_id FROM orders
                 WHERE payment_intent_id = $1`,
                [paymentId]
              );
              if (altRes.rows.length > 0) orderRes.rows = altRes.rows;
            } catch (altErr) {
              logger.info("[Webhook] payment_intent_id lookup unavailable:", altErr.message);
            }
          }

          if (orderRes.rows.length > 0) {
            const order = orderRes.rows[0];

            if (merchantFavourable) {
              // Merchant won — release the hold and unfreeze both parties
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
                await transitionAccountState(order.buyer_id, "ACTIVE", { reason: `Chargeback resolved in merchant favour (order ${order.order_id})` }).catch(() => {});
                await transitionAccountState(order.seller_id, "ACTIVE", { reason: `Chargeback resolved in merchant favour (order ${order.order_id})` }).catch(() => {});
              } catch (unfreezeErr) {
                logger.warn("[Webhook] Chargeback unfreeze error (non-blocking):", unfreezeErr.message);
              }
              logger.info(`[Webhook] Chargeback for order ${order.order_id} resolved in merchant favour (${outcome}). Hold released, accounts unfrozen.`);
            } else if (buyerFavourable) {
              // Buyer won — money returns to buyer. Keep hold, raise alert.
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
                logger.warn("[Webhook] Lost-chargeback alert failed:", alertErr.message);
              }
              logger.warn(`[Webhook] Chargeback for order ${order.order_id} LOST (${outcome}). Hold maintained for reconciliation.`);
            } else {
              // Pending/unknown outcome — leave state untouched for now
              logger.info(`[Webhook] Chargeback for order ${order.order_id} outcome '${outcome}' — no action (gateway still deciding).`);
            }
          }
        }
        break;
      }

      case "payment.failed": {
        const paymentEntity = payload.payload?.payment?.entity || {};
        const orderId = paymentEntity.notes?.order_id;
        if (orderId) {
          await runQuery(
            `UPDATE orders SET payment_status = 'FAILED', updated_at = NOW() WHERE order_id::text = $1`,
            [orderId]
          );
          logger.info(`[Webhook] Order ${orderId} payment failed.`);
        }
        break;
      }

      default:
        logger.info(`[Webhook] Unhandled event type: ${eventType}`);
    }

    return res.status(200).json({ status: "success", event_id: eventId });
  } catch (err) {
    logger.error(`[Webhook] Processing error for event ${eventId}:`, err);

    // Mark the event as FAILED so the reconciliation watchdog can retry it,
    // instead of leaving it permanently marked PROCESSED (which would lose
    // the financial event forever).
    try {
      await runQuery(
        `UPDATE webhook_events SET status = 'FAILED', processed_at = NOW()
         WHERE gateway_event_id = $1`,
        [eventId]
      );
    } catch (markErr) {
      logger.warn("[Webhook] Failed to mark event as FAILED:", markErr.message);
    }

    return res.status(500).json({ error: "Webhook processing failed" });
  }
};
