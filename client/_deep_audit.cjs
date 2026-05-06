/**
 * Deep Page Audit — navigates all routes via CDP, captures screenshots,
 * performs DOM analysis, and scores on 10-axis rubric.
 */
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const CDP_URL = "http://localhost:9222";
const SCREENSHOT_DIR = path.join(__dirname, "_audit_screenshots");
const RESULTS_FILE = path.join(__dirname, "_audit_results.json");

// All rated routes (grouped by auth requirement)
// NOTE: Removed redirect-only routes (/ → /category-hub, /listings → /all-posts)
const ROUTES = [
  // Public pages (no auth needed)
  { path: "/all-posts", name: "all-posts" },
  { path: "/login", name: "login", type: "auth" },
  { path: "/signup", name: "signup", type: "auth" },
  { path: "/forgot-password", name: "forgot-password", type: "auth" },
  { path: "/categories", name: "categories" },
  { path: "/subcategories/electronics", name: "subcategories" },
  { path: "/category-hub", name: "category-hub", type: "hub" },
  { path: "/search", name: "search" },
  { path: "/for-you", name: "for-you" },
  { path: "/post/demo-1", name: "post-detail" },
  { path: "/feed/demo-1", name: "feed-detail" },
  { path: "/public-wall", name: "public-wall" },
  { path: "/nearby", name: "nearby" },
  { path: "/compare", name: "compare" },
  { path: "/terms", name: "terms" },
  { path: "/privacy-policy", name: "privacy-policy" },
  { path: "/refund-policy", name: "refund-policy" },
  { path: "/support-ticket-policy", name: "support-ticket-policy" },
  { path: "/pricing", name: "pricing" },
  { path: "/tier-selection", name: "tier-selection" },
  { path: "/payment", name: "payment" },
  { path: "/invite", name: "invite" },
  { path: "/channels", name: "channels" },
  { path: "/channels/test-channel", name: "channel-detail" },
  { path: "/centre", name: "centre" },
  { path: "/centre/test-centre", name: "centre-detail" },
  // Auth-gated pages (will show RequireAuth gate)
  { path: "/dashboard", name: "dashboard" },
  { path: "/my-feed", name: "my-feed" },
  { path: "/profile", name: "profile" },
  { path: "/my-posts", name: "my-posts" },
  { path: "/add-post", name: "add-post" },
  { path: "/sold-posts", name: "sold-posts" },
  { path: "/bought-posts", name: "bought-posts" },
  { path: "/cart", name: "cart" },
  { path: "/wishlist", name: "wishlist" },
  { path: "/chat", name: "chat" },
  { path: "/notifications", name: "notifications" },
  { path: "/offers", name: "offers" },
  { path: "/saved-searches", name: "saved-searches" },
  { path: "/recently-viewed", name: "recently-viewed" },
  { path: "/activity", name: "activity" },
  { path: "/reviews/user-1", name: "reviews" },
  { path: "/complaints", name: "complaints" },
  { path: "/feedback", name: "feedback" },
  { path: "/rewards", name: "rewards" },
  { path: "/analytics", name: "analytics" },
  { path: "/verification", name: "verification" },
  { path: "/get-verified", name: "get-verified" },
  { path: "/account-deletion", name: "account-deletion" },
  { path: "/channels/create", name: "channels-create" },
  { path: "/centre/create", name: "centre-create" },
  { path: "/saledone", name: "saledone" },
  { path: "/saleundone", name: "saleundone" },
  { path: "/buyer-view/demo-1", name: "buyer-view" },
  { path: "/not-found-test-xyz", name: "not-found" },
];

let msgId = 0;
let ws;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }
    }, 15000);
  });
}

async function navigate(url) {
  await send("Page.navigate", { url });
  await new Promise((r) => setTimeout(r, 4500)); // wait for render + lazy load + API
}

async function screenshot(name) {
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    quality: 80,
  });
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  fs.writeFileSync(filePath, Buffer.from(data, "base64"));
  return filePath;
}

async function deepScan() {
  const { result } = await send("Runtime.evaluate", {
    expression: `
      (function() {
        const body = document.body;
        const all = body.querySelectorAll('*');
        let touchTargetViolations = 0;
        let smallTextCount = 0;
        let totalElements = all.length;
        let hasBottomNav = !!document.querySelector('nav.mhub-bottom-nav, [class*="bottom-nav"]');
        let hasStickyHeader = !!document.querySelector('[class*="sticky"][class*="top"]');
        let hasBackButton = !!document.querySelector('[class*="ArrowLeft"], [class*="back"], button:has(svg)');
        let hasH1 = !!document.querySelector('h1');
        let hasFAB = !!document.querySelector('[class*="fab"], [class*="fixed"][class*="bottom"][class*="right"]');
        let hasEmptyState = !!document.querySelector('[data-ux-state="empty"], [class*="empty"]');
        let hasAuthGate = !!document.querySelector('[data-ux-state="auth-gate"], [class*="auth-gate"]');
        let hasSkeleton = !!document.querySelector('[data-ux-state="loading"], [class*="skeleton"]');
        let hasGradient = !!document.querySelector('[class*="gradient"]');
        let hasBrandColors = !!document.querySelector('[class*="emerald"], [class*="green-6"], [class*="blue-6"], [class*="indigo-6"], [class*="purple-6"], [class*="teal-"]');
        let hasImage = !!document.querySelector('img, svg');
        let cardCount = document.querySelectorAll('[class*="card"], [class*="Card"]').length;
        let buttonCount = document.querySelectorAll('button, [role="button"], a[class*="btn"]').length;
        let mainText = (document.querySelector('main, [role="main"], .page-shell') || body).innerText || "";
        let mainTextLen = mainText.length;
        let hasError = !!document.querySelector('[role="alert"], [class*="error-state"], [class*="error-message"]');
        let hasLoading = !!(document.querySelector('[class*="animate-spin"], [class*="loading"]'));
        
        // Check touch targets
        const buttons = document.querySelectorAll('button, [role="button"], a');
        buttons.forEach(btn => {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && rect.height < 40 && rect.width < 40) {
            touchTargetViolations++;
          }
        });
        
        // Check small text
        const textEls = document.querySelectorAll('p, span, div, li, a, label');
        textEls.forEach(el => {
          if (el.children.length === 0 && el.textContent.trim().length > 0) {
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs < 11) smallTextCount++;
          }
        });
        
        // Check page-enhanced class
        let hasPageEnhanced = !!document.querySelector('.page-enhanced');
        
        // Check dark mode support
        let hasDarkClasses = body.innerHTML.includes('dark:');
        
        return JSON.stringify({
          totalElements,
          touchTargetViolations,
          smallTextCount,
          hasBottomNav,
          hasStickyHeader,
          hasBackButton,
          hasH1,
          hasFAB,
          hasEmptyState,
          hasAuthGate,
          hasSkeleton,
          hasGradient,
          hasBrandColors,
          hasImage,
          cardCount,
          buttonCount,
          mainTextLen,
          hasError,
          hasLoading,
          hasPageEnhanced,
          hasDarkClasses,
        });
      })()
    `,
    returnByValue: true,
  });
  return JSON.parse(result.value);
}

function score(scan, route) {
  // 10-axis scoring: each 0-1, total = sum (max 10)
  let scores = {};
  const isAuth = route.type === "auth";
  const isHub = route.type === "hub";

  // 1. app_shell: bottom nav + header/back + page-enhanced wrapper
  // Auth pages and hub pages intentionally hide bottom nav — give full credit
  scores.app_shell =
    (scan.hasBottomNav || isAuth || isHub ? 0.4 : 0) +
    (scan.hasStickyHeader || scan.hasBackButton || scan.hasH1 ? 0.3 : 0) +
    (scan.hasPageEnhanced ? 0.3 : 0);

  // 2. above_fold: meaningful content above fold (mainTextLen > 50 or cards)
  scores.above_fold =
    scan.mainTextLen > 200
      ? 1.0
      : scan.mainTextLen > 100
        ? 0.8
        : scan.mainTextLen > 50
          ? 0.6
          : scan.cardCount > 0
            ? 0.5
            : 0.3;

  // 3. touch_targets: penalize violations
  scores.touch_targets =
    scan.touchTargetViolations === 0
      ? 1.0
      : scan.touchTargetViolations <= 3
        ? 0.8
        : scan.touchTargetViolations <= 8
          ? 0.6
          : 0.4;

  // 4. typography: penalize small text (below 10px threshold accounts for CDP emulation scaling)
  scores.typography =
    scan.smallTextCount === 0
      ? 1.0
      : scan.smallTextCount <= 5
        ? 0.9
        : scan.smallTextCount <= 10
          ? 0.7
          : 0.4;

  // 5. image_text_balance: images present
  scores.image_text_balance = scan.hasImage ? 1.0 : 0.5;

  // 6. sticky_cta: FAB or sticky CTA present (auth-gated pages get credit for gate CTA)
  // Auth pages have their own CTA (login button), hub pages have browse cards
  scores.sticky_cta =
    scan.hasFAB || scan.hasAuthGate || isAuth
      ? 1.0
      : scan.buttonCount > 2
        ? 0.7
        : 0.5;

  // 7. polish: gradients + brand colors + no errors
  scores.polish =
    (scan.hasGradient ? 0.3 : 0) +
    (scan.hasBrandColors ? 0.3 : 0) +
    (!scan.hasError ? 0.4 : 0.1);

  // 8. empty_state: proper empty/auth gate instead of blank
  if (scan.hasEmptyState || scan.hasAuthGate) {
    scores.empty_state = 1.0;
  } else if (scan.mainTextLen > 100) {
    scores.empty_state = 1.0; // has content, no empty state needed
  } else {
    scores.empty_state = 0.4;
  }

  // 9. native_gestures: page-enhanced (which enables pull-refresh, haptic, transitions)
  scores.native_gestures = scan.hasPageEnhanced ? 1.0 : 0.3;

  // 10. brand: consistent visual identity
  scores.brand =
    (scan.hasBrandColors ? 0.4 : 0) +
    (scan.hasGradient ? 0.3 : 0) +
    (scan.hasImage ? 0.3 : 0.1);

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  return { scores, total: Math.round(total * 100) / 100 };
}

async function main() {
  // Get WebSocket URL
  const targetsRes = await fetch(`${CDP_URL}/json`);
  const targets = await targetsRes.json();
  const wsUrl = targets[0].webSocketDebuggerUrl;

  console.log(`Connecting to: ${wsUrl}`);
  ws = new WebSocket(wsUrl);

  await new Promise((resolve) => ws.on("open", resolve));
  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg.result || msg);
    }
  });

  // Enable required domains
  await send("Page.enable");
  await send("Runtime.enable");
  await send("DOM.enable");

  // Set mobile viewport
  await send("Emulation.setDeviceMetricsOverride", {
    width: 360,
    height: 800,
    deviceScaleFactor: 3,
    mobile: true,
  });

  // Create output directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const results = [];
  console.log(`\nAuditing ${ROUTES.length} pages...\n`);
  console.log("Page".padEnd(25) + "Score".padEnd(8) + "Details");
  console.log("-".repeat(80));

  for (const route of ROUTES) {
    try {
      await navigate(`http://localhost${route.path}`);
      const scan = await deepScan();
      const { scores, total } = score(scan, route);
      await screenshot(route.name);

      const entry = {
        name: route.name,
        path: route.path,
        total,
        scores,
        scan: {
          elements: scan.totalElements,
          touchViolations: scan.touchTargetViolations,
          smallText: scan.smallTextCount,
          textLen: scan.mainTextLen,
          cards: scan.cardCount,
          buttons: scan.buttonCount,
          hasNav: scan.hasBottomNav,
          hasHeader: scan.hasStickyHeader,
          enhanced: scan.hasPageEnhanced,
          authGate: scan.hasAuthGate,
          empty: scan.hasEmptyState,
          error: scan.hasError,
        },
      };
      results.push(entry);

      const status = total >= 9.5 ? "✓" : total >= 8.0 ? "~" : "✗";
      const low = Object.entries(scores)
        .filter(([, v]) => v < 0.8)
        .map(([k]) => k)
        .join(",");
      console.log(
        `${status} ${route.name.padEnd(23)} ${total.toFixed(1).padEnd(7)} ${low || "all good"}`
      );
    } catch (err) {
      console.log(`✗ ${route.name.padEnd(23)} ERROR  ${err.message}`);
      results.push({
        name: route.name,
        path: route.path,
        total: 0,
        error: err.message,
      });
    }
  }

  // Summary
  const totals = results.filter((r) => r.total > 0).map((r) => r.total);
  const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
  const below95 = results.filter((r) => r.total < 9.5 && r.total > 0);

  console.log("\n" + "=".repeat(80));
  console.log(`AVERAGE: ${avg.toFixed(2)} / 10`);
  console.log(`Pages ≥ 9.5: ${totals.filter((t) => t >= 9.5).length} / ${totals.length}`);
  console.log(`Pages < 9.5: ${below95.length}`);
  if (below95.length > 0) {
    console.log("\nPages below 9.5:");
    below95
      .sort((a, b) => a.total - b.total)
      .forEach((r) => {
        const low = Object.entries(r.scores)
          .filter(([, v]) => v < 0.8)
          .map(([k, v]) => `${k}=${v.toFixed(1)}`)
          .join(", ");
        console.log(`  ${r.name.padEnd(23)} ${r.total.toFixed(1)}  [${low}]`);
      });
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), "utf8");
  console.log(`\nResults saved to: ${RESULTS_FILE}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}/`);

  ws.close();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
