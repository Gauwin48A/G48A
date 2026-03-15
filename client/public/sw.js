/**
 * MHub Service Worker v3 — Enterprise offline-first PWA
 * Stale-while-revalidate APIs, cache-first images, background sync,
 * navigation preload, offline browse, smart update notifications
 */
const CACHE_VERSION = 'mhub-v3';
const IMG_CACHE    = 'mhub-img-v1';
const API_CACHE    = 'mhub-api-v1';
const MAX_IMG      = 200;
const MAX_API      = 100;
const STALE_TTL    = 5 * 60 * 1000; // 5 min

const PRECACHE = ['/', '/index.html', '/manifest.json'];

const CACHEABLE_API = [
  /\/api\/posts(\?|$)/, /\/api\/posts\/for-you/, /\/api\/categories/,
  /\/api\/brands/, /\/api\/public-wall/, /\/api\/dashboard/,
  /\/api\/rewards/, /\/api\/notifications/, /\/api\/feed/,
  /\/api\/wishlist/, /\/api\/tiers/,
];

// ── Install ──
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

// ── Activate + cleanup + navigation preload ──
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ns) => Promise.all(ns.filter((n) => n !== CACHE_VERSION && n !== IMG_CACHE && n !== API_CACHE).map((n) => caches.delete(n))))
      .then(() => {
        self.clients.matchAll({ type: 'window' }).then((cls) => cls.forEach((c) => c.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION })));
        if (self.registration.navigationPreload) self.registration.navigationPreload.enable();
        return self.clients.claim();
      })
  );
});

// ── Fetch router ──
self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  if (request.mode === 'navigate') { e.respondWith(navHandler(e)); return; }
  if (request.destination === 'image' || url.pathname.startsWith('/uploads/')) { e.respondWith(imgHandler(request)); return; }
  if (url.pathname.startsWith('/api/') && CACHEABLE_API.some((r) => r.test(url.pathname))) { e.respondWith(swr(request)); return; }
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/locales/')) { e.respondWith(staticHandler(request)); return; }
  e.respondWith(networkFirst(request));
});

// ── Navigation: preload → network → cached shell ──
async function navHandler(e) {
  try {
    const pr = e.preloadResponse ? await e.preloadResponse : null;
    return pr || await fetch(e.request);
  } catch { return (await caches.match('/index.html')) || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/html' } }); }
}

// ── Images: cache-first, LRU trim ──
async function imgHandler(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) { const c = await caches.open(IMG_CACHE); trimCache(IMG_CACHE, MAX_IMG); c.put(req, res.clone()); }
    return res;
  } catch {
    return new Response(Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), (c) => c.charCodeAt(0)), { headers: { 'Content-Type': 'image/gif' } });
  }
}

// ── API: stale-while-revalidate with TTL ──
async function swr(req) {
  const cache = await caches.open(API_CACHE);
  const cached = await cache.match(req);
  const netP = fetch(req).then(async (res) => {
    if (res.ok) {
      const h = new Headers(res.headers); h.set('sw-cached-at', String(Date.now()));
      const body = await res.clone().blob();
      trimCache(API_CACHE, MAX_API);
      await cache.put(req, new Response(body, { status: res.status, statusText: res.statusText, headers: h }));
    }
    return res;
  }).catch(() => cached);

  if (cached) {
    const age = Date.now() - parseInt(cached.headers.get('sw-cached-at') || '0', 10);
    if (age < STALE_TTL) { netP.catch(() => {}); return cached; }
  }
  return netP;
}

// ── Static: cache-first (hashed filenames = immutable) ──
async function staticHandler(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  try { const res = await fetch(req); if (res.ok) { (await caches.open(CACHE_VERSION)).put(req, res.clone()); } return res; }
  catch { return new Response('', { status: 503 }); }
}

// ── Fallback: network-first ──
async function networkFirst(req) {
  try { const res = await fetch(req); if (res.ok) { (await caches.open(CACHE_VERSION)).put(req, res.clone()); } return res; }
  catch { return (await caches.match(req)) || new Response('Offline', { status: 503 }); }
}

// ── Background Sync: replay queued mutations ──
self.addEventListener('sync', (e) => { if (e.tag === 'mhub-sync') e.waitUntil(replayQueue()); });

async function replayQueue() {
  const db = await idbOpen();
  const tx = db.transaction('q', 'readwrite');
  const s = tx.objectStore('q');
  const keys = await idbAllKeys(s);
  for (const k of keys) {
    const entry = await idbGet(s, k);
    if (!entry) continue;
    try { await fetch(entry.url, { method: entry.method, headers: entry.headers, body: entry.body }); s.delete(k); }
    catch { break; }
  }
}

function idbOpen() {
  return new Promise((ok, fail) => {
    const r = indexedDB.open('mhub-sync', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('q', { autoIncrement: true });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });
}
function idbAllKeys(s) { return new Promise((ok) => { const r = s.getAllKeys(); r.onsuccess = () => ok(r.result); r.onerror = () => ok([]); }); }
function idbGet(s, k) { return new Promise((ok) => { const r = s.get(k); r.onsuccess = () => ok(r.result); r.onerror = () => ok(null); }); }

async function trimCache(name, max) {
  const c = await caches.open(name);
  const ks = await c.keys();
  if (ks.length > max) await Promise.all(ks.slice(0, ks.length - max).map((k) => c.delete(k)));
}

// ── Push Notifications ──
self.addEventListener('push', (e) => {
  if (!e.data) return;
  let d; try { d = e.data.json(); } catch { d = { title: 'MHub', body: e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'MHub', {
    body: d.body || 'New notification', icon: '/pwa-192x192.png', badge: '/pwa-192x192.png',
    vibrate: [100, 50, 100], tag: d.tag || 'mhub-default', renotify: !!d.tag,
    data: { url: d.url || '/' },
    actions: [{ action: 'open', title: 'Open' }, { action: 'close', title: 'Dismiss' }],
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'close') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (new URL(c.url).pathname === url && 'focus' in c) return c.focus(); }
      return clients.openWindow(url);
    })
  );
});

// ── Message handler (skip-waiting from client) ──
self.addEventListener('message', (e) => { if (e.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
