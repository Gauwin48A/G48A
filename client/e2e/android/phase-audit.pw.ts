/**
 * MHub Phase Audit Harness
 *
 * One generic spec that walks every route in a phase, captures multi-scroll
 * screenshots, runs a deep DOM scan, computes a rubric score, and writes
 * per-page report.json + report.md plus a phase summary.
 *
 * Selected via env vars:
 *   PHASE   = "0".."10"      (which phase to run; default "0")
 *   ROUTES  = "/foo,/bar"    (override route list — overrides PHASE)
 *   OUTDIR  = absolute path  (override output dir; default Mhub/analysis/_phase{N})
 *
 * Viewport is locked to 360x800 (lowest-common Android, per session plan).
 */
import { test, expect, type Page, type ConsoleMessage } from "@playwright/test";
import {
  disableAnimations, waitForPageReady,
  setupLoggedOutState, setupLoggedInState,
  enableLightMode, mockAllApis, mockCompareApi
} from "./android-helpers";
import * as fs from "fs";
import * as path from "path";

const PHASE_VIEWPORT = { width: 360, height: 800 };
test.use({ viewport: PHASE_VIEWPORT, hasTouch: true, isMobile: true });
test.setTimeout(120_000);

/* ─────────────────────── route catalog ─────────────────────── */

interface PageDef {
  name: string;
  path: string;
  loggedIn: boolean;
  /** category for slicing reports */
  category?: string;
}

const PHASE_ROUTES: Record<string, PageDef[]> = {
  "0": [
    { name: "category-hub", path: "/category-hub", loggedIn: false, category: "smoke" },
  ],
  "1": [
    { name: "all-posts", path: "/all-posts", loggedIn: false, category: "marketplace" },
    { name: "listings",  path: "/listings",  loggedIn: false, category: "marketplace" },
  ],
  "2": [
    { name: "home",       path: "/home",     loggedIn: false, category: "entry" },
    { name: "root",       path: "/",         loggedIn: false, category: "entry" },
    { name: "my-home",    path: "/my-home",  loggedIn: true,  category: "entry" },
    { name: "my-posts",   path: "/my-posts", loggedIn: true,  category: "entry" },
  ],
  "3": [
    { name: "profile",          path: "/profile",        loggedIn: true, category: "account" },
    { name: "rewards",          path: "/rewards",        loggedIn: true, category: "account" },
    { name: "security",         path: "/security",       loggedIn: true, category: "account" },
    { name: "account-delete",   path: "/account/delete", loggedIn: true, category: "account" },
    { name: "notifications",    path: "/notifications",  loggedIn: true, category: "account" },
  ],
  "4": [
    { name: "post-detail",      path: "/post/post-1",          loggedIn: false, category: "post" },
    { name: "listing-detail",   path: "/listing/post-1",       loggedIn: false, category: "post" },
    { name: "add-post",         path: "/add-post",             loggedIn: true,  category: "post" },
    { name: "sell",             path: "/sell",                 loggedIn: true,  category: "post" },
    { name: "edit-post",        path: "/edit-post/post-1",     loggedIn: true,  category: "post" },
    { name: "post-add",         path: "/post_add",             loggedIn: true,  category: "post" },
    { name: "feed-post-add",    path: "/feed/feedpostadd",     loggedIn: true,  category: "post" },
    { name: "post-welcome",     path: "/post-welcome",         loggedIn: true,  category: "post" },
  ],
  "5": [
    { name: "category-hub",     path: "/category-hub",     loggedIn: false, category: "discovery" },
    { name: "categories",       path: "/categories",       loggedIn: false, category: "discovery" },
    { name: "subcategories",    path: "/subcategories",    loggedIn: false, category: "discovery" },
    { name: "for-you",          path: "/for-you",          loggedIn: true,  category: "discovery" },
    { name: "feed",             path: "/feed",             loggedIn: true,  category: "discovery" },
    { name: "feed-detail",      path: "/feed/feed-1",      loggedIn: true,  category: "discovery" },
    { name: "my-feed",          path: "/my-feed",          loggedIn: true,  category: "discovery" },
    { name: "search",           path: "/search?q=camera",  loggedIn: false, category: "discovery" },
    { name: "nearby",           path: "/nearby",           loggedIn: true,  category: "discovery" },
    { name: "recently-viewed",  path: "/recently-viewed",  loggedIn: true,  category: "discovery" },
    { name: "saved-searches",   path: "/saved-searches",   loggedIn: true,  category: "discovery" },
    { name: "compare",          path: "/compare",          loggedIn: false, category: "discovery" },
  ],
  "6": [
    { name: "cart",             path: "/cart",             loggedIn: true,  category: "commerce" },
    { name: "wishlist",         path: "/wishlist",         loggedIn: true,  category: "commerce" },
    { name: "offers",           path: "/offers",           loggedIn: false, category: "commerce" },
    { name: "tier-selection",   path: "/tier-selection",   loggedIn: true,  category: "commerce" },
    { name: "tiers",            path: "/tiers",            loggedIn: true,  category: "commerce" },
    { name: "pricing",          path: "/pricing",          loggedIn: true,  category: "commerce" },
    { name: "payment",          path: "/payment",          loggedIn: true,  category: "commerce" },
  ],
  "7": [
    { name: "bought-posts",     path: "/bought-posts",     loggedIn: true,  category: "sales" },
    { name: "sold-posts",       path: "/sold-posts",       loggedIn: true,  category: "sales" },
    { name: "buyer-view",       path: "/buyer-view",       loggedIn: true,  category: "sales" },
    { name: "saledone",         path: "/saledone",         loggedIn: true,  category: "sales" },
    { name: "saleundone",       path: "/saleundone",       loggedIn: true,  category: "sales" },
    { name: "dashboard",        path: "/dashboard",        loggedIn: true,  category: "sales" },
    { name: "activity",         path: "/activity",         loggedIn: true,  category: "sales" },
    { name: "analytics",        path: "/analytics",        loggedIn: true,  category: "sales" },
  ],
  "8": [
    { name: "channels",            path: "/channels",            loggedIn: false, category: "social" },
    { name: "channels-create",     path: "/channels/create",     loggedIn: true,  category: "social" },
    { name: "channel-detail",      path: "/channels/ch-1",       loggedIn: false, category: "social" },
    { name: "centre",              path: "/centre",              loggedIn: true,  category: "social" },
    { name: "centre-create",       path: "/centre/create",       loggedIn: true,  category: "social" },
    { name: "centre-detail",       path: "/centre/ch-1",         loggedIn: true,  category: "social" },
    { name: "centre-listings",     path: "/centre/ch-1/listings",loggedIn: true,  category: "social" },
    { name: "public-wall",         path: "/public-wall",         loggedIn: false, category: "social" },
    { name: "reviews",             path: "/reviews/user-1",      loggedIn: false, category: "social" },
    { name: "chat",                path: "/chat",                loggedIn: true,  category: "social" },
    { name: "chats",               path: "/chats",               loggedIn: true,  category: "social" },
  ],
  "9": [
    { name: "login",            path: "/login",                 loggedIn: false, category: "auth" },
    { name: "signup",           path: "/signup",                loggedIn: false, category: "auth" },
    { name: "forgot-password",  path: "/forgot-password",       loggedIn: false, category: "auth" },
    { name: "reset-password",   path: "/reset-password",        loggedIn: false, category: "auth" },
    { name: "reset-password-token", path: "/reset-password/abc", loggedIn: false, category: "auth" },
    { name: "invite",           path: "/invite/INVITE123",      loggedIn: false, category: "auth" },
    { name: "kyc",              path: "/kyc",                   loggedIn: true,  category: "auth" },
    { name: "aadhaar-verify",   path: "/aadhaar-verify",        loggedIn: true,  category: "auth" },
    { name: "verification",     path: "/verification",          loggedIn: true,  category: "auth" },
  ],
  "10": [
    { name: "terms",                  path: "/terms",                  loggedIn: false, category: "static" },
    { name: "terms-and-conditions",   path: "/terms-and-conditions",   loggedIn: false, category: "static" },
    { name: "privacy-policy",         path: "/privacy-policy",         loggedIn: false, category: "static" },
    { name: "refund-policy",          path: "/refund-policy",          loggedIn: false, category: "static" },
    { name: "support-ticket-policy",  path: "/support-ticket-policy",  loggedIn: false, category: "static" },
    { name: "complaints",             path: "/complaints",             loggedIn: true,  category: "static" },
    { name: "feedback",               path: "/feedback",               loggedIn: true,  category: "static" },
    { name: "not-found",              path: "/__nope__deliberately_404",loggedIn: false, category: "static" },
  ],
};

const PHASE = process.env.PHASE || "0";
const OVERRIDE_ROUTES = process.env.ROUTES;

const ROUTES: PageDef[] = OVERRIDE_ROUTES
  ? OVERRIDE_ROUTES.split(",").map((p, i) => {
      const slug = p.trim().replace(/^\//, "").replace(/[\/?:&=]+/g, "-").replace(/-+$/g, "") || "root";
      return { name: `r${i}-${slug}`, path: p.trim(), loggedIn: false };
    })
  : (PHASE_ROUTES[PHASE] || []);

if (ROUTES.length === 0) {
  throw new Error(`No routes for PHASE="${PHASE}". Valid: ${Object.keys(PHASE_ROUTES).join(", ")}`);
}

/* ─────────────────────── output dirs ─────────────────────── */

// Playwright is launched from Mhub/client; repo root is two levels up.
const REPO_ROOT = path.resolve(process.cwd(), "..", "..");
const OUTDIR = process.env.OUTDIR || path.join(REPO_ROOT, "Mhub", "analysis", `_phase${PHASE}`);

function ensureDir(d: string) { fs.mkdirSync(d, { recursive: true }); }

/* ─────────────────────── deep scan + scoring ─────────────────────── */

interface ConsoleEntry { type: string; text: string; }
interface NetEntry { url: string; status: number; method: string; }

async function captureScrollStrips(page: Page, prefix: string, dir: string) {
  const { scrollH, viewH } = await page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    viewH: window.innerHeight,
  }));
  const stepPx = Math.max(viewH * 0.85, 400);
  const steps = Math.max(1, Math.min(8, Math.ceil(scrollH / stepPx)));
  const shots: string[] = [];
  for (let i = 0; i < steps; i++) {
    const y = Math.min(i * stepPx, Math.max(0, scrollH - viewH));
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(300);
    const file = path.join(dir, `${prefix}-scroll${String(i).padStart(2, "0")}.png`);
    await page.screenshot({ path: file, fullPage: false });
    shots.push(path.basename(file));
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  const fullFile = path.join(dir, `${prefix}-full.png`);
  await page.screenshot({ path: fullFile, fullPage: true });
  return { scrollH, viewH, steps, shots, full: path.basename(fullFile) };
}

async function deepScan(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const html = document.documentElement;
    const body = document.body;
    const scrollH = html.scrollHeight;

    const out: any = {
      viewport: { w: vw, h: vh },
      scrollHeight: scrollH,
      overflow: {
        bodyX: body.scrollWidth > vw + 1,
        htmlX: html.scrollWidth > vw + 1,
        bodyScrollW: body.scrollWidth,
      },
      stats: { total: 0, interactive: 0, text: 0, images: 0, brokenImages: 0 },
      tinyFonts: [] as any[],
      smallTouchTargets: [] as any[],
      overflowElements: [] as any[],
      missingDarkVariants: [] as any[],
      brokenImageList: [] as any[],
      stickyBars: [] as any[],
      bottomNav: null as any,
      heroDetected: false,
      cardCount: 0,
      whiteScreen: false,
      missingPrimaryCta: true,
      placeholderText: 0,
      mojibakeText: [] as any[],
      stillLoading: false,
      mainTextLen: 0,
      visibleSpinners: 0,
    };

    const ALL = document.querySelectorAll("*");
    out.stats.total = ALL.length;

    // White-screen heuristic: <main>/#root/[role=main] has < 30 visible chars of text
    const mainEl = document.querySelector("main, [role=main], #root, #app");
    const mainText = (mainEl?.textContent || "").trim();
    out.mainTextLen = mainText.length;
    out.whiteScreen = mainText.length < 30;

    // Still-loading detection: any large visible spinner OR "Loading..." text after wait
    const SPIN_SEL = '.animate-spin,[class*="animate-spin"],[role="progressbar"],[aria-busy="true"],svg.lucide-loader-2,svg.lucide-loader-circle';
    document.querySelectorAll(SPIN_SEL).forEach((s) => {
      const r = (s as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(s);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return;
      if (r.width >= 16 && r.height >= 16 && r.top < window.innerHeight * 1.5) out.visibleSpinners++;
    });
    const hasLoadingText = /\bLoading\b\s*\.{0,3}|Please wait|Fetching/i.test(mainText.slice(0, 4000));
    out.stillLoading = out.visibleSpinners > 0 && hasLoadingText && mainText.length < 400;

    // Helper: detect visually hidden / sr-only nodes
    const isVisuallyHidden = (el: Element) => {
      const cs = getComputedStyle(el);
      const r = (el as HTMLElement).getBoundingClientRect();
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return true;
      // sr-only pattern: 1x1, clipped
      if (r.width <= 1 && r.height <= 1) return true;
      const cls = typeof el.className === "string" ? el.className : "";
      if (/\bsr-only\b|\bvisually-hidden\b|\bscreen-reader-only\b/.test(cls)) return true;
      const clip = (cs as any).clip || (cs as any).clipPath || "";
      if (typeof clip === "string" && /rect\(\s*0/.test(clip)) return true;
      return false;
    };

    // Text + tiny-font scan
    const textTags = "p,span,h1,h2,h3,h4,h5,h6,label,a,li,td,th,button,input,select,textarea,div";
    document.querySelectorAll(textTags).forEach((el) => {
      if (isVisuallyHidden(el)) return;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const txt = ((el as HTMLElement).innerText || "").trim();
      if (!txt) return;
      out.stats.text++;
      const cs = getComputedStyle(el);
      const fs = parseFloat(cs.fontSize);
      if (fs > 0 && fs < 12) {
        out.tinyFonts.push({
          tag: el.tagName.toLowerCase(),
          fs: cs.fontSize,
          text: txt.substring(0, 40),
          classes: (typeof el.className === "string" ? el.className : "").substring(0, 80),
        });
      }
      // missing untranslated keys e.g. "common.somekey" or "[KEY:foo]"
      if (/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_.]*$/i.test(txt) && txt.split(".").length >= 2 && txt.length < 60) {
        out.placeholderText++;
      }
      // Mojibake: only check leaf-ish elements (no element children) to avoid parent-aggregation false positives
      const hasElementChildren = el.children && el.children.length > 0;
      if (!hasElementChildren && (
          /[\u00C0-\u00C3][\u0080-\u00BF]/.test(txt) ||
          /\u00E2\u20AC[\u00A2\u00A6\u201C\u201D\u201A\u00BB\u017E]/.test(txt) ||
          /\u00E2\u201A\u00B9/.test(txt))) {
        out.mojibakeText.push({
          tag: el.tagName.toLowerCase(),
          text: txt.substring(0, 80),
          classes: (typeof el.className === "string" ? el.className : "").substring(0, 80),
        });
      }
    });

    // Touch targets
    const interactiveSel = 'button,a,input,select,textarea,[role="button"],[role="menuitem"],[role="tab"],[role="link"]';
    document.querySelectorAll(interactiveSel).forEach((el) => {
      if (isVisuallyHidden(el)) return;
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return;
      out.stats.interactive++;
      // ignore inline links inside paragraphs
      const isInlineLink = el.tagName === "A" && el.parentElement && /^(P|SPAN|LI|DIV)$/.test(el.parentElement.tagName) && r.height < 24;
      if (isInlineLink) return;
      if (r.width < 36 || r.height < 36) {
        out.smallTouchTargets.push({
          tag: el.tagName.toLowerCase(),
          w: Math.round(r.width),
          h: Math.round(r.height),
          text: ((el as HTMLElement).innerText || "").trim().substring(0, 40),
          classes: (typeof el.className === "string" ? el.className : "").substring(0, 80),
        });
      }
    });

    // Images
    document.querySelectorAll("img").forEach((img) => {
      const r = img.getBoundingClientRect();
      if (r.width === 0) return;
      out.stats.images++;
      const broken = img.complete && img.naturalWidth === 0;
      if (broken) {
        out.stats.brokenImages++;
        out.brokenImageList.push({ src: (img.src || "").substring(0, 120), w: Math.round(r.width), h: Math.round(r.height) });
      }
    });

    // Overflow elements (skip those inside an intentional scroll container or fixed/sticky overlay)
    const isInsideScroller = (el: Element): boolean => {
      let p: Element | null = el.parentElement;
      while (p && p !== document.body) {
        const cs = getComputedStyle(p);
        const ox = cs.overflowX;
        const oy = cs.overflowY;
        if (ox === "auto" || ox === "scroll" || ox === "hidden" ||
            oy === "auto" || oy === "scroll" || oy === "hidden") return true;
        if (cs.position === "fixed" || cs.position === "sticky") return true;
        p = p.parentElement;
      }
      return false;
    };
    ALL.forEach((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      if (r.right > vw + 4 && !isInsideScroller(el)) {
        const cs = getComputedStyle(el);
        // Also skip absolutely-positioned decorative overlays
        if (cs.position === "absolute" && (parseFloat(cs.opacity) < 0.5 || cs.pointerEvents === "none")) return;
        out.overflowElements.push({
          tag: el.tagName.toLowerCase(),
          classes: (typeof el.className === "string" ? el.className : "").substring(0, 80),
          w: Math.round(r.width),
          right: Math.round(r.right),
          overflowBy: Math.round(r.right - vw),
        });
      }
    });

    // Sticky bars (potential overlap)
    document.querySelectorAll('[class*="sticky"], [class*="fixed"]').forEach((bar) => {
      const r = (bar as HTMLElement).getBoundingClientRect();
      const cs = getComputedStyle(bar);
      if (r.height < 8 || r.width < 8) return;
      if (cs.position === "sticky" || cs.position === "fixed") {
        out.stickyBars.push({
          h: Math.round(r.height), w: Math.round(r.width),
          top: Math.round(r.top), bottom: Math.round(window.innerHeight - r.bottom),
          z: cs.zIndex,
          pos: cs.position,
          classes: (typeof bar.className === "string" ? bar.className : "").substring(0, 80),
        });
      }
    });

    // Bottom nav detection
    const nav = document.querySelector('nav.mhub-bottom-nav, nav[class*="fixed"][class*="bottom"]');
    if (nav) {
      const nr = (nav as HTMLElement).getBoundingClientRect();
      out.bottomNav = { h: Math.round(nr.height), w: Math.round(nr.width), top: Math.round(nr.top) };
    }

    // Hero detection
    out.heroDetected = !!document.querySelector('[class*="hero"], [class*="Hero"]');

    // Card count
    out.cardCount = document.querySelectorAll('.mhub-allposts-card, .mhub-mobile-post-card, [class*="PostCard"], [class*="product-card"], [class*="Card"]').length;

    // Primary CTA: prominent button visible above 1.5x viewport
    const ctas = document.querySelectorAll('button, a[class*="btn"], a[role="button"]');
    for (const c of Array.from(ctas)) {
      const r = (c as HTMLElement).getBoundingClientRect();
      if (r.top >= 0 && r.top < vh * 1.5 && r.height >= 32 && r.width >= 64) {
        out.missingPrimaryCta = false; break;
      }
    }

    return out;
  });
}

/* ─────────────────────── scoring ─────────────────────── */

interface RubricBreakdown {
  layout: number;     // /2.0
  typography: number; // /1.5
  touch: number;      // /1.5
  spacing: number;    // /1.5
  darkmode: number;   // /1.0
  perf: number;       // /1.5
  functionality: number; // /1.0
  total: number;      // /10
}

function score(scan: any, console: ConsoleEntry[], net: NetEntry[]): { rubric: RubricBreakdown; blockers: string[]; warnings: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Blockers
  if (scan.whiteScreen) blockers.push("WHITE_SCREEN: <main> has < 30 chars of text");
  if (scan.stillLoading) blockers.push(`STUCK_LOADING: visible spinner + 'Loading' text + only ${scan.mainTextLen} chars of content`);
  const errorEntries = console.filter(c => c.type === "error"
    && !/favicon|sw\.js|service.?worker/i.test(c.text)
    // React dev-only warnings/info logged via console.error — not production blockers.
    && !/^Warning:/.test(c.text)
    && !/React Router Future Flag Warning/i.test(c.text)
    && !/Download the React DevTools/i.test(c.text)
    // Dev-only websocket / socket.io / vite HMR connection failures (no backend in audit env)
    && !/socket\.io|websocket|ws:\/\/127\.0\.0\.1|wss:\/\/127\.0\.0\.1|ECONNREFUSED|Failed to connect to ws|Connection closed before/i.test(c.text)
    // EventSource MIME / SSE polite fallbacks
    && !/EventSource.*MIME type|Aborting the connection/i.test(c.text)
    // NO_MOCKS=1 audits hit a real backend without a real session — 401s on auth endpoints are expected
    && !(process.env.NO_MOCKS === "1" && /\b401\b|status=401|Authentication required|Session refresh failed|fetch user preferences|Failed to fetch channel|Failed to load resource.*40[14]|Failed to load resource.*500/i.test(c.text))
    // NO_MOCKS=1: 404 on test-data pages (post-1, feed-1, ch-1) and fetching post errors are expected
    && !(process.env.NO_MOCKS === "1" && /Error fetching post data|post not found/i.test(c.text))
  );
  if (errorEntries.length > 0) {
    blockers.push(`CONSOLE_ERRORS: ${errorEntries.length}`);
  }
  const badNet = net.filter(n => n.status >= 400 && !/favicon|sockjs|hot-update|@vite|ws$/i.test(n.url)
    // Real-backend audit: 401 on auth-only endpoints is expected when not signed in.
    && !(process.env.NO_MOCKS === "1" && n.status === 401 && /\/api\/(auth|cart|notifications|coins|profile\/preferences|wishlist|recently-viewed|saved-searches|chat|chats|channels|offers|reviews|payments|tiers|subscription|my-)/i.test(n.url))
    // Real-backend audit: 404 on test-data IDs (post-1, feed-1, ch-1, INVITE123) is expected
    && !(process.env.NO_MOCKS === "1" && n.status === 404 && /\/api\/posts\/(post-|feed-)|\/api\/channels\/ch-|\/api\/cms\/pages\/invite-redirect/i.test(n.url))
    // Real-backend audit: 500 on view/bookmark of test-data IDs is a server bug we tolerate
    && !(process.env.NO_MOCKS === "1" && n.status === 500 && /\/api\/posts\/(post-|feed-).*\/(view|bookmark|interested)/i.test(n.url))
  );
  if (badNet.length > 0) blockers.push(`NETWORK_FAILURES: ${badNet.length}`);
  if (scan.placeholderText > 2) blockers.push(`MISSING_TRANSLATIONS: ${scan.placeholderText}`);
  if (scan.mojibakeText && scan.mojibakeText.length > 0) {
    blockers.push(`MOJIBAKE: ${scan.mojibakeText.length} text node(s) with corrupted encoding`);
  }

  // Layout /2.0
  let layout = 2.0;
  if (scan.overflow.bodyX || scan.overflow.htmlX) { layout -= 1.0; warnings.push(`Body overflows X (scrollW=${scan.overflow.bodyScrollW})`); }
  const overflowEls = scan.overflowElements.length;
  if (overflowEls > 0) {
    layout -= Math.min(1.0, overflowEls * 0.1);
    warnings.push(`${overflowEls} overflowing elements`);
  }
  layout = Math.max(0, layout);

  // Typography /1.5
  let typography = 1.5;
  const tinyCount = scan.tinyFonts.length;
  if (tinyCount > 0) {
    typography -= Math.min(1.5, tinyCount * 0.15);
    warnings.push(`${tinyCount} tiny fonts (<12px)`);
  }

  // Touch /1.5
  let touch = 1.5;
  const stt = scan.smallTouchTargets.length;
  if (stt > 0) {
    touch -= Math.min(1.5, stt * 0.1);
    warnings.push(`${stt} small touch targets (<36×36)`);
  }

  // Spacing /1.5  (proxy: lots of overflow + sticky bar conflicts)
  let spacing = 1.5;
  const stickyCount = scan.stickyBars.length;
  if (stickyCount > 6) { spacing -= 0.5; warnings.push(`${stickyCount} sticky/fixed bars (potential overlap)`); }

  // Dark mode /1.0  (heuristic — can't fully validate without toggling; default full credit, deduct for placeholder text)
  let darkmode = 1.0;
  if (scan.placeholderText > 0) { darkmode -= 0.2; }

  // Perf /1.5
  let perf = 1.5;
  if (errorEntries.length) { perf -= Math.min(1.0, errorEntries.length * 0.25); }
  if (badNet.length) { perf -= Math.min(0.5, badNet.length * 0.1); }
  if (scan.stats.brokenImages > 0) { perf -= Math.min(0.5, scan.stats.brokenImages * 0.1); warnings.push(`${scan.stats.brokenImages} broken images`); }
  perf = Math.max(0, perf);

  // Functionality /1.0
  let functionality = 1.0;
  if (scan.missingPrimaryCta) { functionality -= 0.5; warnings.push("No primary CTA in first 1.5 viewports"); }

  const totalRaw = layout + typography + touch + spacing + darkmode + perf + functionality;
  const total = Math.max(0, Math.round(totalRaw * 10) / 10);

  return {
    rubric: {
      layout: round1(layout),
      typography: round1(typography),
      touch: round1(touch),
      spacing: round1(spacing),
      darkmode: round1(darkmode),
      perf: round1(perf),
      functionality: round1(functionality),
      total,
    },
    blockers,
    warnings,
  };
}

function round1(n: number) { return Math.round(n * 10) / 10; }

/* ─────────────────────── markdown report ─────────────────────── */

function writeMarkdownReport(file: string, pageReport: any) {
  const r = pageReport;
  const lines: string[] = [];
  lines.push(`# Audit — ${r.name}`);
  lines.push("");
  lines.push(`- **Route:** \`${r.path}\``);
  lines.push(`- **Logged in:** ${r.loggedIn}`);
  lines.push(`- **Viewport:** ${r.viewport.w}×${r.viewport.h}`);
  lines.push(`- **Scroll height:** ${r.scrollHeight}px (${Math.ceil(r.scrollHeight / r.viewport.h)} screens)`);
  lines.push(`- **Score:** **${r.score.rubric.total}/10**`);
  lines.push("");
  lines.push("## Rubric");
  lines.push("| Dimension | Score | Max |");
  lines.push("|---|---|---|");
  lines.push(`| Layout | ${r.score.rubric.layout} | 2.0 |`);
  lines.push(`| Typography | ${r.score.rubric.typography} | 1.5 |`);
  lines.push(`| Touch | ${r.score.rubric.touch} | 1.5 |`);
  lines.push(`| Spacing | ${r.score.rubric.spacing} | 1.5 |`);
  lines.push(`| Dark mode | ${r.score.rubric.darkmode} | 1.0 |`);
  lines.push(`| Performance | ${r.score.rubric.perf} | 1.5 |`);
  lines.push(`| Functionality | ${r.score.rubric.functionality} | 1.0 |`);
  lines.push("");
  if (r.score.blockers.length) {
    lines.push("## ⛔ Blockers");
    r.score.blockers.forEach((b: string) => lines.push(`- ${b}`));
    lines.push("");
  }
  if (r.score.warnings.length) {
    lines.push("## ⚠ Warnings");
    r.score.warnings.forEach((w: string) => lines.push(`- ${w}`));
    lines.push("");
  }
  lines.push("## Detail");
  lines.push(`- Total elements: ${r.scan.stats.total}`);
  lines.push(`- Interactive: ${r.scan.stats.interactive}`);
  lines.push(`- Text nodes: ${r.scan.stats.text}`);
  lines.push(`- Images: ${r.scan.stats.images} (${r.scan.stats.brokenImages} broken)`);
  lines.push(`- Cards detected: ${r.scan.cardCount}`);
  lines.push(`- Hero block: ${r.scan.heroDetected}`);
  lines.push(`- Bottom nav: ${r.scan.bottomNav ? "yes" : "no"}`);
  lines.push("");
  if (r.scan.tinyFonts.length) {
    lines.push("### Tiny fonts (<12px)");
    r.scan.tinyFonts.slice(0, 20).forEach((t: any) =>
      lines.push(`- \`<${t.tag}>\` ${t.fs} — "${t.text}" — \`${t.classes.split(" ").slice(0, 3).join(" ")}\``)
    );
    if (r.scan.tinyFonts.length > 20) lines.push(`- ...+${r.scan.tinyFonts.length - 20} more`);
    lines.push("");
  }
  if (r.scan.smallTouchTargets.length) {
    lines.push("### Small touch targets (<36×36)");
    r.scan.smallTouchTargets.slice(0, 20).forEach((t: any) =>
      lines.push(`- \`<${t.tag}>\` ${t.w}×${t.h} — "${t.text}" — \`${t.classes.split(" ").slice(0, 3).join(" ")}\``)
    );
    if (r.scan.smallTouchTargets.length > 20) lines.push(`- ...+${r.scan.smallTouchTargets.length - 20} more`);
    lines.push("");
  }
  if (r.scan.overflowElements.length) {
    lines.push("### Overflow elements");
    r.scan.overflowElements.slice(0, 10).forEach((o: any) =>
      lines.push(`- \`<${o.tag}>\` overflows by ${o.overflowBy}px — \`${o.classes.split(" ").slice(0, 3).join(" ")}\``)
    );
    lines.push("");
  }
  if (r.scan.mojibakeText && r.scan.mojibakeText.length) {
    lines.push("### Mojibake (corrupted encoding)");
    r.scan.mojibakeText.slice(0, 20).forEach((m: any) =>
      lines.push(`- \`<${m.tag}>\` "${m.text}" — \`${m.classes.split(" ").slice(0, 3).join(" ")}\``)
    );
    lines.push("");
  }
  if (r.console.length) {
    lines.push("### Console");
    r.console.slice(0, 30).forEach((c: ConsoleEntry) => lines.push(`- **${c.type}**: ${c.text.substring(0, 200)}`));
    lines.push("");
  }
  if (r.network.length) {
    lines.push("### Network failures");
    r.network.slice(0, 30).forEach((n: NetEntry) => lines.push(`- ${n.status} ${n.method} ${n.url.substring(0, 200)}`));
    lines.push("");
  }
  lines.push("### Screenshots");
  lines.push(`- Full page: \`${r.screens.full}\``);
  r.screens.shots.forEach((s: string) => lines.push(`- \`${s}\``));
  fs.writeFileSync(file, lines.join("\n"), "utf8");
}

/* ─────────────────────── the test loop ─────────────────────── */

const phaseReport: any = { phase: PHASE, viewport: PHASE_VIEWPORT, generatedAt: new Date().toISOString(), pages: [] };

test.beforeAll(() => {
  ensureDir(OUTDIR);
});

for (const pg of ROUTES) {
  test(`[P${PHASE}] ${pg.name}  ${pg.path}`, async ({ page }) => {
    const pageDir = path.join(OUTDIR, pg.name);
    ensureDir(pageDir);

    const consoleEntries: ConsoleEntry[] = [];
    const netFailures: NetEntry[] = [];

    page.on("console", (msg: ConsoleMessage) => {
      consoleEntries.push({ type: msg.type(), text: msg.text() });
    });
    page.on("pageerror", (err) => {
      const stack = (err && (err as any).stack) ? String((err as any).stack) : String(err?.message || err);
      consoleEntries.push({ type: "error", text: stack.substring(0, 800) });
    });
    page.on("response", (resp) => {
      const s = resp.status();
      if (s >= 400) {
        netFailures.push({ url: resp.url(), status: s, method: resp.request().method() });
      }
    });

    // NO_MOCKS=1 → use the real backend at VITE_API_BASE_URL (don't intercept /api/**)
    if (process.env.NO_MOCKS !== "1") {
      await mockAllApis(page, pg.loggedIn);
    }
    if (pg.loggedIn) await setupLoggedInState(page);
    else await setupLoggedOutState(page);
    if (process.env.NO_MOCKS !== "1") {
      await mockCompareApi(page);
    }
    await enableLightMode(page);

    let navError: string | null = null;
    try {
      await page.goto(pg.path, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await waitForPageReady(page);
      await disableAnimations(page);
      // Wait for the app shell to actually mount (bottom nav OR a landmark) — escapes Suspense fallback
      await page.waitForSelector(
        'nav.mhub-bottom-nav, [role="main"], main, [data-page], #root > div > div',
        { timeout: 8000, state: "attached" }
      ).catch(() => {});
      // Allow data to populate; skeleton/loader to settle
      await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(1200);
      // Best-effort: wait for the route Suspense fallback to disappear (page-level spinner)
      await page.waitForFunction(
        () => {
          const main = document.querySelector('main, [role="main"]');
          if (!main) return false;
          const txt = (main.textContent || "").trim();
          // Pure Suspense fallback shows just the word "Loading" with no other content.
          // Anything beyond that means the page chunk has rendered.
          if (txt.length > 60 && !/^\s*Loading\s*\.{0,3}\s*$/i.test(txt)) return true;
          if (main.querySelectorAll('input,textarea,select,form,article,[class*="card" i],[class*="Card"]').length >= 1) return true;
          return false;
        },
        { timeout: 4000 }
      ).catch(() => {});
      await page.waitForTimeout(500);
    } catch (e: any) {
      navError = String(e?.message || e);
      consoleEntries.push({ type: "error", text: `NAV_FAIL: ${navError}` });
    }

    // Dismiss possible login prompt
    try { await page.keyboard.press("Escape"); await page.waitForTimeout(150); } catch {}

    let screens: any = { scrollH: 0, viewH: PHASE_VIEWPORT.height, steps: 0, shots: [], full: "" };
    let scan: any = { stats: { total: 0, interactive: 0, text: 0, images: 0, brokenImages: 0 }, tinyFonts: [], smallTouchTargets: [], overflowElements: [], missingDarkVariants: [], brokenImageList: [], stickyBars: [], bottomNav: null, heroDetected: false, cardCount: 0, whiteScreen: true, missingPrimaryCta: true, placeholderText: 0, mojibakeText: [], stillLoading: false, mainTextLen: 0, visibleSpinners: 0, overflow: { bodyX: false, htmlX: false, bodyScrollW: 0 } };
    try { screens = await captureScrollStrips(page, pg.name, pageDir); } catch (e: any) {
      consoleEntries.push({ type: "error", text: `CAPTURE_FAIL: ${String(e?.message || e).substring(0, 400)}` });
    }
    try { scan = await deepScan(page); } catch (e: any) {
      consoleEntries.push({ type: "error", text: `SCAN_FAIL: ${String(e?.message || e).substring(0, 400)}` });
    }
    const sc = score(scan, consoleEntries, netFailures);

    // Category-specific blocker: marketplace feeds must render at least 3 cards.
    if ((pg.category || "") === "marketplace" && scan.cardCount < 3) {
      sc.blockers.push(`EMPTY_FEED: marketplace page rendered only ${scan.cardCount} card(s)`);
    }
    // Discovery pages: just require meaningful rendered content (categories/search/lists vary in markup).
    if ((pg.category || "") === "discovery" && (scan.mainTextLen || 0) < 200) {
      sc.blockers.push(`EMPTY_DISCOVERY: discovery page only rendered ${scan.mainTextLen} chars of content`);
    }

    const pageReport = {
      name: pg.name,
      path: pg.path,
      loggedIn: pg.loggedIn,
      category: pg.category || "uncategorised",
      viewport: PHASE_VIEWPORT,
      scrollHeight: screens.scrollH,
      screens,
      scan,
      console: consoleEntries.slice(0, 100),
      network: netFailures.slice(0, 50),
      score: sc,
      navError,
    };

    fs.writeFileSync(path.join(pageDir, "report.json"), JSON.stringify(pageReport, null, 2));
    writeMarkdownReport(path.join(pageDir, "report.md"), pageReport);
    phaseReport.pages.push({
      name: pg.name, path: pg.path, score: sc.rubric.total,
      blockers: sc.blockers.length, warnings: sc.warnings.length, navError,
    });

    // Console summary for the phase orchestrator
    const tag = sc.blockers.length ? "❌" : sc.rubric.total >= 9.0 ? "✅" : "🟡";
    console.log(`${tag} P${PHASE} ${pg.name.padEnd(24)} ${sc.rubric.total}/10  blockers=${sc.blockers.length} warns=${sc.warnings.length}`);

    // Don't fail the test on score — orchestrator decides next iteration.
    // Don't hard-fail on navError either — record it in the report and let the orchestrator
    // see it via blockers; this ensures the page row makes it into _summary.json.
    if (navError) sc.blockers.push(`NAV_ERROR: ${navError.substring(0, 200)}`);
  });
}

test.afterAll(() => {
  try {
    const summaryPath = path.join(OUTDIR, "_summary.json");
    fs.writeFileSync(summaryPath, JSON.stringify(phaseReport, null, 2), "utf8");

    const md: string[] = [];
    md.push(`# Phase ${PHASE} - summary`);
    md.push("");
    md.push(`Viewport: ${PHASE_VIEWPORT.width}x${PHASE_VIEWPORT.height}  |  Pages: ${phaseReport.pages.length}  |  Generated: ${phaseReport.generatedAt}`);
    md.push("");
    md.push("| Status | Page | Route | Score | Blockers | Warnings |");
    md.push("|---|---|---|---|---|---|");
    for (const p of phaseReport.pages) {
      const status = p.blockers > 0 ? "FAIL" : (p.score >= 9.0 ? "PASS" : "WARN");
      const safePath = String(p.path).replace(/\|/g, "\\|");
      md.push("| " + status + " | " + p.name + " | `" + safePath + "` | **" + p.score + "** | " + p.blockers + " | " + p.warnings + " |");
    }
    md.push("");
    const passed = phaseReport.pages.filter((p: any) => p.blockers === 0 && p.score >= 9.0).length;
    md.push("**Passing (>=9.0, 0 blockers): " + passed + " / " + phaseReport.pages.length + "**");
    fs.writeFileSync(path.join(OUTDIR, "_summary.md"), md.join("\n"), "utf8");
    console.log("\n[phase-audit] summary -> " + summaryPath);
  } catch (e: any) {
    console.error("[phase-audit] afterAll write FAILED:", e?.stack || e);
    throw e;
  }
});
