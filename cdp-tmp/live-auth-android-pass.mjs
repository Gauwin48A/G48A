import fs from "node:fs/promises";
import path from "node:path";

const OUT = "C:/Users/laksh/GITHUB/Android_Kotlin/Mhub/android-native/test-screenshots/live-auth-android-webview-2026-04-27";
const REPORT = path.join(OUT, "live-auth-android-report.json");
const BASE_URL = "http://localhost:8081";

const ROUTES = [
  ["category_hub", "/category-hub"],
  ["all_posts", "/all-posts"],
  ["profile", "/profile"],
  ["rewards", "/rewards"],
  ["notifications", "/notifications"],
  ["wishlist", "/wishlist"],
];
const FALLBACK_MARKERS = [
  "parity user",
  "mhub saved item",
  "unable to load rewards",
  "failed to load profile data",
  "could not load your profile",
  "error loading notifications",
  "unable to load notifications",
  "unable to load your wishlist",
  "failed to load your wishlist",
  "login required to access wishlist",
];
const IDENTIFIER = process.env.MHUB_LOGIN_IDENTIFIER || "9876543210";
const PASSWORD = process.env.MHUB_LOGIN_PASSWORD || "Pass12345";

await fs.mkdir(OUT, { recursive: true });

function now() {
  return new Date().toISOString();
}

function log(msg) {
  process.stdout.write(`[${now()}] ${msg}\n`);
}


const targets = await fetch("http://127.0.0.1:9222/json/list").then((r) => r.json());
const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
if (!page) throw new Error("No debuggable WebView page target found on :9222");

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", (e) => reject(new Error(String(e?.message || e))), { once: true });
});

let id = 0;
const pending = new Map();
ws.addEventListener("message", (event) => {
  const msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject, timer } = pending.get(msg.id);
    clearTimeout(timer);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result || {});
  }
});
ws.addEventListener("close", () => {
  for (const [reqId, p] of pending.entries()) {
    clearTimeout(p.timer);
    p.reject(new Error(`CDP socket closed before response: ${reqId}`));
  }
  pending.clear();
});

const send = (method, params = {}, timeoutMs = 20000) => new Promise((resolve, reject) => {
  const reqId = ++id;
  const timer = setTimeout(() => {
    if (pending.has(reqId)) {
      pending.delete(reqId);
      reject(new Error(`CDP timeout ${method} (${timeoutMs}ms)`));
    }
  }, timeoutMs);

  pending.set(reqId, { resolve, reject, timer });
  ws.send(JSON.stringify({ id: reqId, method, params }));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resultValue = (r) => r?.result?.value ?? r?.value?.result?.value ?? r?.value ?? null;

async function evalValue(expression, timeoutMs = 22000) {
  const out = await send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  }, timeoutMs);
  return resultValue(out);
}

async function evalJson(expression, fallback = {}, timeoutMs = 22000) {
  const val = await evalValue(expression, timeoutMs);
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return fallback;
    }
  }
  return (val && typeof val === "object") ? val : fallback;
}

const report = {
  generatedAt: now(),
  mode: "live-backend-authenticated",
  baseUrl: BASE_URL,
  target: page,
  login: null,
  routes: [],
  summary: {
    routeCount: ROUTES.length,
    authenticatedRoutes: 0,
    routesWithFallbackMarkers: 0,
    routeFailures: 0,
  },
};

async function flushReport() {
  report.generatedAt = now();
  await fs.writeFile(REPORT, JSON.stringify(report, null, 2));
}

await send("Page.enable", {}, 10000);
await send("Runtime.enable", {}, 10000);

async function navigate(url) {
  await send("Page.navigate", { url }, 15000);
  await sleep(1200);
}

async function resetWebRuntime() {
  log("runtime: clear service worker/cache");
  const result = await evalJson(`(async()=> {
    const out = { href: location.href, swCount: 0, cacheKeys: 0 };
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        out.swCount = regs.length;
        for (const reg of regs) {
          try { await reg.unregister(); } catch {}
        }
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        out.cacheKeys = keys.length;
        for (const key of keys) {
          try { await caches.delete(key); } catch {}
        }
      }
    } catch {}
    return JSON.stringify(out);
  })()`, { swCount: 0, cacheKeys: 0 }, 20000);
  log(`runtime: cleared sw=${result.swCount} caches=${result.cacheKeys}`);
}

async function waitRenderable(maxWaitMs = 26000) {
  const start = Date.now();
  let last = { ready: false, rootChars: 0, bodyChars: 0, imgs: 0, cards: 0, text: "" };
  while (Date.now() - start < maxWaitMs) {
    last = await evalJson(`JSON.stringify((()=>{
      const root = document.getElementById('root');
      const rootRaw = (root && (root.innerText || root.textContent) || '').replace(/\\s+/g,' ').trim();
      const bodyRaw = (document.body && (document.body.innerText || document.body.textContent) || '').replace(/\\s+/g,' ').trim();
      const lower = rootRaw.toLowerCase();
      const rootChars = rootRaw.length;
      const bodyChars = bodyRaw.length;
      const imgs = document.querySelectorAll('img[src]').length;
      const cards = document.querySelectorAll('article,[class*="card"],[data-testid*="card"],[data-post-id]').length;
      const loading =
        lower.includes('loading...') ||
        lower.includes('loading profile') ||
        lower.includes('please wait while we load this page') ||
        lower.includes('detecting your location') ||
        lower.includes('initializing app') ||
        lower === 'loading...' ||
        rootChars === 0;
      const ready = (rootChars >= 120 || imgs >= 2 || cards >= 2) && !loading;
      return { href: location.href, title: document.title, ready, rootChars, bodyChars, imgs, cards, text: rootRaw.slice(0, 240) };
    })())`, { ready: false, rootChars: 0, bodyChars: 0, imgs: 0, cards: 0, text: "" }, 12000);

    if (last.ready) return { ...last, waitedMs: Date.now() - start };
    await sleep(900);
  }
  return { ...last, waitedMs: Date.now() - start, timeout: true };
}

async function captureDevice(name) {
  await evalValue("window.scrollTo(0,0);document.documentElement.setAttribute('data-native-platform','1');document.body&&document.body.setAttribute('data-native-platform','1');true;", 9000);
  await sleep(350);
  const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true }, 60000);
  const localFile = path.join(OUT, `${name}.png`);
  await fs.writeFile(localFile, Buffer.from(shot.data, "base64"));
  const stat = await fs.stat(localFile);
  return { file: localFile, bytes: stat.size };
}

async function doLogin() {
  log("login: navigate /login");
  await navigate(`${BASE_URL}/login?fresh=${Date.now()}`);
  await sleep(1500);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await evalJson(`(async()=>{
        const fetchJson = async (url, options = {}, timeoutMs = 10000) => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
            const resp = await fetch(url, { ...options, signal: controller.signal });
            let data = null;
            try { data = await resp.json(); } catch {}
            return { status: resp.status, data };
          } catch (e) {
            return { status: 0, error: String(e && e.message || e) };
          } finally {
            clearTimeout(timer);
          }
        };

        const ts = Date.now().toString();
        const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);

        const csrfRes = await fetchJson('/api/auth/csrf-token', { credentials: 'include' }, 9000);
        const csrfToken = csrfRes.data && csrfRes.data.csrfToken ? csrfRes.data.csrfToken : '';

        const xsrfRaw = (document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/) || [])[1] || '';
        const xsrfToken = xsrfRaw ? decodeURIComponent(xsrfRaw) : '';

        const loginRes = await fetchJson('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-XSRF-TOKEN': xsrfToken,
            'X-MHub-Timestamp': ts,
            'X-MHub-Nonce': nonce,
            'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
            'Accept-Language': navigator.language || 'en-US',
          },
          body: JSON.stringify({ identifier: '${IDENTIFIER}', password: '${PASSWORD}' }),
        }, 12000);

        const sessionRes = await fetchJson('/api/auth/session', { credentials: 'include' }, 9000);
        const meRes = await fetchJson('/api/auth/me', { credentials: 'include' }, 9000);

        return JSON.stringify({
          href: location.href,
          csrfStatus: csrfRes.status,
          csrfHasToken: !!csrfToken,
          hasXsrfCookie: !!xsrfToken,
          loginStatus: loginRes.status,
          loginSuccess: !!(loginRes.data && (loginRes.data.success === true || loginRes.data.status === 'success')),
          sessionStatus: sessionRes.status,
          sessionAuthenticated: !!(sessionRes.data && sessionRes.data.authenticated),
          sessionUser: sessionRes.data && sessionRes.data.user ? {
            id: sessionRes.data.user.id || null,
            name: sessionRes.data.user.name || null,
            role: sessionRes.data.user.role || null,
            phone: sessionRes.data.user.phone || null,
          } : null,
          meStatus: meRes.status,
          meUser: meRes.data && meRes.data.success ? {
            id: meRes.data.id || null,
            name: meRes.data.name || null,
            role: meRes.data.role || null,
            phone: meRes.data.phone || null,
            tier: meRes.data.tier || null,
          } : null,
          loginError: loginRes.error || null,
        });
      })()`, { loginStatus: 0, sessionAuthenticated: false }, 28000);
    } catch (err) {
      const message = String(err && err.message || err);
      if (attempt < 3 && message.includes("Execution context was destroyed")) {
        await sleep(900);
        continue;
      }
      throw err;
    }
  }

  return { loginStatus: 0, sessionAuthenticated: false, loginError: "login-retries-exhausted" };
}

async function inspectRoute() {
  return await evalJson(`(async()=>{
    const fetchJson = async (url, options = {}, timeoutMs = 7000) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { ...options, signal: controller.signal });
        let data = null;
        try { data = await resp.json(); } catch {}
        return { status: resp.status, data };
      } catch (e) {
        return { status: 0, error: String(e && e.message || e) };
      } finally {
        clearTimeout(timer);
      }
    };

    const root = document.getElementById('root');
    const rootRaw = (root && (root.innerText || root.textContent) || '').replace(/\\s+/g,' ').trim();
    const bodyRaw = (document.body && (document.body.innerText || document.body.textContent) || '').replace(/\\s+/g,' ').trim();
    const lower = (rootRaw + ' ' + bodyRaw).toLowerCase();
    const markers = ${JSON.stringify(FALLBACK_MARKERS)};
    const markerHits = markers.filter((m) => lower.includes(m));

    const sessionRes = await fetchJson('/api/auth/session', { credentials: 'include' }, 7000);
    const meRes = await fetchJson('/api/auth/me', { credentials: 'include' }, 7000);

    return JSON.stringify({
      href: location.href,
      title: document.title,
      rootTextLength: rootRaw.length,
      rootTextHead: rootRaw.slice(0, 220),
      bodyTextLength: bodyRaw.length,
      fallbackMarkerHits: markerHits,
      navButtons: document.querySelectorAll('[data-navkey],.mhub-bottom-nav-button').length,
      cards: document.querySelectorAll('article,[class*="card"],[data-testid*="card"],[data-post-id]').length,
      sessionStatus: sessionRes.status,
      authenticated: !!(sessionRes.data && sessionRes.data.authenticated),
      sessionUser: sessionRes.data && sessionRes.data.user ? {
        id: sessionRes.data.user.id || null,
        name: sessionRes.data.user.name || null,
        role: sessionRes.data.user.role || null,
      } : null,
      meStatus: meRes.status,
      meName: meRes.data && meRes.data.success ? (meRes.data.name || null) : null,
      mePhone: meRes.data && meRes.data.success ? (meRes.data.phone || null) : null,
      meTier: meRes.data && meRes.data.success ? (meRes.data.tier || null) : null,
      meError: meRes.error || null,
    });
  })()`, { fallbackMarkerHits: [], authenticated: false }, 26000);
}

try {
  await resetWebRuntime();
  report.login = await doLogin();
  await flushReport();
  log(`login: status=${report.login.loginStatus} auth=${report.login.sessionAuthenticated}`);

  for (const [name, route] of ROUTES) {
    const row = { name, route, startedAt: now() };
    log(`route: ${name} ${route}`);
    try {
      await navigate(`${BASE_URL}${route}`);
      row.renderProbe = await waitRenderable(26000);
      row.screenshot = await captureDevice(name);
      row.inspect = await inspectRoute();

      if (row.inspect.authenticated) report.summary.authenticatedRoutes += 1;
      if ((row.inspect.fallbackMarkerHits || []).length > 0) report.summary.routesWithFallbackMarkers += 1;

      log(`route_done: ${name} bytes=${row.screenshot.bytes} auth=${row.inspect.authenticated} markers=${(row.inspect.fallbackMarkerHits || []).join('|') || 'none'}`);
    } catch (e) {
      row.error = String(e && e.message || e);
      report.summary.routeFailures += 1;
      log(`route_error: ${name} ${row.error}`);
    }
    row.completedAt = now();
    report.routes.push(row);
    await flushReport();
  }
} finally {
  try { ws.close(); } catch {}
}

await flushReport();

console.log(JSON.stringify({
  report: REPORT,
  login: report.login,
  summary: report.summary,
  routes: report.routes.map((r) => ({
    name: r.name,
    route: r.route,
    bytes: r.screenshot?.bytes || 0,
    authenticated: r.inspect?.authenticated ?? false,
    fallbackMarkerHits: r.inspect?.fallbackMarkerHits || [],
    error: r.error || null,
  })),
}, null, 2));
