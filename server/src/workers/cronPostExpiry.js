/**
 * Zaruda Background Worker: Post Expiry & Dynamic SaleDone Notification Engine
 * 
 * Periodically scans active posts that have reached their active duration limit (e.g. 30 days),
 * marks them as expired, and dispatches dynamic push notifications to sellers prompting:
 * "Your listing '[Post Title]' has expired. Has this item been sold?"
 */

const { pool } = require('../config/db');
const { emitNotification } = require('../services/notificationEmitter');
const logger = require('../utils/logger');

async function processExpiredPosts() {
  logger.info('[Worker] Running post expiry check...');
  const client = await pool.connect();
  try {
    // Find active posts created 30+ days ago
    const query = `
      SELECT p.id, p.title, p.user_id, p.created_at
      FROM posts p
      WHERE p.status = 'active'
        AND p.created_at <= NOW() - INTERVAL '30 days'
      LIMIT 100;
    `;
    const res = await client.query(query);

    if (res.rows.length === 0) {
      logger.info('[Worker] No expired posts found.');
      return;
    }

    logger.info(`[Worker] Found ${res.rows.length} posts reaching expiry limit.`);

    for (const post of res.rows) {
      await client.query('BEGIN');
      
      // Update status to expired
      await client.query(
        "UPDATE posts SET status = 'expired', updated_at = NOW() WHERE id = $1",
        [post.id]
      );

      // Emit dynamic push notification & in-app alert to seller
      const notificationPayload = {
        title: 'Listing Expired — Sale Completed?',
        message: `Your post "${post.title}" reached its active duration. Mark as sold or tap to repost.`,
        data: {
          type: 'POST_EXPIRY',
          post_id: String(post.id),
          action: 'OPEN_SALE_DONE',
          route: `zaruda://sale-done?postId=${post.id}`
        }
      };

      await emitNotification(post.user_id, notificationPayload);
      await client.query('COMMIT');

      logger.info(`[Worker] Expired post #${post.id} (${post.title}) & sent alert to user #${post.user_id}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('[Worker] Error processing expired posts:', err);
  } finally {
    client.release();
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
