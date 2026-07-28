/**
 * Suspension Cron Job
 *
 * Runs every hour to:
 * 1. Check for expired 24hr suspensions with no response → permanent lock + KYC blacklist
 * 2. Deactivate expired suspensions that were responded to
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const crypto = require("crypto");

async function processExpiredSuspensions() {
  const now = new Date();

  try {
    // Find active suspensions that have expired
    const expiredResult = await runQuery(
      `SELECT s.id, s.user_id, s.sale_id, s.responded
       FROM suspensions s
       WHERE s.is_active = true
         AND s.suspended_until < $1
         AND s.permanently_locked = false`,
      [now]
    );

    if (expiredResult.rows.length === 0) {
      return { processed: 0 };
    }

    let processed = 0;

    for (const suspension of expiredResult.rows) {
      if (!suspension.responded) {
        // No response within 24hrs → permanent lock
        const userResult = await runQuery(
          `SELECT u.user_id, p.aadhaar_number, p.pan_number, u.phone
           FROM users u
           LEFT JOIN profiles p ON u.user_id::text = p.user_id::text
           WHERE u.user_id::text = $1`,
          [suspension.user_id]
        );

        if (userResult.rows.length > 0) {
          const user = userResult.rows[0];
          const aadhaarHash = user.aadhaar_number
            ? crypto.createHash("sha256").update(String(user.aadhaar_number)).digest("hex")
            : null;
          const mobileHash = user.phone
            ? crypto.createHash("sha256").update(String(user.phone)).digest("hex")
            : null;
          const panHash = user.pan_number
            ? crypto.createHash("sha256").update(String(user.pan_number)).digest("hex")
            : null;

          // Add to KYC blacklist
          await runQuery(
            `INSERT INTO kyc_blacklist (aadhaar_hash, mobile_hash, pan_hash, user_id, reason)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (user_id) DO NOTHING`,
            [aadhaarHash, mobileHash, panHash, suspension.user_id, "Auto-locked: no response to fraud report within 24hrs"]
          );

          // Update user status
          await runQuery(
            `UPDATE users SET status = 'permanently_locked' WHERE user_id::text = $1`,
            [suspension.user_id]
          );

          logger.warn(`[SuspensionCron] Account ${suspension.user_id} permanently locked (no response to fraud #${suspension.sale_id})`);
        }

        // Mark suspension as permanently locked
        await runQuery(
          `UPDATE suspensions SET is_active = false, permanently_locked = true WHERE id = $1`,
          [suspension.id]
        );
      } else {
        // User responded — just deactivate the suspension
        await runQuery(
          `UPDATE suspensions SET is_active = false WHERE id = $1`,
          [suspension.id]
        );
      }

      processed++;
    }

    return { processed };
  } catch (err) {
    logger.error("[SuspensionCron] Error processing expired suspensions:", err);
    return { error: err.message };
  }
}

// Run on a 1-hour interval
function startSuspensionCron() {
  logger.info("[SuspensionCron] Starting suspension auto-lock cron (interval: 1 hour)");

  // Run immediately on startup
  processExpiredSuspensions().then((result) => {
    if (result.processed > 0) {
      logger.info(`[SuspensionCron] Processed ${result.processed} expired suspensions on startup`);
    }
  });

  // Then every hour
  setInterval(async () => {
    const result = await processExpiredSuspensions();
    if (result.processed > 0) {
      logger.info(`[SuspensionCron] Processed ${result.processed} expired suspensions`);
    }
  }, 60 * 60 * 1000); // 1 hour
}

module.exports = { startSuspensionCron, processExpiredSuspensions };
