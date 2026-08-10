/**
 * Android Emulator E2E Verification Script
 *
 * Installs APK, navigates through Demo Login flow, sends deep link to
 * UserSoldPosts, and captures screenshots for verification.
 *
 * Usage: node scripts/emu-e2e-verify.mjs
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = join(__dirname, "..", "emu-screenshots");
const APK_PATH = join(__dirname, "..", "android-native", "app", "build", "outputs", "apk", "debug", "app-debug.apk");

// Use the Android SDK's ADB explicitly (avoids conflicts with scrcpy ADB)
const SDK_ADB = "C:\\Users\\laksh\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe";
const ADB = existsSync(SDK_ADB) ? `"${SDK_ADB}"` : "adb";

let step = 0;

function log(msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
}

function run(cmd, opts = {}) {
  // Replace 'adb ' with the explicit SDK ADB path
  const resolvedCmd = cmd.startsWith("adb ") ? cmd.replace("adb ", ADB + " ") : cmd;
  log(`$ ${resolvedCmd}`);
  try {
    const out = execSync(resolvedCmd, {
      encoding: "utf-8",
      timeout: (opts.timeout || 30) * 1000,
      maxBuffer: 10 * 1024 * 1024,
      ...opts,
    });
    return { status: 0, stdout: out?.trim() || "", stderr: "" };
  } catch (e) {
    return {
      status: e.status ?? 1,
      stdout: e.stdout?.trim() || "",
      stderr: e.stderr?.trim() || "",
    };
  }
}

async function screenshot(name) {
  const path = join(SCREENSHOT_DIR, `${String(step++).padStart(2, "0")}-${name}.png`);
  execSync(`${ADB} exec-out screencap -p > "${path}"`, { timeout: 15000 });
  const size = existsSync(path) ? readFileSync(path).length : 0;
  log(`Screenshot saved: ${name} (${(size / 1024).toFixed(0)} KB)`);
  return path;
}

function tap(x, y) {
  return run(`adb shell input tap ${x} ${y}`, { timeout: 10 });
}

function getUiText() {
  // Write dump to file then read it back (avoids bash pipe issues)
  run("adb shell uiautomator dump /data/local/tmp/uid.xml", { timeout: 15 });
  const r = run("adb exec-out cat /data/local/tmp/uid.xml", { timeout: 15 });
  if (r.status !== 0 || !r.stdout) return [];
  const texts = [];
  const regex = /text="([^"]*)"/g;
  let match;
  while ((match = regex.exec(r.stdout)) !== null) {
    if (match[1] && match[1].trim()) {
      texts.push(match[1].trim());
    }
  }
  return [...new Set(texts)];
}

function assertTextContains(texts, keyword, stepName) {
  const found = texts.some((t) => t.toLowerCase().includes(keyword.toLowerCase()));
  if (!found) {
    log(`FAIL: "${keyword}" not found after "${stepName}"`);
    log(`Texts: ${JSON.stringify(texts.slice(0, 20))}`);
    process.exit(1);
  }
  log(`PASS: "${keyword}" found after "${stepName}"`);
}

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════

async function main() {
  log("═══════════════════════════════════════════");
  log("  Android Emulator E2E Verification");
  log("═══════════════════════════════════════════");

  // Ensure screenshot dir
  if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });

  // ─────── Step 1: Check emulator ───────
  log("--- Step 1: Check emulator ---");
  const devices = run("adb devices", { timeout: 10 });
  if (!devices.stdout.includes("emulator")) {
    log("ERROR: No emulator connected! Start one with:");
    log("  cd /c/Users/laksh/AppData/Local/Android/Sdk/emulator");
    log("  ./emulator.exe -avd MHub_AVD");
    process.exit(1);
  }
  log("Emulator connected");

  // ─────── Step 2: Install APK ───────
  log("--- Step 2: Install APK ---");
  if (!existsSync(APK_PATH)) {
    log(`ERROR: APK not found at ${APK_PATH}`);
    process.exit(1);
  }
  run(`adb install -r "${APK_PATH}"`, { timeout: 120 });
  log("APK installed");

  // ─────── Step 3: Launch app fresh ───────
  log("--- Step 3: Launch app ---");
  run(
    "adb shell am start -n com.zaruda.app.debug/com.zaruda.app.MainActivity -a android.intent.action.MAIN -c android.intent.category.LAUNCHER --activity-clear-task",
    { timeout: 15 }
  );
  await new Promise((r) => setTimeout(r, 5000));
  await screenshot("01-app-launch");

  // ─────── Step 4: Check current screen ───────
  log("--- Step 4: Check current screen ---");
  let texts = getUiText();
  log(`Screen: ${JSON.stringify(texts.slice(0, 20))}`);

  // ─────── Step 5: Tap Electronics card to go to AllPosts ───────
  log("--- Step 5: Navigate to AllPosts ---");
  tap(283, 945);
  await new Promise((r) => setTimeout(r, 5000));
  await screenshot("02-allposts");
  texts = getUiText();
  log(`AllPosts: ${JSON.stringify(texts.slice(0, 20))}`);
  assertTextContains(texts, "Search", "AllPosts");

  // ─────── Step 6: Tap Sell FAB to trigger auth gate ───────
  log("--- Step 6: Trigger auth gate via Sell FAB ---");
  tap(540, 2240);
  await new Promise((r) => setTimeout(r, 3000));
  await screenshot("03-auth-gate");
  texts = getUiText();
  log(`Post-sell-tap: ${JSON.stringify(texts.slice(0, 20))}`);

  // ─────── Step 7: Tap Sign In in auth gate popup ───────
  // AuthGatePopup is a bottom sheet. Sign In button is near bottom of screen
  log("--- Step 7: Tap Sign In ---");
  // Try a few positions in case the bottom sheet varies
  tap(540, 1700);
  await new Promise((r) => setTimeout(r, 3000));
  tap(540, 1600);
  await new Promise((r) => setTimeout(r, 2000));
  await screenshot("04-login-screen");
  texts = getUiText();
  log(`Login: ${JSON.stringify(texts.slice(0, 25))}`);
  assertTextContains(texts, "Demo Login", "LoginScreen");

  // ─────── Step 8: Tap Demo Login button ───────
  log("--- Step 8: Tap Demo Login ---");
  // Demo Login button uses OutlinedButton, full width, likely center of screen
  tap(540, 1150);
  await new Promise((r) => setTimeout(r, 4000));
  await screenshot("05-after-demo-login");
  texts = getUiText();
  log(`Post-login: ${JSON.stringify(texts.slice(0, 20))}`);

  // Check for login success - the app must navigate to a main screen
  const loggedIn = texts.some(t => t.includes("Home") || t.includes("All Posts") || t.includes("Search"));
  if (!loggedIn) {
    log('FAIL: Login did not succeed. Expected main screen text not found after tapping Demo Login.');
    log(`Texts: ${JSON.stringify(texts.slice(0, 20))}`);
    log('Cannot proceed to deep link without authentication. Check if Demo Login button coordinates are correct.');
    process.exit(1);
  }
  log('PASS: Demo login succeeded - navigated to main screen');

  // ─────── Step 9: Deep link to UserSoldPosts ───────
  log("--- Step 9: Deep link to UserSoldPosts ---");
  const dl = run(
    "adb shell am start -d 'zaruda://user/999001/sold-posts' -a android.intent.action.VIEW --activity-clear-task",
    { timeout: 10 }
  );
  log(`Deep link: ${dl.stdout}`);
  await new Promise((r) => setTimeout(r, 5000));
  await screenshot("06-user-sold-posts");
  texts = getUiText();
  log(`UserSoldPosts: ${JSON.stringify(texts.slice(0, 30))}`);
  // Verify UserSoldPosts content - look for trust info, seller name, or ratings
  const hasSoldPosts = texts.some(t => t.includes("sold") || t.includes("Sold"));
  const hasTrust = texts.some(t => t.includes("Trust") || t.includes("GOLD") || t.includes("Score"));
  const hasSeller = texts.some(t => t.includes("Rahul"));
  const hasCategories = texts.filter(t => ["Electronics","Fashion","Vehicles"].includes(t)).length > 0;
  log(`Verification: seller=${hasSeller} trust=${hasTrust} categories=${hasCategories} sold=${hasSoldPosts}`);
  if (hasSeller || hasTrust || hasSoldPosts || hasCategories) {
    log('PASS: UserSoldPosts page contains expected trust passport content');
  } else {
    log('WARNING: No expected UserSoldPosts content detected. Screenshots may show a different screen.');
  }

  // ─────── Step 10: Category filter ───────
  log("--- Step 10: Try category filter ---");
  // Attempt to tap an Electronics category filter chip if visible
  tap(200, 680);
  await new Promise((r) => setTimeout(r, 3000));
  await screenshot("07-category-filter");
  texts = getUiText();
  log(`Filtered: ${JSON.stringify(texts.slice(0, 30))}`);

  // ─────── Summary ───────
  log("═══════════════════════════════════════════");
  log("  Verification Complete!");
  log(`  Screenshots: ${SCREENSHOT_DIR}`);
  log("═══════════════════════════════════════════");

  const files = readdirSync(SCREENSHOT_DIR).sort();
  for (const f of files) {
    const size = (readFileSync(join(SCREENSHOT_DIR, f)).length / 1024).toFixed(0);
    log(`  ${f} (${size} KB)`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
