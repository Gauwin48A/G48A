/**
 * disputeResolutionService.js
 *
 * UNIFIED dispute resolution — single source of truth shared by BOTH dispute systems:
 *   1. Sales suspensions  (salesController: reportFraud / orderNotReceived / sellerRespondDispute / admin-resolve)
 *   2. Order disputes     (disputesController: create / adminResolve)
 *
 * Resolving a dispute in EITHER system MUST:
 *   - Unfreeze BOTH parties (account state → ACTIVE; suspensions deactivated)
 *   - Release the escrow hold (sales.razorpay_hold=false + Razorpay API releaseHold)
 *   - Reactivate the frozen post
 *   - Deactivate any remaining sale-scoped suspensions
 *
 * This guarantees symmetric behavior: resolving via a sales-fraud flag or via an
 * order dispute produces the exact same cleanup on both party accounts.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { transitionAccountState } = require("./accountStateService");

/**
 * Resolve a dispute involving a buyer + seller.
 *
 * @param {object} params
 * @param {string} params.buyerId
 * @param {string} params.sellerId
 * @param {string|number} [params.saleId] - sales-table id (reactivates post + releases sale hold)
 * @param {string} [params.orderId]      - orders-table id (audit context)
 * @param {string} [params.decision]     - SELLER_FAVOR | BUYER_FAVOR | PARTIAL | DISMISSED | MUTUAL_CANCELLATION
 * @param {string} [params.resolution]   - admin notes
 * @param {string} [params.adminId]      - resolving user (admin) id
 * @returns {Promise<{unfrozen: string[], holdReleased: boolean, postReactivated: boolean, suspensionsClosed: number}>}
 */
async function resolveDisputeForParties({
  buyerId,
  sellerId,
  saleId,
  orderId,
  decision = "RESOLVED",
  resolution = null,
  adminId = "system",
}) {
  const results = {
    unfrozen: [],
    holdReleased: false,
    postReactivated: false,
    suspensionsClosed: 0,
  };

  // ── 1. Unfreeze BOTH parties via the account state machine ─────────────
  // transitionAccountState(ACTIVE) also deactivates every suspension row for
  // the user, so both the sales 24h-respond window and order-dispute freeze
  // are cleared in one place.
  for (const uid of [buyerId, sellerId]) {
    if (!uid) continue;
    try {
      await transitionAccountState(uid, "ACTIVE", {
        reason: `Dispute resolved (${decision}): ${resolution || "resolved"}`,
        adminId,
      });
      results.unfrozen.push(uid);
    } catch (err) {
      logger.warn(`[DisputeResolve] Failed to unfreeze ${uid}:`, err.message);
    }
  }

  // ── 2. Release the sale-level hold + reactivate the post ───────────────
  if (saleId) {
    await runQuery(
      `UPDATE sales SET razorpay_hold = false, updated_at = NOW() WHERE id = $1`,
      [saleId]
    ).catch((e) => logger.warn("[DisputeResolve] Sale hold clear failed:", e.message));
    results.holdReleased = true;

    const saleRes = await runQuery(
      `SELECT post_id FROM sales WHERE id = $1`,
      [saleId]
    ).catch(() => ({ rows: [] }));
    if (saleRes.rows[0]?.post_id) {
      await runQuery(
        `UPDATE posts SET status = 'active', updated_at = NOW() WHERE post_id::text = $1`,
        [String(saleRes.rows[0].post_id)]
      ).catch((e) => logger.warn("[DisputeResolve] Post reactivate failed:", e.message));
      results.postReactivated = true;
    }

    // ── Actual Razorpay API hold release (capture) for the sale payment ──
    const spRes = await runQuery(
      `SELECT razorpay_payment_id, amount FROM sale_payments
       WHERE sale_id = $1 AND razorpay_payment_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [saleId]
    ).catch(() => ({ rows: [] }));
    if (spRes.rows[0]?.razorpay_payment_id) {
      try {
        const razorpayService = require("./razorpayService");
        const released = await razorpayService.releaseHold(
          spRes.rows[0].razorpay_payment_id,
          parseFloat(spRes.rows[0].amount || 0),
          `dispute_resolved_${decision}`
        );
        results.holdReleased = results.holdReleased || Boolean(released?.released);
        logger.info(`[DisputeResolve] Razorpay hold released for sale ${saleId} (${spRes.rows[0].razorpay_payment_id})`);
      } catch (e) {
        logger.warn("[DisputeResolve] Razorpay API release failed (DB flag already cleared):", e.message);
      }
    }
  }

  // ── 3. Close any remaining sale-scoped suspensions ─────────────────────
  if (saleId) {
    const upd = await runQuery(
      `UPDATE suspensions SET is_active = false WHERE sale_id = $1 AND is_active = true`,
      [saleId]
    ).catch(() => ({ rowCount: 0 }));
    results.suspensionsClosed = upd.rowCount || 0;
  }

  // ── 4. Audit trail ─────────────────────────────────────────────────────
  try {
    await runQuery(
      `INSERT INTO admin_audit_logs (admin_id, action, entity_type, entity_id, new_values)
       VALUES ($1, 'DISPUTE_RESOLVED', $2, $3, $4)`,
      [
        String(adminId),
        orderId ? "order" : "sale",
        String(orderId || saleId || ""),
        JSON.stringify({ decision, resolution, buyerId, sellerId, saleId, orderId }),
      ]
    );
  } catch (e) {
    logger.warn("[DisputeResolve] Audit log insert failed:", e.message);
  }

  logger.info(
    `[DisputeResolve] ${orderId ? `Order ${orderId}` : `Sale ${saleId}`} resolved (${decision}). ` +
      `Unfrozen: ${results.unfrozen.join(", ") || "none"}, hold=${results.holdReleased}, post=${results.postReactivated}`
  );

  return results;
}

module.exports = { resolveDisputeForParties };
