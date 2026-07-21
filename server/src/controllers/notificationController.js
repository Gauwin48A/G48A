const pool = require("../config/db");
const logger = require("../utils/logger");
const { enqueueNotification } = require("../services/notificationQueue");

function getAuthUser(req, res) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  const userId = req.user.user_id || req.user.id;
  const requestedUserId = req.query?.userId || req.body?.userId;

  if (requestedUserId && String(requestedUserId) !== String(userId)) {
    res.status(403).json({ error: "Cannot access another user notifications" });
    return null;
  }
  return userId;
}

/**
 * Register or update device token (FCM token)
 */
async function registerFcmToken(req, res) {
  try {
    const userId = getAuthUser(req, res);
    if (!userId) return;

    const { token, device_type = 'android', device_name = null, app_version = null } = req.body;
    if (!token) return res.status(400).json({ error: "FCM token is required" });

    await pool.query(
      `INSERT INTO device_tokens (user_id, token, device_type, device_name, app_version, is_active, last_active_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
       ON CONFLICT (token)
       DO UPDATE SET user_id = EXCLUDED.user_id,
                     device_type = EXCLUDED.device_type,
                     device_name = EXCLUDED.device_name,
                     app_version = EXCLUDED.app_version,
                     is_active = true,
                     last_active_at = NOW(),
                     updated_at = NOW()`,
      [userId, token, device_type, device_name, app_version]
    );

    return res.json({ success: true, message: "FCM token registered successfully" });
  } catch (err) {
    logger.error("[NotificationController] Error registering token:", err);
    return res.status(500).json({ error: "Failed to register FCM token" });
  }
}

/**
 * Unregister device token on logout
 */
async function unregisterFcmToken(req, res) {
  try {
    const userId = getAuthUser(req, res);
    if (!userId) return;

    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });

    await pool.query(
      "UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE token = $1 AND user_id = $2",
      [token, userId]
    );

    return res.json({ success: true, message: "Token unregistered successfully" });
  } catch (err) {
    logger.error("[NotificationController] Error unregistering token:", err);
    return res.status(500).json({ error: "Failed to unregister token" });
  }
}

/**
 * Get notification history for current user
 */
async function getNotifications(req, res) {
  try {
    const userId = getAuthUser(req, res);
    if (!userId) return;

    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "20", 10)));
    const offset = (page - 1) * limit;

    const [listRes, statsRes] = await Promise.all([
      pool.query({
        text: `SELECT notification_id, receiver_id as user_id, sender_id, type, title, message, image_url, deep_link, data, status, read_at, created_at
               FROM notifications
               WHERE receiver_id = $1
               ORDER BY created_at DESC
               LIMIT $2 OFFSET $3`,
        values: [userId, limit, offset]
      }),
      pool.query({
        text: "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE read_at IS NULL) as unread FROM notifications WHERE receiver_id = $1",
        values: [userId]
      })
    ]);

    const stats = statsRes.rows[0] || {};

    return res.json({
      success: true,
      notifications: listRes.rows,
      pagination: {
        page,
        limit,
        total: parseInt(stats.total || stats.count || "0", 10),
        unread_count: parseInt(stats.unread || "0", 10)
      }
    });
  } catch (err) {
    logger.error("[NotificationController] Error fetching notifications:", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(req, res) {
  try {
    const userId = getAuthUser(req, res);
    if (!userId) return;

    const notificationId = req.params.id || req.params.notificationId;

    const result = await pool.query(
      "UPDATE notifications SET read_at = NOW(), updated_at = NOW() WHERE notification_id = $1 AND receiver_id = $2 AND read_at IS NULL RETURNING notification_id",
      [notificationId, userId]
    );

    return res.json({
      success: true,
      updated: result.rowCount > 0
    });
  } catch (err) {
    logger.error("[NotificationController] Error marking notification read:", err);
    return res.status(500).json({ error: "Failed to update notification" });
  }
}

/**
 * Mark all notifications as read for current user
 */
async function markAllAsRead(req, res) {
  try {
    const userId = getAuthUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      "UPDATE notifications SET read_at = NOW(), updated_at = NOW() WHERE receiver_id = $1 AND read_at IS NULL",
      [userId]
    );

    return res.json({
      success: true,
      count: result.rowCount
    });
  } catch (err) {
    logger.error("[NotificationController] Error marking all notifications read:", err);
    return res.status(500).json({ error: "Failed to update notifications" });
  }
}

/**
 * Get user notification preference toggles
 */
async function getPreferences(req, res) {
  try {
    const userId = getAuthUser(req, res);
    if (!userId) return;

    let result = await pool.query(
      "SELECT * FROM notification_preferences WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        preferences: {
          user_id: userId,
          push_enabled: true,
          email_enabled: true,
          sms_enabled: false,
          likes_enabled: true,
          comments_enabled: true,
          follows_enabled: true,
          mentions_enabled: true,
          order_updates_enabled: true,
          marketing_enabled: true,
          security_enabled: true,
          system_enabled: true
        }
      });
    }

    return res.json({ success: true, preferences: result.rows[0] });
  } catch (err) {
    logger.error("[NotificationController] Error fetching preferences:", err);
    return res.status(500).json({ error: "Failed to fetch preferences" });
  }
}

/**
 * Update user notification preference toggles
 */
async function updatePreferences(req, res) {
  try {
    const userId = getAuthUser(req, res);
    if (!userId) return;

    const {
      push_enabled = true,
      email_enabled = true,
      sms_enabled = false,
      likes_enabled = true,
      comments_enabled = true,
      follows_enabled = true,
      mentions_enabled = true,
      order_updates_enabled = true,
      marketing_enabled = true,
      security_enabled = true,
      system_enabled = true
    } = req.body;

    const result = await pool.query(
      `INSERT INTO notification_preferences (
        user_id, push_enabled, email_enabled, sms_enabled, likes_enabled,
        comments_enabled, follows_enabled, mentions_enabled, order_updates_enabled,
        marketing_enabled, security_enabled, system_enabled, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
        push_enabled = EXCLUDED.push_enabled,
        email_enabled = EXCLUDED.email_enabled,
        sms_enabled = EXCLUDED.sms_enabled,
        likes_enabled = EXCLUDED.likes_enabled,
        comments_enabled = EXCLUDED.comments_enabled,
        follows_enabled = EXCLUDED.follows_enabled,
        mentions_enabled = EXCLUDED.mentions_enabled,
        order_updates_enabled = EXCLUDED.order_updates_enabled,
        marketing_enabled = EXCLUDED.marketing_enabled,
        security_enabled = EXCLUDED.security_enabled,
        system_enabled = EXCLUDED.system_enabled,
        updated_at = NOW()
       RETURNING *`,
      [userId, push_enabled, email_enabled, sms_enabled, likes_enabled, comments_enabled, follows_enabled, mentions_enabled, order_updates_enabled, marketing_enabled, security_enabled, system_enabled]
    );

    return res.json({ success: true, preferences: result.rows[0] });
  } catch (err) {
    logger.error("[NotificationController] Error updating preferences:", err);
    return res.status(500).json({ error: "Failed to update preferences" });
  }
}

/**
 * Internal/Admin endpoint to trigger a push notification
 */
async function sendNotification(req, res) {
  try {
    const { receiver_id, sender_id = null, type = 'system', title, message, body, image_url, deep_link, data = {} } = req.body;

    if (!receiver_id) return res.status(400).json({ error: "receiver_id is required" });
    if (!title || (!message && !body)) return res.status(400).json({ error: "title and message are required" });

    const msgContent = message || body;

    const dbRes = await pool.query(
      `INSERT INTO notifications (receiver_id, sender_id, type, title, message, image_url, deep_link, data, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       RETURNING notification_id, created_at`,
      [receiver_id, sender_id, type, title, msgContent, image_url || null, deep_link || null, JSON.stringify(data)]
    );

    const notificationId = dbRes.rows[0].notification_id;

    const queueRes = await enqueueNotification({
      notification_id: notificationId,
      receiver_id,
      sender_id,
      type,
      title,
      message: msgContent,
      image_url,
      deep_link,
      data
    });

    return res.json({
      success: true,
      notification_id: notificationId,
      enqueued: queueRes.success,
      jobId: queueRes.jobId || null
    });
  } catch (err) {
    logger.error("[NotificationController] Error sending notification:", err);
    return res.status(500).json({ error: "Failed to process send notification request" });
  }
}

module.exports = {
  registerFcmToken,
  unregisterFcmToken,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
  sendNotification
};
