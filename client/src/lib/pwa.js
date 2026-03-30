/**
 * PWA Install Prompt + SW Update Manager
 * Fire-and-forget: import once in App, handles everything automatically
 */

let deferredPrompt = null;
let swRegistration = null;

/** Track the beforeinstallprompt event for later use */
export function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Dispatch custom event so UI components can show install button
    window.dispatchEvent(new CustomEvent('mhub:installable'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('mhub:installed'));
  });
}

/** Trigger the install prompt (call from a button click handler) */
export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === 'accepted';
}

/** Check if install prompt is available */
export function canInstall() {
  return deferredPrompt !== null;
}

/** Register SW and handle updates with user notification */
export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null;

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    // Listen for updates
    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available — notify the app
          window.dispatchEvent(new CustomEvent('mhub:sw-update', { detail: { registration: swRegistration } }));
        }
      });
    });

    // Listen for SW messages
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        window.dispatchEvent(new CustomEvent('mhub:sw-update', { detail: { version: event.data.version } }));
      }
    });

    // Register background sync if available
    if ('SyncManager' in window) {
      await swRegistration.sync.register('mhub-sync').catch(() => {});
    }

    return swRegistration;
  } catch {
    return null;
  }
}

/** Tell the waiting SW to activate immediately */
export function skipWaiting() {
  if (swRegistration?.waiting) {
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

/** Queue an offline mutation for background sync replay */
export async function queueOfflineMutation(url, method, headers, body) {
  if (!('indexedDB' in window)) return;
  return new Promise((resolve) => {
    const req = indexedDB.open('mhub-sync', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('q', { autoIncrement: true });
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('q', 'readwrite');
      tx.objectStore('q').add({ url, method, headers, body, timestamp: Date.now() });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    };
    req.onerror = () => resolve(false);
  });
}
