/**
 * android-intent-capture.mjs
 *
 * Intent-based Android screenshot capture (no CDP).
 * Captures each route and auto-recovers when a frame is blank/loading.
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dir, "..", "..");
const SHOTS = path.join(REPO, "android-native", "test-screenshots");
const ADB = "C:\\Android\\Sdk\\platform-tools\\adb.exe";
const SERIAL = process.env.ANDROID_SERIAL || "emulator-5554";
const PKG = "com.zaruda.app.debug";
const COMPONENT = `${PKG}/com.zaruda.app.MainActivity`;

const COLD_START_MS = Number(process.env.COLD_START_MS || "30000");
const AUTH_ROUTE_MS = Number(process.env.AUTH_ROUTE_MS || "25000");
const PUBLIC_ROUTE_MS = Number(process.env.PUBLIC_ROUTE_MS || "15000");
const RECOVERY_WAIT_MS = Number(process.env.RECOVERY_WAIT_MS || "30000");
const HARD_RECOVERY_WAIT_MS = Number(process.env.HARD_RECOVERY_WAIT_MS || "45000");

const SLOW_ROUTES = new Set([
  "login",
  "nearby",
  "search",
  "subcategories",
  "add_post",
  "post_welcome",
  "tiers",
  "kyc",
  "rewards",
  "aadhaar_verify",
]);

const SLOW_ROUTE_EXTRA_MS = 15000;
const MIN_VALID_KB = 40;
const BLANK_KB = 30;

function sleep(ms) {
  spawnSync(process.execPath, ["-e", `setTimeout(() => {}, ${ms})`], { timeout: ms + 5000 });
}

function adb(...args) {
  return spawnSync(ADB, ["-s", SERIAL, ...args], {
    encoding: "utf8",
    timeout: 30000,
  });
}

function screencap(localFile) {
  try {
    const buf = execSync(`"${ADB}" -s ${SERIAL} exec-out screencap -p`, {
      maxBuffer: 50 * 1024 * 1024,
      timeout: 20000,
    });
    fs.writeFileSync(localFile, buf);
    return buf.length;
  } catch {
    return 0;
  }
}

function launchRoute(routeTarget, coldStart = false) {
  if (coldStart) {
    adb("shell", "am", "force-stop", PKG);
    sleep(700);
    adb("shell", "am", "start", "-n", COMPONENT, "--es", "debug_route", routeTarget);
    return;
  }
  adb(
    "shell",
    "am",
    "start",
    "-n",
    COMPONENT,
    "--activity-single-top",
    "--es",
    "debug_route",
    routeTarget,
  );
}

function captureRouteWithRecovery({ file, routeTarget, waitMs, slowExtraMs }) {
  const attempts = [];

  const tryCapture = (label, wait) => {
    sleep(wait);
    const bytes = screencap(file);
    const kb = Math.round(bytes / 1024);
    attempts.push({ label, wait, bytes, kb });
    return { bytes, kb };
  };

  let current = tryCapture("base", waitMs);
  if (current.bytes > 0 && current.kb >= MIN_VALID_KB) {
    return { ...current, attempts, recovered: false };
  }

  current = tryCapture("extra-wait", 15000);
  if (current.bytes > 0 && current.kb >= MIN_VALID_KB) {
    return { ...current, attempts, recovered: true };
  }

  launchRoute(routeTarget, true);
  current = tryCapture("cold-restart", Math.max(waitMs + slowExtraMs, RECOVERY_WAIT_MS));
  if (current.bytes > 0 && current.kb >= MIN_VALID_KB) {
    return { ...current, attempts, recovered: true };
  }

  launchRoute(routeTarget, true);
  current = tryCapture("hard-recovery", Math.max(waitMs + slowExtraMs + 15000, HARD_RECOVERY_WAIT_MS));
  return { ...current, attempts, recovered: true };
}

const ROUTES = [
  { key: "login", path: "/login", auth: false },
  { key: "signup", path: "/signup", auth: false },
  { key: "forgot_password", path: "/forgot-password", auth: false },

  { key: "category_hub", path: "/category-hub", auth: false },
  { key: "all_posts", path: "/all-posts", auth: false },
  { key: "for_you", path: "/for-you", auth: false },
  { key: "my_home", path: "/my-home", auth: true },
  { key: "nearby", path: "/nearby", auth: true },
  { key: "search", path: "/search", auth: false },
  { key: "subcategories", path: "/subcategories", auth: false },

  { key: "add_post", path: "/add-post", auth: true },
  { key: "post_welcome", path: "/post-welcome", auth: true },
  { key: "tiers", path: "/tier-selection", auth: true },
  { key: "cart", path: "/cart", auth: true },
  { key: "wishlist", path: "/wishlist", auth: true },
  { key: "recently_viewed", path: "/recently-viewed", auth: true },
  { key: "saved_searches", path: "/saved-searches", auth: true },
  { key: "compare", path: "/compare", auth: false },
  { key: "bought_posts", path: "/bought-posts", auth: true },
  { key: "sold_posts", path: "/sold-posts", auth: true },
  { key: "buyer_view", path: "/buyer-view", auth: true },
  { key: "sale_done", path: "/saledone", auth: true },
  { key: "sale_undone", path: "/saleundone", auth: true },
  { key: "offers", path: "/offers", auth: false },
  { key: "payment", path: "/payment", auth: true },

  { key: "feed", path: "/feed", auth: false },
  { key: "my_feed", path: "/my-feed", auth: true },
  { key: "post_add", path: "/post_add", auth: true },
  { key: "public_wall", path: "/public-wall", auth: false },
  { key: "chat", path: "/chat", auth: true },
  { key: "notifications", path: "/notifications", auth: true },
  { key: "complaints", path: "/complaints", auth: true },
  { key: "feedback", path: "/feedback", auth: true },

  { key: "dashboard", path: "/dashboard", auth: true },
  { key: "activity", path: "/activity", auth: true },
  { key: "profile", path: "/profile", auth: true },
  { key: "security", path: "/security", auth: true },
  { key: "account_delete", path: "/account/delete", auth: true },
  { key: "verification", path: "/verification", auth: true },
  { key: "aadhaar_verify", path: "/aadhaar-verify", auth: true },
  { key: "kyc", path: "/kyc", auth: true },
  { key: "rewards", path: "/rewards", auth: true },
  { key: "analytics", path: "/analytics", auth: true },

  { key: "channels", path: "/channels", auth: false },
  { key: "channel_create", path: "/channels/create", auth: true },
  { key: "centre_list", path: "/centre", auth: true },
  { key: "centre_create", path: "/centre/create", auth: true },

  { key: "terms", path: "/terms-and-conditions", auth: false },
  { key: "privacy", path: "/privacy-policy", auth: false },
  { key: "refund", path: "/refund-policy", auth: false },
  { key: "support_policy", path: "/support-ticket-policy", auth: false },
  { key: "admin_panel", path: "/admin-panel", auth: true },
];

const STAMP = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const AND_DIR = path.join(SHOTS, `android-auth-${STAMP}`);
fs.mkdirSync(AND_DIR, { recursive: true });

console.log(`\n${"=".repeat(55)}`);
console.log(` MHub Android Intent Capture - ${ROUTES.length} routes`);
console.log(`${"=".repeat(55)}`);
console.log(`Output:        ${AND_DIR}`);
console.log(`Cold start:    ${COLD_START_MS}ms`);
console.log(`Auth routes:   ${AUTH_ROUTE_MS}ms`);
console.log(`Public routes: ${PUBLIC_ROUTE_MS}ms`);
console.log(`Recovery wait: ${RECOVERY_WAIT_MS}ms / ${HARD_RECOVERY_WAIT_MS}ms`);
console.log(`Package:       ${PKG}\n`);

adb("shell", "am", "force-stop", PKG);
sleep(1000);

let success = 0;
let failed = 0;
let blank = 0;
let recovered = 0;

for (let i = 0; i < ROUTES.length; i++) {
  const { key, path: webPath, auth } = ROUTES[i];
  const slug = webPath.replace(/\//g, "_").replace(/^_/, "");
  const num = String(i + 1).padStart(3, "0");
  const file = path.join(AND_DIR, `${num}_${slug}.png`);

  const needsColdStart = i === 0 || i % 15 === 0;
  const isSlow = SLOW_ROUTES.has(key);
  const slowExtra = isSlow ? SLOW_ROUTE_EXTRA_MS : 0;
  const baseWait = needsColdStart ? COLD_START_MS : auth ? AUTH_ROUTE_MS : PUBLIC_ROUTE_MS;
  const waitMs = baseWait + slowExtra;

  process.stdout.write(
    `  [${i + 1}/${ROUTES.length}] ${key} -> ${webPath} ${auth ? "[auth]" : "[public]"} (${Math.round(waitMs / 1000)}s)${needsColdStart && i > 0 ? " [cold]" : ""}${isSlow ? " [slow]" : ""} ... `,
  );

  const routeTarget = webPath;
  launchRoute(routeTarget, needsColdStart);

  const result = captureRouteWithRecovery({
    file,
    routeTarget,
    waitMs,
    slowExtraMs: slowExtra,
  });

  const { bytes, kb, attempts, recovered: usedRecovery } = result;
  if (usedRecovery) {
    recovered++;
    const attemptSummary = attempts.map((a) => `${a.label}:${a.kb}KB`).join(", ");
    process.stdout.write(`recovery(${attemptSummary}) ... `);
  }

  if (bytes === 0) {
    console.log("x screencap failed");
    failed++;
  } else if (kb < BLANK_KB) {
    console.log(`! ${kb}KB (likely blank/transition)`);
    blank++;
  } else {
    console.log(`ok ${kb}KB`);
    success++;
  }
}

console.log(`\n${"-".repeat(55)}`);
console.log(`Done: ${success} captured, ${blank} possibly blank, ${failed} failed, ${recovered} recovered`);
console.log(`Total: ${ROUTES.length} routes`);
console.log(`Output: ${AND_DIR}\n`);

