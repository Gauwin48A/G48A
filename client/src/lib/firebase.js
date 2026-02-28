/**
 * Firebase Configuration for Client-Side
 * 
 * SETUP REQUIRED:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Register your web app in the Firebase console
 * 3. Copy the firebaseConfig object from there and paste below
 * 4. Get the VAPID key from Cloud Messaging settings
 */
import { buildApiPath } from '@/lib/networkConfig';

// TODO: Replace with your Firebase config
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// VAPID key for web push (get from Firebase Console > Cloud Messaging > Web Push certificates)
const VAPID_KEY = "YOUR_VAPID_KEY";

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured() {
    return firebaseConfig.apiKey !== "YOUR_API_KEY";
}

/**
 * Initialize Firebase and get messaging instance
 * Call this after user logs in
 */
export async function initializeFirebase() {
    if (!isFirebaseConfigured()) {
        console.warn('[FCM] Firebase not configured. Push notifications disabled.');
        return null;
    }

    try {
        // Dynamic import to avoid errors if Firebase is not installed
        const { initializeApp } = await import('firebase/app');
        const { getMessaging, getToken, onMessage } = await import('firebase/messaging');

        const app = initializeApp(firebaseConfig);
        const messaging = getMessaging(app);

        return { messaging, getToken, onMessage };
    } catch (error) {
        console.error('[FCM] Failed to initialize Firebase:', error);
        return null;
    }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.warn('[FCM] Notifications not supported in this browser');
        return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        console.warn('[FCM] Notification permission denied');
        return null;
    }

    const firebase = await initializeFirebase();
    if (!firebase) return null;

    try {
        const token = await firebase.getToken(firebase.messaging, {
            vapidKey: VAPID_KEY
        });
        console.log('[FCM] Token obtained:', token);
        return token;
    } catch (error) {
        console.error('[FCM] Failed to get token:', error);
        return null;
    }
}

/**
 * Register token with backend
 */
export async function registerTokenWithBackend(token, userId) {
    try {
        const response = await fetch(buildApiPath('/push/register'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId
            },
            body: JSON.stringify({
                token,
                deviceType: 'web',
                deviceName: navigator.userAgent
            })
        });
        return response.json();
    } catch (error) {
        console.error('[FCM] Failed to register token:', error);
        return { success: false, error };
    }
}

/**
 * Setup foreground message handler
 */
export async function setupForegroundHandler(callback) {
    const firebase = await initializeFirebase();
    if (!firebase) return;

    firebase.onMessage(firebase.messaging, (payload) => {
        console.log('[FCM] Foreground message:', payload);
        callback(payload);
    });
}

export { firebaseConfig, VAPID_KEY };
