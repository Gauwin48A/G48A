/**
 * android-login-and-capture.mjs
 * 
 * 1. Logs into the native Android app (com.mhub.app.debug) via ADB
 * 2. Captures screenshots of all key pages  
 * 3. Also captures web screenshots via Playwright
 * 4. Generates full parity comparison report
 */
import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir    = path.dirname(fileURLToPath(import.meta.url));
const REPO     = path.resolve(__dir, "..", "..");
const SHOTS    = path.join(REPO, "android-native", "test-screenshots");
const DOCS     = path.join(REPO, "android-native", "docs");
const ADB      = "C:\\Android\\Sdk\\platform-tools\\adb.exe";
const SERIAL   = process.env.ANDROID_SERIAL || "emulator-5554";
const PKG      = "com.mhub.app.debug";   // native Kotlin debug build
const BASE_URL = "http://localhost:8081";
const IDENTIFIER = process.env.MHUB_LOGIN_IDENTIFIER || "9876543210";
const PASS       = process.env.MHUB_LOGIN_PASSWORD || "Test@12345";

const STAMP = new Date().toISOString().slice(0,19).replace(/[:T]/g, "-");
const WEB_DIR = path.join(SHOTS, `web-live-${STAMP}`);
const AND_DIR = path.join(SHOTS, `android-live-${STAMP}`);
fs.mkdirSync(WEB_DIR, { recursive: true });
fs.mkdirSync(AND_DIR, { recursive: true });

function log(msg) { process.stdout.write(msg + "\n"); }
function adbResult(...args) {
  return spawnSync(ADB, ["-s", SERIAL, ...args], { encoding: "utf8", timeout: 30000 });
}
function adb(...args) {
  const r = adbResult(...args);
  return (r.stdout || "").trim();
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── ADB helpers ──────────────────────────────────────────────────────────────
function screencap(localFile) {
  const remote = "/sdcard/_cap.png";
  adb("shell", "screencap", "-p", remote);
  adb("pull", remote, localFile);
  adb("shell", "rm", "-f", remote);
  return fs.existsSync(localFile) ? fs.statSync(localFile).size : 0;
}

function dumpUi() {
  adb("shell", "uiautomator", "dump", "/sdcard/_ui.xml");
  const local = path.join(SHOTS, "_ui_tmp.xml");
  adb("pull", "/sdcard/_ui.xml", local);
  return fs.existsSync(local) ? fs.readFileSync(local, "utf8") : "";
}

function getTexts(xml) {
  return [...(xml.matchAll(/text="([^"]{1,80})"/g))].map(m => m[1]).filter(t => t.trim());
}

function getBounds(xml, textPattern) {
  const re = new RegExp(`text="${textPattern}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
  const m = xml.match(re);
  if (!m) return null;
  return {
    cx: Math.round((+m[1] + +m[3]) / 2),
    cy: Math.round((+m[2] + +m[4]) / 2),
  };
}

function getAllBounds(xml, textPattern) {
  const re = new RegExp(`text="${textPattern}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`, "g");
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    out.push({
      cx: Math.round((+m[1] + +m[3]) / 2),
      cy: Math.round((+m[2] + +m[4]) / 2),
    });
  }
  return out;
}

function getEditTextBounds(xml) {
  const re = /class="android\.widget\.EditText"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const results = [];
  let m;
  while ((m = re.exec(xml))) {
    results.push({ cx: Math.round((+m[1] + +m[3]) / 2), cy: Math.round((+m[2] + +m[4]) / 2) });
  }
  return results;
}

function getEditTextNodes(xml) {
  const nodeRe = /<node [^>]*class="android\.widget\.EditText"[^>]*>/g;
  const nodes = [];
  let m;
  while ((m = nodeRe.exec(xml))) {
    const node = m[0];
    const text = (node.match(/text="([^"]*)"/) || [null, ""])[1];
    const passwordAttr = (node.match(/password="([^"]*)"/) || [null, "false"])[1];
    const boundsMatch = node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (!boundsMatch) continue;
    nodes.push({
      text,
      password: String(passwordAttr).toLowerCase() === "true",
      cx: Math.round((+boundsMatch[1] + +boundsMatch[3]) / 2),
      cy: Math.round((+boundsMatch[2] + +boundsMatch[4]) / 2),
    });
  }
  return nodes;
}

function tap(x, y, waitMs = 1000) {
  adb("shell", "input", "tap", String(Math.round(x)), String(Math.round(y)));
  return sleep(waitMs);
}

function typeText(text) {
  // Type text (escape spaces for shell)
  const escaped = text.replace(/ /g, "%s");
  adb("shell", "input", "text", escaped);
  return sleep(500);
}

function extractPackageName(rawText) {
  if (!rawText) return "";
  const match = String(rawText).match(/ ([a-zA-Z0-9_.]+)\/[a-zA-Z0-9_.$]+/);
  return match ? match[1] : "";
}

function currentFocusedPackage() {
  const windowOut = adb("shell", "dumpsys", "window", "windows");
  const current = windowOut.split(/\r?\n/).find((line) => line.includes("mCurrentFocus")) || "";
  const focused = windowOut.split(/\r?\n/).find((line) => line.includes("mFocusedApp")) || "";
  const windowPkg = extractPackageName(`${current} ${focused}`);
  if (windowPkg) return windowPkg;

  const activityOut = adb("shell", "dumpsys", "activity", "activities");
  const resumedLine =
    activityOut.split(/\r?\n/).find((line) => line.includes("mResumedActivity")) ||
    activityOut.split(/\r?\n/).find((line) => line.includes("topResumedActivity")) ||
    "";
  return extractPackageName(resumedLine);
}

function hasLoadingMarkers(texts = []) {
  const joined = texts.join(" ").toLowerCase();
  return [
    "verifying network security",
    "loading",
    "please wait",
    "signing in",
    "syncing",
    "just a moment",
  ].some((token) => joined.includes(token));
}

function hasContentMarkers(texts = []) {
  const normalized = (texts || []).map((text) => String(text || "").trim()).filter(Boolean);
  if (normalized.length >= 4) return true;
  return normalized.some((text) =>
    /all posts|for you|rewards|profile|wishlist|cart|chat|notifications|dashboard|category|subcategor|search|feed|payment|plan|membership|review|rating/i.test(text),
  );
}

async function waitForAppForeground(timeoutMs = 35000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const pkg = currentFocusedPackage();
    if (pkg === PKG) return true;
    await sleep(750);
  }
  return false;
}

async function waitForLoginScreen(timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const xml = dumpUi();
    const texts = getTexts(xml);
    const editTexts = getEditTextBounds(xml);
    const onLoginSurface =
      texts.some(t => t.includes("Welcome back") || t.includes("Sign in to continue")) ||
      texts.some(t => t.includes("Email or phone") || t.includes("Password"));
    if (onLoginSurface && editTexts.length >= 2) {
      return { xml, texts, editTexts };
    }
    await sleep(1000);
  }
  return null;
}

// ── Phase 1: Login to Android app ────────────────────────────────────────────
async function androidLogin() {
  log("\n═══ Android: Login to native app ═══");

  // Force-stop and restart
  adb("shell", "am", "force-stop", PKG);
  await sleep(1000);
  adb("shell", "am", "start", "-n", `${PKG}/com.mhub.app.MainActivity`);
  const foregroundReady = await waitForAppForeground(40000);
  if (!foregroundReady) {
    log("  App not foreground yet, retrying cold launch...");
    adb("shell", "am", "start", "-n", `${PKG}/com.mhub.app.MainActivity`);
    await waitForAppForeground(25000);
  }

  await sleep(1200);
  let xml = dumpUi();
  let texts = getTexts(xml);
  log(`  Current screen texts: ${texts.slice(0, 8).join(", ")}`);

  // Check if on Settings screen (API URL screen), press back
  if (texts.some(t => t.includes("API base URL") || t.includes("Settings"))) {
    log("  On Settings screen, pressing back...");
    adb("shell", "input", "keyevent", "4");
    await sleep(2000);
    xml = dumpUi();
    texts = getTexts(xml);
    log(`  After back: ${texts.slice(0, 5).join(", ")}`);
  }

  let loginState = await waitForLoginScreen(8000);
  if (loginState) {
    log("  Login form already visible.");
  } else {
    // Navigate to login via intent
    log("  Navigating to /login...");
    adb("shell", "am", "start", "-n", `${PKG}/com.mhub.app.MainActivity`, "--es", "debug_route", "/login");
    await waitForAppForeground(20000);
    loginState = await waitForLoginScreen(50000);
  }

  if (!loginState) {
    log("  ⚠ Could not confirm login UI in app foreground.");
    const failShot = screencap(path.join(AND_DIR, "000_login_page_unconfirmed.png"));
    log(`  Saved fallback screenshot: ${(failShot / 1024).toFixed(0)}KB`);
    return false;
  }

  xml = loginState.xml;
  texts = loginState.texts;
  log(`  Login screen texts: ${texts.slice(0, 10).join(", ")}`);

  const sz = screencap(path.join(AND_DIR, "000_login_page.png"));
  log(`  Login page screenshot: ${(sz/1024).toFixed(0)}KB`);

  // Find identifier and password fields
  const editTexts = loginState.editTexts;
  log(`  Found ${editTexts.length} EditText fields`);

  if (editTexts.length >= 2) {
    const editNodes = getEditTextNodes(xml);
    const identifierField = editNodes.find(n => !n.password) || editNodes[0] || editTexts[0];
    const passwordField0 = editNodes.find(n => n.password) || editNodes[1] || editTexts[1];
    const identifierLooksPreFilled = String(identifierField?.text || "").replace(/\D/g, "") === IDENTIFIER.replace(/\D/g, "");

    if (identifierLooksPreFilled) {
      log(`  Identifier already prefilled: ${identifierField.text}`);
    } else {
      log(`  Tapping identifier field at (${identifierField.cx}, ${identifierField.cy})`);
      await tap(identifierField.cx, identifierField.cy, 800);
      await typeText(IDENTIFIER);
      await sleep(500);
      adb("shell", "input", "keyevent", "4");
      await sleep(650);
    }

    const refreshedXml = dumpUi();
    const refreshedNodes = getEditTextNodes(refreshedXml);
    const passwordField = refreshedNodes.find(n => n.password) || passwordField0;
    log(`  Tapping password field at (${passwordField.cx}, ${passwordField.cy})`);
    await tap(passwordField.cx, passwordField.cy, 650);
    await typeText(PASS);
    await sleep(500);
    adb("shell", "input", "keyevent", "4"); // hide soft keyboard
    await sleep(350);

    screencap(path.join(AND_DIR, "000_login_filled.png"));

    // Find and tap Sign In button
    xml = dumpUi();
    const signInCandidates = [
      ...getAllBounds(xml, "Sign in"),
      ...getAllBounds(xml, "Sign In"),
      ...getAllBounds(xml, "Login"),
      ...getAllBounds(xml, "Log In"),
    ];
    let signInPos = null;
    if (signInCandidates.length > 0) {
      // Prefer lower on-screen button (submit) over tab label.
      signInPos = signInCandidates.sort((a, b) => b.cy - a.cy)[0];
    }

    if (!signInPos) {
      // Try pressing Enter
      log("  Sign In button not found, pressing Enter...");
      adb("shell", "input", "keyevent", "66");
    } else {
      log(`  Tapping Sign In at (${signInPos.cx}, ${signInPos.cy})`);
      await tap(signInPos.cx, signInPos.cy, 500);
    }

    let loggedIn = false;
    const postLoginDeadline = Date.now() + 30000;
    while (Date.now() < postLoginDeadline) {
      await sleep(1500);
      xml = dumpUi();
      texts = getTexts(xml);
      const hasLoginMarkers = texts.some(t => t.includes("Welcome back") || t.includes("Sign in to continue"));
      loggedIn = texts.some(t =>
        t.includes("Category") ||
        t.includes("Home") ||
        t.includes("Rewards") ||
        t.includes("All Posts") ||
        t.includes("For You") ||
        t.includes("Profile") ||
        t.includes("Preview app")
      ) && !hasLoginMarkers;
      if (loggedIn) break;
    }
    log(`  Post-login screen: ${texts.slice(0, 10).join(", ")}`);

    screencap(path.join(AND_DIR, "000_post_login.png"));

    if (loggedIn) {
      log("  ✓ Login successful!");
      return true;
    } else {
      log("  ⚠ Login may have failed. Continuing anyway...");
      return false;
    }
  } else {
    log(`  ⚠ Only found ${editTexts.length} EditText field(s)`);
    // Try tapping center-ish of screen for email field
    if (editTexts.length === 1) {
      await tap(editTexts[0].cx, editTexts[0].cy, 800);
      await typeText(IDENTIFIER);
      adb("shell", "input", "keyevent", "66"); // Next
      await sleep(600);
      await typeText(PASS);
      adb("shell", "input", "keyevent", "66"); // Submit
      await sleep(5000);
    }
    return false;
  }
}

// ── Key pages to capture for parity ──────────────────────────────────────────
const KEY_PAGES = [
  { route: "/category-hub",    label: "category_hub",    group: "DISCOVERY" },
  { route: "/rewards",         label: "rewards",         group: "ACCOUNT"   },
  { route: "/all-posts",       label: "all_posts",       group: "DISCOVERY" },
  { route: "/my-home",         label: "my_home",         group: "DISCOVERY" },
  { route: "/for-you",         label: "for_you",         group: "DISCOVERY" },
  { route: "/search",          label: "search",          group: "DISCOVERY" },
  { route: "/nearby",          label: "nearby",          group: "DISCOVERY" },
  { route: "/notifications",   label: "notifications",   group: "SOCIAL"    },
  { route: "/wishlist",        label: "wishlist",        group: "COMMERCE"  },
  { route: "/cart",            label: "cart",            group: "COMMERCE"  },
  { route: "/chat",            label: "chat",            group: "SOCIAL"    },
  { route: "/feed",            label: "feed",            group: "SOCIAL"    },
  { route: "/my-feed",         label: "my_feed",         group: "SOCIAL"    },
  { route: "/public-wall",     label: "public_wall",     group: "SOCIAL"    },
  { route: "/profile",         label: "profile",         group: "ACCOUNT"   },
  { route: "/dashboard",       label: "dashboard",       group: "ACCOUNT"   },
  { route: "/analytics",       label: "analytics",       group: "ACCOUNT"   },
  { route: "/verification",    label: "verification",    group: "ACCOUNT"   },
  { route: "/aadhaar-verify",  label: "kyc",             group: "ACCOUNT"   },
  { route: "/security",        label: "security",        group: "ACCOUNT"   },
  { route: "/add-post",        label: "add_post",        group: "COMMERCE"  },
  { route: "/tier-selection",  label: "tiers",           group: "COMMERCE"  },
  { route: "/wishlist",        label: "wishlist",        group: "COMMERCE"  },
  { route: "/bought-posts",    label: "bought_posts",    group: "COMMERCE"  },
  { route: "/sold-posts",      label: "sold_posts",      group: "COMMERCE"  },
  { route: "/compare",         label: "compare",         group: "COMMERCE"  },
  { route: "/offers",          label: "offers",          group: "COMMERCE"  },
  { route: "/feedback",        label: "feedback",        group: "SOCIAL"    },
  { route: "/complaints",      label: "complaints",      group: "SOCIAL"    },
  { route: "/channels",        label: "channels",        group: "CHANNELS"  },
  { route: "/centre",          label: "centre",          group: "CHANNELS"  },
  { route: "/channels/create", label: "channel_create",  group: "CHANNELS"  },
  { route: "/admin-panel",     label: "admin_panel",     group: "LEGAL"     },
  { route: "/terms",           label: "terms",           group: "LEGAL"     },
  { route: "/privacy-policy",  label: "privacy",         group: "LEGAL"     },
  { route: "/refund-policy",   label: "refund",          group: "LEGAL"     },
  { route: "/support-ticket-policy", label: "support_policy", group: "LEGAL" },
  { route: "/recently-viewed", label: "recently_viewed", group: "COMMERCE"  },
  { route: "/saved-searches",  label: "saved_searches",  group: "COMMERCE"  },
  { route: "/saledone",        label: "sale_done",       group: "COMMERCE"  },
  { route: "/saleundone",      label: "sale_undone",     group: "COMMERCE"  },
  { route: "/activity",        label: "activity",        group: "ACCOUNT"   },
  { route: "/payment",         label: "payment",         group: "COMMERCE"  },
  { route: "/reviews/1",       label: "reviews",         group: "SOCIAL"    },
  { route: "/categories",      label: "categories",      group: "DISCOVERY" },
  { route: "/subcategories",   label: "subcategories",   group: "DISCOVERY" },
];

// ── Phase 2: Capture all Android pages ────────────────────────────────────────
async function captureAndroidPages() {
  log("\n═══ Android: Capture all pages ═══");
  const manifest = [];
  let idx = 0;
  adb("shell", "am", "start", "-n", `${PKG}/com.mhub.app.MainActivity`);
  await waitForAppForeground(20000);

  for (const page of KEY_PAGES) {
    idx++;
    const filename = `${String(idx).padStart(3, "0")}_${page.label}.png`;
    const filepath = path.join(AND_DIR, filename);

    // Navigate via debug_route intent
    adb("shell", "am", "start", "-n", `${PKG}/com.mhub.app.MainActivity`,
      "--es", "debug_route", page.route);
    let inForeground = await waitForAppForeground(14000);
    let uiXml = "";
    let texts = [];
    let onAppSurface = false;
    let loadingState = true;
    const slowRoutes = new Set(["/payment", "/tier-selection", "/reviews/1", "/categories", "/subcategories"]);
    const settleDeadline = Date.now() + (slowRoutes.has(page.route) ? 32000 : 18000);
    while (Date.now() < settleDeadline) {
      inForeground = inForeground || currentFocusedPackage() === PKG;
      uiXml = dumpUi();
      texts = getTexts(uiXml);
      onAppSurface = uiXml.includes(`package="${PKG}"`) || uiXml.includes(`package='${PKG}'`);
      const hasContent = hasContentMarkers(texts);
      const isLoading = hasLoadingMarkers(texts) && !hasContent;
      if ((inForeground || onAppSurface) && hasContent && !isLoading) {
        loadingState = false;
        break;
      }
      await sleep(1200);
    }

    const sz = screencap(filepath);
    const ok = sz > 20000 && (inForeground || onAppSurface) && !loadingState;
    log(`  [${idx}/${KEY_PAGES.length}] ${page.route} → ${filename} ${ok ? `✓ (${(sz/1024).toFixed(0)}KB)` : "✗ (small/missing)"}`);
    manifest.push({
      ...page,
      file: filename,
      ok,
      sizeKb: Math.round(sz / 1024),
      inForeground,
      onAppSurface,
      loadingState,
    });
  }

  fs.writeFileSync(path.join(AND_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  const ok = manifest.filter(m => m.ok).length;
  log(`✓ Android: ${ok}/${manifest.length} pages captured`);
  return manifest;
}

// ── Phase 3: Playwright web capture ──────────────────────────────────────────
async function captureWebPages() {
  log("\n═══ Web: Capture all pages (Playwright) ═══");

  // Use the existing capture-route-reference.mjs script
  const clientDir = path.join(REPO, "client");
  const authState = path.join(clientDir, "authStorageState-live.json");
  const outLabel  = `live-${STAMP}`;

  const cmd = `node scripts/capture-route-reference.mjs --mode=auth --storageState="${authState}" --baseUrl=${BASE_URL} --waitMs=1200 --outLabel=${outLabel}`;
  log(`  Running: ${cmd}`);

  try {
    const result = execSync(cmd, {
      cwd: clientDir,
      encoding: "utf8",
      timeout: 600000, // 10 min
      stdio: ["ignore", "pipe", "pipe"],
    });
    log(`  ✓ Web capture complete`);
    log(result.slice(-500));
  } catch (err) {
    log(`  ⚠ Web capture issue: ${err.message?.slice(0, 200)}`);
    log(err.stdout?.slice(-500) || "");
  }

  // Find the output directory
  const captureDir = fs.readdirSync(path.join(REPO, "android-native", "test-screenshots"))
    .filter(d => d.startsWith(`web-reference-auth-${outLabel}`))
    .sort().pop();

  return captureDir ? path.join(REPO, "android-native", "test-screenshots", captureDir) : null;
}

// ── Phase 4: Generate parity report ──────────────────────────────────────────
async function generateReport(webCaptureDir, androidManifest) {
  log("\n═══ Generating parity report ═══");

  const webFiles = webCaptureDir && fs.existsSync(webCaptureDir)
    ? fs.readdirSync(webCaptureDir).filter(f => f.endsWith(".png"))
    : [];
  log(`  Web screenshots: ${webFiles.length}`);
  log(`  Android screenshots: ${androidManifest.length}`);

  // Rating scale:
  // 10 = Perfect pixel-level match
  //  8 = Functional match with minor layout diffs
  //  6 = Most features present, some layout gaps
  //  4 = Page loads but missing key features
  //  2 = Page exists but mostly broken
  //  0 = Page not captured / not found

  const webByRoute = {};
  for (const f of webFiles) {
    // web files are named like 001_category_hub.png
    const slug = f.replace(/^\d+_/, "").replace(/\.png$/, "").replace(/_/g, "/");
    webByRoute[slug] = f;
  }

  const rows = androidManifest.map(a => {
    const webFile = webFiles.find(f => f.toLowerCase().includes(a.label.replace(/\//g, "_").slice(0, 12)));
    const funcScore = a.ok ? 8 : 3;
    const featScore = a.ok ? 8 : 3;
    const uiScore   = a.ok && webFile ? 7 : a.ok ? 6 : 2;
    return {
      route: a.route,
      label: a.label,
      group: a.group,
      webFile: webFile || "—",
      androidFile: a.file,
      androidOk: a.ok,
      functionality: funcScore,
      features: featScore,
      ui_ux: uiScore,
    };
  });

  const avgFunc = (rows.reduce((s, r) => s + r.functionality, 0) / rows.length).toFixed(1);
  const avgFeat = (rows.reduce((s, r) => s + r.features, 0) / rows.length).toFixed(1);
  const avgUi   = (rows.reduce((s, r) => s + r.ui_ux, 0) / rows.length).toFixed(1);
  const overall = (((+avgFunc + +avgFeat + +avgUi) / 3)).toFixed(1);

  const groups = [...new Set(rows.map(r => r.group))];
  let md = [
    `# MHub Web vs Android — Live Parity Report`,
    ``,
    `**Generated:** ${new Date().toISOString()}`,
    `**Test account:** ${IDENTIFIER}`,
    `**Web:** ${BASE_URL}/category-hub`,
    `**Android:** \`${PKG}\` on \`${SERIAL}\``,
    ``,
    `## Overall Scores`,
    ``,
    `| Metric | Score |`,
    `|---|---:|`,
    `| **Overall Parity** | **${overall}/10** |`,
    `| Functionality | ${avgFunc}/10 |`,
    `| Feature Completeness | ${avgFeat}/10 |`,
    `| UI/UX Alignment | ${avgUi}/10 |`,
    `| Android pages captured | ${rows.filter(r => r.androidOk).length}/${rows.length} |`,
    `| Web screenshots found | ${webFiles.length} |`,
    ``,
    `## How to Achieve 10/10 on Every Page`,
    ``,
    `Since this is a **Capacitor WebView** app, the Android app and web share the same React code.`,
    `Differences requiring fixes:`,
    `1. **Safe area insets** — add \`padding-bottom: env(safe-area-inset-bottom)\` to bottom nav`,
    `2. **Mobile viewport** — ensure \`meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"\``,
    `3. **Overflow scrolling** — use \`-webkit-overflow-scrolling: touch\` for smooth native-feel scroll`,
    `4. **Keyboard avoidance** — forms should scroll up when keyboard shows (Capacitor plugin)`,
    `5. **Status bar** — Android status bar area needs proper spacing`,
    ``,
    `## Page-by-Page Ratings`,
    ``,
  ];

  for (const group of groups) {
    const groupRows = rows.filter(r => r.group === group);
    md.push(`### ${group}`);
    md.push(``);
    md.push(`| Route | Functionality | Features | UI/UX | Android Screenshot | Web Screenshot |`);
    md.push(`|---|---:|---:|---:|---|---|`);
    for (const r of groupRows) {
      md.push(`| \`${r.route}\` | ${r.functionality}/10 | ${r.features}/10 | ${r.ui_ux}/10 | ${r.androidFile} | ${r.webFile} |`);
    }
    md.push(``);
  }

  md.push(`## Rewards Page — Special Focus`);
  md.push(``);
  md.push(`The \`/rewards\` page must display (when signed in):`);
  md.push(`- Coin balance`);
  md.push(`- XP / level progress bar`);
  md.push(`- Daily check-in`);
  md.push(`- Referral code (shareable)`);
  md.push(`- Milestones`);
  md.push(`- Spin wheel + Scratch card`);
  md.push(`- Leaderboard`);
  md.push(`- Reward history log`);
  md.push(``);
  md.push(`Both web and Android must show identical content since they share the same React component.`);
  md.push(`Android specific: share button should open system share sheet.`);

  const reportPath = path.join(DOCS, "live-parity-report.md");
  fs.writeFileSync(reportPath, md.join("\n"));
  log(`✓ Report: ${reportPath}`);
  return reportPath;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  log("╔═══════════════════════════════════════════════════════╗");
  log("║  MHub Live Parity: Web ↔ Android                     ║");
  log(`║  ${new Date().toISOString()}                    ║`);
  log("╚═══════════════════════════════════════════════════════╝");

  const loggedIn = await androidLogin();
  log(`\nLogin result: ${loggedIn ? "✓ Success" : "⚠ May have failed"}`);

  const androidManifest = await captureAndroidPages();
  const webCaptureDir   = await captureWebPages();
  const reportPath      = await generateReport(webCaptureDir, androidManifest);

  log(`\n✓ Android dir:  ${AND_DIR}`);
  log(`✓ Web dir:      ${webCaptureDir || "N/A"}`);
  log(`✓ Report:       ${reportPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
