const { Worker } = require("bullmq");
const pool = require("../config/db");
const logger = require("../utils/logger");
const { sendFcmMulticast } = require("../services/fcmAdminService");

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: null
};

/**
 * Checks whether user has enabled notifications for this specific type.
 */
async function isNotificationAllowed(userId, type) {
  try {
    const res = await pool.query(
      `SELECT push_enabled, likes_enabled, comments_enabled, follows_enabled,
              mentions_enabled, order_updates_enabled, marketing_enabled, security_enabled, system_enabled
       FROM notification_preferences
       WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length === 0) return true; // Default to allowed if no explicit preferences saved

    const prefs = res.rows[0];
    if (!prefs.push_enabled) return false;

    const norm = String(type || '').toLowerCase();
    if (norm.includes('like') && prefs.likes_enabled === false) return false;
    if (norm.includes('comment') && prefs.comments_enabled === false) return false;
    if (norm.includes('follow') && prefs.follows_enabled === false) return false;
    if (norm.includes('mention') && prefs.mentions_enabled === false) return false;
    if ((norm.includes('order') || norm.includes('transaction')) && prefs.order_updates_enabled === false) return false;
    if ((norm.includes('promo') || norm.includes('marketing')) && prefs.marketing_enabled === false) return false;
    if (norm.includes('security') && prefs.security_enabled === false) return false;
    if (norm.includes('system') && prefs.system_enabled === false) return false;

    return true;
  } catch (err) {
    logger.warn(`[NotificationWorker] Preference check failed for user ${userId}:`, err.message);
    return true; // Proceed on check error to prevent dropping valid alerts
  }
}

let notificationWorker = null;

try {
  notificationWorker = new Worker(
    "notifications",
    async (job) => {
      const { notification_id, receiver_id, sender_id, type, title, message, body, image_url, image, deep_link, data } = job.data;

      logger.info(`[NotificationWorker] Processing job ${job.id} for notification #${notification_id} to user #${receiver_id}`);

      // 1. Update status to 'processing'
      if (notification_id) {
        await pool.query(
          "UPDATE notifications SET status = 'processing', delivery_attempts = delivery_attempts + 1, updated_at = NOW() WHERE notification_id = $1",
          [notification_id]
        );
      }

      // 2. Check user notification preference toggles
      const allowed = await isNotificationAllowed(receiver_id, type);
      if (!allowed) {
        logger.info(`[NotificationWorker] Push skipped for user #${receiver_id} - notification type '${type}' disabled in preferences`);
        if (notification_id) {
          await pool.query(
            "UPDATE notifications SET status = 'sent', updated_at = NOW() WHERE notification_id = $1",
            [notification_id]
          );
        }
        return { status: "skipped_user_preference" };
      }

      // 3. Fetch active FCM tokens for recipient
      const tokenRes = await pool.query(
        "SELECT token FROM device_tokens WHERE user_id = $1 AND is_active = true",
        [receiver_id]
      );

      if (tokenRes.rows.length === 0) {
        logger.info(`[NotificationWorker] No active FCM device tokens found for user #${receiver_id}`);
        if (notification_id) {
          await pool.query(
            "UPDATE notifications SET status = 'sent', updated_at = NOW() WHERE notification_id = $1",
            [notification_id]
          );
        }
        return { status: "no_active_devices" };
      }

      const tokens = tokenRes.rows.map(r => r.token);

      // 4. Send FCM Push Notification via FCM Admin SDK
      const pushResult = await sendFcmMulticast(tokens, {
        notification_id,
        type,
        title,
        message: message || body,
        image_url: image_url || image,
        deep_link,
        data
      });

      // Deactivate invalid/unregistered tokens if any
      if (pushResult.invalidTokens && pushResult.invalidTokens.length > 0) {
        await pool.query(
          "UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE token = ANY($1::text[])",
          [pushResult.invalidTokens]
        );
        logger.info(`[NotificationWorker] Deactivated ${pushResult.invalidTokens.length} stale FCM device tokens`);
      }

      // 5. Update notification record status
      if (notification_id) {
        const finalStatus = pushResult.successCount > 0 || pushResult.reason === 'fcm_not_configured' ? 'sent' : 'failed';
        await pool.query(
          "UPDATE notifications SET status = $1, updated_at = NOW() WHERE notification_id = $2",
          [finalStatus, notification_id]
        );
      }

      return { status: "completed", successCount: pushResult.successCount, totalCount: tokens.length };
    },
    { connection, concurrency: 10 }
  );

  notificationWorker.on("completed", (job, result) => {
    logger.info(`[NotificationWorker] Job ${job.id} completed successfully:`, result);
  });

  notificationWorker.on("failed", async (job, err) => {
    logger.error(`[NotificationWorker] Job ${job?.id} failed on attempt ${job?.attemptsMade}:`, err.message);
    if (job?.data?.notification_id && job?.attemptsMade >= (job?.opts?.attempts || 5)) {
      try {
        await pool.query(
          "UPDATE notifications SET status = 'failed', updated_at = NOW() WHERE notification_id = $1",
          [job.data.notification_id]
        );
      } catch (dbErr) {
        logger.error("[NotificationWorker] Error updating failed status in DB:", dbErr.message);
      }
    }
  });

  logger.info("[NotificationWorker] Notification worker started listening");
} catch (err) {
  logger.error("[NotificationWorker] Failed to start notification worker:", err.message);
}

module.exports = { notificationWorker };
