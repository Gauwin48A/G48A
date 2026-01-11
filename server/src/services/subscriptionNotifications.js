/**
 * Subscription Notification Service
 * Protocol: Value Hierarchy - Expiry Alerts
 * 
 * Checks for expiring subscriptions and creates notifications
 * Should be run as a cron job or on app startup
 */

const pool = require('../config/db');

/**
 * Check for expiring subscriptions and send notifications
 * Called daily via cron or on server startup
 */
async function checkExpiringSubscriptions() {
    try {
        console.log('[Subscription] Checking for expiring subscriptions...');

        // Find users whose subscription expires in:
        // - 7 days (warning)
        // - 3 days (urgent)
        // - 1 day (final notice)
        // - Expired today (expired notice)

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

        console.log(`[Subscription] Found ${result.rows.length} users with expiring subscriptions`);

        for (const user of result.rows) {
            const daysLeft = Math.ceil(user.days_until_expiry);

            // Determine notification type and message
            let notificationType, title, message;

            if (daysLeft <= 0) {
                notificationType = 'subscription_expired';
                title = '⚠️ Subscription Expired';
                message = `Your ${user.tier.toUpperCase()} subscription has expired. Renew now to continue posting!`;
            } else if (daysLeft === 1) {
                notificationType = 'subscription_expiring_1day';
                title = '🔴 Last Day! Subscription Expiring';
                message = `Your ${user.tier.toUpperCase()} subscription expires tomorrow! Renew now to avoid interruption.`;
            } else if (daysLeft <= 3) {
                notificationType = 'subscription_expiring_3days';
                title = '🟠 Subscription Expiring Soon';
                message = `Your ${user.tier.toUpperCase()} subscription expires in ${daysLeft} days. Renew now!`;
            } else if (daysLeft <= 7) {
                notificationType = 'subscription_expiring_7days';
                title = '🟡 Subscription Reminder';
                message = `Your ${user.tier.toUpperCase()} subscription expires in ${daysLeft} days.`;
            }

            // Check if we already sent this notification today
            const existingNotif = await pool.query(`
        SELECT notification_id FROM notifications
        WHERE user_id = $1 
          AND type = $2 
          AND created_at > NOW() - INTERVAL '24 hours'
      `, [user.user_id, notificationType]);

            if (existingNotif.rows.length === 0 && notificationType) {
                // Create notification
                await pool.query(`
          INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
          VALUES ($1, $2, $3, $4, false, NOW())
        `, [user.user_id, notificationType, title, message]);

                console.log(`[Subscription] Notification sent to user ${user.user_id}: ${notificationType}`);
            }
        }

        console.log('[Subscription] Expiry check complete');
        return { checked: result.rows.length };

    } catch (err) {
        console.error('[Subscription] Expiry check error:', err);
        return { error: err.message };
    }
}

/**
 * Send renewal success notification
 */
async function sendRenewalSuccessNotification(userId, tier, expiryDate) {
    try {
        const title = '🎉 Subscription Renewed!';
        const message = `Your ${tier.toUpperCase()} subscription is now active until ${new Date(expiryDate).toLocaleDateString('en-IN')}. Happy selling!`;

        await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, 'subscription_renewed', $2, $3, false, NOW())
    `, [userId, title, message]);

        console.log(`[Subscription] Renewal confirmation sent to user ${userId}`);
    } catch (err) {
        console.error('[Subscription] Renewal notification error:', err);
    }
}

/**
 * Send upgrade success notification
 */
async function sendUpgradeNotification(userId, fromTier, toTier) {
    try {
        const title = '🚀 Tier Upgraded!';
        const message = `Congratulations! You've upgraded from ${fromTier.toUpperCase()} to ${toTier.toUpperCase()}. Enjoy your new benefits!`;

        await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, 'tier_upgraded', $2, $3, false, NOW())
    `, [userId, title, message]);

        console.log(`[Subscription] Upgrade notification sent to user ${userId}`);
    } catch (err) {
        console.error('[Subscription] Upgrade notification error:', err);
    }
}

/**
 * Send post limit warning notification
 */
async function sendPostLimitWarning(userId, tier, postsToday) {
    try {
        const title = '📝 Daily Post Limit Reached';
        const message = `You've used your daily post limit (${postsToday} posts). Upgrade to Premium for unlimited posts!`;

        await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, 'post_limit_reached', $2, $3, false, NOW())
      ON CONFLICT DO NOTHING
    `, [userId, title, message]);

    } catch (err) {
        console.error('[Subscription] Post limit notification error:', err);
    }
}

/**
 * Send credit low warning
 */
async function sendCreditsLowNotification(userId, creditsLeft) {
    try {
        if (creditsLeft > 2) return; // Only warn when very low

        const title = creditsLeft === 0 ? '🔴 No Post Credits Left' : '🟡 Low Post Credits';
        const message = creditsLeft === 0
            ? 'You have no post credits remaining. Buy more credits or upgrade to continue posting.'
            : `You have only ${creditsLeft} post credit(s) left. Consider upgrading to Silver or Premium for better value!`;

        await pool.query(`
      INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
      VALUES ($1, 'credits_low', $2, $3, false, NOW())
    `, [userId, title, message]);

    } catch (err) {
        console.error('[Subscription] Credits notification error:', err);
    }
}

module.exports = {
    checkExpiringSubscriptions,
    sendRenewalSuccessNotification,
    sendUpgradeNotification,
    sendPostLimitWarning,
    sendCreditsLowNotification
};
