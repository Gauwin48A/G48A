/**
 * Zaruda Background Worker: Post Expiry & Dynamic SaleDone Notification Engine
 * 
 * Periodically scans active posts that have reached their active duration limit
 * (based on expires_at or plan tier visibility), marks them as expired, and
 * dispatches dynamic push notifications to sellers prompting:
 * "Your listing '[Post Title]' has expired. Has this item been sold or would you like to repost?"
 */

const pool = require("../config/db");
const { emitNotification } = require("../services/notificationEmitter");
const logger = require("../utils/logger");

async function processExpiredPosts() {
  logger.info("[Worker] Running post expiry check...");
  const client = typeof pool.connect === "function" ? await pool.connect() : pool;
  try {
    // Find active posts that have reached their expiry time
    const query = `
      SELECT p.post_id, p.title, p.user_id, p.created_at, p.expires_at
      FROM posts p
      WHERE p.status = 'active'
        AND (
          p.expires_at <= NOW()
          OR (p.expires_at IS NULL AND p.created_at <= NOW() - INTERVAL '30 days')
        )
      LIMIT 100;
    `;
    const res = await client.query(query);

    if (res.rows.length === 0) {
      logger.info("[Worker] No expired posts found.");
      return { expiredCount: 0 };
    }

    logger.info(`[Worker] Found ${res.rows.length} posts reaching expiry limit.`);

    for (const post of res.rows) {
      await client.query("BEGIN");

      // Update status to expired
      await client.query(
        "UPDATE posts SET status = 'expired', updated_at = NOW() WHERE post_id = $1",
        [post.post_id]
      );

      // Emit dynamic push notification & in-app alert to seller
      const notificationPayload = {
        title: "Listing Expired — What would you like to do?",
        message: `Your post "${post.title}" reached its visibility limit. Mark as sold or tap to repost for a fresh period.`,
        data: {
          type: "POST_EXPIRY",
          post_id: String(post.post_id),
          action: "OPEN_EXPIRY_ACTION",
          route: `zaruda://expiry-action/${post.post_id}`,
        },
      };

      try {
        await emitNotification(post.user_id, notificationPayload);
      } catch (notifErr) {
        logger.warn(`[Worker] Could not emit notification for post #${post.post_id}:`, notifErr.message);
      }

      await client.query("COMMIT");
      logger.info(`[Worker] Expired post #${post.post_id} ("${post.title}") & sent alert to user #${post.user_id}`);
    }

    return { expiredCount: res.rows.length };
  } catch (err) {
    if (client.query) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
    }
    logger.error("[Worker] Error processing expired posts:", err);
    throw err;
  } finally {
    if (client.release) client.release();
  }
}

if (require.main === module) {
  processExpiredPosts()
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(err);
      process.exit(1);
    });
}

module.exports = { processExpiredPosts };
