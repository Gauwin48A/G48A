/**
 * Push Notification Service  
 * Web Push API + FCM support for real-time alerts
 */
const webpush = require('web-push');

// Configure VAPID keys (generate once, store in env)
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@mhub.com';

// Only configure if keys exist
if (VAPID_PUBLIC && VAPID_PRIVATE) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
    console.log('[DEFENDER] 📱 Web Push configured');
}

// In-memory subscription store (use DB in production)
const subscriptions = new Map();

/**
 * Store push subscription for a user
 * @param {number} userId - User ID
 * @param {object} subscription - PushSubscription object
 */
const saveSubscription = (userId, subscription) => {
    subscriptions.set(userId, subscription);
    console.log(`[PUSH] Subscription saved for user ${userId}`);
};

/**
 * Remove subscription
 */
const removeSubscription = (userId) => {
    subscriptions.delete(userId);
};

/**
 * Send push notification to a user
 * @param {number} userId - Target user
 * @param {object} payload - { title, body, icon, badge, data }
 */
const sendPush = async (userId, payload) => {
    const subscription = subscriptions.get(userId);

    if (!subscription) {
        console.log(`[PUSH] No subscription for user ${userId}`);
        return { success: false, reason: 'no_subscription' };
    }

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
        console.log('[PUSH] VAPID keys not configured');
        return { success: false, reason: 'not_configured' };
    }

    try {
        const notificationPayload = JSON.stringify({
            title: payload.title || 'MHub',
            body: payload.body || 'You have a new notification',
            icon: payload.icon || '/icon-192.png',
            badge: payload.badge || '/badge-72.png',
            data: payload.data || {},
            timestamp: Date.now()
        });

        await webpush.sendNotification(subscription, notificationPayload);
        console.log(`[PUSH] ✅ Sent to user ${userId}: ${payload.title}`);
        return { success: true };
    } catch (err) {
        console.error(`[PUSH] ❌ Failed for user ${userId}:`, err.message);

        // Remove invalid subscriptions
        if (err.statusCode === 410 || err.statusCode === 404) {
            removeSubscription(userId);
        }

        return { success: false, error: err.message };
    }
};

/**
 * Send push to multiple users
 */
const sendBulkPush = async (userIds, payload) => {
    const results = await Promise.all(
        userIds.map(id => sendPush(id, payload))
    );
    return results;
};

/**
 * Notification Types
 */
const NotifyTypes = {
    NEW_MESSAGE: 'new_message',
    OFFER_RECEIVED: 'offer_received',
    OFFER_ACCEPTED: 'offer_accepted',
    PRICE_DROP: 'price_drop',
    ITEM_SOLD: 'item_sold',
    WATCHLIST_UPDATE: 'watchlist_update'
};

/**
 * Pre-built notification templates
 */
const notifyNewMessage = (userId, senderName, preview) => {
    return sendPush(userId, {
        title: `Message from ${senderName}`,
        body: preview.substring(0, 100),
        data: { type: NotifyTypes.NEW_MESSAGE }
    });
};

const notifyOfferReceived = (userId, itemTitle, offerAmount) => {
    return sendPush(userId, {
        title: 'New Offer Received! 💰',
        body: `₹${offerAmount} for ${itemTitle}`,
        data: { type: NotifyTypes.OFFER_RECEIVED }
    });
};

const notifyPriceDrop = (userId, itemTitle, oldPrice, newPrice) => {
    return sendPush(userId, {
        title: 'Price Drop Alert! 📉',
        body: `${itemTitle} dropped from ₹${oldPrice} to ₹${newPrice}`,
        data: { type: NotifyTypes.PRICE_DROP }
    });
};

module.exports = {
    saveSubscription,
    removeSubscription,
    sendPush,
    sendBulkPush,
    NotifyTypes,
    notifyNewMessage,
    notifyOfferReceived,
    notifyPriceDrop
};
