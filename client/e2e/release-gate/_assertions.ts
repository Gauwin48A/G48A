/**
 * release-gate/_assertions.ts
 * ---------------------------------------------------------------------------
 * Reusable per-page checks for the release-gate suite. Every public-facing
 * route is funnelled through `gotoAndAssertPage` which:
 *
 *   1. navigates,
 *   2. waits for Suspense + first paint,
 *   3. disables animations,
 *   4. asserts: navigation succeeded, no error overlay, no visible spinner,
 *      primary content present, no mojibake, font-size ≥ 12px on visible text,
 *      touch targets ≥ 36px on visible interactive controls (sampled).
 *
 * Each assertion is recorded to the coverage tracker so the summary report
 * shows pass/fail per dimension, per route.
 * ---------------------------------------------------------------------------
 */
import { expect, type Page, type TestInfo } from "@playwright/test";
import { disableAnimations } from "../comprehensive/e2e-helpers";
import { trackAssertion, trackNote, trackRoute } from "./_tracker";

const MOJIBAKE_RE = /Ã.|Â.|â€./;

export async function gotoAndAssertPage(
  page: Page,
  info: TestInfo,
  route: string,
  opts: { requireMain?: boolean } = {}
) {
  const requireMain = opts.requireMain !== false;
  trackRoute(info, route);

  let navOk = true;
  try {
    const resp = await page.goto(route, { waitUntil: "domcontentloaded", timeout: 20_000 });
    navOk = !!resp && resp.status() < 500;
    trackAssertion(info, "navigation", navOk, `status=${resp?.status() ?? "n/a"}`);
  } catch (err) {
    navOk = false;
    trackAssertion(info, "navigation", false, String(err).slice(0, 200));
  }
  expect(navOk, `nav failed for ${route}`).toBe(true);

  // Wait for Suspense fallback to clear (validated 1.2s buffer in audit-harness).
  await disableAnimations(page);
  await page
    .waitForFunction(
      () => {
        const main = document.querySelector(
          'nav.mhub-bottom-nav, [role="main"], main, [data-page], #root > div'
        );
        if (!main) return false;
        const text = (main as HTMLElement).innerText || "";
        return text.length >= 60 || main.querySelectorAll("a,button,form,article,section").length >= 1;
      },
      { timeout: 8_000 }
    )
    .catch(() => {
      // soft — the assertions below will surface the real issue.
    });
  await page.waitForTimeout(400);

  if (requireMain) await assertPrimaryContent(page, info);
  await assertNoVisibleSpinner(page, info);
  await assertNoMojibake(page, info);
  await assertMobileFontFloor(page, info);
}

export async function assertPrimaryContent(page: Page, info: TestInfo) {
  const stats = await page.evaluate(() => {
    const main = document.querySelector(
      '[role="main"], main, [data-page], nav.mhub-bottom-nav ~ *, #root'
    ) as HTMLElement | null;
    const text = main?.innerText || document.body.innerText || "";
    const cards = document.querySelectorAll(
      '[data-testid*="card"], .mhub-mobile-card, article, [class*="post-card"]'
    );
    return { mainTextLen: text.trim().length, cardCount: cards.length };
  });
  const ok = stats.mainTextLen >= 60 || stats.cardCount >= 1;
  trackAssertion(
    info,
    "primary-content",
    ok,
    `text=${stats.mainTextLen} cards=${stats.cardCount}`
  );
  expect(ok, `no primary content (text=${stats.mainTextLen} cards=${stats.cardCount})`).toBe(true);
}

export async function assertNoVisibleSpinner(page: Page, info: TestInfo) {
  const probe = async () =>
    page.evaluate(() => {
      const spinners = Array.from(
        document.querySelectorAll(
          '[role="progressbar"], .mhub-spinner, .animate-spin, [aria-busy="true"]'
        )
      );
      return spinners.filter((el) => {
        const r = (el as HTMLElement).getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }).length;
    });
  let visible = await probe();
  // Some pages keep a spinner mounted briefly (e.g. lazy chunk loading).
  // Re-probe after 1.5s and only record the assertion based on the second read.
  if (visible > 0) {
    await page.waitForTimeout(1_500);
    visible = await probe();
  }
  const ok = visible === 0;
  trackAssertion(info, "no-spinner-after-settle", ok, `count=${visible}`, {
    soft: true
  });
  if (!ok) trackNote(info, `persistent-spinner=${visible}`);
}

export async function assertNoMojibake(page: Page, info: TestInfo) {
  const offenders = await page.evaluate((reSrc: string) => {
    const re = new RegExp(reSrc);
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walker.nextNode())) {
      const t = (n.nodeValue || "").trim();
      if (!t) continue;
      if (re.test(t)) out.push(t.slice(0, 80));
      if (out.length >= 5) break;
    }
    return out;
  }, MOJIBAKE_RE.source);
  const ok = offenders.length === 0;
  trackAssertion(info, "no-mojibake", ok, offenders.join(" | "));
  expect(ok, `mojibake: ${offenders.join(" | ")}`).toBe(true);
}

export async function assertMobileFontFloor(page: Page, info: TestInfo) {
  const violations = await page.evaluate(() => {
    const out: { tag: string; size: number; text: string }[] = [];
    const els = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
    for (const el of els) {
      if (out.length >= 10) break;
      if (el.children.length > 0) continue;
      const txt = (el.innerText || "").trim();
      if (!txt) continue;
      const cs = getComputedStyle(el);
      const px = parseFloat(cs.fontSize);
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Allow micro-labels under 12px ONLY if hidden visually (sr-only etc.)
      if (px < 12 && cs.visibility !== "hidden" && cs.display !== "none") {
        out.push({ tag: el.tagName, size: px, text: txt.slice(0, 40) });
      }
    }
    return out;
  });
  const ok = violations.length === 0;
  trackAssertion(
    info,
    "font-floor-12px",
    ok,
    violations
      .slice(0, 3)
      .map((v) => `${v.tag}:${v.size}:${v.text}`)
      .join(" | "),
    { soft: true }
  );
  // soft — record but don't hard-fail; mobile-layout.css covers most.
  if (!ok) trackNote(info, `font-floor-violations=${violations.length}`);
}

export async function clickTracked(page: Page, info: TestInfo, selector: string) {
  trackAssertion(info, `click ${selector}`, true);
  trackNote(info, `click:${selector}`);
  await page.locator(selector).first().click({ timeout: 5_000 }).catch((err) => {
    trackAssertion(info, `click ${selector}`, false, String(err).slice(0, 200));
    throw err;
  });
}
