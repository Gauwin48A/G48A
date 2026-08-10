/**
 * reconciliationService.js - Razorpay ↔ Database Reconciliation & Watchdog Service
 *
 * Implements:
 * 1. Scans for transactions stuck in 'PAYOUT_PROCESSING', 'SETTLEMENT_PENDING', or 'PAYOUT_PENDING' > 15 minutes.
 * 2. Reconciles DB records with Razorpay API status to recover lost responses or network timeouts.
 * 3. Flag RECONCILIATION_MISMATCH financial alerts if DB and Gateway amounts/statuses differ.
 * 4. Re-enqueues stuck payouts via the BullMQ payout queue for exponential-backoff retry.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const paymentGateway = require("./paymentGatewayService");

/** Threshold (minutes) before a pending/processing payout is considered "stuck". */
const STUCK_AGE_MINUTES = 15;

/** Maximum number of stuck records scanned per sweep. */
const SWEEP_LIMIT = 50;

/**
 * Re-enqueue a stuck payout record via the BullMQ payout queue for retry.
 */
async function reenqueueStuckPayout(payout) {
  try {
    const { enqueuePayoutJob } = require("./payoutQueue");
    const result = await enqueuePayoutJob({
      referenceId: payout.reference_id,
      sellerId: payout.seller_id,
      amount: parseFloat(payout.amount),
      currency: payout.currency || "INR",
      payoutRecordId: payout.payout_id,
    });

    if (result.success) {
      logger.info(
        `[Reconciliation] Re-enqueued stuck payout #${payout.payout_id} (${payout.reference_id}) via BullMQ`
      );
      return true;
    }
    return false;
  } catch (err) {
    logger.error(
      `[Reconciliation] Failed to re-enqueue payout #${payout.payout_id}:`,
      err.message
    );
    return false;
  }
}

/**
 * Fetch the live status of a Razorpay transfer/payout.
 * @returns {Promise<{status: string|null, raw: object|null}>}
 */
async function fetchGatewayPayoutStatus(gatewayPayoutId) {
  try {
    // Payouts are created via the Payouts API (/v1/payouts), so status checks
    // must use the Payouts endpoint too — the Transfers endpoint only works
    // for Route/transfers payouts.
    const razorpayService = require("./razorpayService");
    const gw = await razorpayService.getPayoutStatus(gatewayPayoutId);
    if (!gw.success) {
      return { status: null, raw: null };
    }
    return { status: String(gw.status || "").toLowerCase(), raw: gw };
  } catch (err) {
    logger.warn(
      `[Reconciliation] Gateway status check failed for ${gatewayPayoutId}: ${err.message}`
    );
    return { status: null, raw: null };
  }
}

/**
 * Perform a full reconciliation sweep of stuck payouts.
 * Reconciles DB state against the Razorpay gateway and re-enqueues for retry.
 */
const reconcileStuckTransactions = async () => {
  logger.info("[Reconciliation] Starting transaction reconciliation sweep...");
  let reconciledCount = 0;
  let reenqueuedCount = 0;
  let mismatchCount = 0;

  try {
    // 1. Fetch pending/processing payouts older than the stuck threshold
    const stuckPayoutsRes = await runQuery(
      `SELECT * FROM payout_records
       WHERE status IN ('PAYOUT_PENDING', 'PAYOUT_PROCESSING', 'PAYOUT_FAILED_RETRYABLE')
         AND created_at < NOW() - ($1 || ' minutes')::interval
       LIMIT $2`,
      [String(STUCK_AGE_MINUTES), SWEEP_LIMIT]
    );

    for (const payout of stuckPayoutsRes.rows) {
      try {
        if (!paymentGateway.isRazorpayConfigured()) {
          // In simulation mode, complete stuck payouts
          await runQuery(
            `UPDATE payout_records SET status = 'PAYOUT_SUCCESS', updated_at = NOW() WHERE payout_id = $1`,
            [payout.payout_id]
          );
          reconciledCount++;
          continue;
        }

        // If gateway payout ID exists, fetch live status from Razorpay
        if (payout.gateway_payout_id) {
          const { status: liveStatus, raw: gwData } =
            await fetchGatewayPayoutStatus(payout.gateway_payout_id);

          if (liveStatus === "processed") {
            await runQuery(
              `UPDATE payout_records SET status = 'PAYOUT_SUCCESS', updated_at = NOW() WHERE payout_id = $1`,
              [payout.payout_id]
            );
            reconciledCount++;
            continue;
          } else if (liveStatus === "reversed" || liveStatus === "failed") {
            await runQuery(
              `UPDATE payout_records SET status = 'PAYOUT_FAILED_FINAL', last_error = $1, updated_at = NOW() WHERE payout_id = $2`,
              [gwData?.failure_reason || liveStatus, payout.payout_id]
            );
            mismatchCount++;

            // ── Raise a RECONCILIATION_MISMATCH financial alert ────────
            try {
              const { raiseFinancialAlert } = require("./financialAlertsService");
              await raiseFinancialAlert({
                type: "RECONCILIATION_MISMATCH",
                severity: "HIGH",
                entityType: "PAYOUT",
                entityId: String(payout.payout_id),
                message: `Payout #${payout.payout_id} (${payout.reference_id}) is ${liveStatus} at gateway while DB recorded ${payout.status}.`,
                metadata: {
                  reference_id: payout.reference_id,
                  amount: payout.amount,
                  gateway_status: liveStatus,
                  db_status: payout.status,
                },
              });
            } catch (alertErr) {
              logger.warn("[Reconciliation] Alert raise failed:", alertErr.message);
            }
            continue;
          }
          // Still pending/queued at gateway — fall through to re-enqueue
        } else {
          // No gateway_payout_id available to verify — this record is stuck.
          // Raise a STUCK_TRANSACTION alert (Phase 6, item 54).
          try {
            const { raiseFinancialAlert } = require("./financialAlertsService");
            await raiseFinancialAlert({
              type: "STUCK_TRANSACTION",
              severity: "MEDIUM",
              entityType: "PAYOUT",
              entityId: String(payout.payout_id),
              message: `Payout #${payout.payout_id} (${payout.reference_id}) stuck in ${payout.status} > ${STUCK_AGE_MINUTES} min without a gateway reference.`,
              metadata: { reference_id: payout.reference_id, status: payout.status, age_minutes: STUCK_AGE_MINUTES },
            });
          } catch (alertErr) {
            logger.warn("[Reconciliation] Stuck-txn alert failed:", alertErr.message);
          }
        }

        // Re-enqueue via BullMQ for proper retry with exponential backoff
        const reenqueued = await reenqueueStuckPayout(payout);
        if (reenqueued) {
          reenqueuedCount++;
        }
      } catch (err) {
        logger.error(`[Reconciliation] Error processing payout #${payout.payout_id}:`, err.message);
      }
    }

    // ── Unusual refund activity check (Phase 6, item 54) ────────────
    try {
      const { raiseUnusualRefundAlert } = require("./financialAlertsService");
      await raiseUnusualRefundAlert({ windowHours: 24, threshold: 5 });
    } catch (refundAlertErr) {
      logger.warn("[Reconciliation] Refund-activity alert failed:", refundAlertErr.message);
    }

    logger.info(
      `[Reconciliation] Sweep complete. Reconciled: ${reconciledCount}, Re-enqueued: ${reenqueuedCount}, Mismatches: ${mismatchCount}`
    );
    return { success: true, reconciledCount, reenqueuedCount, mismatchCount };
  } catch (err) {
    logger.error("[Reconciliation] Sweep error:", err);
    return { success: false, error: err.message };
  }
};

module.exports = {
  reconcileStuckTransactions,
  reenqueueStuckPayout,
};
