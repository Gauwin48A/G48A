/**
 * payoutWorker.js - BullMQ Payout Worker
 *
 * Processes payouts with:
 * - Exponential backoff retry (30s → 2min → 8min → 30min → 2hr → 6hr)
 * - Gateway status check BEFORE retrying (never retry blindly after timeout)
 * - DB state tracking: PAYOUT_PROCESSING → PAYOUT_SUCCESS / PAYOUT_FAILED_RETRYABLE / PAYOUT_FAILED_FINAL
 * - Timeout handling: checks Razorpay API for actual status before deciding retry
 *
 * Follows the same pattern as notificationWorker.js.
 */

const { Worker } = require("bullmq");
const pool = require("../config/db");
const logger = require("../utils/logger");
const paymentGateway = require("../services/paymentGatewayService");
const { checkPayoutKycEligibility } = require("../services/payoutKycGuard");

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null,
};

/**
 * Check the actual payout/transfer status from Razorpay before deciding to retry.
 * This prevents double-payouts when a network timeout occurred after the gateway
 * actually succeeded.
 *
 * @param {string} gatewayPayoutId - Razorpay transfer/payout ID (if known)
 * @returns {Promise<{knownToHaveSucceeded: boolean, gatewayStatus: string|null}>}
 */
async function checkGatewayStatusBeforeRetry(gatewayPayoutId) {
  if (!gatewayPayoutId) {
    return { knownToHaveSucceeded: false, gatewayStatus: null };
  }

  try {
    // Fetch the payout status from Razorpay via the Payouts API
    // (payouts are created through /v1/payouts, not /v1/transfers).
    const razorpayService = require("../services/razorpayService");
    const gw = await razorpayService.getPayoutStatus(gatewayPayoutId);
    if (!gw.success) {
      return { knownToHaveSucceeded: false, gatewayStatus: null };
    }

    const liveStatus = String(gw.status || "").toLowerCase();

    if (liveStatus === "processed") {
      return { knownToHaveSucceeded: true, gatewayStatus: "processed" };
    }

    if (liveStatus === "reversed" || liveStatus === "failed") {
      return { knownToHaveSucceeded: false, gatewayStatus: liveStatus };
    }

    // Still pending/queued — don't retry, it's still processing
    return { knownToHaveSucceeded: false, gatewayStatus: liveStatus };
  } catch (err) {
    // Gateway unreachable — can't determine status. Return null so retry is attempted.
    logger.warn(
      `[PayoutWorker] Could not check gateway status for ${gatewayPayoutId}: ${err.message}`
    );
    return { knownToHaveSucceeded: false, gatewayStatus: null };
  }
}

let payoutWorker = null;

try {
  payoutWorker = new Worker(
    "payouts",
    async (job) => {
      const {
        referenceId,
        sellerId,
        amount,
        currency = "INR",
      } = job.data;

      logger.info(
        `[PayoutWorker] Processing job ${job.id} (attempt ${job.attemptsMade + 1}/${job.opts.attempts}) for ref: ${referenceId}`
      );

      if (!referenceId || !sellerId || !amount) {
        throw new Error(
          `Invalid job data: missing referenceId, sellerId, or amount`
        );
      }

      // ── Step 1: Fetch current payout record from DB ────────────────
      const payoutRes = await pool.query(
        `SELECT * FROM payout_records WHERE reference_id = $1`,
        [referenceId]
      );

      if (payoutRes.rows.length === 0) {
        throw new Error(
          `No payout record found for reference_id: ${referenceId}`
        );
      }

      const payoutRecord = payoutRes.rows[0];

      // ── Step 2: Check for already-successful payout to avoid duplicates ──
      if (payoutRecord.status === "PAYOUT_SUCCESS") {
        logger.info(
          `[PayoutWorker] Payout ${referenceId} already marked as PAYOUT_SUCCESS — skipping`
        );
        return { status: "already_completed", referenceId };
      }

      if (payoutRecord.status === "PAYOUT_FAILED_FINAL") {
        logger.info(
          `[PayoutWorker] Payout ${referenceId} is PAYOUT_FAILED_FINAL — will not retry`
        );
        return { status: "permanently_failed", referenceId };
      }

      // ── Step 2b: KYC gating (Phase 7, item 45) ─────────────────────
      // A seller whose KYC is not VERIFIED cannot receive payouts. Fail
      // permanently with a clear, retryable-after-fix reason and raise an alert
      // so ops can resolve the KYC and admin can retry the payout.
      // Uses the shared guard (also enforced by the Redis-less fallback path).
      try {
        const kyc = await checkPayoutKycEligibility(sellerId);
        if (!kyc.eligible) {
          await pool.query(
            `UPDATE payout_records SET
               status = 'PAYOUT_FAILED_FINAL',
               last_error = $1,
               updated_at = NOW()
             WHERE payout_id = $2`,
            [`Seller KYC is not verified (${kyc.kycStatus}) — payout blocked`, payoutRecord.payout_id]
          );

          try {
            const { raiseFinancialAlert } = require("../services/financialAlertsService");
            await raiseFinancialAlert({
              type: "PAYOUT_FAILURE_SPIKE",
              severity: "HIGH",
              entityType: "PAYOUT",
              entityId: String(payoutRecord.payout_id),
              userId: String(sellerId),
              message: `Payout ${referenceId} blocked — seller KYC not verified (${kyc.kycStatus}). Manual verification + admin retry required.`,
              metadata: { reference_id: referenceId, amount: payoutRecord.amount, kyc_status: kyc.kycStatus },
            });
          } catch (alertErr) {
            logger.warn("[PayoutWorker] KYC alert raise failed:", alertErr.message);
          }

          logger.warn(
            `[PayoutWorker] Payout ${referenceId} blocked — seller KYC not verified (${kyc.kycStatus})`
          );
          return { status: "PAYOUT_FAILED_FINAL", reason: "KYC_NOT_VERIFIED", referenceId };
        }
      } catch (kycErr) {
        // Fail-open on KYC lookup errors (can't determine → proceed), but log
        logger.warn("[PayoutWorker] KYC lookup error (fail-open):", kycErr.message);
      }

      // ── Step 3: Before retrying, check if gateway already processed this ──
      if (job.attemptsMade > 0 && payoutRecord.gateway_payout_id) {
        const { knownToHaveSucceeded, gatewayStatus } =
          await checkGatewayStatusBeforeRetry(payoutRecord.gateway_payout_id);

        if (knownToHaveSucceeded) {
          // Gateway already processed — just mark success in DB
          await pool.query(
            `UPDATE payout_records SET
               status = 'PAYOUT_SUCCESS',
               last_error = NULL,
               attempts = $1,
               updated_at = NOW()
             WHERE payout_id = $2`,
            [job.attemptsMade + 1, payoutRecord.payout_id]
          );

          logger.info(
            `[PayoutWorker] Payout ${referenceId} was already processed by gateway — marked success`
          );
          return { status: "recovered_success", referenceId, gatewayStatus };
        }

        if (gatewayStatus === "failed" || gatewayStatus === "reversed") {
          // Gateway says it failed — mark as permanently failed
          await pool.query(
            `UPDATE payout_records SET
               status = 'PAYOUT_FAILED_FINAL',
               last_error = $1,
               attempts = $2,
               updated_at = NOW()
             WHERE payout_id = $3`,
            [
              `Gateway returned status: ${gatewayStatus}`,
              job.attemptsMade + 1,
              payoutRecord.payout_id,
            ]
          );

          logger.warn(
            `[PayoutWorker] Payout ${referenceId} permanently failed — gateway status: ${gatewayStatus}`
          );
          return { status: "gateway_failed", referenceId, gatewayStatus };
        }
      }

      // ── Step 4: Update DB to processing state ──────────────────────
      await pool.query(
        `UPDATE payout_records SET
           status = 'PAYOUT_PROCESSING',
           attempts = $1,
           updated_at = NOW()
         WHERE payout_id = $2`,
        [job.attemptsMade + 1, payoutRecord.payout_id]
      );

      // ── Step 5: Execute the payout via Razorpay ────────────────────
      const payoutResult = await paymentGateway.executeSellerPayout({
        sellerId,
        amount,
        currency,
        referenceId,
      });

      // ── Step 6: Handle the result ──────────────────────────────────
      if (payoutResult && payoutResult.success) {
        const newStatus =
          payoutResult.mode === "RAZORPAY_LIVE"
            ? "PAYOUT_SUCCESS"
            : "PAYOUT_PENDING"; // Simulated payouts stay pending for manual confirmation

        await pool.query(
          `UPDATE payout_records SET
             status = $1,
             gateway_payout_id = $2,
             last_error = NULL,
             updated_at = NOW()
           WHERE payout_id = $3`,
          [
            newStatus,
            payoutResult.transferId || payoutResult.payoutId || null,
            payoutRecord.payout_id,
          ]
        );

        logger.info(
          `[PayoutWorker] Payout ${referenceId}: ₹${amount} → ${newStatus}` +
            (payoutResult.transferId
              ? ` (gateway ID: ${payoutResult.transferId})`
              : "")
        );

        // Log to financial_ledger if RAZORPAY_LIVE
        if (payoutResult.mode === "RAZORPAY_LIVE") {
          await pool
            .query(
              `INSERT INTO financial_ledger (reference_id, user_id, event_type, direction, amount, status, provider_reference)
               VALUES ($1, $2, 'SELLER_TRANSFER', 'DEBIT', $3, 'COMPLETED', $4)
               ON CONFLICT (reference_id, event_type) WHERE reference_id IS NOT NULL AND reference_id != '' DO NOTHING`,
              [
                `${referenceId}_gw`,
                String(sellerId),
                amount,
                payoutResult.transferId || null,
              ]
            )
            .catch((err) =>
              logger.warn(
                "[PayoutWorker] Ledger insert failed:",
                err.message
              )
            );
        }

        return { status: newStatus, referenceId };
      } else {
        // Payout failed — determine if retryable
        const errorMsg = payoutResult?.error || "Unknown payout error";
        const isRetryable = isErrorRetryable(errorMsg);

        if (isRetryable) {
          await pool.query(
            `UPDATE payout_records SET
               status = 'PAYOUT_FAILED_RETRYABLE',
               last_error = $1,
               updated_at = NOW()
             WHERE payout_id = $2`,
            [errorMsg, payoutRecord.payout_id]
          );

          logger.warn(
            `[PayoutWorker] Payout ${referenceId} retryable failure (attempt ${job.attemptsMade + 1}): ${errorMsg}`
          );

          // Throw so BullMQ triggers the retry with exponential backoff
          throw new Error(errorMsg);
        } else {
          // Non-retryable — mark as permanently failed
          await pool.query(
            `UPDATE payout_records SET
               status = 'PAYOUT_FAILED_FINAL',
               last_error = $1,
               updated_at = NOW()
             WHERE payout_id = $2`,
            [errorMsg, payoutRecord.payout_id]
          );

          logger.error(
            `[PayoutWorker] Payout ${referenceId} permanently failed: ${errorMsg}`
          );
          return { status: "PAYOUT_FAILED_FINAL", referenceId, error: errorMsg };
        }
      }
    },
    {
      connection,
      concurrency: 5, // Process up to 5 payouts simultaneously
      // Lock duration — prevents other workers from picking up the same job
      lockDuration: 60000, // 60 seconds
    }
  );

  // ── Event Handlers ──────────────────────────────────────────────

  payoutWorker.on("completed", (job, result) => {
    logger.info(
      `[PayoutWorker] Job ${job.id} completed: ${result?.status || "unknown"}`
    );
  });

  payoutWorker.on("failed", async (job, err) => {
    const attempt = job?.attemptsMade || 0;
    const maxAttempts = job?.opts?.attempts || 6;

    logger.error(
      `[PayoutWorker] Job ${job?.id} failed on attempt ${attempt}/${maxAttempts}: ${err.message}`
    );

    // If all retries exhausted, mark as permanently failed in DB
    if (attempt >= maxAttempts) {
      const refId = job?.data?.referenceId;
      if (refId) {
        try {
          // First, check if the gateway actually processed it
          const payoutRes = await pool.query(
            `SELECT * FROM payout_records WHERE reference_id = $1`,
            [refId]
          );

          if (payoutRes.rows.length > 0) {
            const record = payoutRes.rows[0];

            // Don't downgrade if it was already marked as success by a race condition
            if (record.status !== "PAYOUT_SUCCESS") {
              // Before marking final failure, do one last gateway check
              if (record.gateway_payout_id) {
                const { knownToHaveSucceeded } =
                  await checkGatewayStatusBeforeRetry(record.gateway_payout_id);

                if (knownToHaveSucceeded) {
                  await pool.query(
                    `UPDATE payout_records SET status = 'PAYOUT_SUCCESS', updated_at = NOW() WHERE payout_id = $1`,
                    [record.payout_id]
                  );
                  logger.info(
                    `[PayoutWorker] Recovered payout ${refId} on final attempt — gateway confirms success`
                  );
                  return;
                }
              }

              // Actually permanently failed
              await pool.query(
                `UPDATE payout_records SET
                   status = 'PAYOUT_FAILED_FINAL',
                   last_error = $1,
                   updated_at = NOW()
                 WHERE payout_id = $2`,
                [
                  `All ${maxAttempts} retry attempts exhausted. Last error: ${err.message}`,
                  record.payout_id,
                ]
              );
              logger.error(
                `[PayoutWorker] Payout ${refId} permanently failed after ${maxAttempts} attempts`
              );

              // ── Raise payout failure spike alert (Phase 6, item 54) ──
              try {
                const alertsService = require("../services/financialAlertsService");
                await alertsService.raiseFinancialAlert({
                  type: "PAYOUT_FAILURE_SPIKE",
                  severity: "HIGH",
                  entityType: "PAYOUT",
                  entityId: record.payout_id,
                  userId: record.seller_id,
                  message: `Payout ${refId} permanently failed after ${maxAttempts} attempts: ${err.message}`,
                  metadata: { reference_id: refId, amount: record.amount },
                });
                await alertsService.raisePayoutFailureSpikeAlert({
                  windowHours: 1,
                  threshold: 3,
                  lastError: err.message,
                });
              } catch (alertErr) {
                logger.warn("[PayoutWorker] Failure alert raise failed:", alertErr.message);
              }
            }
          }
        } catch (dbErr) {
          logger.error(
            "[PayoutWorker] Error updating final failure in DB:",
            dbErr.message
          );
        }
      }
    }
  });

  payoutWorker.on("error", (err) => {
    logger.error("[PayoutWorker] Worker error:", err.message);
  });

  logger.info("[PayoutWorker] Payout worker started listening");
} catch (err) {
  logger.error(
    "[PayoutWorker] Failed to start payout worker:",
    err.message
  );
}

/**
 * Determine if a payout error is retryable or permanent.
 */
function isErrorRetryable(errorMsg) {
  if (!errorMsg) return true;

  const normalized = String(errorMsg).toLowerCase();

  // Non-retryable errors
  const nonRetryablePatterns = [
    "insufficient balance",
    "invalid account",
    "account blocked",
    "invalid bank details",
    "invalid vpa",
    "invalid upi",
    "kyc pending",
    "contact not found",
    "fund account not found",
    "invalid amount",
    "amount exceeds limit",
    "transaction not allowed",
    "unauthorized",
    "forbidden",
    "not found",
    "payout destination",
    "no payout",
    "waiting for account",
    "400",
    "401",
    "403",
    "422",
  ];

  for (const pattern of nonRetryablePatterns) {
    if (normalized.includes(pattern)) return false;
  }

  // Everything else is potentially retryable (timeouts, 5xx, network errors)
  return true;
}

module.exports = { payoutWorker };
