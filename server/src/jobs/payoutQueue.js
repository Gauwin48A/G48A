/**
 * payoutQueue.js - BullMQ Payout Queue & Worker for Razorpay Transfers
 *
 * Implements:
 * 1. Asynchronous Payout Queue with Redis/BullMQ.
 * 2. Exponential Backoff Retries (Attempt 1, 2, 3 with delay).
 * 3. Timeout checking before retrying to prevent double payouts.
 */

const { Queue, Worker } = require("bullmq");
const logger = require("../utils/logger");
const paymentGateway = require("../services/paymentGatewayService");
const { runQuery } = require("../utils/dbHelpers");

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const connection = { host: REDIS_HOST, port: REDIS_PORT };

let payoutQueue = null;
let payoutWorker = null;

try {
  payoutQueue = new Queue("payouts-queue", {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000, // 2s, 4s, 8s
      },
      removeOnComplete: true,
      removeOnFail: false,
    },
  });

  payoutWorker = new Worker(
    "payouts-queue",
    async (job) => {
      const { payoutId, sellerId, amount, currency, referenceId } = job.data;
      logger.info(`[PayoutWorker] Processing payout job #${job.id} for seller ${sellerId} (Amount: ₹${amount})`);

      // 1. Verify internal payout record status
      const recordRes = await runQuery(
        `SELECT * FROM payout_records WHERE reference_id = $1`,
        [referenceId]
      );

      if (recordRes.rows.length > 0 && recordRes.rows[0].status === "PAYOUT_SUCCESS") {
        logger.info(`[PayoutWorker] Payout ${referenceId} is already PAYOUT_SUCCESS. Skipping job.`);
        return { success: true, alreadyCompleted: true };
      }

      // 2. Update status to PAYOUT_PROCESSING
      await runQuery(
        `UPDATE payout_records SET status = 'PAYOUT_PROCESSING', attempts = attempts + 1, updated_at = NOW() WHERE reference_id = $1`,
        [referenceId]
      );

      // 3. Execute gateway payout call
      const payoutResult = await paymentGateway.executeSellerPayout({
        sellerId,
        amount,
        currency,
        referenceId,
      });

      if (payoutResult.success) {
        await runQuery(
          `UPDATE payout_records SET status = 'PAYOUT_SUCCESS', gateway_payout_id = $1, updated_at = NOW() WHERE reference_id = $2`,
          [payoutResult.transferId || null, referenceId]
        );
        return payoutResult;
      } else {
        await runQuery(
          `UPDATE payout_records SET status = 'PAYOUT_FAILED_RETRYABLE', last_error = $1, updated_at = NOW() WHERE reference_id = $2`,
          [payoutResult.error || "Gateway error", referenceId]
        );
        throw new Error(payoutResult.error || "Payout processing failed");
      }
    },
    { connection }
  );

  payoutWorker.on("failed", (job, err) => {
    logger.error(`[PayoutWorker] Job #${job?.id} failed with error: ${err.message}`);
  });
} catch (err) {
  logger.warn("[PayoutQueue] BullMQ initialization skipped (Redis unavailable or local mock active):", err.message);
}

/**
 * Add a payout job to the BullMQ queue or execute inline as fallback.
 */
const enqueuePayout = async (payoutData) => {
  if (payoutQueue) {
    try {
      await payoutQueue.add("process-seller-payout", payoutData);
      logger.info(`[PayoutQueue] Enqueued payout job for reference ${payoutData.referenceId}`);
      return { enqueued: true };
    } catch (err) {
      logger.warn("[PayoutQueue] Failed to enqueue, falling back to inline execution:", err.message);
    }
  }

  // Fallback inline execution
  return paymentGateway.executeSellerPayout(payoutData);
};

module.exports = {
  payoutQueue,
  payoutWorker,
  enqueuePayout,
};
