/**
 * Emulator-5554 Full App Screenshot Sweep
 * Captures every page at Pixel 7 / Android 14 resolution (412×915)
 * Viewport = 412 wide × 915 tall, touch enabled, Android 14 UA
 * Output: e2e/android/screenshots/5554/
 */
import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  mockAllApis,
  setupLoggedInState,
  enableLightMode,
  disableAnimations,
  waitForPageReady,
  ANDROID_VIEWPORT,
  ANDROID_USER_AGENT,
} from './android-helpers';

const OUT = path.resolve(process.cwd(), 'e2e/android/screenshots/5554');

const DISABLE_CSS = `
*,*::before,*::after{
  animation:none!important;
  transition:none!important;
  scroll-behavior:auto!important;
}
`;

/* ── All pages to sweep ─────────────────────────────────────────── */
const PAGES: Array<{ route: string; label: string; auth: boolean; scrollY?: number }> = [
  // ── Public / landing ──
  { route: '/category-hub',       label: '01-category-hub',         auth: false },
  { route: '/all-posts',          label: '02-all-posts',            auth: false },
  { route: '/all-posts',          label: '02-all-posts-bottom',     auth: false, scrollY: 9999 },
  { route: '/for-you',            label: '03-for-you',              auth: true  },
  { route: '/search',             label: '04-search',               auth: false },
  { route: '/feed',               label: '05-feed',                 auth: true  },
  { route: '/listing/post-1',     label: '06-post-detail',          auth: false },
  { route: '/listing/post-1',     label: '06-post-detail-bottom',   auth: false, scrollY: 9999 },
  { route: '/subcategories',      label: '07-subcategories',        auth: false },
  // ── Auth pages ──
  { route: '/login',              label: '08-login',                auth: false },
  { route: '/signup',             label: '09-signup',               auth: false },
  { route: '/forgot-password',    label: '10-forgot-password',      auth: false },
  // ── Authenticated pages ──
  { route: '/home',               label: '11-home',                 auth: true  },
  { route: '/dashboard',          label: '12-dashboard',            auth: true  },
  { route: '/profile',            label: '13-profile',              auth: true  },
  { route: '/profile',            label: '13-profile-bottom',       auth: true,  scrollY: 9999 },
  { route: '/my-home',            label: '14-my-posts',             auth: true  },
  { route: '/my-feed',            label: '15-my-feed',              auth: true  },
  { route: '/cart',               label: '16-cart',                 auth: true  },
  { route: '/cart',               label: '16-cart-bottom',          auth: true,  scrollY: 9999 },
  { route: '/wishlist',           label: '17-wishlist',             auth: true  },
  { route: '/notifications',      label: '18-notifications',        auth: true  },
  { route: '/rewards',            label: '19-rewards',              auth: true  },
  { route: '/rewards',            label: '19-rewards-bottom',       auth: true,  scrollY: 9999 },
  { route: '/add-post',           label: '20-add-post',             auth: true  },
  { route: '/add-post',           label: '20-add-post-bottom',      auth: true,  scrollY: 9999 },
  { route: '/edit-post/post-1',   label: '21-edit-post',            auth: true  },
  { route: '/sold-posts',         label: '22-sold-posts',           auth: true  },
  { route: '/bought-posts',       label: '23-bought-posts',         auth: true  },
  { route: '/recently-viewed',    label: '24-recently-viewed',      auth: true  },
  { route: '/saved-searches',     label: '25-saved-searches',       auth: true  },
  { route: '/compare',            label: '26-compare',              auth: false },
  { route: '/nearby',             label: '27-nearby',               auth: true  },
  { route: '/activity',           label: '28-activity',             auth: true  },
  { route: '/offers',             label: '29-offers',               auth: false },
  { route: '/analytics',          label: '30-analytics',            auth: false },
  { route: '/chat',               label: '31-chat',                 auth: true  },
  { route: '/feedback',           label: '32-feedback',             auth: true  },
  { route: '/complaints',         label: '33-complaints',           auth: true  },
  { route: '/reviews/123',        label: '34-reviews',              auth: false },
  { route: '/public-wall',        label: '35-public-wall',          auth: false },
  { route: '/channels',           label: '36-channels',             auth: false },
  { route: '/channels/123',       label: '37-channel-detail',       auth: false },
  { route: '/channels/create',    label: '38-create-channel',       auth: true  },
  { route: '/buyer-view',         label: '39-buyer-view',           auth: true  },
  { route: '/post-welcome',       label: '40-post-welcome',         auth: true  },
  { route: '/security',           label: '41-security-settings',    auth: true  },
  { route: '/kyc',                label: '42-kyc',                  auth: true  },
  { route: '/aadhaar-verify',     label: '43-aadhaar-verify',       auth: true  },
  { route: '/tier-selection',     label: '44-tier-selection',       auth: true  },
  { route: '/saledone',           label: '45-saledone',             auth: true  },
  { route: '/saleundone',         label: '46-saleundone',           auth: true  },
  { route: '/payment',            label: '47-payment',              auth: true  },
  { route: '/privacy-policy',     label: '48-privacy-policy',       auth: false },
  { route: '/terms',              label: '49-terms',                auth: false },
  { route: '/refund-policy',      label: '50-refund-policy',        auth: false },
  { route: '/support-ticket-policy', label: '51-support-ticket',   auth: false },
  { route: '/verification',       label: '52-verification',         auth: true  },
  { route: '/account-deletion',   label: '53-account-deletion',     auth: true  },
];

test.use({
  viewport: ANDROID_VIEWPORT,
  hasTouch: true,
  isMobile: true,
  userAgent: ANDROID_USER_AGENT,
  screenshot: 'on',
});

test.describe('Emulator-5554 Full App Sweep (Android 14 / Pixel 7)', () => {
  test.describe.configure({ timeout: 10 * 60 * 1000 });

  test.beforeEach(async ({ page }) => {
    await mockAllApis(page, true);
    await setupLoggedInState(page);
    await enableLightMode(page);
  });

  test('capture all pages — light mode', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('Missing baseURL');
    await fs.mkdir(OUT, { recursive: true });

    const consoleErrors: Record<string, string[]> = {};

    for (const entry of PAGES) {
      const errors: string[] = [];
      const handler = (msg: any) => {
        if (msg.type() === 'error') errors.push(msg.text());
      };
      page.on('console', handler);

      const url = new URL(entry.route, baseURL).toString();

      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25_000 });
        await waitForPageReady(page);
        await disableAnimations(page);
        await page.addStyleTag({ content: DISABLE_CSS });
        await page.waitForTimeout(1200);

        // Scroll if needed
        if (entry.scrollY) {
          await page.evaluate((y) => window.scrollTo(0, y), entry.scrollY);
          await page.waitForTimeout(600);
        }

        // Viewport screenshot (what user sees on phone)
        await page.screenshot({
          path: path.join(OUT, `${entry.label}__viewport.png`),
          fullPage: false,
        });

        // Full-page screenshot (entire scroll height)
        if (!entry.scrollY) {
          await page.screenshot({
            path: path.join(OUT, `${entry.label}__full.png`),
            fullPage: true,
          });
        } else {
          await page.screenshot({
            path: path.join(OUT, `${entry.label}__viewport.png`),
            fullPage: false,
          });
        }

        // Check horizontal overflow
        const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
        if (hasOverflow) {
          console.warn(`[5554-sweep] ⚠ OVERFLOW  ${entry.label} — scrollWidth=${await page.evaluate(() => document.body.scrollWidth)} innerWidth=${ANDROID_VIEWPORT.width}`);
        } else {
          console.log(`[5554-sweep] ✓ ${entry.label}`);
        }

        if (errors.length) consoleErrors[entry.label] = errors;

      } catch (err) {
        console.warn(`[5554-sweep] ✗ FAILED ${entry.label} (${entry.route}):`, err);
        // Try a blank error screenshot so we know which ones failed
        try {
          await page.screenshot({ path: path.join(OUT, `${entry.label}__ERROR.png`), fullPage: false });
        } catch { /* ignore */ }
      }

      page.off('console', handler);
    }

    // Summary
    const withErrors = Object.keys(consoleErrors);
    if (withErrors.length) {
      console.log('\n[5554-sweep] Pages with JS console errors:');
      withErrors.forEach((lbl) => console.log(`  ${lbl}: ${consoleErrors[lbl].slice(0, 2).join(' | ')}`));
    }
  });
});
