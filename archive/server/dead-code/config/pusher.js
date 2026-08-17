// =============================================================================
// Pusher Realtime Configuration
// =============================================================================

const Pusher = require("pusher");
require("dotenv").config();

// =============================================================================
// Initialisation
// =============================================================================

const isPusherConfigured = !!(
  process.env.PUSHER_APP_ID &&
  process.env.PUSHER_KEY &&
  process.env.PUSHER_SECRET &&
  process.env.PUSHER_CLUSTER
);

let pusher = null;

if (isPusherConfigured) {
  pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
  });
  console.log("📡 Pusher: Realtime enabled");
} else {
  console.log("⚠️ Pusher: Not configured (will use Socket.io fallback)");
}

// =============================================================================
// Event Helpers
// =============================================================================

/**
 * Triggers a Pusher event on a given channel.
 * Returns null when Pusher is not configured, true on success, false on failure.
 *
 * @param {string} channel - Pusher channel name.
 * @param {string} event - Event name.
 * @param {*} data - Payload to send.
 * @returns {Promise<boolean|null>}
 */
const triggerEvent = async (channel, event, data) => {
  if (!pusher) {
    console.log("[Pusher] Not configured, skipping event");
    return null;
  }
  try {
    await pusher.trigger(channel, event, data);
    console.log(`[Pusher] Triggered ${event} on ${channel}`);
    return true;
  } catch (error) {
    console.error("[Pusher] Trigger failed:", error);
    return false;
  }
};

/**
 * Sends a chat message event to the appropriate chat room channel.
 * @param {string|number} chatId - Chat room identifier.
 * @param {Object} message - Message object with message_id, content, sender_id, created_at.
 * @returns {Promise<boolean|null>}
 */
const sendChatMessage = async (chatId, message) =>
  triggerEvent(`chat-room-${chatId}`, "new-message", {
    id: message.message_id,
    content: message.content,
    senderId: message.sender_id,
    createdAt: message.created_at,
  });

/**
 * Sends a notification event to a user's personal channel.
 * @param {string|number} userId - Target user identifier.
 * @param {Object} notification - Notification payload.
 * @returns {Promise<boolean|null>}
 */
const sendNotification = async (userId, notification) =>
  triggerEvent(`user-${userId}`, "notification", notification);

/**
 * Returns the Pusher client credentials needed by the frontend.
 * @returns {{ key: string|undefined, cluster: string|undefined }}
 */
const getClientCredentials = () => ({
  key: process.env.PUSHER_KEY,
  cluster: process.env.PUSHER_CLUSTER,
});

// =============================================================================
// Module Exports
// =============================================================================

module.exports = {
  pusher: pusher,
  isPusherConfigured: isPusherConfigured,
  triggerEvent: triggerEvent,
  sendChatMessage: sendChatMessage,
  sendNotification: sendNotification,
  getClientCredentials: getClientCredentials,
};
