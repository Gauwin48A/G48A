/**
 * Post Expiry Notification Worker
 * Checks for posts nearing expiry and sends notifications to owners.
 * Designed to run as a periodic cron job (daily).
 */
const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const DAYS_BEFORE_EXPIRY = 3;

async function notifyExpiringPosts() {
  try {
    // Find posts expiring within N days
    const result = await runQuery(
      `SELECT p.post_id, p.title, p.user_id, p.created_at,
              p.created_at + INTERVAL '30 days' AS expires_at
       FROM posts p
       WHERE p.status = 'active'
         AND p.created_at + INTERVAL '30 days' BETWEEN NOW() AND NOW() + INTERVAL '${DAYS_BEFORE_EXPIRY} days'
         AND NOT EXISTS (
           SELECT 1 FROM notifications n
           WHERE n.user_id::text = p.user_id::text
             AND n.type = 'post_expiry'
             AND n.related_id::text = p.post_id::text
             AND n.created_at > NOW() - INTERVAL '7 days'
         )`
    );

    let notified = 0;
    for (const post of result.rows) {
      try {
        await runQuery(
          `INSERT INTO notifications (user_id, type, title, message, related_id, action_url, created_at)
           VALUES ($1, 'post_expiry', 'Listing Expiring Soon',
                   $2, $3, $4, NOW())`,
          [
            post.user_id,
            `Your listing "${post.title}" will expire soon. Renew it to keep it active.`,
            String(post.post_id),
            `/post/${post.post_id}`,
          ]
        );
        notified++;
      } catch (insertErr) {
        logger.warn(`[ExpiryNotifier] Failed to notify for post ${post.post_id}:`, insertErr.message);
      }
    }

    logger.info(`[ExpiryNotifier] Notified ${notified} users of ${result.rows.length} expiring posts`);
    return { total: result.rows.length, notified };
  } catch (error) {
    logger.error("[ExpiryNotifier] Error:", error.message);
    return { total: 0, notified: 0, error: error.message };
  }
}

module.exports = { notifyExpiringPosts };
