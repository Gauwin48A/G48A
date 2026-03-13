/**
 * Firebase Configuration for Client-Side
 * 
 * SETUP REQUIRED:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Register your web app in the Firebase console
 * 3. Set VITE_FIREBASE_* env vars in .env (see .env.example)
 * 4. Set VITE_VAPID_PUBLIC_KEY from Cloud Messaging settings
 */
import { buildApiPath } from '@/lib/networkConfig';
import { reportRuntimeError } from '@/lib/errorReporting';

const env = import.meta.env || {};
const PLACEHOLDER_MARKERS = [
    "YOUR_API_KEY",
    "YOUR_PROJECT_ID",
    "YOUR_SENDER_ID",
    "YOUR_APP_ID",
    "YOUR_VAPID_KEY",
];

const isPlaceholder = (value) => {
    if (!value) return true;
    return PLACEHOLDER_MARKERS.some((marker) => value.includes(marker));
};

// Firebase config is sourced from env to avoid hardcoding.
const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
    appId: env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

// VAPID key for web push (get from Firebase Console > Cloud Messaging > Web Push certificates)
const VAPID_KEY = env.VITE_VAPID_PUBLIC_KEY || "YOUR_VAPID_KEY";

let cachedFirebase = null;
let initPromise = null;
let warnedConfig = false;
let reportedInitFailure = false;

const REQUIRED_FIELDS = [
    { key: "VITE_FIREBASE_API_KEY", value: firebaseConfig.apiKey },
    { key: "VITE_FIREBASE_AUTH_DOMAIN", value: firebaseConfig.authDomain },
    { key: "VITE_FIREBASE_PROJECT_ID", value: firebaseConfig.projectId },
    { key: "VITE_FIREBASE_STORAGE_BUCKET", value: firebaseConfig.storageBucket },
    { key: "VITE_FIREBASE_MESSAGING_SENDER_ID", value: firebaseConfig.messagingSenderId },
    { key: "VITE_FIREBASE_APP_ID", value: firebaseConfig.appId },
    { key: "VITE_VAPID_PUBLIC_KEY", value: VAPID_KEY },
];

export function getFirebaseConfigDiagnostics() {
    const missingKeys = REQUIRED_FIELDS.filter((field) => isPlaceholder(field.value))
        .map((field) => field.key);
    return {
        configured: missingKeys.length === 0,
        missingKeys,
    };
}

export function warnIfFirebaseMisconfigured() {
    if (warnedConfig) return;
    const diagnostics = getFirebaseConfigDiagnostics();
    if (diagnostics.configured) return;
    warnedConfig = true;
    const message = `[FCM] Firebase env missing or placeholder: ${diagnostics.missingKeys.join(', ')}`;
    console.warn(message);
    try {
        reportRuntimeError(new Error(message), 'firebase-config');
    } catch {
        // ignore reporting failures
    }
}

/**
 * Check if Firebase is configured
 */
export function isFirebaseConfigured() {
    return getFirebaseConfigDiagnostics().configured;
}

/**
 * Initialize Firebase and get messaging instance
 * Call this after user logs in
 */
export async function initializeFirebase() {
    if (cachedFirebase) return cachedFirebase;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        if (typeof window === "undefined") {
            return null;
        }

        if (!isFirebaseConfigured()) {
            warnIfFirebaseMisconfigured();
            console.warn('[FCM] Firebase not configured. Push notifications disabled.');
            return null;
        }

        try {
            // Dynamic import to avoid errors if Firebase is not installed
            const { initializeApp, getApps, getApp } = await import('firebase/app');
            const { getMessaging, getToken, onMessage, isSupported } = await import('firebase/messaging');

            const supported = await isSupported();
            if (!supported) {
                console.warn('[FCM] Messaging not supported in this browser/environment.');
                return null;
            }

            const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
            const messaging = getMessaging(app);

            return { messaging, getToken, onMessage };
        } catch (error) {
            const message = String(error?.message || error);
            if (message.includes('firebase/app') || message.includes('Failed to resolve import')) {
                console.error('[FCM] Firebase package not installed. Run npm install in client.');
            }
            console.error('[FCM] Failed to initialize Firebase:', error);
            if (!reportedInitFailure) {
                reportedInitFailure = true;
                try {
                    reportRuntimeError(error, 'firebase-init');
                } catch {
                    // ignore reporting failures
                }
            }
            return null;
        }
    })();

    try {
        cachedFirebase = await initPromise;
        return cachedFirebase;
    } finally {
        initPromise = null;
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

    if (isPlaceholder(VAPID_KEY)) {
        warnIfFirebaseMisconfigured();
        console.warn('[FCM] VAPID key missing. Push notifications disabled.');
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
        let serviceWorkerRegistration = null;
        if ('serviceWorker' in navigator) {
            try {
                serviceWorkerRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            } catch (error) {
                console.warn('[FCM] Failed to register service worker:', error);
            }
        }

        const token = await firebase.getToken(firebase.messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: serviceWorkerRegistration || undefined,
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
