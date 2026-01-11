/**
 * CRON Jobs - Automated Background Tasks
 * Protocol: Value Hierarchy - Tier-Based Expiry & Notifications
 * 
 * Schedule:
 * - Post expiry check: Daily at 00:00 (uses tier-based expires_at)
 * - Expiry warnings: Daily at 09:00 (3 days before posts expire)
 * - Subscription check: Daily at 10:00 (7, 3, 1 days before expiry)
 * - Transaction expiry: Hourly
 */

const cron = require('node-cron');
const pool = require('../config/db');

// Configuration for warnings
const POST_WARNING_DAYS = [5, 3, 1]; // Days before expiry to warn

/**
 * Mark expired posts as expired (based on tier-specific expires_at)
 * Premium: 45 days, Silver: 25 days, Basic: 15 days
 * Runs daily at midnight
 */
const expireOldPosts = async () => {
    console.log('[CRON] Running tier-based post expiry check...');

    try {
        // Use the expires_at field set during post creation based on tier
        const result = await pool.query(`
            UPDATE posts 
            SET status = 'expired', updated_at = NOW()
            WHERE status = 'active'
              AND expires_at IS NOT NULL
              AND expires_at < NOW()
            RETURNING post_id, user_id, title, expires_at,
                      (SELECT tier FROM users WHERE users.user_id = posts.user_id) as user_tier
        `);

        if (result.rows.length > 0) {
            console.log(`[CRON] Expired ${result.rows.length} posts (tier-based expiry)`);

            // Create tier-specific notifications for each expired post
            for (const post of result.rows) {
                const tierName = (post.user_tier || 'basic').toUpperCase();
                await pool.query(`
                    INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
                    VALUES ($1, $2, $3, 'post_expired', $4, NOW())
                `, [
                    post.user_id,
                    '📋 Post Expired',
                    `Your post "${post.title || 'Untitled'}" has expired based on your ${tierName} tier visibility. Upgrade your tier for longer visibility or repost to make it active again.`,
                    post.post_id
                ]);
            }
        } else {
            console.log('[CRON] No posts to expire');
        }

        // Also expire posts using legacy logic (for posts without expires_at)
        const legacyResult = await pool.query(`
            UPDATE posts 
            SET status = 'expired', updated_at = NOW()
            WHERE status = 'active'
              AND expires_at IS NULL
              AND created_at < NOW() - INTERVAL '30 days'
            RETURNING post_id, user_id, title
        `);

        if (legacyResult.rows.length > 0) {
            console.log(`[CRON] Expired ${legacyResult.rows.length} legacy posts (30-day default)`);
            for (const post of legacyResult.rows) {
                await pool.query(`
                    INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
                    VALUES ($1, 'Post Expired', $2, 'post_expired', $3, NOW())
                `, [
                    post.user_id,
                    `Your post "${post.title || 'Untitled'}" has expired after 30 days. Upgrade to Premium for 45-day visibility!`,
                    post.post_id
                ]);
            }
        }
    } catch (error) {
        console.error('[CRON] Post expiry error:', error);
    }
};

/**
 * Send tier-aware expiry warning notifications
 * Warns at 5, 3, and 1 days before expires_at
 * Runs daily at 9 AM
 */
const sendExpiryWarnings = async () => {
    console.log('[CRON] Sending tier-based expiry warnings...');

    try {
        for (const daysBeforeExpiry of POST_WARNING_DAYS) {
            const result = await pool.query(`
                SELECT 
                    p.post_id, 
                    p.user_id, 
                    p.title, 
                    p.expires_at,
                    u.tier,
                    EXTRACT(DAY FROM (p.expires_at - NOW())) as days_left
                FROM posts p
                JOIN users u ON p.user_id = u.user_id
                LEFT JOIN notifications n ON n.reference_id = p.post_id 
                    AND n.type = 'expiry_warning' 
                    AND n.created_at > NOW() - INTERVAL '20 hours'
                WHERE p.status = 'active'
                  AND p.expires_at IS NOT NULL
                  AND p.expires_at > NOW()
                  AND p.expires_at < NOW() + INTERVAL '${daysBeforeExpiry + 1} days'
                  AND p.expires_at > NOW() + INTERVAL '${daysBeforeExpiry - 1} days'
                  AND n.notification_id IS NULL
            `);

            if (result.rows.length > 0) {
                console.log(`[CRON] Sending ${result.rows.length} expiry warnings (${daysBeforeExpiry} days before)`);

                for (const post of result.rows) {
                    const daysLeft = Math.ceil(post.days_left);
                    const tierName = (post.tier || 'basic').toUpperCase();

                    let emoji = '🟡';
                    if (daysLeft <= 1) emoji = '🔴';
                    else if (daysLeft <= 3) emoji = '🟠';

                    await pool.query(`
                        INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
                        VALUES ($1, $2, $3, 'expiry_warning', $4, NOW())
                    `, [
                        post.user_id,
                        `${emoji} Post Expiring Soon`,
                        `Your post "${post.title || 'Untitled'}" expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''} (${tierName} tier). Renew or upgrade for extended visibility!`,
                        post.post_id
                    ]);
                }
            }
        }

        console.log('[CRON] Expiry warnings complete');
    } catch (error) {
        console.error('[CRON] Expiry warning error:', error);
    }
};

/**
 * Check expiring subscriptions (Silver/Premium)
 * Warns at 7, 3, and 1 days before subscription_expiry
 * Runs daily at 10 AM
 */
const checkSubscriptionExpiry = async () => {
    console.log('[CRON] Checking subscription expiry...');

    try {
        const { checkExpiringSubscriptions } = require('../services/subscriptionNotifications');
        const result = await checkExpiringSubscriptions();
        console.log(`[CRON] Subscription check complete: ${result.checked || 0} users processed`);
    } catch (error) {
        console.error('[CRON] Subscription expiry error:', error);
    }
};

/**
 * Clean up expired transactions
 * Runs every hour
 */
const expireOldTransactions = async () => {
    console.log('[CRON] Checking for expired transactions...');

    try {
        const result = await pool.query(`
            UPDATE transactions 
            SET status = 'expired'
            WHERE status = 'pending_buyer_confirm'
              AND expires_at < NOW()
            RETURNING transaction_id, seller_id, post_id
        `);

        if (result.rows.length > 0) {
            console.log(`[CRON] Expired ${result.rows.length} transactions`);

            // Restore posts to active status
            for (const tx of result.rows) {
                await pool.query(
                    `UPDATE posts SET status = 'active' WHERE post_id = $1`,
                    [tx.post_id]
                );

                await pool.query(`
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    VALUES ($1, '🔄 Sale Expired', 'The pending sale has expired. Your item is back on the market.', 'sale_expired', NOW())
                `, [tx.seller_id]);
            }
        }
    } catch (error) {
        console.error('[CRON] Transaction expiry error:', error);
    }
};

/**
 * Initialize all CRON jobs
 */
const initCronJobs = () => {
    console.log('⏰ Initializing CRON jobs...');

    // Post expiry check - Daily at midnight (uses tier-based expires_at)
    cron.schedule('0 0 * * *', expireOldPosts, {
        timezone: 'Asia/Kolkata'
    });
    console.log('  ├─ Post expiry (tier-based): Daily at 00:00 IST');

    // Expiry warnings - Daily at 9 AM
    cron.schedule('0 9 * * *', sendExpiryWarnings, {
        timezone: 'Asia/Kolkata'
    });
    console.log('  ├─ Expiry warnings: Daily at 09:00 IST');

    // Subscription expiry check - Daily at 10 AM
    cron.schedule('0 10 * * *', checkSubscriptionExpiry, {
        timezone: 'Asia/Kolkata'
    });
    console.log('  ├─ Subscription expiry: Daily at 10:00 IST');

    // Transaction expiry - Every hour
    cron.schedule('0 * * * *', expireOldTransactions, {
        timezone: 'Asia/Kolkata'
    });
    console.log('  └─ Transaction expiry: Hourly');

    console.log('⏰ CRON jobs initialized');
};

// Export for testing
module.exports = {
    initCronJobs,
    expireOldPosts,
    sendExpiryWarnings,
    checkSubscriptionExpiry,
    expireOldTransactions
};

