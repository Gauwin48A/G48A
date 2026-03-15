/**
 * Network-aware utilities + Request deduplication
 * Zero-cost performance layer that wraps fetch/axios
 */

// ── Connection quality detection ──
export function getConnectionQuality() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return 'unknown';
  const et = conn.effectiveType; // '4g', '3g', '2g', 'slow-2g'
  if (et === '4g') return 'fast';
  if (et === '3g') return 'medium';
  return 'slow';
}

/** Should we load high-res images? */
export function shouldLoadHiRes() {
  const q = getConnectionQuality();
  return q === 'fast' || q === 'unknown';
}

/** Get optimal image quality param for Cloudinary */
export function getImageQuality() {
  const q = getConnectionQuality();
  if (q === 'fast' || q === 'unknown') return 'auto:good';
  if (q === 'medium') return 'auto:low';
  return 'auto:eco';
}

// ── Request deduplication ──
const inFlight = new Map();
const DEDUP_WINDOW = 150; // ms

/**
 * Deduplicated fetch — identical GET requests within 150ms share one promise
 * @param {string} url
 * @param {RequestInit} opts
 * @returns {Promise<Response>}
 */
export function dedupFetch(url, opts = {}) {
  if (opts.method && opts.method !== 'GET') return fetch(url, opts);

  const key = url;
  const existing = inFlight.get(key);
  if (existing && Date.now() - existing.ts < DEDUP_WINDOW) {
    return existing.promise.then((r) => r.clone());
  }

  const promise = fetch(url, opts).finally(() => {
    setTimeout(() => {
      const entry = inFlight.get(key);
      if (entry && Date.now() - entry.ts >= DEDUP_WINDOW) inFlight.delete(key);
    }, DEDUP_WINDOW);
  });

  inFlight.set(key, { promise, ts: Date.now() });
  return promise;
}

// ── Online/offline state ──
const listeners = new Set();

export function onOnlineChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

if (typeof window !== 'undefined') {
  const notify = () => listeners.forEach((fn) => fn(navigator.onLine));
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);
}

export function isOnline() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
