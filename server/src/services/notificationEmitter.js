const pool = require("../config/db");
const logger = require("../utils/logger");
const { enqueueNotification } = require("./notificationQueue");

let ioInstance = null;

/**
 * Register the Socket.IO instance for notification broadcasts.
 * @param {import("socket.io").Server} io
 */
function setNotificationSocket(io) {
  ioInstance = io;
}

/**
 * Emit a notification event:
 * 1. Broadcast real-time event to Socket.IO user room (user_<userId>)
 * 2. Save notification record into PostgreSQL notifications table
 * 3. Queue FCM push notification via BullMQ
 *
 * @param {string|number} receiverId - Recipient user ID
 * @param {object} payload - Notification data
 * @param {string} payload.title - Notification title
 * @param {string} payload.message - Body text
 * @param {string} [payload.type] - Notification type ('like', 'comment', 'follow', 'order', 'system', etc.)
 * @param {string|number} [payload.sender_id] - User ID of actor
 * @param {string} [payload.image_url] - Optional thumbnail image URL
 * @param {string} [payload.deep_link] - Deep link route for mobile app
 * @param {object} [payload.data] - Additional metadata payload
 * @returns {Promise<boolean>}
 */
async function emitNotification(receiverId, payload = {}) {
  if (!receiverId) return false;

  const {
    title = "New Notification",
    message = "",
    type = "system",
    sender_id = null,
    image_url = null,
    deep_link = null,
    data = {}
  } = payload;

  // 1. Real-time Socket.IO broadcast
  if (ioInstance) {
    try {
      ioInstance.to(`user_${receiverId}`).emit("notification", {
        receiver_id: receiverId,
        title,
        message,
        type,
        sender_id,
        image_url,
        deep_link,
        data,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      logger.warn(`[NotificationEmitter] Socket emit error for user_${receiverId}:`, err.message);
    }
  }

  // 2. Persist in PostgreSQL and Queue Push Notification asynchronously
  try {
    const dbRes = await pool.query(
      `INSERT INTO notifications (receiver_id, user_id, sender_id, type, category, title, message, image_url, deep_link, data, status)
       VALUES ($1, $1, $2, $3, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING notification_id, created_at`,
      [receiverId, sender_id, type, title, message, image_url, deep_link, JSON.stringify(data)]
    );

    const notificationId = dbRes.rows[0].notification_id;

    // Queue FCM push dispatch
    await enqueueNotification({
      notification_id: notificationId,
      receiver_id: receiverId,
      sender_id,
      type,
      title,
      message,
      image_url,
      deep_link,
      data
    });

    return true;
  } catch (err) {
    logger.error(`[NotificationEmitter] Failed to persist/queue notification for user ${receiverId}:`, err.message);
    return false;
  }
}

module.exports = {
  setNotificationSocket,
  emitNotification,
};
