/**
 * Push Notification Service Worker
 *
 * Handles background Web Push notifications via VAPID.
 * No Firebase dependency required.
 */

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'MHub', body: event.data.text() };
  }

  const title = payload.notification?.title || payload.title || 'MHub Notification';
  const options = {
    body: payload.notification?.body || payload.body || 'You have a new notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.tag || 'mhub-notification',
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  // Notify foreground clients
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: 'PUSH_RECEIVED', payload });
    });
  });

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        const targetUrl = event.notification.data?.url || '/notifications';
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      }),
  );
});

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Push SW] Service Worker activated');
  event.waitUntil(self.clients.claim());
});
