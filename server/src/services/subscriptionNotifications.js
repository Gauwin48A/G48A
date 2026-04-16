const pool = require("../config/db");

/**
 * Check for users whose subscriptions are expiring within 7 days
 * and create appropriate notification records.
 * @returns {Promise<{checked: number}|{error: string}>}
 */
async function checkExpiringSubscriptions() {
  try {
    console.log("[Subscription] Checking for expiring subscriptions...");

    const result = await pool.query(`
      SELECT
        user_id,
        tier,
        subscription_expiry,
        EXTRACT(DAY FROM (subscription_expiry - NOW())) as days_until_expiry
      FROM users
      WHERE tier IN ('silver', 'premium')
        AND subscription_expiry IS NOT NULL
        AND subscription_expiry > NOW() - INTERVAL '1 day'
        AND subscription_expiry < NOW() + INTERVAL '8 days'
    `);

    console.log(
      `[Subscription] Found ${result.rows.length} users with expiring subscriptions`
    );

    for (const user of result.rows) {
      const daysLeft = Math.ceil(user.days_until_expiry);
      let notificationType, title, message;

      if (daysLeft <= 0) {
        notificationType = "subscription_expired";
        title = "⚠️ Subscription Expired";
        message = `Your ${user.tier.toUpperCase()} subscription has expired. Renew now to continue posting!`;
      } else if (daysLeft === 1) {
        notificationType = "subscription_expiring_1day";
        title = "🔴 Last Day! Subscription Expiring";
        message = `Your ${user.tier.toUpperCase()} subscription expires tomorrow! Renew now to avoid interruption.`;
      } else if (daysLeft <= 3) {
        notificationType = "subscription_expiring_3days";
        title = "🟠 Subscription Expiring Soon";
        message = `Your ${user.tier.toUpperCase()} subscription expires in ${daysLeft} days. Renew now!`;
      } else if (daysLeft <= 7) {
        notificationType = "subscription_expiring_7days";
        title = "🟡 Subscription Reminder";
        message = `Your ${user.tier.toUpperCase()} subscription expires in ${daysLeft} days.`;
      }

      const existingNotif = await pool.query(
        `
        SELECT notification_id FROM notifications
        WHERE user_id = $1
          AND type = $2
          AND created_at > NOW() - INTERVAL '24 hours'
        `,
        [user.user_id, notificationType]
      );

      if (existingNotif.rows.length === 0 && notificationType) {
        await pool.query(
          `
          INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
          VALUES ($1, $2, $3, $4, false, NOW())
          `,
          [user.user_id, notificationType, title, message]
        );
        console.log(
          `[Subscription] Notification sent to user ${user.user_id}: ${notificationType}`
        );
      }
    }

    console.log("[Subscription] Expiry check complete");
    return { checked: result.rows.length };
  } catch (err) {
    console.error("[Subscription] Expiry check error:", err);
    return { error: err.message };
  }
}

/**
 * Send a notification confirming successful subscription renewal.
 * @param {string} userId - The user who renewed
 * @param {string} tier - The renewed tier (e.g. "silver", "premium")
 * @param {string|Date} expiryDate - New expiry date
 */
async function sendRenewalSuccessNotification(userId, tier, expiryDate) {
  try {
    const title = "🎉 Subscription Renewed!";
    const message = `Your ${tier.toUpperCase()} subscription is now active until ${new Date(expiryDate).toLocaleDateString("en-IN")}. Happy selling!`;

    await pool.query(
      `
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, 'subscription_renewed', $2, $3, false, NOW())
      `,
      [userId, title, message]
    );

    console.log(
      `[Subscription] Renewal confirmation sent to user ${userId}`
    );
  } catch (err) {
    console.error("[Subscription] Renewal notification error:", err);
  }
}

/**
 * Send a notification when a user upgrades their tier.
 * @param {string} userId - The user who upgraded
 * @param {string} fromTier - Previous tier
 * @param {string} toTier - New tier
 */
async function sendUpgradeNotification(userId, fromTier, toTier) {
  try {
    const title = "🚀 Tier Upgraded!";
    const message = `Congratulations! You've upgraded from ${fromTier.toUpperCase()} to ${toTier.toUpperCase()}. Enjoy your new benefits!`;

    await pool.query(
      `
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, 'tier_upgraded', $2, $3, false, NOW())
      `,
      [userId, title, message]
    );

    console.log(
      `[Subscription] Upgrade notification sent to user ${userId}`
    );
  } catch (err) {
    console.error("[Subscription] Upgrade notification error:", err);
  }
}

/**
 * Notify a user that they have reached their daily post limit.
 * @param {string} userId - The affected user
 * @param {string} tier - Current subscription tier
 * @param {number} postsToday - Number of posts made today
 */
async function sendPostLimitWarning(userId, tier, postsToday) {
  try {
    const title = "📝 Daily Post Limit Reached";
    const message = `You've used your daily post limit (${postsToday} posts). Upgrade to Premium for unlimited posts!`;

    await pool.query(
      `
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, 'post_limit_reached', $2, $3, false, NOW())
      ON CONFLICT DO NOTHING
      `,
      [userId, title, message]
    );
  } catch (err) {
    console.error("[Subscription] Post limit notification error:", err);
  }
}

/**
 * Notify a user when their post credits are running low (2 or fewer).
 * @param {string} userId - The affected user
 * @param {number} creditsLeft - Remaining credits
 */
async function sendCreditsLowNotification(userId, creditsLeft) {
  try {
    if (creditsLeft > 2) return;

    const title =
      creditsLeft === 0
        ? "🔴 No Post Credits Left"
        : "🟡 Low Post Credits";

    const message =
      creditsLeft === 0
        ? "You have no post credits remaining. Buy more credits or upgrade to continue posting."
        : `You have only ${creditsLeft} post credit(s) left. Consider upgrading to Silver or Premium for better value!`;

    await pool.query(
      `
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, 'credits_low', $2, $3, false, NOW())
      `,
      [userId, title, message]
    );
  } catch (err) {
    console.error("[Subscription] Credits notification error:", err);
  }
}

module.exports = {
  checkExpiringSubscriptions,
  sendRenewalSuccessNotification,
  sendUpgradeNotification,
  sendPostLimitWarning,
  sendCreditsLowNotification,
};
