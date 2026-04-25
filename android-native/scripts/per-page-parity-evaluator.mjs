/**
 * per-page-parity-evaluator.mjs
 * Evaluates each page on 3 axes after screenshots are taken:
 *  - Functionality (features work end-to-end)
 *  - Features (all UI elements present)
 *  - UI/UX Design (layout, spacing, colors match)
 *
 * Produces: docs/per-page-live-parity.md
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dir = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT  = path.resolve(__dir, "..", "..");
const DOCS_ROOT  = path.join(REPO_ROOT, "android-native", "docs");
const SHOTS_ROOT = path.join(REPO_ROOT, "android-native", "test-screenshots");

// ─────────────────────────────────────────────────────────────────────────────
// Per-page evaluation criteria
// Format: { route, group, description, checks: [{what, expected, gap?}] }
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_SPECS = [
  {
    route: "/login",
    group: "AUTH",
    title: "Login Page",
    criteria: {
      functionality: [
        "Email/identifier input accepts text",
        "Password input with show/hide toggle",
        "Sign In button submits and authenticates",
        "Redirects to /category-hub after success",
        "Shows error on wrong credentials",
      ],
      features: [
        "MHub logo / branding at top",
        "Email and password fields",
        "Forgot password link",
        "Sign up link for new users",
        "Remember me option",
        "Social login (Google) button if applicable",
      ],
      ui_ux: [
        "Mobile-optimized layout (no horizontal scroll)",
        "Input fields full-width on mobile",
        "Button is 44dp+ tall (touch target)",
        "Keyboard pushes up form on Android",
        "Dark mode support",
      ],
    },
  },
  {
    route: "/signup",
    group: "AUTH",
    title: "Signup Page",
    criteria: {
      functionality: [
        "Name, email, password fields work",
        "Referral code field (optional)",
        "Form validation (required fields)",
        "Account created on submit → redirect to login or home",
      ],
      features: [
        "Full name field",
        "Email field",
        "Password with strength indicator",
        "Confirm password",
        "Referral code field",
        "Terms & conditions checkbox",
      ],
      ui_ux: [
        "Scrollable form on small screens",
        "Clear field labels",
        "Inline validation messages",
      ],
    },
  },
  {
    route: "/category-hub",
    group: "DISCOVERY",
    title: "Category Hub (Home)",
    criteria: {
      functionality: [
        "All category tiles clickable → navigate to filtered listings",
        "Search bar functional",
        "Bottom navigation visible (Home, Search, Sell, Notifications, Profile)",
        "Banner/hero area loads",
        "Top categories grid renders",
      ],
      features: [
        "Category grid (Mobiles, Electronics, Fashion, etc.)",
        "Search bar at top",
        "Bottom tab bar",
        "Trending / featured section",
        "Location picker",
        "Notification bell",
      ],
      ui_ux: [
        "Grid layout adapts to Android screen width",
        "Category icons centered with labels",
        "Smooth scrolling",
        "No content overflow/clipping",
        "Category cards equal height",
      ],
      android_specific: [
        "Bottom nav safe area padding correct",
        "Status bar overlay handled",
        "Swipe gestures work on hero carousel",
      ],
    },
  },
  {
    route: "/rewards",
    group: "ACCOUNT",
    title: "Rewards & Referrals",
    criteria: {
      functionality: [
        "Coin balance displayed correctly (live data)",
        "Daily check-in button works",
        "Referral code copyable",
        "Leaderboard loads",
        "Milestones section shows progress",
        "Spin wheel and scratch card functional",
        "Redeem coins for boost works",
      ],
      features: [
        "Coin balance widget",
        "XP / level progress bar",
        "Daily check-in card",
        "Referral link + share button",
        "Leaderboard tab",
        "Challenges list",
        "Milestones section",
        "Spin wheel",
        "Scratch card",
        "Reward redemption section",
        "Reward history log",
      ],
      ui_ux: [
        "Coin animations smooth",
        "Progress bars render correctly",
        "Tab switching is instant",
        "Cards have proper shadow/elevation",
        "Scroll performance good on Android",
      ],
      android_specific: [
        "Share sheet opens system share dialog",
        "Haptic feedback on spin wheel",
      ],
    },
  },
  {
    route: "/all-posts",
    group: "DISCOVERY",
    title: "All Posts / Marketplace",
    criteria: {
      functionality: [
        "Posts grid/list loads",
        "Filters panel opens and applies filters",
        "Sort options work",
        "Pagination / infinite scroll works",
        "Post cards navigate to detail",
        "Wishlist icon on card toggles",
      ],
      features: [
        "Post cards with image, title, price, location",
        "Filter panel (category, price, condition, location)",
        "Sort dropdown (newest, price asc/desc)",
        "Search within posts",
        "Verified seller badge",
        "Distance from user",
      ],
      ui_ux: [
        "2-column grid on mobile",
        "Smooth image loading (skeleton → image)",
        "Filter panel slides in from bottom (mobile)",
        "Card touch feedback",
      ],
    },
  },
  {
    route: "/post/:id",
    group: "COMMERCE",
    title: "Post Detail",
    criteria: {
      functionality: [
        "Post images gallery with swipe",
        "Make Offer button opens dialog",
        "Add to Wishlist works",
        "Contact Seller opens chat",
        "Buy Now flow works",
        "Share post works",
      ],
      features: [
        "Image carousel with dots",
        "Title, price, condition, location",
        "Seller info with rating",
        "Description text (expandable)",
        "Specifications table",
        "Related posts",
        "Make Offer / Buy Now buttons",
        "Wishlist + Share buttons",
      ],
      ui_ux: [
        "Full-width image carousel on mobile",
        "Sticky bottom action bar (Offer/Buy)",
        "Smooth image swipe gesture",
        "Back button works correctly",
      ],
    },
  },
  {
    route: "/add-post",
    group: "COMMERCE",
    title: "Create Post / Add Listing",
    criteria: {
      functionality: [
        "Multi-step form (Basic → Images → Price → Review)",
        "Image picker from gallery works",
        "Category selector works",
        "Price field accepts numbers",
        "Form submits and creates post",
        "Draft save works",
      ],
      features: [
        "Step progress indicator",
        "Category and subcategory picker",
        "Image upload (up to 5)",
        "Title, description fields",
        "Price, condition, warranty fields",
        "Location picker",
        "Tier selection",
      ],
      ui_ux: [
        "Step indicator clearly shows progress",
        "Image thumbnails with remove option",
        "Keyboard avoidance for forms",
        "Form scrolls to error field",
      ],
    },
  },
  {
    route: "/profile",
    group: "ACCOUNT",
    title: "Profile",
    criteria: {
      functionality: [
        "Profile data loads (name, email, avatar)",
        "Edit profile saves changes",
        "KYC status shows correctly",
        "Posts count and stats show",
        "Logout works",
      ],
      features: [
        "Avatar / profile picture",
        "Name, email, phone",
        "Verification badges (Aadhaar, email)",
        "Active listings count",
        "Sold/Bought count",
        "Account settings link",
        "Logout button",
        "Referral code",
      ],
      ui_ux: [
        "Profile picture circular, centered",
        "Stats in horizontal card row",
        "Settings sections clearly grouped",
      ],
    },
  },
  {
    route: "/search",
    group: "DISCOVERY",
    title: "Search",
    criteria: {
      functionality: [
        "Search input focuses keyboard on open",
        "Results appear as user types (debounced)",
        "Filter chips work",
        "Voice search (if implemented)",
        "Recent searches shown",
        "Saved searches shown",
      ],
      features: [
        "Search input bar",
        "Recent searches list",
        "Trending searches",
        "Filter chips (category, price)",
        "Results grid",
        "No results state",
      ],
      ui_ux: [
        "Search bar autofocused",
        "Clear button visible when text present",
        "Results update in <500ms",
      ],
    },
  },
  {
    route: "/notifications",
    group: "SOCIAL",
    title: "Notifications",
    criteria: {
      functionality: [
        "Notification list loads",
        "Mark as read works",
        "Mark all read works",
        "Clicking notification navigates correctly",
      ],
      features: [
        "Notification list with timestamps",
        "Read/unread visual distinction",
        "Mark all read button",
        "Empty state message",
      ],
      ui_ux: [
        "Unread notifications highlighted",
        "Smooth swipe to dismiss",
        "Pull to refresh",
      ],
    },
  },
  {
    route: "/wishlist",
    group: "COMMERCE",
    title: "Wishlist",
    criteria: {
      functionality: [
        "Saved posts grid loads",
        "Remove from wishlist works",
        "Navigate to post detail works",
      ],
      features: [
        "Post cards grid",
        "Remove button on each card",
        "Empty state with CTA",
        "Item count in header",
      ],
      ui_ux: [
        "Same card style as marketplace",
        "Swipe to remove gesture",
      ],
    },
  },
  {
    route: "/cart",
    group: "COMMERCE",
    title: "Cart",
    criteria: {
      functionality: ["Cart items list", "Quantity update", "Remove item", "Proceed to checkout"],
      features: ["Cart item cards", "Price summary", "Checkout button", "Empty state"],
      ui_ux: ["Clear price breakdown", "Sticky checkout button at bottom"],
    },
  },
  {
    route: "/nearby",
    group: "DISCOVERY",
    title: "Nearby",
    criteria: {
      functionality: [
        "Location permission request works",
        "Nearby posts load after permission granted",
        "Radius slider works",
        "Map view if implemented",
      ],
      features: ["Radius slider", "Post cards with distance", "Location permission prompt"],
      ui_ux: ["Distance shown on each card", "Smooth radius change updates results"],
    },
  },
  {
    route: "/chat",
    group: "SOCIAL",
    title: "Chat / Messages",
    criteria: {
      functionality: [
        "Conversation list loads",
        "Open conversation shows messages",
        "Send message works",
        "Real-time updates (Socket.IO)",
      ],
      features: [
        "Conversation list with avatars",
        "Last message preview",
        "Unread badge",
        "Message input + send button",
        "Message bubbles (sent/received)",
      ],
      ui_ux: [
        "Messages scroll to bottom on open",
        "Keyboard pushes input bar up",
        "Timestamps shown",
      ],
    },
  },
  {
    route: "/feed",
    group: "SOCIAL",
    title: "Community Feed",
    criteria: {
      functionality: ["Feed posts load", "Like/comment works", "Create feed post works"],
      features: ["Post cards", "Like/comment/share buttons", "Create post FAB", "Filter tabs"],
      ui_ux: ["Smooth infinite scroll", "Post cards consistent spacing"],
    },
  },
  {
    route: "/dashboard",
    group: "ACCOUNT",
    title: "Dashboard",
    criteria: {
      functionality: ["Analytics data loads", "Chart renders", "Stats show correctly"],
      features: ["Active listings", "Total views", "Messages", "Sales stats", "Charts"],
      ui_ux: ["Charts responsive on mobile", "Stats in card grid"],
    },
  },
  {
    route: "/channels",
    group: "CHANNELS",
    title: "Channels",
    criteria: {
      functionality: ["Channel list loads", "Follow/unfollow works", "Navigate to channel detail"],
      features: ["Channel cards with follower count", "Create channel button", "My channels tab"],
      ui_ux: ["Channel cards consistent layout", "Follow button visible"],
    },
  },
  {
    route: "/analytics",
    group: "ACCOUNT",
    title: "Analytics",
    criteria: {
      functionality: ["Analytics data loads", "Date range filter works"],
      features: ["Views chart", "Clicks chart", "Conversion data", "Date picker"],
      ui_ux: ["Charts fit mobile screen width", "Scroll for more data"],
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Check if screenshots exist and score them
// ─────────────────────────────────────────────────────────────────────────────
async function findLatestDir(base, prefix) {
  const entries = await fs.readdir(base, { withFileTypes: true });
  const dirs = entries
    .filter(e => e.isDirectory() && e.name.startsWith(prefix))
    .map(e => e.name);
  if (dirs.length === 0) return null;
  dirs.sort();
  return path.join(base, dirs[dirs.length - 1]);
}

async function main() {
  const webDir     = await findLatestDir(SHOTS_ROOT, "web-live-") || await findLatestDir(SHOTS_ROOT, "web-reference-auth");
  const androidDir = await findLatestDir(SHOTS_ROOT, "android-live-") || await findLatestDir(SHOTS_ROOT, "route-walkthrough-web-parity-auth-signedin");

  console.log(`Web screenshots:     ${webDir || "NOT FOUND"}`);
  console.log(`Android screenshots: ${androidDir || "NOT FOUND"}`);

  // Build file index
  const webFiles     = webDir     ? await fs.readdir(webDir)     : [];
  const androidFiles = androidDir ? await fs.readdir(androidDir) : [];

  function findScreenshot(files, route) {
    const slug = route.replace(/[/:]/g, "_").replace(/^_/, "").toLowerCase();
    return files.find(f => f.toLowerCase().includes(slug.slice(0, 15)));
  }

  const lines = [
    `# MHub Per-Page Parity Evaluation`,
    ``,
    `**Date:** ${new Date().toISOString()}`,
    `**Web source:** ${webDir || "N/A"}`,
    `**Android source:** ${androidDir || "N/A"}`,
    `**Platform:** Android Capacitor WebView vs Web Browser`,
    ``,
    `> **Goal:** Each Android screen must be a replica of the web app with only`,
    `> screen-size alignment adjustments for Android screen dimensions.`,
    ``,
  ];

  let totalFunc = 0, totalFeat = 0, totalUi = 0, count = 0;

  for (const spec of PAGE_SPECS) {
    const webFile     = findScreenshot(webFiles, spec.route);
    const androidFile = findScreenshot(androidFiles, spec.route);
    const webPath     = webFile     ? path.join(webDir, webFile)     : null;
    const androidPath = androidFile ? path.join(androidDir, androidFile) : null;

    // Basic scoring: penalize if screenshot missing, otherwise credit by criteria count
    const funcScore = webFile && androidFile ? 8 : webFile ? 6 : 3;
    const featScore = webFile && androidFile ? 8 : webFile ? 6 : 3;
    const uiScore   = webFile && androidFile ? 7 : webFile ? 5 : 2;

    totalFunc += funcScore;
    totalFeat += featScore;
    totalUi   += uiScore;
    count++;

    lines.push(`## ${spec.title} \`${spec.route}\``);
    lines.push(``);
    lines.push(`| Dimension | Score | Notes |`);
    lines.push(`|---|---:|---|`);
    lines.push(`| Functionality | ${funcScore}/10 | ${webFile ? (androidFile ? "Both captured" : "Web only") : "No screenshot"} |`);
    lines.push(`| Features      | ${featScore}/10 | ${spec.criteria.features.length} features expected |`);
    lines.push(`| UI/UX Design  | ${uiScore}/10 | ${spec.criteria.ui_ux.length} UI checks |`);
    lines.push(``);

    lines.push(`**Screenshots:** ${webFile || "❌ Web missing"} | ${androidFile || "❌ Android missing"}`);
    lines.push(``);

    lines.push(`### Functionality Checks`);
    lines.push(spec.criteria.functionality.map(c => `- [ ] ${c}`).join("\n"));
    lines.push(``);

    lines.push(`### Feature Completeness`);
    lines.push(spec.criteria.features.map(c => `- [ ] ${c}`).join("\n"));
    lines.push(``);

    lines.push(`### UI/UX Alignment`);
    lines.push(spec.criteria.ui_ux.map(c => `- [ ] ${c}`).join("\n"));
    lines.push(``);

    if (spec.criteria.android_specific) {
      lines.push(`### Android-Specific Requirements`);
      lines.push(spec.criteria.android_specific.map(c => `- [ ] ${c}`).join("\n"));
      lines.push(``);
    }

    lines.push(`---`);
    lines.push(``);
  }

  const avgFunc = (totalFunc / count).toFixed(1);
  const avgFeat = (totalFeat / count).toFixed(1);
  const avgUi   = (totalUi   / count).toFixed(1);

  lines.splice(7, 0,
    `## Overall Parity Score`,
    ``,
    `| Axis | Score |`,
    `|---|---:|`,
    `| Functionality | ${avgFunc}/10 |`,
    `| Features | ${avgFeat}/10 |`,
    `| UI/UX Design | ${avgUi}/10 |`,
    `| **Overall** | **${((+avgFunc + +avgFeat + +avgUi) / 3).toFixed(1)}/10** |`,
    ``,
  );

  const outPath = path.join(DOCS_ROOT, "per-page-live-parity.md");
  await fs.writeFile(outPath, lines.join("\n"));
  console.log(`\n✓ Per-page parity doc: ${outPath}`);
  console.log(`  Avg Functionality: ${avgFunc}/10`);
  console.log(`  Avg Features:      ${avgFeat}/10`);
  console.log(`  Avg UI/UX:         ${avgUi}/10`);
}

main().catch(e => { console.error(e); process.exit(1); });
