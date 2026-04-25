/**
 * android-intent-capture.mjs
 *
 * Intent-based Android screenshot capture — no CDP required.
 * For each route, launches the parity WebView screen via ADB intent,
 * waits for page load, then takes an ADB screenshot.
 *
 * Usage:
 *   cd Mhub/android-native
 *   node scripts/android-intent-capture.mjs
 *
 * Env overrides:
 *   ANDROID_SERIAL=emulator-5554
 *   WAIT_MS=5000  (ms to wait after launch for page load)
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir  = path.dirname(fileURLToPath(import.meta.url));
const REPO   = path.resolve(__dir, "..", "..");
const SHOTS  = path.join(REPO, "android-native", "test-screenshots");
const ADB    = "C:\\Android\\Sdk\\platform-tools\\adb.exe";
const SERIAL = process.env.ANDROID_SERIAL || "emulator-5554";
const PKG    = "com.mhub.app.debug";
const COMPONENT = `${PKG}/com.mhub.app.MainActivity`;
const COLD_START_MS = Number(process.env.COLD_START_MS || "30000");
const AUTH_ROUTE_MS = Number(process.env.AUTH_ROUTE_MS || "25000");
const PUBLIC_ROUTE_MS = Number(process.env.PUBLIC_ROUTE_MS || "15000");

// Routes that need extra wait time (slow render, permission prompts, etc.)
const SLOW_ROUTES = new Set(["login", "nearby", "kyc", "rewards", "aadhaar_verify"]);
const SLOW_ROUTE_EXTRA_MS = 15000;  // extra time for slow routes
const MIN_VALID_KB = 40;            // retry if screenshot is below this

// ── Blocking sleep via child node process ────────────────────────────────────
function sleep(ms) {
  spawnSync(process.execPath, ["-e", `setTimeout(()=>{},${ms})`], { timeout: ms + 5000 });
}

function adb(...args) {
  const r = spawnSync(ADB, ["-s", SERIAL, ...args], {
    encoding: "utf8",
    timeout: 30000,
  });
  return { stdout: (r.stdout || "").trim(), stderr: (r.stderr || "").trim(), status: r.status };
}

function screencap(localFile) {
  try {
    const buf = execSync(`"${ADB}" -s ${SERIAL} exec-out screencap -p`, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 15000,
    });
    fs.writeFileSync(localFile, buf);
    return buf.length;
  } catch {
    return 0;
  }
}

// ── Route catalog: key → web path, auth flag ─────────────────────────────────
const ROUTES = [
  // Auth (public)
  { key: "login",            path: "/login",           auth: false },
  { key: "signup",           path: "/signup",          auth: false },
  { key: "forgot_password",  path: "/forgot-password", auth: false },
  // Discovery
  { key: "category_hub",    path: "/category-hub",    auth: false },
  { key: "all_posts",       path: "/all-posts",       auth: false },
  { key: "for_you",         path: "/for-you",         auth: false },
  { key: "my_home",         path: "/my-home",         auth: true },
  { key: "nearby",          path: "/nearby",          auth: true },
  { key: "search",          path: "/search",          auth: false },
  { key: "subcategories",   path: "/subcategories",   auth: false },
  // Commerce
  { key: "add_post",        path: "/add-post",        auth: true },
  { key: "post_welcome",    path: "/post-welcome",    auth: true },
  { key: "tiers",           path: "/tier-selection",  auth: true },
  { key: "cart",            path: "/cart",            auth: true },
  { key: "wishlist",        path: "/wishlist",        auth: true },
  { key: "recently_viewed", path: "/recently-viewed", auth: true },
  { key: "saved_searches",  path: "/saved-searches",  auth: true },
  { key: "compare",         path: "/compare",         auth: false },
  { key: "bought_posts",    path: "/bought-posts",    auth: true },
  { key: "sold_posts",      path: "/sold-posts",      auth: true },
  { key: "buyer_view",      path: "/buyer-view",      auth: true },
  { key: "sale_done",       path: "/saledone",        auth: true },
  { key: "sale_undone",     path: "/saleundone",      auth: true },
  { key: "offers",          path: "/offers",          auth: false },
  { key: "payment",         path: "/payment",         auth: true },
  // Social
  { key: "feed",            path: "/feed",            auth: false },
  { key: "my_feed",         path: "/my-feed",         auth: true },
  { key: "post_add",        path: "/post_add",        auth: true },
  { key: "public_wall",     path: "/public-wall",     auth: false },
  { key: "chat",            path: "/chat",            auth: true },
  { key: "notifications",   path: "/notifications",   auth: true },
  { key: "complaints",      path: "/complaints",      auth: true },
  { key: "feedback",        path: "/feedback",        auth: true },
  // Account
  { key: "dashboard",       path: "/dashboard",       auth: true },
  { key: "activity",        path: "/activity",        auth: true },
  { key: "profile",         path: "/profile",         auth: true },
  { key: "security",        path: "/security",        auth: true },
  { key: "account_delete",  path: "/account/delete",  auth: true },
  { key: "verification",    path: "/verification",    auth: true },
  { key: "aadhaar_verify", path: "/aadhaar-verify",  auth: true },
  { key: "kyc",             path: "/kyc",             auth: true },
  { key: "rewards",         path: "/rewards",         auth: true },
  { key: "analytics",       path: "/analytics",       auth: true },
  // Channels
  { key: "channels",        path: "/channels",        auth: false },
  { key: "channel_create",  path: "/channels/create", auth: true },
  { key: "centre_list",     path: "/centre",          auth: true },
  { key: "centre_create",   path: "/centre/create",   auth: true },
  // Legal (public)
  { key: "terms",           path: "/terms-and-conditions", auth: false },
  { key: "privacy",         path: "/privacy-policy",       auth: false },
  { key: "refund",          path: "/refund-policy",        auth: false },
  { key: "support_policy",  path: "/support-ticket-policy", auth: false },
  { key: "admin_panel",     path: "/admin-panel",     auth: true },
];

// ── Main ─────────────────────────────────────────────────────────────────────
const STAMP   = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const AND_DIR = path.join(SHOTS, `android-auth-${STAMP}`);
fs.mkdirSync(AND_DIR, { recursive: true });

console.log(`\n${"═".repeat(55)}`);
console.log(` MHub Android Intent Capture — ${ROUTES.length} routes`);
console.log(`${"═".repeat(55)}`);
console.log(`Output:       ${AND_DIR}`);
console.log(`Cold start:   ${COLD_START_MS}ms`);
console.log(`Auth routes:  ${AUTH_ROUTE_MS}ms`);
console.log(`Public routes:${PUBLIC_ROUTE_MS}ms`);
console.log(`Package:      ${PKG}\n`);

// Force-stop app before starting
adb("shell", "am", "force-stop", PKG);
sleep(1000);

let success = 0;
let failed  = 0;
let blank   = 0;

for (let i = 0; i < ROUTES.length; i++) {
  const { key, path: webPath, auth } = ROUTES[i];
  const slug = webPath.replace(/\//g, "_").replace(/^_/, "");
  const num  = String(i + 1).padStart(3, "0");
  const file = path.join(AND_DIR, `${num}_${slug}.png`);

  // Force-restart app every 15 routes to prevent memory/backstack issues
  const needsColdStart = i === 0 || i % 15 === 0;
  const isSlow = SLOW_ROUTES.has(key);
  const baseWait = needsColdStart ? COLD_START_MS : (auth ? AUTH_ROUTE_MS : PUBLIC_ROUTE_MS);
  const waitMs = baseWait + (isSlow ? SLOW_ROUTE_EXTRA_MS : 0);
  process.stdout.write(`  [${i + 1}/${ROUTES.length}] ${key} → ${webPath} ${auth ? '🔒' : '🌐'} (${waitMs/1000}s)${needsColdStart && i > 0 ? ' ♻' : ''}${isSlow ? ' 🐢' : ''} ... `);

  if (needsColdStart) {
    adb("shell", "am", "force-stop", PKG);
    sleep(500);
    adb("shell", "am", "start",
      "-n", COMPONENT,
      "--es", "debug_route", `"parity/page/${key}"`
    );
  } else {
    adb("shell", "am", "start",
      "-n", COMPONENT,
      "--activity-single-top",
      "--es", "debug_route", `"parity/page/${key}"`
    );
  }

  sleep(waitMs);

  // Take screenshot
  let bytes = screencap(file);
  let kb = Math.round(bytes / 1024);

  // Retry once if screenshot is too small (likely blank/loading)
  if (bytes > 0 && kb < MIN_VALID_KB) {
    process.stdout.write(`${kb}KB (small, retrying +15s) ... `);
    sleep(15000);
    bytes = screencap(file);
    kb = Math.round(bytes / 1024);
  }

  if (bytes === 0) {
    console.log("✗ screencap failed");
    failed++;
  } else if (kb < 15) {
    console.log(`⚠ ${kb}KB (may be blank)`);
    blank++;
  } else {
    console.log(`✓ ${kb}KB`);
    success++;
  }
}

console.log(`\n${"─".repeat(55)}`);
console.log(`Done: ${success} captured, ${blank} possibly blank, ${failed} failed`);
console.log(`Total: ${ROUTES.length} routes`);
console.log(`Output: ${AND_DIR}\n`);
