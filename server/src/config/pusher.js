/**
 * Pusher Configuration
 * Protocol: Ironclad - The Pulse (Realtime)
 * 
 * Enables realtime chat without maintaining fragile WebSocket servers
 */

const Pusher = require('pusher');
require('dotenv').config();

// Check if Pusher is configured
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
        useTLS: true
    });
    console.log('📡 Pusher: Realtime enabled');
} else {
    console.log('⚠️ Pusher: Not configured (will use Socket.io fallback)');
}

/**
 * Trigger a Pusher event
 * @param {string} channel - Channel name (e.g., 'chat-room-123')
 * @param {string} event - Event name (e.g., 'new-message')
 * @param {object} data - Data to send
 */
const triggerEvent = async (channel, event, data) => {
    if (!pusher) {
        console.log('[Pusher] Not configured, skipping event');
        return null;
    }

    try {
        await pusher.trigger(channel, event, data);
        console.log(`[Pusher] Triggered ${event} on ${channel}`);
        return true;
    } catch (error) {
        console.error('[Pusher] Trigger failed:', error);
        return false;
    }
};

/**
 * Send a chat message via Pusher
 * @param {number} chatId - The chat room ID
 * @param {object} message - Message data
 */
const sendChatMessage = async (chatId, message) => {
    return triggerEvent(`chat-room-${chatId}`, 'new-message', {
        id: message.message_id,
        content: message.content,
        senderId: message.sender_id,
        createdAt: message.created_at
    });
};

/**
 * Send a notification via Pusher
 * @param {number} userId - The user ID to notify
 * @param {object} notification - Notification data
 */
const sendNotification = async (userId, notification) => {
    return triggerEvent(`user-${userId}`, 'notification', notification);
};

/**
 * Get Pusher client credentials for frontend
 */
const getClientCredentials = () => {
    return {
        key: process.env.PUSHER_KEY,
        cluster: process.env.PUSHER_CLUSTER
    };
};

module.exports = {
    pusher,
    isPusherConfigured,
    triggerEvent,
    sendChatMessage,
    sendNotification,
    getClientCredentials
};
