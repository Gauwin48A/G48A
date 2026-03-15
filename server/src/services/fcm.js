const pool = require("../config/db");
const logger = require("../utils/logger");

let webpush;
try {
  webpush = require("web-push");
} catch {
  webpush = null;
}

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@mhub.com";

if (webpush && VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  logger.info("[Push] Web Push configured with VAPID keys");
} else {
  logger.warn("[Push] web-push not configured — install web-push and set VAPID env vars to enable sending");
}

async function sendNotification(subscriptionJSON, title, body, data = {}) {
  if (!webpush || !VAPID_PUBLIC || !VAPID_PRIVATE) {
    logger.warn("[Push] Cannot send — web-push not configured");
    return { success: false, reason: "not_configured" };
  }

  let subscription;
  try {
    subscription = typeof subscriptionJSON === "string" ? JSON.parse(subscriptionJSON) : subscriptionJSON;
  } catch {
    return { success: false, reason: "invalid_subscription" };
  }

  const payload = JSON.stringify({
    notification: { title, body },
    data,
    timestamp: Date.now(),
  });

  try {
    await webpush.sendNotification(subscription, payload);
    return { success: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — deactivate
      try {
        await pool.query(
          "UPDATE device_tokens SET is_active = false WHERE token = $1",
          [typeof subscriptionJSON === "string" ? subscriptionJSON : JSON.stringify(subscriptionJSON)]
        );
      } catch {}
    }
    logger.error("[Push] Send failed:", err.message);
    return { success: false, error: err.message };
  }
}

async function sendToMultiple(tokens, title, body, data = {}) {
  const results = await Promise.allSettled(
    tokens.map((token) => sendNotification(token, title, body, data))
  );
  const successCount = results.filter(
    (r) => r.status === "fulfilled" && r.value?.success
  ).length;
  return { success: true, successCount, totalCount: tokens.length };
}

async function sendToUser(userId, title, body, data = {}) {
  try {
    const result = await pool.query(
      "SELECT token FROM device_tokens WHERE user_id = $1 AND is_active = true",
      [userId]
    );
    if (result.rows.length === 0) {
      return { success: false, reason: "No active devices" };
    }
    const tokens = result.rows.map((row) => row.token);
    return await sendToMultiple(tokens, title, body, data);
  } catch (error) {
    logger.error("[Push] Error sending to user:", error);
    throw error;
  }
}

async function registerToken(userId, token, deviceType = "web", deviceName = null) {
  try {
    await pool.query(
      `INSERT INTO device_tokens (user_id, token, device_type, device_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token)
       DO UPDATE SET user_id = $1, device_type = $3, device_name = $4, is_active = true, updated_at = NOW()`,
      [userId, token, deviceType, deviceName]
    );
    return { success: true };
  } catch (error) {
    logger.error("[Push] Error registering token:", error);
    throw error;
  }
}

async function unregisterToken(token, userId = null) {
  try {
    let result;
    if (userId === null || userId === undefined || String(userId).trim() === "") {
      result = await pool.query(
        "UPDATE device_tokens SET is_active = false WHERE token = $1",
        [token]
      );
    } else {
      result = await pool.query(
        "UPDATE device_tokens SET is_active = false WHERE token = $1 AND user_id::text = $2",
        [token, String(userId)]
      );
    }
    return { success: true, deactivatedCount: result.rowCount || 0 };
  } catch (error) {
    logger.error("[Push] Error unregistering token:", error);
    throw error;
  }
}

module.exports = {
  sendNotification,
  sendToMultiple,
  sendToUser,
  registerToken,
  unregisterToken,
};