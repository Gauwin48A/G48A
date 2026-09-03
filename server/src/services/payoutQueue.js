/**
 * payoutQueue.js - BullMQ Payout Queue
 *
 * Dedicated queue for Razorpay payout processing with:
 * - Exponential backoff (30s → 2min → 8min → 30min → 2hr → 6hr)
 * - Gateway timeout handling with status check before retry
 * - DB-level payout record tracking
 * - Graceful fallback to direct dispatch when Redis is unavailable
 *
 * Follows the same pattern as notificationQueue.js.
 */

const { Queue } = require("bullmq");
const logger = require("../utils/logger");
const pool = require("../config/db");
const paymentGateway = require("./paymentGatewayService");
const { checkPayoutKycEligibility } = require("./payoutKycGuard");
const { getRedisConnectionOptions } = require("../config/redisConnection");

const connection = getRedisConnectionOptions({ maxRetriesPerRequest: 1 });

let payoutQueue = null;
let isRedisAvailable = false;

try {
  payoutQueue = new Queue("payouts", {
    connection,
    defaultJobOptions: {
      // Exponential backoff: 30s → 2min → 8min → 30min → 2hr → 6hr (6 attempts total)
      attempts: 6,
      backoff: {
        type: "exponential",
        delay: 30000, // 30 seconds base delay
      },
      removeOnComplete: 100,   // Keep last 100 completed
      removeOnFail: 50,        // Keep last 50 failed for debugging
    },
  });

  payoutQueue.on("error", (err) => {
    isRedisAvailable = false;
    logger.error("[PayoutQueue] BullMQ queue error:", err.message);
  });

  payoutQueue.client
    .then(() => {
      isRedisAvailable = true;
      logger.info("[PayoutQueue] BullMQ connected to Redis");
    })
    .catch((err) => {
      isRedisAvailable = false;
      logger.warn(
        `[PayoutQueue] Redis offline (${err.message}) — direct fallback dispatch active`
      );
    });
} catch (err) {
  logger.warn(
    "[PayoutQueue] Could not initialize BullMQ queue — fallback mode active"
  );
}

/**
 * Clean expired gateway_payout_id references and reset stale records to retryable.
 * Called before each payout attempt to ensure we're working with clean state.
 */
async function cleanStaleProcessingRecords() {
  try {
    // Reset records stuck in PAYOUT_PROCESSING for > 30 min (likely lost network response)
    const staleRes = await pool.query(
      `UPDATE payout_records
       SET status = 'PAYOUT_FAILED_RETRYABLE',
           last_error = 'Stuck in processing for > 30 min — reset to retryable',
           updated_at = NOW()
       WHERE status = 'PAYOUT_PROCESSING'
         AND updated_at < NOW() - INTERVAL '30 minutes'
       RETURNING payout_id`
    );
    if (staleRes.rows.length > 0) {
      logger.info(
        `[PayoutQueue] Reset ${staleRes.rows.length} stale PAYOUT_PROCESSING records to retryable`
      );
    }
  } catch (err) {
    logger.warn("[PayoutQueue] Failed to clean stale processing records:", err.message);
  }
}

/**
 * Direct dispatch fallback when Redis is offline.
 * Processes the payout directly (synchronously) without queue.
 */
async function fallbackDirectDispatch(jobData) {
  const { referenceId, sellerId, amount, currency, payoutRecordId } = jobData;

  try {
    // ── KYC gating (Phase 7, item 45) — same gate as the BullMQ worker. ──
    // The fallback path is used when Redis is unavailable, so it MUST enforce
    // the identical KYC rule; otherwise a non-KYC seller could receive a
    // payout whenever the queue is offline.
    try {
      const kyc = await checkPayoutKycEligibility(sellerId);
      if (!kyc.eligible) {
        const target = payoutRecordId
          ? `WHERE payout_id = $2`
          : `WHERE reference_id = $2`;
        await pool.query(
          `UPDATE payout_records SET
             status = 'PAYOUT_FAILED_FINAL',
             last_error = $1,
             attempts = COALESCE(attempts, 0) + 1,
             updated_at = NOW()
           ${target}`,
          [`Seller KYC is not verified (${kyc.kycStatus}) — payout blocked`, payoutRecordId || referenceId]
        );
        try {
          const alertsService = require("./financialAlertsService");
          await alertsService.raiseFinancialAlert({
            type: "PAYOUT_FAILURE_SPIKE",
            severity: "HIGH",
            entityType: "PAYOUT",
            entityId: String(payoutRecordId || referenceId),
            userId: String(sellerId),
            message: `Payout ${referenceId} blocked (fallback) — seller KYC not verified (${kyc.kycStatus}).`,
            metadata: { reference_id: referenceId, amount, kyc_status: kyc.kycStatus },
          });
        } catch (alertErr) {
          logger.warn("[PayoutQueue:Fallback] KYC alert raise failed:", alertErr.message);
        }
        logger.warn(
          `[PayoutQueue:Fallback] Payout ${referenceId} blocked — seller KYC not verified (${kyc.kycStatus})`
        );
        return { success: false, error: `KYC_NOT_VERIFIED (${kyc.kycStatus})` };
      }
    } catch (kycErr) {
      // Fail-open on KYC lookup errors (can't determine → proceed), but log
      logger.warn("[PayoutQueue:Fallback] KYC lookup error (fail-open):", kycErr.message);
    }

    // Update record to processing
    if (payoutRecordId) {
      await pool.query(
        `UPDATE payout_records SET status = 'PAYOUT_PROCESSING', updated_at = NOW() WHERE payout_id = $1`,
        [payoutRecordId]
      );
    }

    const payoutResult = await paymentGateway.executeSellerPayout({
      sellerId,
      amount,
      currency: currency || "INR",
      referenceId,
    });

    if (payoutResult && payoutResult.success) {
      const newStatus =
        payoutResult.mode === "RAZORPAY_LIVE"
          ? "PAYOUT_SUCCESS"
          : "PAYOUT_PENDING";

      await pool.query(
        `UPDATE payout_records SET
           status = $1,
           gateway_payout_id = $2,
           attempts = COALESCE(attempts, 0) + 1,
           last_error = NULL,
           updated_at = NOW()
         WHERE reference_id = $3`,
        [newStatus, payoutResult.transferId || null, referenceId]
      );

      logger.info(
        `[PayoutQueue:Fallback] Payout for ${referenceId}: ₹${amount} → ${newStatus}`
      );
      return { success: true, status: newStatus };
    } else {
      throw new Error(payoutResult?.error || "Gateway returned failure");
    }
  } catch (err) {
    logger.error(
      `[PayoutQueue:Fallback] Payout failed for ${referenceId}:`,
      err.message
    );

    if (payoutRecordId) {
      await pool.query(
        `UPDATE payout_records SET
           status = 'PAYOUT_FAILED_RETRYABLE',
           last_error = $1,
           attempts = COALESCE(attempts, 0) + 1,
           updated_at = NOW()
         WHERE payout_id = $2`,
        [err.message || "Fallback dispatch error", payoutRecordId]
      );
    }

    return { success: false, error: err.message };
  }
}

/**
 * Enqueue a payout job into BullMQ or fallback to direct dispatch.
 *
 * @param {Object} jobData
 * @param {string} jobData.referenceId - Unique reference (e.g., "sale_42")
 * @param {string} jobData.sellerId - Seller user ID
 * @param {number} jobData.amount - Payout amount in INR
 * @param {string} jobData.currency - Currency code (default "INR")
 * @param {number} [jobData.payoutRecordId] - payout_records.payout_id if known
 * @returns {Promise<{success: boolean, jobId?: string, fallback?: boolean}>}
 */
async function enqueuePayoutJob(jobData) {
  const { referenceId } = jobData;

  if (!referenceId || !jobData.sellerId || !jobData.amount) {
    logger.error("[PayoutQueue] Invalid job data — missing required fields:", {
      hasRef: !!referenceId,
      hasSeller: !!jobData.sellerId,
      hasAmount: !!jobData.amount,
    });
    return { success: false, error: "Missing required payout fields" };
  }

  // Clean stale records before each enqueue
  await cleanStaleProcessingRecords();

  // ── QUEUE_BACKLOG alert (Phase 6, item 54): if the queue is piling up
  //    beyond the threshold, surface it for ops (worker down / gateway slow).
  //    Kept off the hot path via setImmediate so enqueue latency is unaffected.
  try {
    const QUEUE_BACKLOG_THRESHOLD = parseInt(process.env.QUEUE_BACKLOG_THRESHOLD || "50", 10);
    if (payoutQueue && isRedisAvailable && QUEUE_BACKLOG_THRESHOLD > 0) {
      setImmediate(async () => {
        try {
          const waiting = await payoutQueue.count().catch(() => 0);
          if (waiting >= QUEUE_BACKLOG_THRESHOLD) {
            const alertsService = require("./financialAlertsService");
            await alertsService.raiseFinancialAlert({
              type: "QUEUE_BACKLOG",
              severity: "MEDIUM",
              entityType: "PAYOUT",
              message: `Payout queue backlog: ${waiting} jobs waiting (threshold ${QUEUE_BACKLOG_THRESHOLD}).`,
              metadata: { waiting, threshold: QUEUE_BACKLOG_THRESHOLD },
            });
          }
        } catch (alertErr) {
          logger.warn("[PayoutQueue] Backlog alert error:", alertErr.message);
        }
      });
    }
  } catch (backlogErr) {
    logger.warn("[PayoutQueue] Backlog alert setup error:", backlogErr.message);
  }

  if (payoutQueue) {
    if (!isRedisAvailable) {
      try {
        await Promise.race([
          payoutQueue.client,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 1500))
        ]);
        isRedisAvailable = true;
      } catch {
        isRedisAvailable = false;
      }
    }
  }

  if (payoutQueue && isRedisAvailable) {
    try {
      // ── Duplicate payout attempt detection (Phase 6, item 54) ──────
      // Only an already-PAYOUT_SUCCESS record is an unambiguous duplicate
      // signal (money already dispatched for this reference). PAYOUT_PENDING
      // is the pre-enqueue initial state, and PAYOUT_PROCESSING /
      // PAYOUT_FAILED_RETRYABLE are legitimate recovery targets, so those
      // never raise the alert.
      try {
        const dupCheck = await pool.query(
          `SELECT status FROM payout_records
           WHERE reference_id = $1 AND status = 'PAYOUT_SUCCESS'`,
          [referenceId]
        );
        if (dupCheck.rows.length > 0) {
          const alertsService = require("./financialAlertsService");
          await alertsService.raiseDuplicatePayoutAlert({
            referenceId,
            sellerId: jobData.sellerId,
            amount: jobData.amount,
          });
        }
      } catch (dupErr) {
        logger.warn("[PayoutQueue] Duplicate-payout detection error:", dupErr.message);
      }

      const job = await payoutQueue.add("process-payout", jobData, {
        // Deduplication via jobId — if same referenceId already queued, it won't be added again
        jobId: `payout-${referenceId}`,
      });

      logger.info(
        `[PayoutQueue] Job ${job.id} enqueued for seller ${jobData.sellerId}: ₹${jobData.amount} (ref: ${referenceId})`
      );

      // Update payout record status to PAYOUT_PROCESSING if we have the ID
      if (jobData.payoutRecordId) {
        await pool
          .query(
            `UPDATE payout_records SET status = 'PAYOUT_PROCESSING', updated_at = NOW() WHERE payout_id = $1`,
            [jobData.payoutRecordId]
          )
          .catch((err) =>
            logger.warn("[PayoutQueue] Status update failed:", err.message)
          );
      }

      return { success: true, jobId: job.id };
    } catch (err) {
      isRedisAvailable = false;
      logger.warn(
        `[PayoutQueue] Queue add failed (${err.message}) — falling back to direct dispatch`
      );
    }
  }

  // Fallback: direct dispatch when Redis is unreachable
  logger.info(
    `[PayoutQueue] Using direct fallback for payout ${referenceId}`
  );
  setImmediate(() => fallbackDirectDispatch(jobData));
  return { success: true, fallback: true };
}

module.exports = {
  payoutQueue,
  enqueuePayoutJob,
  fallbackDirectDispatch,
};
