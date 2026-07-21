const { Queue } = require("bullmq");
const logger = require("../utils/logger");
const pool = require("../config/db");
const { sendFcmMulticast } = require("./fcmAdminService");

const redisHost = process.env.REDIS_HOST || "127.0.0.1";
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false
};

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
    const tokenRes = await pool.query(
      "SELECT token FROM device_tokens WHERE user_id = $1 AND is_active = true",
      [receiver_id]
    );

    if (tokenRes.rows.length === 0) {
      if (notification_id) {
        await pool.query(
          "UPDATE notifications SET status = 'sent', updated_at = NOW() WHERE notification_id = $1",
          [notification_id]
        );
      }
      return { success: true, status: "no_active_devices" };
    }

    const tokens = tokenRes.rows.map(r => r.token);
    const pushResult = await sendFcmMulticast(tokens, {
      notification_id,
      type,
      title,
      message: message || body,
      image_url: image_url || image,
      deep_link,
      data
    });

    if (pushResult.invalidTokens && pushResult.invalidTokens.length > 0) {
      await pool.query(
        "UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE token = ANY($1::text[])",
        [pushResult.invalidTokens]
      );
    }

    if (notification_id) {
      const finalStatus = pushResult.successCount > 0 || pushResult.reason === 'fcm_not_configured' ? 'sent' : 'failed';
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
  if (notificationQueue && isRedisAvailable) {
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

  // Fallback direct dispatch if Redis is un-contactable
  setImmediate(() => fallbackDirectDispatch(jobData));
  return { success: true, fallback: true };
}

module.exports = {
  notificationQueue,
  enqueueNotification
};
