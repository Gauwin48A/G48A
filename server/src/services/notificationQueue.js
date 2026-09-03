const { Queue } = require("bullmq");
const logger = require("../utils/logger");
const pool = require("../config/db");
const { sendFcmMulticast } = require("./fcmAdminService");
const { sendToMultiple: sendWebPush } = require("./fcm");
const { getRedisConnectionOptions } = require("../config/redisConnection");

const connection = getRedisConnectionOptions({ maxRetriesPerRequest: 1 });

let notificationQueue = null;
let isRedisAvailable = false;

try {
  notificationQueue = new Queue("notifications", {
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 30000
      },
      removeOnComplete: 1000,
      removeOnFail: 5000
    }
  });

  notificationQueue.on("error", (err) => {
    isRedisAvailable = false;
  });

  // Test Redis connection status
  notificationQueue.client.then(() => {
    isRedisAvailable = true;
    logger.info("[NotificationQueue] BullMQ connected to Redis");
  }).catch((err) => {
    isRedisAvailable = false;
    logger.warn(`[NotificationQueue] Redis offline (${err.message}) - enabling direct fallback dispatch`);
  });
} catch (err) {
  logger.warn("[NotificationQueue] Could not initialize BullMQ queue - fallback mode active");
}

/**
 * Direct async dispatch fallback when Redis is offline.
 */
async function fallbackDirectDispatch(jobData) {
  const { notification_id, receiver_id, type, title, message, body, image_url, image, deep_link, data } = jobData;

  try {
    let tokenRes;
    try {
      tokenRes = await pool.query(
        "SELECT fcm_token AS token, COALESCE(platform, 'android') AS device_type FROM device_tokens WHERE user_id = $1 AND is_active = true",
        [receiver_id]
      );
    } catch (err) {
      // Legacy schema without a platform column — fall back to the old behavior.
      tokenRes = await pool.query(
        "SELECT fcm_token AS token FROM device_tokens WHERE user_id = $1 AND is_active = true",
        [receiver_id]
      );
    }

    if (tokenRes.rows.length === 0) {
      if (notification_id) {
        await pool.query(
          "UPDATE notifications SET status = 'sent', updated_at = NOW() WHERE notification_id = $1",
          [notification_id]
        );
      }
      return { success: true, status: "no_active_devices" };
    }

    const androidTokens = tokenRes.rows.filter(r => r.device_type !== "web").map(r => r.token);
    const webTokens = tokenRes.rows.filter(r => r.device_type === "web").map(r => r.token);

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

    // Web VAPID subscription JSONs are NOT FCM tokens — send via web-push instead
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
        logger.warn(`[NotificationQueue] Web push send failed for user #${receiver_id}:`, err.message);
      }
    }

    if (pushResult.invalidTokens && pushResult.invalidTokens.length > 0) {
      await pool.query(
        "UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE fcm_token = ANY($1::text[])",
        [pushResult.invalidTokens]
      );
    }

    if (notification_id) {
      const sentAny = pushResult.successCount > 0 || (webPushResult && webPushResult.successCount > 0);
      const finalStatus = sentAny || pushResult.reason === 'fcm_not_configured' ? 'sent' : 'failed';
      await pool.query(
        "UPDATE notifications SET status = $1, updated_at = NOW() WHERE notification_id = $2",
        [finalStatus, notification_id]
      );
    }

    return { success: true, fallback: true, successCount: pushResult.successCount };
  } catch (err) {
    logger.error("[NotificationQueue] Direct fallback dispatch failed:", err.message);
    if (notification_id) {
      await pool.query(
        "UPDATE notifications SET status = 'failed', updated_at = NOW() WHERE notification_id = $1",
        [notification_id]
      );
    }
    return { success: false, error: err.message };
  }
}

/**
 * Enqueue a push notification job into BullMQ or fallback to direct dispatch
 * @param {Object} jobData - Notification payload data
 */
async function enqueueNotification(jobData) {
  if (notificationQueue) {
    if (!isRedisAvailable) {
      try {
        await Promise.race([
          notificationQueue.client,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timeout")), 1500))
        ]);
        isRedisAvailable = true;
      } catch {
        isRedisAvailable = false;
      }
    }

    if (isRedisAvailable) {
      try {
        const job = await notificationQueue.add("send-push", jobData, {
          jobId: `notif-${jobData.notification_id || Date.now()}-${Math.random().toString(36).substring(2, 7)}`
        });
        logger.info(`[NotificationQueue] Job ${job.id} enqueued for user ${jobData.receiver_id}`);
        return { success: true, jobId: job.id };
      } catch (err) {
        isRedisAvailable = false;
        logger.warn(`[NotificationQueue] Queue add failed (${err.message}) - falling back to direct dispatch`);
      }
    }
  }

  // Fallback direct dispatch if Redis is un-contactable
  setImmediate(() => fallbackDirectDispatch(jobData));
  return { success: true, fallback: true };
}

module.exports = {
  notificationQueue,
  enqueueNotification
};
