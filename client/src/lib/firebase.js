/**
 * Web Push Notification Service (VAPID)
 *
 * Replaces Firebase Cloud Messaging with native Web Push API.
 * Uses VAPID (Voluntary Application Server Identification) for server-to-browser push.
 *
 * SETUP:
 * 1. Generate VAPID keys: npx web-push generate-vapid-keys
 * 2. Set VITE_VAPID_PUBLIC_KEY in client .env
 * 3. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL in server .env
 */
import { buildApiPath } from '@/lib/networkConfig';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

let warnedConfig = false;

export function isFirebaseConfigured() {
  return isPushConfigured();
}

export function isPushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY.length > 20 && !VAPID_PUBLIC_KEY.includes('YOUR_'));
}

export function warnIfFirebaseMisconfigured() {
  warnIfPushMisconfigured();
}

export function warnIfPushMisconfigured() {
  if (warnedConfig) return;
  if (isPushConfigured()) return;
  warnedConfig = true;
  console.warn('[Push] VITE_VAPID_PUBLIC_KEY is missing or placeholder. Push notifications disabled.');
}

export async function requestNotificationPermission() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Push notifications not supported in this browser');
    return null;
  }

  if (!isPushConfigured()) {
    warnIfPushMisconfigured();
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    console.warn('[Push] Notification permission denied');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/push-sw.js');
    await navigator.serviceWorker.ready;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    // Return the subscription as JSON string (acts as the "token")
    const subscriptionJSON = JSON.stringify(subscription);
    console.log('[Push] Subscription obtained');
    return subscriptionJSON;
  } catch (error) {
    console.error('[Push] Failed to subscribe:', error);
    return null;
  }
}

export async function registerTokenWithBackend(token, userId) {
  try {
    const response = await fetch(buildApiPath('/push/register'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      credentials: 'include',
      body: JSON.stringify({
        token,
        deviceType: 'web',
        deviceName: navigator.userAgent,
      }),
    });
    return response.json();
  } catch (error) {
    console.error('[Push] Failed to register with backend:', error);
    return { success: false, error };
  }
}

export async function setupForegroundHandler(callback) {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PUSH_RECEIVED') {
      callback(event.data.payload);
    }
  });
}
