// ============================================================
// cronJobs.js – Scheduled background tasks
// ============================================================

const cron = require("node-cron");
const pool = require("../config/db");
const { expireOffers } = require("../controllers/offersController");
const {
  executePaymentReconciliation,
} = require("../services/paymentReconciliationService");
const {
  awardWeeklySalesLeaderRewards,
} = require("../services/leaderboardRewardsService");
const {
  purgeLocationRetention,
} = require("../services/locationRetentionService");
const { resetMonthlyQuotas } = require("../cron/quotaReset");
const {
  expireSubscriptions,
  expireBoosts,
  setTierBasedExpiry,
} = require("../cron/subscriptionExpiry");

let transactionExpirySupportPromise = null;
let transactionExpirySupport = null;

async function hasTransactionExpirySupport() {
  if (transactionExpirySupport !== null) return transactionExpirySupport;
  if (transactionExpirySupportPromise) return transactionExpirySupportPromise;

  transactionExpirySupportPromise = (async () => {
    try {
      const tableResult = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name = 'transactions'
         ) AS exists`
      );
      const tableExists = Boolean(tableResult.rows?.[0]?.exists);
      if (!tableExists) {
        transactionExpirySupport = false;
        return false;
      }

      const columnResult = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'transactions'
             AND column_name = 'expires_at'
         ) AS exists`
      );
      transactionExpirySupport = Boolean(columnResult.rows?.[0]?.exists);
      return transactionExpirySupport;
    } catch (error) {
      console.warn(
        "[CRON] Unable to check transactions.expires_at availability:",
        error.message
      );
      transactionExpirySupport = false;
      return false;
    }
  })().finally(() => {
    transactionExpirySupportPromise = null;
  });

  return transactionExpirySupportPromise;
}

// ------------------------------------------------------------
// Constants
// ------------------------------------------------------------

/** Days before expiry at which warnings are sent. */
const POST_WARNING_DAYS = [5, 3, 1];

/** Maximum notifications inserted in a single batch. */
const NOTIFICATION_BATCH_SIZE =
  Number.parseInt(process.env.CRON_NOTIFICATION_BATCH_SIZE, 10) || 250;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

/**
 * Insert notifications in batches using `jsonb_to_recordset`.
 *
 * @param {Array<{user_id: number, title: string, message: string, type: string, post_id: number|null}>} notifications
 * @returns {Promise<number>} Total number of rows inserted.
 */
async function insertNotifications(notifications) {
  if (!Array.isArray(notifications) || notifications.length === 0) {
    return 0;
  }

  let inserted = 0;

  for (let i = 0; i < notifications.length; i += NOTIFICATION_BATCH_SIZE) {
    const batch = notifications.slice(i, i + NOTIFICATION_BATCH_SIZE);
    const result = await pool.query(
      `INSERT INTO notifications (user_id, title, message, type, post_id, created_at)
             SELECT n.user_id, n.title, n.message, n.type, n.post_id, NOW()
             FROM jsonb_to_recordset($1::jsonb) AS n(
                user_id bigint,
                title text,
                message text,
                type text,
                post_id bigint
             )`,
      [JSON.stringify(batch)]
    );
    inserted += result.rowCount || 0;
  }

  return inserted;
}

// ------------------------------------------------------------
// Post Expiry
// ------------------------------------------------------------

/**
 * Expire posts whose `expires_at` has passed (tier-based) and legacy
 * posts older than 30 days that have no explicit expiry date.
 * Sends a notification to each affected user.
 *
 * @returns {Promise<void>}
 */
const expireOldPosts = async () => {
  console.log("[CRON] Running tier-based post expiry check...");

  try {
    // Tier-based expiry
    const result = await pool.query(
      `UPDATE posts
             SET status = 'expired', updated_at = NOW()
             WHERE status = 'active'
               AND expires_at IS NOT NULL
               AND expires_at < NOW()
             RETURNING post_id, user_id, title, expires_at,
                       (SELECT tier FROM users WHERE users.user_id = posts.user_id) AS user_tier`
    );

    if (result.rows.length > 0) {
      console.log(
        `[CRON] Expired ${result.rows.length} posts (tier-based expiry)`
      );

      const notifications = result.rows.map((post) => {
        const tierName = (post.user_tier || "basic").toUpperCase();
        return {
          user_id: post.user_id,
          title: "Post Expired",
          message: `Your post "${post.title || "Untitled"}" has expired based on your ${tierName} tier visibility. Upgrade your tier for longer visibility or repost to make it active again.`,
          type: "post_expired",
          post_id: post.post_id,
        };
      });

      await insertNotifications(notifications);
    } else {
      console.log("[CRON] No posts to expire");
    }

    // Legacy 30-day default expiry
    const legacyResult = await pool.query(
      `UPDATE posts
             SET status = 'expired', updated_at = NOW()
             WHERE status = 'active'
               AND expires_at IS NULL
               AND created_at < NOW() - INTERVAL '30 days'
             RETURNING post_id, user_id, title`
    );

    if (legacyResult.rows.length > 0) {
      console.log(
        `[CRON] Expired ${legacyResult.rows.length} legacy posts (30-day default)`
      );

      const legacyNotifications = legacyResult.rows.map((post) => ({
        user_id: post.user_id,
        title: "Post Expired",
        message: `Your post "${post.title || "Untitled"}" has expired after 30 days. Upgrade to Premium for 45-day visibility!`,
        type: "post_expired",
        post_id: post.post_id,
      }));

      await insertNotifications(legacyNotifications);
    }
  } catch (error) {
    console.error("[CRON] Post expiry error:", error);
  }
};

// ------------------------------------------------------------
// Expiry Warnings
// ------------------------------------------------------------

/**
 * Send expiry-warning notifications for posts that are about to expire
 * within the windows defined by `POST_WARNING_DAYS`.
 * Uses parameterized queries to avoid SQL injection.
 *
 * @returns {Promise<void>}
 */
const sendExpiryWarnings = async () => {
  console.log("[CRON] Sending tier-based expiry warnings...");

  try {
    for (const daysBeforeExpiry of POST_WARNING_DAYS) {
      const result = await pool.query(
        `SELECT
                    p.post_id,
                    p.user_id,
                    p.title,
                    p.expires_at,
                    u.tier,
                    EXTRACT(DAY FROM (p.expires_at - NOW())) AS days_left
                 FROM posts p
                 JOIN users u ON p.user_id = u.user_id
                 LEFT JOIN notifications n ON n.post_id = p.post_id
                    AND n.type = 'expiry_warning'
                    AND n.created_at > NOW() - INTERVAL '20 hours'
                 WHERE p.status = 'active'
                   AND p.expires_at IS NOT NULL
                   AND p.expires_at > NOW()
                   AND p.expires_at < NOW() + INTERVAL '1 day' * $1
                   AND p.expires_at > NOW() + INTERVAL '1 day' * $2
                   AND n.notification_id IS NULL`,
        [daysBeforeExpiry + 1, daysBeforeExpiry - 1]
      );

      if (result.rows.length > 0) {
        console.log(
          `[CRON] Sending ${result.rows.length} expiry warnings (${daysBeforeExpiry} days before)`
        );

        const warningNotifications = result.rows.map((post) => {
          const daysLeft = Math.ceil(post.days_left);
          const tierName = (post.tier || "basic").toUpperCase();
          return {
            user_id: post.user_id,
            title: "Post Expiring Soon",
            message: `Your post "${post.title || "Untitled"}" expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""} (${tierName} tier). Renew or upgrade for extended visibility!`,
            type: "expiry_warning",
            post_id: post.post_id,
          };
        });

        await insertNotifications(warningNotifications);
      }
    }

    console.log("[CRON] Expiry warnings complete");
  } catch (error) {
    console.error("[CRON] Expiry warning error:", error);
  }
};

// ------------------------------------------------------------
// Subscription Expiry Check
// ------------------------------------------------------------

/**
 * Check for expiring subscriptions and notify affected users.
 *
 * @returns {Promise<void>}
 */
const checkSubscriptionExpiry = async () => {
  console.log("[CRON] Checking subscription expiry...");

  try {
    const { checkExpiringSubscriptions } = require(
      "../services/subscriptionNotifications"
    );
    const result = await checkExpiringSubscriptions();
    console.log(
      `[CRON] Subscription check complete: ${result.checked || 0} users processed`
    );
  } catch (error) {
    console.error("[CRON] Subscription expiry error:", error);
  }
};

// ------------------------------------------------------------
// Transaction Expiry
// ------------------------------------------------------------

/**
 * Expire pending-buyer-confirm transactions whose `expires_at` has
 * passed, re-activate the associated posts, and notify sellers.
 *
 * @returns {Promise<void>}
 */
const expireOldTransactions = async () => {
  console.log("[CRON] Checking for expired transactions...");

  try {
    const hasExpiryColumn = await hasTransactionExpirySupport();
    if (!hasExpiryColumn) {
      console.warn(
        "[CRON] Transaction expiry skipped (transactions.expires_at missing)"
      );
      return;
    }

    const result = await pool.query(
      `UPDATE transactions
             SET status = 'expired'
             WHERE status = 'pending_buyer_confirm'
               AND expires_at < NOW()
             RETURNING transaction_id, seller_id, post_id`
    );

    if (result.rows.length > 0) {
      console.log(`[CRON] Expired ${result.rows.length} transactions`);

      // Re-activate the posts tied to the expired transactions
      const postIds = [
        ...new Set(result.rows.map((tx) => tx.post_id).filter(Boolean)),
      ];
      if (postIds.length > 0) {
        await pool.query(
          `UPDATE posts SET status = 'active' WHERE post_id = ANY($1::bigint[])`,
          [postIds]
        );
      }

      // Notify sellers
      const notifications = result.rows
        .filter((tx) => tx.seller_id)
        .map((tx) => ({
          user_id: tx.seller_id,
          title: "Sale Expired",
          message:
            "The pending sale has expired. Your item is back on the market.",
          type: "sale_expired",
          post_id: null,
        }));

      await insertNotifications(notifications);
    }
  } catch (error) {
    console.error("[CRON] Transaction expiry error:", error);
  }
};

// ------------------------------------------------------------
// Daily Digest
// ------------------------------------------------------------

/**
 * Send a daily digest notification to users who have 3+ unread
 * notifications from the past 24 hours.
 *
 * @returns {Promise<void>}
 */
const sendDailyDigest = async () => {
  console.log("[CRON] Sending daily digest...");

  try {
    const result = await pool.query(
      `WITH digest_targets AS (
                SELECT n.user_id, COUNT(n.notification_id) AS unread_count
                FROM notifications n
                WHERE n.created_at > NOW() - INTERVAL '24 hours'
                  AND n.is_read = false
                GROUP BY n.user_id
                HAVING COUNT(n.notification_id) >= 3
                LIMIT 500
            )
            INSERT INTO notifications (user_id, title, message, type, created_at)
            SELECT
                dt.user_id,
                'Daily Summary',
                'You have ' || dt.unread_count || ' unread notifications. Check your dashboard for updates.',
                'digest',
                NOW()
            FROM digest_targets dt`
    );

    const sent = result.rowCount || 0;
    console.log(`[CRON] Daily digest sent to ${sent} users`);
  } catch (error) {
    console.error("[CRON] Daily digest error:", error);
  }
};

// ------------------------------------------------------------
// Fraud Batch Review
// ------------------------------------------------------------

/**
 * Review suspicious login attempts and potential duplicate payments
 * in the last 6 hours. Sends security-alert notifications and logs
 * duplicate-payment warnings.
 *
 * @returns {Promise<void>}
 */
const runFraudBatchReview = async () => {
  console.log("[CRON] Running fraud batch review...");

  try {
    // Suspicious logins (>= 5 failures in the past 6 h)
    const suspiciousLogins = await pool
      .query(
        `SELECT user_id, COUNT(*) AS fail_count
             FROM login_audit
             WHERE success = false AND created_at > NOW() - INTERVAL '6 hours'
             GROUP BY user_id
             HAVING COUNT(*) >= 5`
      )
      .catch(() => ({ rows: [] }));

    const suspiciousUserIds = suspiciousLogins.rows
      .map((row) => row.user_id)
      .filter(Boolean);

    if (suspiciousUserIds.length > 0) {
      await pool
        .query(
          `INSERT INTO notifications (user_id, title, message, type, created_at)
                 SELECT DISTINCT t.user_id, 'Security Alert', 'Multiple failed login attempts detected on your account. If this was not you, please change your password immediately.', 'security_alert', NOW()
                 FROM unnest($1::bigint[]) AS t(user_id)
                 ON CONFLICT DO NOTHING`,
          [suspiciousUserIds]
        )
        .catch(() => {});
    }

    // Duplicate payments (same user, amount, plan within 10 min)
    const dupePayments = await pool
      .query(
        `SELECT p1.id, p1.user_id, p1.amount, p1.plan_purchased
             FROM payments p1
             JOIN payments p2 ON p1.user_id = p2.user_id
               AND p1.amount = p2.amount
               AND p1.plan_purchased = p2.plan_purchased
               AND p1.id != p2.id
               AND ABS(EXTRACT(EPOCH FROM (p1.created_at - p2.created_at))) < 600
             WHERE p1.status = 'pending'
               AND p1.created_at > NOW() - INTERVAL '6 hours'`
      )
      .catch(() => ({ rows: [] }));

    if (dupePayments.rows.length > 0) {
      console.warn(
        `[CRON] Fraud batch: ${dupePayments.rows.length} potential duplicate payments flagged`
      );
    }

    console.log(
      `[CRON] Fraud batch complete: ${suspiciousLogins.rows.length} suspicious logins, ${dupePayments.rows.length} duplicate payments`
    );
  } catch (error) {
    console.error("[CRON] Fraud batch error:", error);
  }
};

// ------------------------------------------------------------
// Complaint Auto-Resolution
// ------------------------------------------------------------

/**
 * Automatically close complaints that have been idle (open / triage)
 * for more than 7 days and notify the buyer.
 *
 * @returns {Promise<void>}
 */
const autoResolveStaleComplaints = async () => {
  console.log("[CRON] Running complaint auto-resolution...");

  try {
    const result = await pool
      .query(
        `UPDATE complaints
             SET status = 'auto_closed',
                 admin_response = COALESCE(admin_response, 'This complaint was automatically closed after 7 days of inactivity.'),
                 updated_at = NOW()
             WHERE status IN ('open', 'triage')
               AND updated_at < NOW() - INTERVAL '7 days'
             RETURNING complaint_id, buyer_id`
      )
      .catch(() => ({ rows: [] }));

    const buyerIds = result.rows
      .map((complaint) => complaint.buyer_id)
      .filter(Boolean);

    if (buyerIds.length > 0) {
      await pool
        .query(
          `INSERT INTO notifications (user_id, title, message, type, created_at)
                 SELECT DISTINCT t.user_id, 'Complaint Closed', 'Your complaint has been automatically closed after 7 days of inactivity. If you still need help, please submit a new complaint.', 'complaint_closed', NOW()
                 FROM unnest($1::bigint[]) AS t(user_id)`,
          [buyerIds]
        )
        .catch(() => {});
    }

    console.log(`[CRON] Auto-resolved ${result.rows.length} stale complaints`);
  } catch (error) {
    console.error("[CRON] Complaint auto-resolution error:", error);
  }
};

// ------------------------------------------------------------
// Payment Reconciliation
// ------------------------------------------------------------

/**
 * Run the payment reconciliation pipeline (expire stale pending
 * payments, flag amount mismatches, flag duplicates).
 * Controlled by the `PAYMENT_RECON_ENABLED` env var.
 *
 * @returns {Promise<void>}
 */
const runPaymentReconciliation = async () => {
  console.log("[CRON] Running payment reconciliation...");

  try {
    const reconEnabled = String(process.env.PAYMENT_RECON_ENABLED || "true")
      .trim()
      .toLowerCase();

    if (["0", "false", "no", "off"].includes(reconEnabled)) {
      console.log(
        "[CRON] Payment reconciliation skipped (PAYMENT_RECON_ENABLED=false)"
      );
      return;
    }

    const result = await executePaymentReconciliation({ actor: "cron" });
    console.log(
      `[CRON] Payment reconciliation complete: expired=${result.actions.auto_expired_count}, amount_flags=${result.actions.amount_mismatch_flagged_count}, duplicate_flags=${result.actions.duplicate_flagged_count}`
    );
  } catch (error) {
    console.error("[CRON] Payment reconciliation error:", error);
  }
};

// ------------------------------------------------------------
// Location Retention
// ------------------------------------------------------------

/**
 * Purge stale location and fraud events according to the retention
 * policy defined in `locationRetentionService`.
 *
 * @returns {Promise<void>}
 */
const runLocationRetention = async () => {
  console.log("[CRON] Running location retention purge...");

  try {
    const result = await purgeLocationRetention();

    if (result.skipped) {
      console.log("[CRON] Location retention skipped");
      return;
    }

    console.log(
      `[CRON] Location retention complete: location_events=${result.locationEventsDeleted || 0}, fraud_events=${result.fraudEventsDeleted || 0}`
    );
  } catch (error) {
    console.error("[CRON] Location retention error:", error);
  }
};

// ------------------------------------------------------------
// Scheduler Initialization
// ------------------------------------------------------------

/**
 * Register all cron schedules. Should be called once at server startup.
 * All schedules use Asia/Kolkata timezone.
 */
const initCronJobs = () => {
  console.log("[CRON] Initializing CRON jobs...");

  // Post expiry (tier-based) – Daily at 00:00 IST
  cron.schedule("0 0 * * *", expireOldPosts, { timezone: "Asia/Kolkata" });
  console.log("  - Post expiry (tier-based): Daily at 00:00 IST");

  // Expiry warnings – Daily at 09:00 IST
  cron.schedule("0 9 * * *", sendExpiryWarnings, { timezone: "Asia/Kolkata" });
  console.log("  - Expiry warnings: Daily at 09:00 IST");

  // Subscription expiry check – Daily at 10:00 IST
  cron.schedule("0 10 * * *", checkSubscriptionExpiry, {
    timezone: "Asia/Kolkata",
  });
  console.log("  - Subscription expiry: Daily at 10:00 IST");

  // Transaction expiry – Hourly
  cron.schedule("0 * * * *", expireOldTransactions, {
    timezone: "Asia/Kolkata",
  });
  console.log("  - Transaction expiry: Hourly");

  // Payment reconciliation – Every 2 hours at :20
  cron.schedule("20 */2 * * *", runPaymentReconciliation, {
    timezone: "Asia/Kolkata",
  });
  console.log("  - Payment reconciliation: Every 2 hours at :20");

  // Offer expiry (48h) – Hourly at :30
  cron.schedule(
    "30 * * * *",
    async () => {
      console.log("[CRON] Running offer expiry check...");
      const count = await expireOffers();
      console.log(`[CRON] Offer expiry complete: ${count} expired`);
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log("  - Offer expiry (48h): Hourly at :30");

  // Daily digest – Daily at 09:30 IST
  cron.schedule("30 9 * * *", sendDailyDigest, { timezone: "Asia/Kolkata" });
  console.log("  - Daily digest: Daily at 09:30 IST");

  // Fraud batch review – Every 6 hours
  cron.schedule("0 */6 * * *", runFraudBatchReview, {
    timezone: "Asia/Kolkata",
  });
  console.log("  - Fraud batch review: Every 6 hours");

  // Complaint auto-resolution – Daily at 02:00 IST
  cron.schedule("0 2 * * *", autoResolveStaleComplaints, {
    timezone: "Asia/Kolkata",
  });
  console.log("  - Complaint auto-resolution: Daily at 02:00 IST");

  // Location retention purge – Daily at 02:15 IST
  cron.schedule("15 2 * * *", runLocationRetention, {
    timezone: "Asia/Kolkata",
  });
  console.log("  - Location retention purge: Daily at 02:15 IST");

  // Weekly leaderboard rewards – Monday 00:10 IST
  cron.schedule(
    "10 0 * * MON",
    async () => {
      const outcome = await awardWeeklySalesLeaderRewards();
      console.log(
        `[CRON] Weekly leaderboard rewards: awarded=${outcome.awarded} period=${outcome.periodKey}`
      );
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log("  - Weekly leaderboard rewards: Monday 00:10 IST");

  // Monthly quota reset – 1st of month at 00:00 IST
  cron.schedule(
    "0 0 1 * *",
    async () => {
      console.log("[CRON] Running monthly quota reset...");
      const result = await resetMonthlyQuotas();
      console.log(
        `[CRON] Monthly quota reset complete: ${result.resetCount} subscriptions reset`
      );
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log("  - Monthly quota reset: 1st of month at 00:00 IST");

  // Subscription expiry – Daily at 00:30 IST
  cron.schedule(
    "30 0 * * *",
    async () => {
      console.log("[CRON] Running subscription expiry...");
      const result = await expireSubscriptions();
      console.log(
        `[CRON] Subscription expiry: ${result.expiredCount} expired, ${result.downgraded.length} downgraded`
      );
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log("  - Subscription expiry: Daily at 00:30 IST");

  // Boost expiry – Daily at 00:45 IST
  cron.schedule(
    "45 0 * * *",
    async () => {
      console.log("[CRON] Running boost expiry...");
      const result = await expireBoosts();
      console.log(
        `[CRON] Boost expiry: ${result.expiredBoosts} boosts expired`
      );
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log("  - Boost expiry: Daily at 00:45 IST");

  // Tier-based listing expiry – Daily at 01:15 IST
  cron.schedule(
    "15 1 * * *",
    async () => {
      console.log("[CRON] Setting tier-based expiry dates...");
      const result = await setTierBasedExpiry();
      console.log(
        `[CRON] Tier-based expiry: ${result.updatedCount} posts updated`
      );
    },
    { timezone: "Asia/Kolkata" }
  );
  console.log("  - Tier-based listing expiry: Daily at 01:15 IST");

  console.log("[CRON] CRON jobs initialized");
};

// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

module.exports = {
  initCronJobs,
  expireOldPosts,
  sendExpiryWarnings,
  checkSubscriptionExpiry,
  expireOldTransactions,
  runPaymentReconciliation,
  sendDailyDigest,
  runFraudBatchReview,
  autoResolveStaleComplaints,
};
