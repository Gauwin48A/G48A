const { Worker } = require("bullmq");
const pool = require("../config/db");
const logger = require("../utils/logger");
const { sendFcmMulticast } = require("../services/fcmAdminService");
const { sendToMultiple: sendWebPush } = require("../services/fcm");

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

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (id) => typeof id === "string" && UUID_REGEX.test(id);

let notificationWorker = null;

try {
  notificationWorker = new Worker(
    "notifications",
    async (job) => {
      const { notification_id, receiver_id, sender_id, type, title, message, body, image_url, image, deep_link, data } = job.data;

      logger.info(`[NotificationWorker] Processing job ${job.id} for notification #${notification_id} to user #${receiver_id}`);

      // Guard: users.user_id is UUID in this schema. Legacy/test receivers
      // (e.g. "777777") would crash every downstream query with an invalid-uuid
      // error and retry-storm the queue. Skip them gracefully instead.
      if (!receiver_id || !isUuid(String(receiver_id))) {
        logger.warn(`[NotificationWorker] Skipping job ${job.id}: receiver #${receiver_id} is not a valid UUID`);
        if (isUuid(notification_id)) {
          await pool
            .query(
              "UPDATE notifications SET status = 'failed', updated_at = NOW() WHERE notification_id = $1",
              [notification_id]
            )
            .catch(() => {});
        }
        return { status: "invalid_receiver" };
      }

      // 1. Update status to 'processing'
      if (isUuid(notification_id)) {
        await pool.query(
          "UPDATE notifications SET status = 'processing', delivery_attempts = delivery_attempts + 1, updated_at = NOW() WHERE notification_id = $1",
          [notification_id]
        );
      }

      // 2. Check user notification preference toggles
      const allowed = await isNotificationAllowed(receiver_id, type);
      if (!allowed) {
        logger.info(`[NotificationWorker] Push skipped for user #${receiver_id} - notification type '${type}' disabled in preferences`);
        if (isUuid(notification_id)) {
          await pool.query(
            "UPDATE notifications SET status = 'sent', updated_at = NOW() WHERE notification_id = $1",
            [notification_id]
          );
        }
        return { status: "skipped_user_preference" };
      }

      // 3. Fetch active FCM tokens for recipient
      let tokenRes;
    try {
      tokenRes = await pool.query(
        "SELECT fcm_token AS token, COALESCE(platform, 'android') AS device_type FROM device_tokens WHERE user_id = $1 AND is_active = true",
        [receiver_id]
      );      } catch (err) {
        // Legacy schema without a platform column — fall back to the old behavior.
        tokenRes = await pool.query(
          "SELECT fcm_token AS token FROM device_tokens WHERE user_id = $1 AND is_active = true",
          [receiver_id]
        );
      }

      if (tokenRes.rows.length === 0) {
        logger.info(`[NotificationWorker] No active FCM device tokens found for user #${receiver_id}`);
        if (isUuid(notification_id)) {
          await pool.query(
            "UPDATE notifications SET status = 'sent', updated_at = NOW() WHERE notification_id = $1",
            [notification_id]
          );
        }
        return { status: "no_active_devices" };
      }

      const androidTokens = tokenRes.rows.filter(r => r.device_type !== "web").map(r => r.token);
      const webTokens = tokenRes.rows.filter(r => r.device_type === "web").map(r => r.token);

      // 4. Send Android pushes via Firebase Admin FCM (FCM device tokens only)
      const pushResult = androidTokens.length
        ? await sendFcmMulticast(androidTokens, {
            notification_id,
            type,
            title,
            message: message || body,
            image_url: image_url || image,
            deep_link,
            data
          })
        : { success: true, successCount: 0, invalidTokens: [] };

      // 4b. Send web pushes via VAPID web-push (subscription JSONs are NOT FCM tokens)
      let webPushResult = { successCount: 0 };
      if (webTokens.length) {
        try {
          webPushResult = await sendWebPush(webTokens, title, message || body, {
            notification_id: String(notification_id || ""),
            type: type || "system",
            deep_link: deep_link || "",
            image_url: image_url || image || "",
            ...(data || {})
          });
        } catch (err) {
          logger.warn(`[NotificationWorker] Web push send failed for user #${receiver_id}:`, err.message);
        }
      }

      // Deactivate invalid/unregistered tokens if any
      if (pushResult.invalidTokens && pushResult.invalidTokens.length > 0) {
        await pool.query(
          "UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE fcm_token = ANY($1::text[])",
          [pushResult.invalidTokens]
        );
        logger.info(`[NotificationWorker] Deactivated ${pushResult.invalidTokens.length} stale FCM device tokens`);
      }

      // 5. Update notification record status
      if (isUuid(notification_id)) {
        const sentAny = pushResult.successCount > 0 || (webPushResult && webPushResult.successCount > 0);
        const finalStatus = sentAny || pushResult.reason === 'fcm_not_configured' ? 'sent' : 'failed';
        await pool.query(
          "UPDATE notifications SET status = $1, updated_at = NOW() WHERE notification_id = $2",
          [finalStatus, notification_id]
        );
      }

      return { status: "completed", successCount: pushResult.successCount, totalCount: tokenRes.rows.length };
    },
    { connection, concurrency: 10 }
  );

  notificationWorker.on("completed", (job, result) => {
    logger.info(`[NotificationWorker] Job ${job.id} completed successfully:`, result);
  });

  notificationWorker.on("failed", async (job, err) => {
    logger.error(`[NotificationWorker] Job ${job?.id} failed on attempt ${job?.attemptsMade}:`, err.message);
    if (isUuid(job?.data?.notification_id) && job?.attemptsMade >= (job?.opts?.attempts || 5)) {
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

/**
 * Periodically checks for listings reaching 7-day and 2-day expiry windows.
 */
async function checkPostExpiryNotifications() {
  try {
    // 1. 7-day expiry notice (Day 23)
    const res7 = await pool.query(
      `SELECT post_id, title, user_id
       FROM posts
       WHERE status = 'active'
         AND expires_at >= NOW() + INTERVAL '6 days'
         AND expires_at <= NOW() + INTERVAL '7 days'`
    );
    for (const row of res7.rows) {
      await pool.query(
        `INSERT INTO notifications (receiver_id, type, title, message, deep_link, status)
         VALUES ($1, 'expiry_warning_7d', $2, $3, $4, 'pending')`,
        [
          row.user_id,
          'Is your listing sold yet?',
          `Your post "${row.title}" has been active for 23 days. Mark it as sold or keep it active.`,
          `zaruda://repost?post_id=${row.post_id}`
        ]
      ).catch(() => {});
    }

    // 2. 2-day expiry notice (Day 28)
    const res2 = await pool.query(
      `SELECT post_id, title, user_id
       FROM posts
       WHERE status = 'active'
         AND expires_at >= NOW()
         AND expires_at <= NOW() + INTERVAL '2 days'`
    );
    for (const row of res2.rows) {
      await pool.query(
        `INSERT INTO notifications (receiver_id, type, title, message, deep_link, status)
         VALUES ($1, 'expiry_warning_2d', $2, $3, $4, 'pending')`,
        [
          row.user_id,
          'Listing Expiring Soon!',
          `Your post "${row.title}" will expire in 48 hours. Tap to repost and renew for 30 days.`,
          `zaruda://repost?post_id=${row.post_id}`
        ]
      ).catch(() => {});
    }
  } catch (err) {
    logger.warn("[NotificationWorker] Expiry notification check warning:", err.message);
  }
}

module.exports = { notificationWorker, checkPostExpiryNotifications };
