const pool = require("../config/db");
const logger = require("../utils/logger");
const { enqueueNotification } = require("../services/notificationQueue");

/**
 * All notification preference keys the web + app clients may toggle.
 * (Union of the 017 web schema keys and the 050 granular-push keys.)
 */
const NOTIFICATION_PREF_KEYS = [
  "push_enabled",
  "email_enabled",
  "sms_enabled",
  "likes_enabled",
  "comments_enabled",
  "follows_enabled",
  "mentions_enabled",
  "order_updates_enabled",
  "marketing_enabled",
  "security_enabled",
  "system_enabled",
  "price_drop_enabled",
  "message_enabled",
];

const DEFAULT_PREFERENCES = {
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
  system_enabled: true,
  price_drop_enabled: true,
  message_enabled: true,
};

/**
 * Self-heal the notification_preferences table so both schema shapes
 * (017 web shape + 050 granular-push shape) coexist, and user_id is unique.
 * Mirrors the ensure*Column helpers used elsewhere in the codebase.
 */
async function ensureNotificationPreferenceSchema() {
  const columnStatements = NOTIFICATION_PREF_KEYS.map(
    (key) => `ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS ${key} BOOLEAN DEFAULT true`
  );
  for (const sql of columnStatements) {
    try {
      await pool.query(sql);
    } catch (err) {
      logger.warn(`[NotificationPrefs] Column ensure failed (${sql.split(" ")[4]}):`, err.message);
    }
  }
  // Ensure user_id is unique so the merge-based upsert is deterministic.
  // Postgres has no ADD CONSTRAINT IF NOT EXISTS, so we probe information_schema
  // first and only attempt the constraint when no unique index/constraint exists.
  try {
    const uniqCheck = await pool.query(
      `SELECT 1 FROM pg_indexes WHERE tablename = 'notification_preferences' AND indexdef ILIKE '%UNIQUE%' LIMIT 1`
    );
    if (uniqCheck.rows.length === 0) {
      try {
        await pool.query(
          `ALTER TABLE notification_preferences ADD CONSTRAINT notification_preferences_user_id_key UNIQUE (user_id)`
        );
        logger.info("[NotificationPrefs] Added UNIQUE(user_id) constraint");
      } catch (err) {
        // Likely duplicate rows from a legacy category-based schema.
        logger.warn("[NotificationPrefs] UNIQUE(user_id) add failed — duplicate rows may exist:", err.message);
      }
    }
  } catch (err) {
    logger.warn("[NotificationPrefs] Unique-index probe failed:", err.message);
  }
}

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

    // Schema: device_tokens(user_id, fcm_token, platform, is_active, ...)
    await pool.query(
      `INSERT INTO device_tokens (user_id, fcm_token, platform, is_active, updated_at)
       VALUES ($1, $2, $3, true, NOW())
       ON CONFLICT (fcm_token)
       DO UPDATE SET user_id = EXCLUDED.user_id,
                     platform = EXCLUDED.platform,
                     is_active = true,
                     updated_at = NOW()`,
      [userId, token, device_type]
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
      "UPDATE device_tokens SET is_active = false, updated_at = NOW() WHERE fcm_token = $1 AND user_id = $2",
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

    await ensureNotificationPreferenceSchema();

    let result = await pool.query(
      "SELECT * FROM notification_preferences WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        preferences: { user_id: userId, ...DEFAULT_PREFERENCES }
      });
    }

    // Merge stored row with defaults so every key the client toggles is present.
    const preferences = { ...DEFAULT_PREFERENCES, ...result.rows[0] };
    return res.json({ success: true, preferences });
  } catch (err) {
    logger.error("[NotificationController] Error fetching preferences:", err);
    return res.status(500).json({ error: "Failed to fetch preferences" });
  }
}

/**
 * Update user notification preference toggles
 *
 * Merge-based: only the keys the client sends are changed; every other toggle
 * keeps its current stored value (or its default). This prevents toggling one
 * switch from silently resetting the rest to true.
 */
async function updatePreferences(req, res) {
  try {
    const userId = getAuthUser(req, res);
    if (!userId) return;

    await ensureNotificationPreferenceSchema();

    const body = req.body || {};
    const incoming = {};
    for (const key of NOTIFICATION_PREF_KEYS) {
      if (typeof body[key] === "boolean") {
        incoming[key] = body[key];
      }
    }

    // Load current stored preferences (fall back to defaults when absent).
    const currentRes = await pool.query(
      "SELECT * FROM notification_preferences WHERE user_id = $1 LIMIT 1",
      [userId]
    );
    const merged = {
      ...DEFAULT_PREFERENCES,
      ...(currentRes.rows[0] || {}),
      ...incoming,
    };

    // Build parameterized upsert over the full key set.
    const keys = NOTIFICATION_PREF_KEYS;
    const values = keys.map((key) => merged[key]);
    const insertCols = ["user_id", ...keys].join(", ");
    const insertPlaceholders = ["$1", ...keys.map((_, i) => `$${i + 2}`)].join(", ");
    const updateSet = keys
      .map((key, i) => `${key} = EXCLUDED.${key}`)
      .concat("updated_at = NOW()")
      .join(", ");

    const result = await pool.query(
      `INSERT INTO notification_preferences (${insertCols})
       VALUES (${insertPlaceholders})
       ON CONFLICT (user_id)
       DO UPDATE SET ${updateSet}
       RETURNING *`,
      [userId, ...values]
    );

    const preferences = { user_id: userId, ...(result.rows[0] || merged) };
    return res.json({ success: true, preferences });
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
      `INSERT INTO notifications (receiver_id, user_id, sender_id, type, category, title, message, image_url, deep_link, data, status)
       VALUES ($1, $1, $2, $3, $3, $4, $5, $6, $7, $8, 'pending')
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
