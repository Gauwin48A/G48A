const express = require("express");
const admin = require("../config/firebase");
const router = express.Router();
const fcm = require("../services/fcm");
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { protect } = require("../middleware/auth");

/**
 * Check whether a role string represents an admin-level role.
 */
function isAdminRole(role) {
  const normalized = String(role || "").trim().toLowerCase();
  return normalized === "admin" || normalized === "superadmin";
}

/**
 * Determine if the current request has admin access (by token role or DB lookup).
 */
async function hasAdminAccess(req) {
  if (isAdminRole(req.user?.role)) {
    return true;
  }

  const userId = getAuthUserId(req);
  if (!userId) return false;

  try {
    const result = await runQuery(
      `
        SELECT COALESCE(NULLIF(to_jsonb(u)->>'role', ''), 'user') AS role
        FROM users u
        WHERE u.user_id::text = $1
        LIMIT 1
      `,
      [userId]
    );
    return isAdminRole(result.rows[0]?.role);
  } catch (error) {
    logger.warn("[Push] Admin access check failed", { message: error.message });
    return false;
  }
}

/** @route POST /register - Register a device token for push notifications */
router.post("/register", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { token, deviceType = "web", deviceName } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    if (!userId) {
      return res.status(401).json({ error: "User ID is required" });
    }

    await fcm.registerToken(userId, token, deviceType, deviceName);
    res.json({ success: true, message: "Device registered for push notifications" });
  } catch (error) {
    logger.error("Error registering device:", error);
    res.status(500).json({ error: "Failed to register device" });
  }
});

/** @route DELETE /unregister - Unregister a device token */
router.delete("/unregister", protect, async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await fcm.unregisterToken(token, userId);
    if ((result?.deactivatedCount || 0) === 0) {
      return res.status(404).json({ error: "Token not found for user" });
    }

    res.json({ success: true, message: "Device unregistered" });
  } catch (error) {
    logger.error("Error unregistering device:", error);
    res.status(500).json({ error: "Failed to unregister device" });
  }
});

/** @route POST /send - Send a push notification to a specific user (admin only) */
router.post("/send", protect, async (req, res) => {
  try {
    const canSend = await hasAdminAccess(req);
    if (!canSend) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { userId, title, body, data } = req.body;
    if (!userId || !title || !body) {
      return res.status(400).json({ error: "userId, title, and body are required" });
    }

    const result = await fcm.sendToUser(userId, title, body, data || {});
    res.json(result);
  } catch (error) {
    logger.error("Error sending notification:", error);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

/** @route POST /broadcast - Broadcast a push notification to all active devices (admin only) */
router.post("/broadcast", protect, async (req, res) => {
  try {
    const canBroadcast = await hasAdminAccess(req);
    if (!canBroadcast) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { title, body, data } = req.body;
    if (!title || !body) {
      return res.status(400).json({ error: "title and body are required" });
    }

    const result = await runQuery(
      "SELECT fcm_token AS token, COALESCE(platform, 'android') AS platform FROM device_tokens WHERE is_active = true"
    );
    if (result.rows.length === 0) {
      return res.json({ success: false, reason: "No registered devices" });
    }

    // Android FCM tokens via Firebase Admin SDK, web subscriptions via VAPID web-push.
    const androidTokens = result.rows.filter(r => r.platform !== "web").map(r => r.token);
    const webTokens = result.rows.filter(r => r.platform === "web").map(r => r.token);

    let androidResult = { successCount: 0 };
    if (androidTokens.length) {
      const { sendFcmMulticast } = require("../services/fcmAdminService");
      androidResult = await sendFcmMulticast(androidTokens, {
        notification_id: data?.notification_id || "",
        type: data?.type || "system",
        title,
        message: body,
        image_url: data?.image_url || "",
        deep_link: data?.deep_link || "",
        data: data || {}
      });
    }
    const webResult = webTokens.length
      ? await fcm.sendToMultiple(webTokens, title, body, data || {})
      : { successCount: 0 };

    const sendResult = {
      success: true,
      totalCount: result.rows.length,
      successCount: (androidResult.successCount || 0) + (webResult.successCount || 0)
    };
    res.json(sendResult);
  } catch (error) {
    logger.error("Error broadcasting notification:", error);
    res.status(500).json({ error: "Failed to broadcast notification" });
  }
});

module.exports = router;
