/**
 * MHub Android Layout Audit — Deep Element Scan
 * Scans every page, captures screenshots at multiple scroll positions,
 * and analyzes every element: height, width, positioning, font sizes,
 * touch targets, spacing, overflow, and card anatomy.
 *
 * Outputs:
 *   e2e/android/screenshots/audit/          — per-page, per-scroll PNGs
 *   e2e/android/screenshots/audit/report.json — full JSON report
 */
import { test, expect, type Page } from "@playwright/test";
import {
  disableAnimations, waitForPageReady,
  setupLoggedOutState, setupLoggedInState,
  enableLightMode, mockAllApis, mockCompareApi,
  ANDROID_VIEWPORT
} from "./android-helpers";
import * as fs from "fs";
import * as path from "path";

test.use({ viewport: ANDROID_VIEWPORT, hasTouch: true, isMobile: true });
test.setTimeout(300_000); // 5 min — this is a full sweep

const AUDIT_DIR = path.join("e2e", "android", "screenshots", "audit");

/* ─────────────────── helpers ─────────────────── */

async function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

async function screenshotAt(page: Page, name: string, scrollY?: number) {
  if (scrollY !== undefined) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(400);
  }
  await page.screenshot({
    path: path.join(AUDIT_DIR, `${name}.png`),
    fullPage: false,
  });
}

async function fullPageScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(AUDIT_DIR, `${name}-full.png`),
    fullPage: true,
  });
}

/** Capture screenshots at every viewport-height scroll step */
async function captureScrollStrips(page: Page, prefix: string) {
  const { scrollH, viewH } = await page.evaluate(() => ({
    scrollH: document.documentElement.scrollHeight,
    viewH: window.innerHeight,
  }));
  const steps = Math.ceil(scrollH / (viewH * 0.85));
  const shots: string[] = [];
  for (let i = 0; i < steps; i++) {
    const y = Math.min(i * viewH * 0.85, scrollH - viewH);
    const name = `${prefix}-scroll${String(i).padStart(2, "0")}`;
    await screenshotAt(page, name, y);
    shots.push(name);
  }
  // also a full-page shot
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await fullPageScreenshot(page, prefix);
  return { scrollH, viewH, steps, shots };
}

/* ─── Deep element-level JS scan injected into the page ─── */
async function deepElementScan(page: Page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scrollH = document.documentElement.scrollHeight;
    const result: any = {
      viewport: { width: vw, height: vh },
      scrollHeight: scrollH,
      screens: Math.ceil(scrollH / vh),
      overflow: {
        bodyX: document.body.scrollWidth > vw,
        htmlX: document.documentElement.scrollWidth > vw,
        bodyScrollW: document.body.scrollWidth,
      },
      stats: { total: 0, interactive: 0, text: 0, images: 0 },
      fontDistribution: {} as Record<string, number>,
      touchTargetIssues: [] as any[],
      cards: [] as any[],
      grid: null as any,
      stickyBars: [] as any[],
      bottomNav: null as any,
      searchBar: null as any,
      categoryTrack: null as any,
      spacingIssues: [] as any[],
      overflowElements: [] as any[],
    };

    const ALL = document.querySelectorAll("*");
    result.stats.total = ALL.length;

    /* ── 1. Font size distribution & tiny-text flags ── */
    const textTags = "p,span,h1,h2,h3,h4,h5,h6,label,a,li,td,th,button,input,select,textarea";
    document.querySelectorAll(textTags).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.top > scrollH) return;
      result.stats.text++;
      const fs = getComputedStyle(el).fontSize;
      result.fontDistribution[fs] = (result.fontDistribution[fs] || 0) + 1;
    });

    /* ── 2. Touch-target audit (< 44 × 44) ── */
    const interactiveSel = 'button,a,input,select,[role="button"],[role="menuitem"],[tabindex]';
    document.querySelectorAll(interactiveSel).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      result.stats.interactive++;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return;
      if (r.width < 44 || r.height < 44) {
        result.touchTargetIssues.push({
          tag: el.tagName,
          text: (el as HTMLElement).innerText?.trim().substring(0, 40) || "",
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top),
          left: Math.round(r.left),
          classes: (typeof el.className === "string" ? el.className : "").substring(0, 80),
        });
      }
    });

    /* ── 3. Images ── */
    document.querySelectorAll("img").forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) result.stats.images++;
    });

    /* ── 4. Post cards — deep anatomy ── */
    const cardSel = ".mhub-allposts-card, .mhub-mobile-post-card, [class*='PostCard'], [class*='product-card']";
    document.querySelectorAll(cardSel).forEach((card, idx) => {
      const cr = card.getBoundingClientRect();
      if (cr.width === 0) return;

      const c: any = {
        index: idx,
        width: Math.round(cr.width),
        height: Math.round(cr.height),
        top: Math.round(cr.top),
        left: Math.round(cr.left),
        children: [] as any[],
      };

      // Walk every direct & nested element inside the card
      card.querySelectorAll("*").forEach((child) => {
        const r = child.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        const cs = getComputedStyle(child);
        if (cs.display === "none") return;

        const tag = child.tagName.toLowerCase();
        const entry: any = {
          tag,
          w: Math.round(r.width),
          h: Math.round(r.height),
          top: Math.round(r.top - cr.top), // relative to card
          left: Math.round(r.left - cr.left),
          fontSize: cs.fontSize,
          lineHeight: cs.lineHeight,
          padding: cs.padding,
          margin: cs.margin,
          position: cs.position,
          overflow: cs.overflow,
        };

        // Classify the element
        if (tag === "img") {
          entry.role = "image";
          entry.src = (child as HTMLImageElement).src?.substring(0, 80);
          entry.naturalW = (child as HTMLImageElement).naturalWidth;
          entry.naturalH = (child as HTMLImageElement).naturalHeight;
        } else if (tag === "button" || child.getAttribute("role") === "button") {
          entry.role = "button";
          entry.text = (child as HTMLElement).innerText?.trim().substring(0, 30);
        } else if (["h1","h2","h3","h4","h5","h6"].includes(tag) || child.classList.contains("mhub-card-title")) {
          entry.role = "title";
          entry.text = (child as HTMLElement).innerText?.trim().substring(0, 60);
          entry.clamp = cs.webkitLineClamp || "none";
          entry.isTruncated = child.scrollHeight > r.height + 2;
        } else if (child.classList.contains("mhub-price-pill") || child.classList.contains("font-bold")) {
          entry.role = "price";
          entry.text = (child as HTMLElement).innerText?.trim().substring(0, 30);
        } else if (child.classList.contains("mhub-chip")) {
          entry.role = "chip";
          entry.text = (child as HTMLElement).innerText?.trim().substring(0, 20);
        } else if (tag === "span" || tag === "p" || tag === "a") {
          entry.role = "text";
          entry.text = (child as HTMLElement).innerText?.trim().substring(0, 40);
        } else if (child.classList.contains("mhub-media-frame") || child.classList.contains("mhub-media-img")) {
          entry.role = "media";
        }

        // Flag issues
        const issues: string[] = [];
        if (entry.role === "button" && (r.width < 44 || r.height < 44)) issues.push("SMALL_TOUCH_TARGET");
        if (r.right > vw + 2) issues.push("OVERFLOWS_RIGHT");
        if (r.left < -2) issues.push("OFFSCREEN_LEFT");
        if (parseFloat(cs.fontSize) < 11 && entry.text) issues.push("TINY_FONT");
        if (child.scrollWidth > r.width + 4 && entry.text) issues.push("TEXT_CLIPPED");
        if (issues.length) entry.issues = issues;

        c.children.push(entry);
      });

      result.cards.push(c);
    });

    /* ── 5. Grid layout ── */
    const grid = document.querySelector(".grid.grid-cols-2, .mhub-post-grid, [class*='grid-cols']");
    if (grid) {
      const gs = getComputedStyle(grid);
      const gr = grid.getBoundingClientRect();
      result.grid = {
        columns: gs.gridTemplateColumns,
        rows: gs.gridTemplateRows?.substring(0, 120),
        gap: gs.gap,
        width: Math.round(gr.width),
        padding: gs.padding,
        childCount: grid.children.length,
      };
    }

    /* ── 6. Sticky bars ── */
    document.querySelectorAll('[class*="sticky"]').forEach((bar) => {
      const r = bar.getBoundingClientRect();
      const cs = getComputedStyle(bar);
      if (r.height > 0) {
        result.stickyBars.push({
          h: Math.round(r.height),
          w: Math.round(r.width),
          top: cs.top,
          zIndex: cs.zIndex,
          position: cs.position,
          classes: (typeof bar.className === "string" ? bar.className : "").substring(0, 100),
        });
      }
    });

    /* ── 7. Bottom nav ── */
    const nav = document.querySelector('nav.mhub-bottom-nav, nav[class*="fixed"][class*="bottom"]');
    if (nav) {
      const nr = nav.getBoundingClientRect();
      result.bottomNav = {
        h: Math.round(nr.height),
        w: Math.round(nr.width),
        top: Math.round(nr.top),
        zIndex: getComputedStyle(nav).zIndex,
        items: Array.from(nav.querySelectorAll("a, button")).map((item) => {
          const ir = item.getBoundingClientRect();
          return {
            text: (item as HTMLElement).innerText?.trim().substring(0, 20),
            w: Math.round(ir.width),
            h: Math.round(ir.height),
          };
        }),
      };
    }

    /* ── 8. Search bar ── */
    const search = document.querySelector('.mhub-nav-search, input[type="search"], input[placeholder*="earch"]');
    if (search) {
      const sr = search.getBoundingClientRect();
      const scs = getComputedStyle(search);
      result.searchBar = {
        w: Math.round(sr.width),
        h: Math.round(sr.height),
        top: Math.round(sr.top),
        fontSize: scs.fontSize,
        padding: scs.padding,
        placeholder: (search as HTMLInputElement).placeholder || "",
      };
    }

    /* ── 9. Category track / chips ── */
    const track = document.querySelector(".mhub-category-track, [class*='category-scroll']");
    if (track) {
      const tr = track.getBoundingClientRect();
      const parent = track.parentElement;
      const chips = track.querySelectorAll(".mhub-category-item, [class*='chip'], [class*='pill']");
      result.categoryTrack = {
        trackW: Math.round(tr.width),
        viewportW: vw,
        overflowPx: Math.round(tr.right - vw),
        scrollable: parent ? parent.scrollWidth > parent.clientWidth : false,
        chipCount: chips.length,
        chips: Array.from(chips).map((ch) => {
          const chr = ch.getBoundingClientRect();
          return {
            text: ch.textContent?.trim().substring(0, 20) || "",
            w: Math.round(chr.width),
            h: Math.round(chr.height),
            fontSize: getComputedStyle(ch).fontSize,
            visible: chr.right <= vw && chr.left >= 0,
          };
        }),
      };
    }

    /* ── 10. Card consistency check ── */
    if (result.cards.length >= 2) {
      const widths = result.cards.map((c: any) => c.width);
      const heights = result.cards.map((c: any) => c.height);
      const uniqueW = [...new Set(widths)];
      const uniqueH = [...new Set(heights)];
      if (uniqueW.length > 1) {
        result.spacingIssues.push({ type: "INCONSISTENT_CARD_WIDTHS", values: uniqueW });
      }
      result.cardSizeStats = {
        widthRange: [Math.min(...widths), Math.max(...widths)],
        heightRange: [Math.min(...heights), Math.max(...heights)],
        uniqueWidths: uniqueW.length,
        uniqueHeights: uniqueH.length,
      };
    }

    /* ── 11. Overflow elements ── */
    ALL.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      if (r.right > vw + 5) {
        result.overflowElements.push({
          tag: el.tagName.toLowerCase(),
          classes: (typeof el.className === "string" ? el.className : "").substring(0, 80),
          w: Math.round(r.width),
          right: Math.round(r.right),
          overflowBy: Math.round(r.right - vw),
        });
      }
    });

    return result;
  });
}

/* ─────────────────── page definitions ─────────────────── */

interface PageDef {
  name: string;
  path: string;
  loggedIn: boolean;
}

const PAGES: PageDef[] = [
  // Core marketplace
  { name: "all-posts",       path: "/all-posts",         loggedIn: false },
  { name: "category-hub",    path: "/",                  loggedIn: false },
  { name: "post-detail",     path: "/post/post-1",       loggedIn: false },
  { name: "search",          path: "/search?q=camera",   loggedIn: false },
  // Auth-gated
  { name: "feed",            path: "/feed",              loggedIn: true },
  { name: "for-you",         path: "/for-you",           loggedIn: true },
  { name: "cart",            path: "/cart",               loggedIn: true },
  { name: "wishlist",        path: "/wishlist",           loggedIn: true },
  { name: "profile",         path: "/profile",            loggedIn: true },
  { name: "dashboard",       path: "/dashboard",          loggedIn: true },
  { name: "notifications",   path: "/notifications",      loggedIn: true },
  { name: "rewards",         path: "/rewards",            loggedIn: true },
  { name: "channels",        path: "/channels",           loggedIn: true },
  // Utility / legal
  { name: "login",           path: "/login",              loggedIn: false },
  { name: "signup",          path: "/signup",             loggedIn: false },
  { name: "terms",           path: "/terms",              loggedIn: false },
  { name: "privacy",         path: "/privacy-policy",     loggedIn: false },
];

/* ─────────────────── THE AUDIT ─────────────────── */

test.describe("Layout Audit — Deep Element Scan", () => {
  const fullReport: Record<string, any> = {};

  test.beforeAll(() => {
    ensureDir(AUDIT_DIR);
  });

  for (const pg of PAGES) {
    test(`[AUDIT] ${pg.name}`, async ({ page }) => {
      // Setup mocks & state
      await mockAllApis(page, pg.loggedIn);
      if (pg.loggedIn) {
        await setupLoggedInState(page);
      } else {
        await setupLoggedOutState(page);
      }
      if (pg.name === "wishlist" || pg.name === "cart") {
        // compare needs localStorage seeding
        await mockCompareApi(page);
      }
      await enableLightMode(page);

      // Navigate
      await page.goto(pg.path, { waitUntil: "domcontentloaded" });
      await waitForPageReady(page);
      await disableAnimations(page);
      // Dismiss any login prompt overlay
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      // 1. Capture scroll-strip screenshots
      const scrollInfo = await captureScrollStrips(page, pg.name);

      // 2. Deep element scan
      const scan = await deepElementScan(page);

      // 3. Build page report
      const pageReport = {
        page: pg.name,
        url: pg.path,
        loggedIn: pg.loggedIn,
        ...scrollInfo,
        scan,
      };

      fullReport[pg.name] = pageReport;

      // Console summary per page
      console.log(`\n${"═".repeat(60)}`);
      console.log(`  ${pg.name.toUpperCase()} — ${pg.path}`);
      console.log(`${"═".repeat(60)}`);
      console.log(`  Viewport: ${scan.viewport.width}×${scan.viewport.height}`);
      console.log(`  Page height: ${scan.scrollHeight}px (${scan.screens} screens)`);
      console.log(`  Elements: ${scan.stats.total} total, ${scan.stats.interactive} interactive, ${scan.stats.text} text, ${scan.stats.images} images`);
      console.log(`  Overflow X: body=${scan.overflow.bodyX}, html=${scan.overflow.htmlX}`);
      if (scan.overflow.bodyX || scan.overflow.htmlX) {
        console.log(`    ⚠ Body scrollWidth = ${scan.overflow.bodyScrollW}px (viewport ${scan.viewport.width}px)`);
      }

      // Cards
      if (scan.cards.length > 0) {
        console.log(`\n  ── POST CARDS (${scan.cards.length}) ──`);
        if (scan.cardSizeStats) {
          console.log(`    Width range: ${scan.cardSizeStats.widthRange[0]}–${scan.cardSizeStats.widthRange[1]}px (${scan.cardSizeStats.uniqueWidths} unique)`);
          console.log(`    Height range: ${scan.cardSizeStats.heightRange[0]}–${scan.cardSizeStats.heightRange[1]}px (${scan.cardSizeStats.uniqueHeights} unique)`);
        }
        scan.cards.slice(0, 4).forEach((card: any) => {
          console.log(`    Card #${card.index}: ${card.width}×${card.height} at (${card.left}, ${card.top})`);
          const titles = card.children.filter((ch: any) => ch.role === "title");
          const prices = card.children.filter((ch: any) => ch.role === "price");
          const images = card.children.filter((ch: any) => ch.role === "image");
          const buttons = card.children.filter((ch: any) => ch.role === "button");
          const chips = card.children.filter((ch: any) => ch.role === "chip");
          if (titles.length) console.log(`      Title: "${titles[0].text}" — ${titles[0].fontSize}, ${titles[0].w}×${titles[0].h}px, truncated=${titles[0].isTruncated || false}`);
          if (prices.length) console.log(`      Price: "${prices[0].text}" — ${prices[0].fontSize}, ${prices[0].w}×${prices[0].h}px`);
          if (images.length) console.log(`      Image: ${images[0].w}×${images[0].h}px (natural ${images[0].naturalW}×${images[0].naturalH})`);
          if (buttons.length) console.log(`      Buttons (${buttons.length}): ${buttons.map((b: any) => `${b.text||"?"}[${b.w}×${b.h}]`).join(", ")}`);
          if (chips.length) console.log(`      Chips (${chips.length}): ${chips.map((c: any) => `${c.text}[${c.fontSize}]`).join(", ")}`);
          const issues = card.children.filter((ch: any) => ch.issues?.length);
          if (issues.length) {
            issues.forEach((ch: any) => console.log(`      ⚠ ${ch.tag} ${ch.role||""}: ${ch.issues.join(", ")}`));
          }
        });
      }

      // Grid
      if (scan.grid) {
        console.log(`\n  ── GRID ──`);
        console.log(`    Columns: ${scan.grid.columns}`);
        console.log(`    Gap: ${scan.grid.gap}, Padding: ${scan.grid.padding}`);
        console.log(`    Width: ${scan.grid.width}px, Children: ${scan.grid.childCount}`);
      }

      // Sticky bars
      if (scan.stickyBars.length) {
        console.log(`\n  ── STICKY BARS (${scan.stickyBars.length}) ──`);
        scan.stickyBars.forEach((b: any) => console.log(`    ${b.w}×${b.h} top:${b.top} z:${b.zIndex} pos:${b.position}`));
      }

      // Bottom nav
      if (scan.bottomNav) {
        console.log(`\n  ── BOTTOM NAV ──`);
        console.log(`    ${scan.bottomNav.w}×${scan.bottomNav.h} at y=${scan.bottomNav.top} z=${scan.bottomNav.zIndex}`);
        console.log(`    Items: ${scan.bottomNav.items.map((i: any) => `${i.text}[${i.w}×${i.h}]`).join(", ")}`);
      }

      // Search bar
      if (scan.searchBar) {
        console.log(`\n  ── SEARCH BAR ──`);
        console.log(`    ${scan.searchBar.w}×${scan.searchBar.h} at y=${scan.searchBar.top}, font:${scan.searchBar.fontSize}`);
      }

      // Category track
      if (scan.categoryTrack) {
        console.log(`\n  ── CATEGORY TRACK ──`);
        console.log(`    Track width: ${scan.categoryTrack.trackW}px, ${scan.categoryTrack.chipCount} chips, scrollable: ${scan.categoryTrack.scrollable}`);
        scan.categoryTrack.chips?.forEach((ch: any) => console.log(`      "${ch.text}" ${ch.w}×${ch.h} ${ch.fontSize} visible:${ch.visible}`));
      }

      // Touch target issues
      if (scan.touchTargetIssues.length) {
        console.log(`\n  ── TOUCH TARGET ISSUES (${scan.touchTargetIssues.length}) ──`);
        scan.touchTargetIssues.slice(0, 15).forEach((t: any) =>
          console.log(`    ${t.tag} "${t.text}" → ${t.w}×${t.h}px at (${t.left}, ${t.top})`)
        );
        if (scan.touchTargetIssues.length > 15) {
          console.log(`    ... and ${scan.touchTargetIssues.length - 15} more`);
        }
      }

      // Font distribution
      console.log(`\n  ── FONT SIZE DISTRIBUTION ──`);
      const sorted = Object.entries(scan.fontDistribution)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 10);
      sorted.forEach(([size, count]) => console.log(`    ${size}: ${count} elements`));

      // Spacing issues
      if (scan.spacingIssues.length) {
        console.log(`\n  ── SPACING ISSUES ──`);
        scan.spacingIssues.forEach((s: any) => console.log(`    ${s.type}: ${JSON.stringify(s.values)}`));
      }

      // Overflow elements
      if (scan.overflowElements.length) {
        console.log(`\n  ⚠ OVERFLOW ELEMENTS (${scan.overflowElements.length}) ──`);
        scan.overflowElements.slice(0, 10).forEach((o: any) =>
          console.log(`    <${o.tag}> .${o.classes.split(" ")[0]} → ${o.w}px wide, overflows by ${o.overflowBy}px`)
        );
      }

      console.log(`  Screenshots: ${scrollInfo.steps} scroll strips + 1 full-page\n`);
    });
  }

  // Write the full JSON report at the end
  test("[AUDIT] write combined report", async ({ page }) => {
    const reportPath = path.join(AUDIT_DIR, "report.json");
    fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
    console.log(`\n✅ Full audit report written to ${reportPath}`);
    console.log(`   Pages audited: ${Object.keys(fullReport).length}`);
    
    // Summary of all issues across pages
    let totalTouchIssues = 0;
    let totalOverflowPages = 0;
    let totalCards = 0;
    const allCardIssues: string[] = [];

    for (const [pageName, pr] of Object.entries(fullReport)) {
      const s = (pr as any).scan;
      if (!s) continue;
      totalTouchIssues += s.touchTargetIssues?.length || 0;
      if (s.overflow?.bodyX || s.overflow?.htmlX) totalOverflowPages++;
      totalCards += s.cards?.length || 0;
      s.cards?.forEach((c: any) => {
        c.children?.forEach((ch: any) => {
          if (ch.issues) {
            ch.issues.forEach((issue: string) => {
              allCardIssues.push(`${pageName}:card${c.index}:${ch.tag}:${issue}`);
            });
          }
        });
      });
    }

    console.log(`\n${"═".repeat(60)}`);
    console.log("  AUDIT SUMMARY");
    console.log(`${"═".repeat(60)}`);
    console.log(`  Pages scanned: ${Object.keys(fullReport).length}`);
    console.log(`  Total cards analyzed: ${totalCards}`);
    console.log(`  Touch target issues: ${totalTouchIssues}`);
    console.log(`  Pages with overflow: ${totalOverflowPages}`);
    console.log(`  Card element issues: ${allCardIssues.length}`);
    if (allCardIssues.length) {
      console.log(`  Issue breakdown:`);
      allCardIssues.forEach((i) => console.log(`    - ${i}`));
    }

    // Expect no overflow
    expect(totalOverflowPages, "pages with horizontal overflow").toBe(0);
  });
});
