/**
 * Firebase Cloud Messaging Service
 * 
 * This file handles sending push notifications via FCM.
 * 
 * SETUP REQUIRED:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Go to Project Settings > Service Accounts > Generate new private key
 * 3. Save the JSON file as 'firebase-service-account.json' in server/config/
 * 4. Add GOOGLE_APPLICATION_CREDENTIALS to your .env
 */

// Uncomment after adding firebase-admin: npm install firebase-admin
// const admin = require('firebase-admin');

// Initialize Firebase Admin (uncomment after setup)
// const serviceAccount = require('../config/firebase-service-account.json');
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount)
// });

const pool = require('../config/db');

/**
 * Send notification to a single device
 * @param {string} token - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
async function sendNotification(token, title, body, data = {}) {
    // TODO: Uncomment after Firebase setup
    // const message = {
    //   notification: { title, body },
    //   data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    //   token
    // };
    // 
    // try {
    //   const response = await admin.messaging().send(message);
    //   console.log('Successfully sent notification:', response);
    //   return { success: true, messageId: response };
    // } catch (error) {
    //   console.error('Error sending notification:', error);
    //   throw error;
    // }

    console.log(`[FCM Placeholder] Would send to ${token}: ${title} - ${body}`);
    return { success: true, placeholder: true };
}

/**
 * Send notification to multiple devices
 * @param {string[]} tokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
async function sendToMultiple(tokens, title, body, data = {}) {
    // TODO: Uncomment after Firebase setup
    // const message = {
    //   notification: { title, body },
    //   data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    //   tokens
    // };
    // 
    // try {
    //   const response = await admin.messaging().sendEachForMulticast(message);
    //   console.log('Successfully sent notifications:', response.successCount);
    //   return response;
    // } catch (error) {
    //   console.error('Error sending notifications:', error);
    //   throw error;
    // }

    console.log(`[FCM Placeholder] Would send to ${tokens.length} devices: ${title} - ${body}`);
    return { success: true, successCount: tokens.length, placeholder: true };
}

/**
 * Send notification to all devices of a user
 * @param {number} userId - User ID
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data payload
 */
async function sendToUser(userId, title, body, data = {}) {
    try {
        const result = await pool.query(
            'SELECT token FROM device_tokens WHERE user_id = $1 AND is_active = true',
            [userId]
        );

        if (result.rows.length === 0) {
            console.log(`No active devices for user ${userId}`);
            return { success: false, reason: 'No active devices' };
        }

        const tokens = result.rows.map(row => row.token);
        return await sendToMultiple(tokens, title, body, data);
    } catch (error) {
        console.error('Error sending to user:', error);
        throw error;
    }
}

/**
 * Register a device token for a user
 */
async function registerToken(userId, token, deviceType = 'web', deviceName = null) {
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
        console.error('Error registering token:', error);
        throw error;
    }
}

/**
 * Unregister a device token (on logout)
 */
async function unregisterToken(token) {
    try {
        await pool.query(
            'UPDATE device_tokens SET is_active = false WHERE token = $1',
            [token]
        );
        return { success: true };
    } catch (error) {
        console.error('Error unregistering token:', error);
        throw error;
    }
}

module.exports = {
    sendNotification,
    sendToMultiple,
    sendToUser,
    registerToken,
    unregisterToken
};
