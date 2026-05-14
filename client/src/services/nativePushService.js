/**
 * Native Push Notification Service for Android/iOS
 *
 * Uses @capacitor/push-notifications for FCM on Android.
 * Falls back to web VAPID push on browser.
 */
import { Capacitor } from "@capacitor/core";
import { buildApiPath } from "@/lib/networkConfig";

let PushNotifications = null;

const DEBUG = import.meta.env.DEV;
const log = (...args) => { if (DEBUG) console.log("[NativePush]", ...args); };
const logError = (...args) => { if (DEBUG) console.error("[NativePush]", ...args); };

/**
 * Dynamically import push-notifications plugin (avoids crash on web)
 */
async function loadPlugin() {
  if (PushNotifications) return PushNotifications;
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const mod = await import("@capacitor/push-notifications");
    PushNotifications = mod.PushNotifications;
    return PushNotifications;
  } catch (err) {
    logError("Failed to load push plugin:", err);
    return null;
  }
}

/**
 * Check if native push is available (Android/iOS only)
 */
export function isNativePushAvailable() {
  return Capacitor.isNativePlatform();
}

/**
 * Request permission and register for push notifications.
 * @returns {Promise<string|null>} FCM token or null
 */
export async function registerNativePush() {
  const plugin = await loadPlugin();
  if (!plugin) return null;

  try {
    const permResult = await plugin.requestPermissions();
    if (permResult.receive !== "granted") {
      log("Push permission denied");
      return null;
    }

    await plugin.register();
    log("Push registration initiated");
    return new Promise((resolve) => {
      plugin.addListener("registration", (token) => {
        log("FCM Token received:", token.value);
        resolve(token.value);
      });

      plugin.addListener("registrationError", (err) => {
        logError("Registration failed:", err);
        resolve(null);
      });
    });
  } catch (err) {
    logError("registerNativePush error:", err);
    return null;
  }
}

/**
 * Register FCM token with MHub backend.
 * @param {string} token - FCM token
 * @param {string} userId - Current user ID
 */
export async function registerNativeTokenWithBackend(token, userId) {
  if (!token || !userId) return { success: false };

  try {
    const response = await fetch(buildApiPath("/push/register"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      credentials: "include",
      body: JSON.stringify({
        token,
        deviceType: Capacitor.getPlatform(),
        deviceName: `MHub ${Capacitor.getPlatform()} App`,
      }),
    });
    return response.json();
  } catch (err) {
    logError("Backend registration failed:", err);
    return { success: false, error: err };
  }
}

/**
 * Listen for incoming push notifications (foreground).
 * @param {Function} onNotification - callback({title, body, data})
 * @returns {Function} cleanup function
 */
export async function setupNativePushListeners(onNotification) {
  const plugin = await loadPlugin();
  if (!plugin) return () => {};

  const receivedListener = await plugin.addListener(
    "pushNotificationReceived",
    (notification) => {
      log("Foreground notification:", notification);
      onNotification?.({
        title: notification.title || "",
        body: notification.body || "",
        data: notification.data || {},
      });
    }
  );

  const actionListener = await plugin.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      log("Notification action:", action);
      const data = action.notification?.data || {};
      // Return deep link data for routing
      onNotification?.({
        title: action.notification?.title || "",
        body: action.notification?.body || "",
        data,
        actionPerformed: true,
      });
    }
  );

  return () => {
    receivedListener.remove();
    actionListener.remove();
  };
}

/**
 * Get current delivery status of notifications.
 */
export async function getDeliveredNotifications() {
  const plugin = await loadPlugin();
  if (!plugin) return [];

  try {
    const result = await plugin.getDeliveredNotifications();
    return result.notifications || [];
  } catch {
    return [];
  }
}

/**
 * Remove all delivered notifications from tray.
 */
export async function removeAllDeliveredNotifications() {
  const plugin = await loadPlugin();
  if (!plugin) return;

  try {
    await plugin.removeAllDeliveredNotifications();
  } catch (err) {
    logError("Failed to remove notifications:", err);
  }
}
