/**
 * Firebase Messaging Service Worker
 * 
 * This file handles background push notifications.
 * It MUST be in the public folder and named exactly: firebase-messaging-sw.js
 * 
 * SETUP: Replace the firebaseConfig with your actual Firebase config
 */

// TODO: Replace with your Firebase config (same as in firebase.js)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Check if configured
if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    console.log('[FCM SW] Firebase not configured - push notifications disabled');
} else {
    // Import Firebase scripts (these are loaded from CDN in service worker context)
    importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    // Handle background messages
    messaging.onBackgroundMessage((payload) => {
        console.log('[FCM SW] Background message received:', payload);

        const notificationTitle = payload.notification?.title || 'Mhub Notification';
        const notificationOptions = {
            body: payload.notification?.body || 'You have a new notification',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: payload.data?.tag || 'mhub-notification',
            data: payload.data,
            actions: [
                { action: 'open', title: 'Open' },
                { action: 'dismiss', title: 'Dismiss' }
            ]
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });

    // Handle notification click
    self.addEventListener('notificationclick', (event) => {
        console.log('[FCM SW] Notification clicked:', event);
        event.notification.close();

        if (event.action === 'dismiss') return;

        // Open the app or focus existing window
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // If app is already open, focus it
                    for (const client of clientList) {
                        if (client.url.includes(self.location.origin) && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    // Otherwise open new window
                    if (clients.openWindow) {
                        const targetUrl = event.notification.data?.url || '/notifications';
                        return clients.openWindow(targetUrl);
                    }
                })
        );
    });
}

// Basic service worker lifecycle events
self.addEventListener('install', (event) => {
    console.log('[FCM SW] Service Worker installed');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[FCM SW] Service Worker activated');
    event.waitUntil(clients.claim());
});
