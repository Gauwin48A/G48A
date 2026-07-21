const admin = require("firebase-admin");
const logger = require("../utils/logger");

let fcmInitialized = false;

function initFcmAdmin() {
  if (fcmInitialized || admin.apps.length > 0) {
    fcmInitialized = true;
    return true;
  }

  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      fcmInitialized = true;
      logger.info("[FCM] Admin SDK initialized from service account file");
      return true;
    } else if (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FCM_PROJECT_ID,
          clientEmail: process.env.FCM_CLIENT_EMAIL,
          privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, "\n")
        })
      });
      fcmInitialized = true;
      logger.info("[FCM] Admin SDK initialized from env variables");
      return true;
    } else {
      logger.warn("[FCM] Admin SDK not configured (Missing FIREBASE_SERVICE_ACCOUNT_PATH or FCM credentials)");
      return false;
    }
  } catch (err) {
    logger.error("[FCM] Admin SDK initialization failed:", err.message);
    return false;
  }
}

const ANDROID_CHANNELS = {
  chat: 'chat_messages',
  transaction: 'transactions',
  promotion: 'promotions',
  reward: 'rewards',
  system: 'system',
  default: 'general'
};

function resolveAndroidChannel(type) {
  const norm = String(type || '').toLowerCase();
  if (norm.includes('chat') || norm.includes('message')) return ANDROID_CHANNELS.chat;
  if (norm.includes('transaction') || norm.includes('order') || norm.includes('payment')) return ANDROID_CHANNELS.transaction;
  if (norm.includes('promo') || norm.includes('deal') || norm.includes('marketing')) return ANDROID_CHANNELS.promotion;
  if (norm.includes('reward') || norm.includes('coin') || norm.includes('streak')) return ANDROID_CHANNELS.reward;
  if (norm.includes('system') || norm.includes('security') || norm.includes('alert')) return ANDROID_CHANNELS.system;
  return ANDROID_CHANNELS.default;
}

/**
 * Send FCM message to a single device token or topic.
 */
async function sendFcmMessage(token, payload) {
  if (!initFcmAdmin()) {
    logger.warn("[FCM] Skipping push dispatch — FCM Admin SDK is not configured");
    return { success: false, reason: "fcm_not_configured" };
  }

  const channelId = resolveAndroidChannel(payload.type);

  const message = {
    token: token,
    notification: {
      title: payload.title || "New Notification",
      body: payload.message || payload.body || "",
      imageUrl: payload.image_url || payload.image || undefined
    },
    android: {
      priority: 'high',
      notification: {
        channelId: channelId,
        sound: 'default',
        imageUrl: payload.image_url || payload.image || undefined,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK'
      }
    },
    data: {
      notification_id: String(payload.notification_id || ''),
      type: String(payload.type || 'system'),
      title: String(payload.title || ''),
      message: String(payload.message || payload.body || ''),
      deep_link: String(payload.deep_link || ''),
      image_url: String(payload.image_url || payload.image || ''),
      android_channel_id: channelId,
      ...(payload.data ? Object.fromEntries(
        Object.entries(payload.data).map(([k, v]) => [k, String(typeof v === 'object' ? JSON.stringify(v) : v)])
      ) : {})
    }
  };

  try {
    const response = await admin.messaging().send(message);
    logger.info(`[FCM] Successfully sent push notification (MessageId: ${response})`);
    return { success: true, messageId: response };
  } catch (err) {
    logger.error(`[FCM] Failed to send push message to token ${token}:`, err.message);
    const isUnregistered = err.code === 'messaging/registration-token-not-registered' || err.code === 'messaging/invalid-registration-token';
    return { success: false, error: err.message, code: err.code, isUnregistered };
  }
}

/**
 * Send multicast FCM message to multiple device tokens.
 */
async function sendFcmMulticast(tokens, payload) {
  if (!tokens || tokens.length === 0) return { success: true, successCount: 0 };
  
  const results = await Promise.allSettled(
    tokens.map((token) => sendFcmMessage(token, payload))
  );

  const successCount = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
  const invalidTokens = results
    .filter(r => r.status === 'fulfilled' && r.value?.isUnregistered)
    .map((r, i) => tokens[i]);

  return {
    success: true,
    successCount,
    totalCount: tokens.length,
    invalidTokens
  };
}

module.exports = {
  initFcmAdmin,
  resolveAndroidChannel,
  sendFcmMessage,
  sendFcmMulticast
};
