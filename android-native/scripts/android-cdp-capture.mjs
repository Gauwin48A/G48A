/**
 * android-cdp-capture.mjs
 *
 * Full pipeline:
 *  1. Launch com.mhub.app on emulator (Capacitor WebView)
 *  2. Forward Chrome DevTools Protocol (CDP) port via ADB
 *  3. Login via CDP JavaScript evaluation (fills real WebView login form)
 *  4. Navigate to every app route and capture ADB screenshots
 *
 * Prerequisites:
 *  - com.mhub.app installed on emulator-5554
 *  - webContentsDebuggingEnabled: true in capacitor.config.json (already set)
 *  - node (ws package in cdp-tmp)
 *
 * Usage:
 *   cd Mhub/android-native
 *   node scripts/android-cdp-capture.mjs
 *
 * Env overrides:
 *   ANDROID_SERIAL=emulator-5554
 *   CDP_PORT=9222
 *   WAIT_MS=2000
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __dir   = path.dirname(fileURLToPath(import.meta.url));
const REPO    = path.resolve(__dir, "..", "..");
const SHOTS   = path.join(REPO, "android-native", "test-screenshots");
const ADB     = "C:\\Android\\Sdk\\platform-tools\\adb.exe";
const SERIAL  = process.env.ANDROID_SERIAL || "emulator-5554";
const PKG     = process.env.ANDROID_PKG || "com.mhub.app.debug";
const PKG_ACTIVITY = process.env.ANDROID_ACTIVITY || `${PKG}/com.mhub.app.MainActivity`;
const CDP_PORT = Number(process.env.CDP_PORT || "9222");
const WAIT_MS  = Number(process.env.WAIT_MS  || "3500");
const CONTENT_POLL_INTERVAL = 500;  // ms between DOM-content polls
const CONTENT_POLL_MAX      = 14;   // max polls (14 × 500ms = 7s max)
const IDENTIFIER = process.env.MHUB_LOGIN_IDENTIFIER || "9876543210";
const PASS       = process.env.MHUB_LOGIN_PASSWORD || "Pass12345";
const DEVICE_ID  = process.env.MHUB_DEVICE_ID || "6655fbf0-36e5-4739-84b8-35a6496c7444";

// All app routes (skip param routes — they need real IDs)
const DEFAULT_ROUTES = [
  "/category-hub",
  "/all-posts",
  "/listings",
  "/home",
  "/for-you",
  "/feed",
  "/public-wall",
  "/search",
  "/nearby",
  "/login",
  "/signup",
  "/forgot-password",
  "/dashboard",
  "/activity",
  "/profile",
  "/security",
  "/my-home",
  "/my-posts",
  "/my-feed",
  "/bought-posts",
  "/sold-posts",
  "/add-post",
  "/post-welcome",
  "/sell",
  "/tier-selection",
  "/tiers",
  "/pricing",
  "/wishlist",
  "/cart",
  "/recently-viewed",
  "/saved-searches",
  "/saledone",
  "/saleundone",
  "/buyer-view",
  "/verification",
  "/aadhaar-verify",
  "/kyc",
  "/notifications",
  "/complaints",
  "/feedback",
  "/rewards",
  "/categories",
  "/subcategories",
  "/compare",
  "/chat",
  "/chats",
  "/channels",
  "/channels/create",
  "/centre",
  "/centre/create",
  "/payment",
  "/offers",
  "/analytics",
  "/terms",
  "/terms-and-conditions",
  "/privacy-policy",
  "/refund-policy",
  "/support-ticket-policy",
  "/account/delete",
  "/post_add",
  "/feed/feedpostadd",
];

const ROUTES = (process.env.ROUTES_CSV || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const ACTIVE_ROUTES = ROUTES.length > 0 ? ROUTES : DEFAULT_ROUTES;

const STAMP  = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const AND_DIR = path.join(SHOTS, `android-auth-${STAMP}`);
fs.mkdirSync(AND_DIR, { recursive: true });

// ─── helpers ─────────────────────────────────────────────────────────────────
function log(msg) { process.stdout.write(msg + "\n"); }

function adb(...args) {
  const r = spawnSync(ADB, ["-s", SERIAL, ...args], { encoding: "utf8", timeout: 30000 });
  return { stdout: (r.stdout || "").trim(), stderr: (r.stderr || "").trim(), status: r.status };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function screencap(localFile) {
  const remote = "/sdcard/_cap.png";
  adb("shell", "screencap", "-p", remote);
  adb("pull", remote, localFile);
  adb("shell", "rm", "-f", remote);
  return fs.existsSync(localFile) ? fs.statSync(localFile).size : 0;
}

// ─── CDP helpers ──────────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = "";
      res.on("data", chunk => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    }).on("error", reject);
  });
}

/**
 * Evaluate JS in the WebView via cdp-eval.js (ws package).
 * Uses spawnSync with the current node binary to avoid cmd.exe ENOENT on Windows.
 */
function cdpEval(wsUrl, js, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const cdpScript = path.join(REPO, "cdp-eval.js");
    const cdpDir    = path.join(REPO, "cdp-tmp");
    const r = spawnSync(process.execPath, [cdpScript, wsUrl, js], {
      cwd: cdpDir, encoding: "utf8", timeout: timeoutMs + 2000
    });
    if (r.error) {
      resolve({ error: String(r.error.message || r.error) });
      return;
    }
    const out = (r.stdout || "").trim();
    if (!out) {
      resolve({ error: r.stderr || "no output" });
      return;
    }
    try { resolve(JSON.parse(out)); }
    catch { resolve({ raw: out }); }
  });
}

/**
 * Wait until the page has meaningful text content in the DOM.
 * Returns the actual text length when ready, or 0 on timeout.
 */
async function waitForContent(wsUrl, minChars = 80) {
  const checkJs = `
    (function() {
      try {
        const body = document.body;
        if (!body) return JSON.stringify({ chars: 0, path: window.location.pathname });
        const text = (body.innerText || body.textContent || '').replace(/\\s+/g, ' ').trim();
        const imgs = body.querySelectorAll('img[src]').length;
        return JSON.stringify({ chars: text.length + imgs * 50, path: window.location.pathname });
      } catch(e) { return JSON.stringify({ chars: 0, path: '', err: e.message }); }
    })()
  `;
  for (let i = 0; i < CONTENT_POLL_MAX; i++) {
    await sleep(CONTENT_POLL_INTERVAL);
    const raw = await cdpEval(wsUrl, checkJs, 5000);
    try {
      const parsed = JSON.parse(raw?.result?.value || raw?.raw || "{}");
      if ((parsed.chars || 0) >= minChars) return parsed;
    } catch { /* ignore */ }
  }
  return { chars: 0, path: '' };
}

// ─── ADB port forward ─────────────────────────────────────────────────────────
async function forwardCdpPort(pid) {
  // Remove any previous forward on this port
  adb("forward", "--remove", `tcp:${CDP_PORT}`);
  const r = adb("forward", `tcp:${CDP_PORT}`, `localabstract:webview_devtools_remote_${pid}`);
  if (r.status !== 0) {
    log(`  ⚠ ADB forward failed: ${r.stderr}`);
    return false;
  }
  log(`  ✓ Forwarded localhost:${CDP_PORT} → WebView CDP (PID ${pid})`);
  return true;
}

async function getWebViewWsUrl() {
  const tabs = await httpGet(`http://localhost:${CDP_PORT}/json`);
  if (!tabs || !Array.isArray(tabs) || tabs.length === 0) return null;
  const tab = tabs.find(t => t.webSocketDebuggerUrl && t.url && !t.url.startsWith("chrome-extension"));
  return tab ? tab.webSocketDebuggerUrl : (tabs[0] && tabs[0].webSocketDebuggerUrl);
}

/**
 * Get WS URL with retry — re-establishes ADB port forward if needed.
 */
async function getWsUrlWithRetry(pid) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const url = await getWebViewWsUrl().catch(() => null);
    if (url) return url;
    log(`  ↺ CDP reconnect attempt ${attempt + 1}/4 (re-forwarding port)...`);
    await forwardCdpPort(pid);
    await sleep(2000);
  }
  return null;
}

// ─── main ─────────────────────────────────────────────────────────────────────
async function main() {
  log("═══════════════════════════════════════════════════════");
  log(" MHub Android CDP Capture — Authenticated All Routes  ");
  log("═══════════════════════════════════════════════════════");
  log(`Output: ${AND_DIR}`);
  log(`Serial: ${SERIAL}  Package: ${PKG}  Activity: ${PKG_ACTIVITY}  CDP port: ${CDP_PORT}`);

  // ── Step 1: Launch app into WebView parity screen ──────────────────────────
  log("\n[1/5] Launching com.mhub.app into WebView parity screen...");
  adb("shell", "am", "force-stop", PKG);
  await sleep(1500);
  // Launch into rewards parity page first so auth-gated session bootstrap is deterministic.
  const launch = adb("shell", "am", "start", "-n", PKG_ACTIVITY, "--es", "debug_route", "parity/page/rewards");
  if (launch.status !== 0) {
    log(`  ✗ Launch failed: ${launch.stderr}`);
    process.exit(1);
  }
  // Wait for the WebView to fully initialize (native app → compose → WebView load)
  await sleep(30000);

  // ── Step 2: Get WebView PID from /proc/net/unix & forward CDP ──────────────
  log("\n[2/5] Getting WebView PID...");
  // The WebView renderer has its own PID, different from the app PID.
  // We find it by scanning /proc/net/unix for webview_devtools_remote_<PID>
  let pid = null;
  const socketAttempts = 25;
  for (let attempt = 0; attempt < socketAttempts; attempt++) {
    const unixSockets = adb("shell", "cat", "/proc/net/unix").stdout;
    const m = unixSockets.match(/webview_devtools_remote_(\d+)/);
    if (m) {
      pid = m[1];
      break;
    }
    log(`  Waiting for WebView devtools socket (attempt ${attempt + 1}/${socketAttempts})...`);
    await sleep(3000);
  }
  if (!pid) {
    log("  ✗ Could not find WebView devtools socket. Ensure webContentsDebuggingEnabled is true.");
    process.exit(1);
  }
  log(`  WebView PID: ${pid}`);

  const forwarded = await forwardCdpPort(pid);
  if (!forwarded) {
    log("  ✗ Could not forward CDP port");
    process.exit(1);
  }
  await sleep(1500);

  // ── Step 3: Get WebSocket URL ───────────────────────────────────────────────
  log("\n[3/5] Connecting to Chrome DevTools Protocol...");
  let wsUrl = await getWsUrlWithRetry(pid);
  if (!wsUrl) {
    log("  ✗ Could not get WebView WS URL. Ensure webContentsDebuggingEnabled:true");
    process.exit(1);
  }
  log(`  ✓ WebSocket URL: ${wsUrl}`);

  // ── Step 4: Ensure authenticated ───────────────────────────────────────────
  log("\n[4/5] Checking authentication state...");

  // Check if already logged in by reading localStorage / cookie
  const authCheckJs = `
    (async function() {
      const uid = localStorage.getItem('user_id') || '';
      const hasToken = document.cookie.includes('accessToken') || document.cookie.includes('refreshToken');
      const path = window.location.pathname;
      let meStatus = null;
      try {
        const me = await fetch('/api/auth/me', { credentials: 'include' });
        meStatus = me.status;
      } catch {}
      return JSON.stringify({ uid, hasToken, path, meStatus });
    })()
  `;
  const authCheck = await cdpEval(wsUrl, authCheckJs, 8000);
  const checkResult = (() => {
    try { return JSON.parse(authCheck?.result?.value || authCheck?.value?.result?.value || "{}"); }
    catch { return {}; }
  })();
  log(`  Auth check: ${JSON.stringify(checkResult)}`);

  const isLoggedIn = checkResult.meStatus === 200 || checkResult.hasToken === true;

  if (!isLoggedIn) {
    log("  Not authenticated — logging in via API fetch...");

    // Login via fetch (no page reload — stays on current page, sets HttpOnly cookies)
    const loginJs = `
      (async function() {
        try {
          localStorage.setItem('mhub_device_id', '${DEVICE_ID}');
          await fetch('/api/auth/csrf-token', { credentials: 'include' });
          const xsrfMatch = document.cookie.match(/(?:^|;\\s*)XSRF-TOKEN=([^;]+)/);
          const xsrfToken = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : '';
          const ts = String(Date.now());
          const nonce = 'android-' + Math.random().toString(36).slice(2) + '-' + ts;
          const r = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
              'x-mhub-timestamp': ts,
              'x-mhub-nonce': nonce,
              'x-device-id': '${DEVICE_ID}',
              'x-device-fingerprint': '${DEVICE_ID}',
              'x-platform': 'android-webview',
              ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {})
            },
            body: JSON.stringify({
              identifier: '${IDENTIFIER}',
              password: '${PASS}',
              deviceId: '${DEVICE_ID}',
              _timestamp: ts,
              _nonce: nonce
            })
          });
          let d = {};
          try { d = await r.json(); } catch {}
          const me = await fetch('/api/auth/me', { credentials: 'include' }).catch(() => null);
          return JSON.stringify({
            ok: r.ok,
            status: r.status,
            msg: d.message || d.error || 'ok',
            code: d.code || null,
            meStatus: me ? me.status : null
          });
        } catch(e) { return JSON.stringify({ ok: false, error: e.message }); }
      })()
    `;
    const loginResult = await cdpEval(wsUrl, loginJs, 20000);
    const lr = (() => {
      try { return JSON.parse(loginResult?.result?.value || loginResult?.value?.result?.value || "{}"); }
      catch { return {}; }
    })();
    log(`  Login result: ${JSON.stringify(lr)}`);

    if (!lr.ok) {
      log("  ⚠ Login API call may have failed — proceeding anyway (cookies may be cached)");
    } else {
      log("  ✓ Login successful");
    }
    await sleep(2000);
  } else {
    log("  ✓ Already authenticated (session cookies present)");
  }

  // The WebView already loaded /category-hub via the parity screen launch.
  // Just wait for content to settle, then screenshot.
  await sleep(3000);

  // Screenshot the starting state
  const startShot = path.join(AND_DIR, "000_category_hub_start.png");
  const startSize = screencap(startShot);
  log(`  Start state captured: ${(startSize / 1024).toFixed(0)}KB`);

  // ── Step 5: Capture all routes ─────────────────────────────────────────────
  log(`\n[5/5] Capturing ${ACTIVE_ROUTES.length} routes...`);

  let ok = 0;
  let fail = 0;
  const manifest = [
    {
      index: 0,
      route: "/category-hub",
      file: "000_category_hub_start.png",
      size: startSize,
      status: startSize > 0 ? "ok" : "failed",
      actualPath: checkResult.path || "/category-hub",
    },
  ];

  for (let i = 0; i < ACTIVE_ROUTES.length; i++) {
    const route = ACTIVE_ROUTES[i];
    const num   = String(i + 2).padStart(3, "0");
    const slug  = route.replace(/\//g, "_").replace(/^_/, "");
    const file  = path.join(AND_DIR, `${num}_${slug}.png`);

    process.stdout.write(`  [${i + 1}/${ACTIVE_ROUTES.length}] ${route} ... `);

    // Navigate via full page load (pushState doesn't trigger React Router in embedded WebView)
    const targetUrl = `http://10.0.2.2:8081${route}`;
    const navJs = `
      (function() {
        const target = '${route}';
        if (window.location.pathname === target) return 'already:' + target;
        window.location.href = '${targetUrl}';
        return 'navigating:' + target;
      })()
    `;
    await cdpEval(wsUrl, navJs, 8000);

    // Wait for the page to actually load (full navigation takes longer)
    await sleep(2000);

    // After full page load, re-get the WS URL (page navigation changes the tab)
    const postNavWs = await getWsUrlWithRetry(pid);
    if (postNavWs) wsUrl = postNavWs;

    // Wait for DOM to settle
    await sleep(2000);

    // Check what path we landed on
    let actualPath = route;
    try {
      const checkResult = await cdpEval(wsUrl, 'window.location.pathname', 5000);
      actualPath = checkResult?.result?.value || route;
    } catch { /* use target route */ }
    const pathNote = actualPath && actualPath !== route ? ` [→${actualPath}]` : '';

    const sz = screencap(file);
    if (sz > 30000) {
      process.stdout.write(`✓ ${(sz / 1024).toFixed(0)}KB${pathNote}\n`);
      ok++;
      manifest.push({
        index: i + 1,
        route,
        file: path.basename(file),
        size: sz,
        status: "ok",
        actualPath,
      });
    } else if (sz > 0) {
      process.stdout.write(`⚠ ${(sz / 1024).toFixed(0)}KB (may be blank)${pathNote}\n`);
      ok++;
      manifest.push({
        index: i + 1,
        route,
        file: path.basename(file),
        size: sz,
        status: "blank",
        actualPath,
      });
    } else {
      process.stdout.write(`✗ screencap failed\n`);
      fail++;
      manifest.push({
        index: i + 1,
        route,
        file: path.basename(file),
        size: 0,
        status: "failed",
        actualPath,
      });
    }
  }

  // Cleanup port forward
  adb("forward", "--remove", `tcp:${CDP_PORT}`);
  fs.writeFileSync(path.join(AND_DIR, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

  log("\n═══════════════════════════════════════════════════════");
  log(` Android capture complete`);
  log(` OK: ${ok}  Failed: ${fail}  Total: ${ACTIVE_ROUTES.length}`);
  log(` Output dir: ${AND_DIR}`);
  log("═══════════════════════════════════════════════════════");
}

main().catch(e => {
  log(`\n✗ Fatal error: ${e.message}`);
  log(e.stack || "");
  // Try to clean up port forward
  try { spawnSync(ADB, ["-s", SERIAL, "forward", "--remove", `tcp:${CDP_PORT}`], { timeout: 5000 }); } catch {}
  process.exit(1);
});
