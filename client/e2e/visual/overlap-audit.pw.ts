import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isDevServerResource, safeScreenshot } from '../comprehensive/e2e-helpers';

const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'analysis', 'reports', 'overlap-audit');

const DISABLE_ANIMATIONS_CSS = `
*,
*::before,
*::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
`;

/**
 * Pages with identified overlap / clumsy UI issues.
 * Each entry documents the specific problem found in the static code audit.
 */
const OVERLAP_PAGES: Array<{
  route: string;
  label: string;
  issue: string;
  severity: 'high' | 'medium';
  scrollToBottom?: boolean;
}> = [
  {
    route: '/feed',
    label: 'feed-tab-bar-overlap',
    issue: 'Sticky tab bar top-0 z-40 overlaps blue top ribbon; FAB + back-to-top stack; new-posts toast hidden behind bottom nav',
    severity: 'high',
    scrollToBottom: true,
  },
  {
    route: '/all-posts',
    label: 'allposts-compare-banner',
    issue: 'Compare banner z-9998 overlaps back-to-top z-50; category toolbar z-30 under card dropdowns',
    severity: 'medium',
    scrollToBottom: true,
  },
  {
    route: '/rewards',
    label: 'rewards-cta-hidden',
    issue: 'Mobile CTA fixed bottom-4 z-50 hidden behind bottom nav z-120',
    severity: 'high',
  },
  {
    route: '/chat',
    label: 'chat-no-bottom-clearance',
    issue: 'No bottom padding — message input hidden behind fixed bottom nav',
    severity: 'high',
  },
  {
    route: '/add-post',
    label: 'addpost-submit-overlap',
    issue: 'Sticky submit bar z-10 covered by bottom nav z-120',
    severity: 'high',
    scrollToBottom: true,
  },
  {
    route: '/post/123',
    label: 'postdetail-sticky-header',
    issue: 'Sticky header z-50 hidden by LocationBanner z-100 when shown',
    severity: 'medium',
    scrollToBottom: true,
  },
  {
    route: '/search',
    label: 'search-sticky-ribbon',
    issue: 'Sticky header top-0 z-50 overlaps blue top ribbon',
    severity: 'medium',
  },
  {
    route: '/my-home',
    label: 'myhome-dead-space',
    issue: 'Hardcoded pt-28 (112px) creates dead space when top nav is hidden',
    severity: 'medium',
  },
  {
    route: '/for-you',
    label: 'foryou-subcategory-bar',
    issue: 'Subcategory bar z-30 slides under LocationBanner z-100',
    severity: 'medium',
  },
  {
    route: '/cart',
    label: 'cart-checkout-overlap',
    issue: 'Mobile checkout button partially obscured by bottom nav',
    severity: 'medium',
    scrollToBottom: true,
  },
  {
    route: '/profile',
    label: 'profile-tabs-zindex',
    issue: 'Sticky tabs z-30 too low for overlapping dropdown menus',
    severity: 'medium',
  },
  {
    route: '/dashboard',
    label: 'dashboard-bottom-clearance',
    issue: 'pb-24 does not adapt to safe-area bottom nav inset',
    severity: 'medium',
    scrollToBottom: true,
  },
  {
    route: '/notifications',
    label: 'notifications-blob-layers',
    issue: 'Massive fixed decorative blobs (500-600px) cause GPU paint overlap on mobile',
    severity: 'medium',
  },
  {
    route: '/category-hub',
    label: 'categoryhub-layout',
    issue: 'Multi-section layout with navbar + filter bar + grid — general overlap check',
    severity: 'medium',
  },
];

const MOBILE_VIEWPORT = { width: 412, height: 915 };
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

function buildMockPayload(url: string, method: string) {
  const pathname = (() => {
    try { return new URL(url).pathname.toLowerCase(); } catch { return url.toLowerCase(); }
  })();

  if (pathname.includes('/rewards/log')) return [];
  if (pathname.includes('/rewards')) {
    return {
      user: {
        fullName: 'Test User', rank: 'Bronze', level: 1,
        xpCurrent: 42, xpRequired: 100, totalCoins: 15, totalReferrals: 0,
        referralCode: 'TESTCODE',
        dailySecretCode: 'SECRET123',
        dailySecretCodeExpiresAt: new Date(Date.now() + 3600000).toISOString(),
        leaderboard: { nextPayoutAt: new Date(Date.now() + 86400000).toISOString() },
        referralLedger: { status: 'ok' },
        activityStats: {},
      },
      referralChain: [],
    };
  }
  if (pathname.includes('/public-wall')) return { topSellers: [], topBuyers: [], topUsers: [] };
  if (pathname.includes('/posts') || pathname.includes('/listings') || pathname.includes('/feed')) {
    if (method === 'get') return { posts: [], total: 0, page: 1, totalPages: 0 };
  }
  if (pathname.includes('/categories') || pathname.includes('/subcategories')) {
    if (method === 'get') return [];
  }
  if (pathname.includes('/notifications')) {
    if (method === 'get') return [];
  }
  if (pathname.includes('/cart')) {
    if (method === 'get') return { items: [], total: 0 };
  }
  if (pathname.includes('/chat') || pathname.includes('/messages')) {
    if (method === 'get') return [];
  }
  if (method === 'get') return {};
  return { success: true };
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

test.describe('Overlap & Clumsy UI Audit', () => {
  test.describe.configure({ timeout: 5 * 60 * 1000 });

  test.beforeEach(async ({ page }) => {
    // Seed auth + location
    await page.addInitScript(() => {
      const user = {
        id: 123, user_id: 123,
        fullName: 'Test User', email: 'test.user@example.com',
      };
      const now = Date.now();
      const location = {
        latitude: 17.385, longitude: 78.4867, accuracy: 50,
        city: 'Hyderabad', state: 'Telangana', country: 'India',
        area: 'Bachupally', locality: 'Bachupally',
        provider: 'overlap_audit_cache', timestamp: now,
      };
      localStorage.setItem('authToken', 'overlap-audit-token');
      localStorage.setItem('authSession', 'true');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userId', '123');
      localStorage.setItem('user_id', '123');
      localStorage.setItem('mhub_location', JSON.stringify(location));
      localStorage.setItem('mhub_user_city', location.city);
      localStorage.setItem(
        'mhub_location_skipped',
        JSON.stringify({ skipped: true, timestamp: now })
      );
    });

    // Mock API calls
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (isDevServerResource(url)) {
        return route.fallback();
      }
      if (url.includes('/api/auth/') || url.includes('/api/health') ||
          url.includes('/api/analytics/') || url.includes('/api/location')) {
        return route.fallback();
      }
      const method = route.request().method().toLowerCase();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(buildMockPayload(url, method)),
      });
    });

    await page.route('**/api/health**', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', db: 'connected', time: new Date().toISOString() }),
      });
    });

    await page.route('**/api/analytics/**', async (route) => {
      await route.fulfill({ status: 202, contentType: 'application/json', body: '{"ok":true}' });
    });

    await page.route('**/api/location**', async (route) => {
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{"success":true}' });
    });

    await page.route('**/api/auth/csrf-token**', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        headers: { 'Set-Cookie': 'XSRF-TOKEN=overlap-audit; Path=/; SameSite=Lax' },
        body: '{"ok":true}',
      });
    });

    await page.route('**/api/auth/session**', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true, canRefresh: true, hasRefreshCookie: true, authState: 'active',
          user: { id: 123, user_id: 123, fullName: 'Test User', email: 'test.user@example.com' },
        }),
      });
    });

    await page.route('**/api/auth/me**', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ id: 123, user_id: 123, fullName: 'Test User', email: 'test.user@example.com' }),
      });
    });

    await page.route('**/api/auth/refresh-token**', async (route) => {
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          token: 'overlap-audit-token',
          user: { id: 123, user_id: 123, fullName: 'Test User', email: 'test.user@example.com' },
        }),
      });
    });

    await page.route('**/socket.io/**', async (route) => {
      await route.abort('failed');
    });
  });

  test('capture overlap pages — mobile viewport', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('Missing Playwright baseURL.');
    await ensureOutputDir();
    await page.setViewportSize(MOBILE_VIEWPORT);

    for (const entry of OVERLAP_PAGES) {
      const targetUrl = new URL(entry.route, baseURL).toString();
      const screenshotName = `mobile__${entry.label}.png`;
      const screenshotPath = path.join(OUTPUT_DIR, screenshotName);

      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
        await page.waitForTimeout(1500);

        // Take viewport-only shot first (shows fixed/sticky overlap as user sees it)
        await safeScreenshot(page, { path: screenshotPath, fullPage: false });
        console.log(`[overlap-audit] ✓ ${screenshotName}  |  ${entry.issue}`);

        // If page has bottom overlap issues, scroll to bottom and capture again
        if (entry.scrollToBottom) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(800);
          const bottomName = `mobile__${entry.label}__bottom.png`;
          await safeScreenshot(page, { path: path.join(OUTPUT_DIR, bottomName), fullPage: false });
          console.log(`[overlap-audit] ✓ ${bottomName}  (scrolled to bottom)`);
        }

        // Full-page shot for complete layout picture
        const fullName = `mobile__${entry.label}__full.png`;
        await safeScreenshot(page, { path: path.join(OUTPUT_DIR, fullName), fullPage: true });
        console.log(`[overlap-audit] ✓ ${fullName}  (full page)`);

      } catch (error) {
        console.warn(`[overlap-audit] ✗ FAILED ${entry.route}:`, error);
      }
    }
  });

  test('capture overlap pages — desktop viewport', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('Missing Playwright baseURL.');
    await ensureOutputDir();
    await page.setViewportSize(DESKTOP_VIEWPORT);

    for (const entry of OVERLAP_PAGES) {
      const targetUrl = new URL(entry.route, baseURL).toString();
      const screenshotName = `desktop__${entry.label}.png`;
      const screenshotPath = path.join(OUTPUT_DIR, screenshotName);

      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
        await page.waitForTimeout(1500);

        await safeScreenshot(page, { path: screenshotPath, fullPage: false });
        console.log(`[overlap-audit] ✓ ${screenshotName}  |  ${entry.issue}`);

        if (entry.scrollToBottom) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(800);
          const bottomName = `desktop__${entry.label}__bottom.png`;
          await safeScreenshot(page, { path: path.join(OUTPUT_DIR, bottomName), fullPage: false });
          console.log(`[overlap-audit] ✓ ${bottomName}  (scrolled to bottom)`);
        }

      } catch (error) {
        console.warn(`[overlap-audit] ✗ FAILED ${entry.route}:`, error);
      }
    }
  });
});
