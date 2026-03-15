import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const APP_FILE = path.resolve(process.cwd(), 'src/App.jsx');
const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'analysis', 'visual-audit');

const DYNAMIC_REPLACEMENTS: Array<[RegExp, string]> = [
  [/:postId\b/g, '123'],
  [/:userId\b/g, '123'],
  [/:token\b/g, 'test-token'],
  [/:id\b/g, '123']
];

const DISABLE_ANIMATIONS_CSS = `
*,
*::before,
*::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
`;

const LIST_HINTS = [
  'posts',
  'categories',
  'channels',
  'notifications',
  'reviews',
  'offers',
  'complaints',
  'feedback',
  'recommendations',
  'wishlist',
  'cart',
  'search',
  'nearby',
  'sold',
  'bought',
  'saved-searches',
  'feed',
  'history',
  'log',
  'list'
];

function getPathFromUrl(url: string) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return String(url || '').toLowerCase();
  }
}

function buildMockPayload(url: string, method: string) {
  const path = getPathFromUrl(url);

  if (path.includes('/rewards/log')) {
    return [];
  }

  if (path.includes('/rewards')) {
    return {
      user: {
        fullName: 'Test User',
        rank: 'Bronze',
        level: 1,
        xpCurrent: 0,
        xpRequired: 100,
        totalCoins: 0,
        totalReferrals: 0,
        referralCode: 'TESTCODE',
        dailySecretCode: 'SECRET123',
        dailySecretCodeExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        leaderboard: {
          nextPayoutAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        },
        referralLedger: { status: 'ok' },
        activityStats: {}
      },
      referralChain: []
    };
  }

  if (path.includes('/public-wall')) {
    return { topSellers: [], topBuyers: [], topUsers: [] };
  }

  if (method === 'get') {
    const isDetail = /\/[a-z-]+\/[0-9a-z-]+$/i.test(path);
    if (!isDetail && LIST_HINTS.some((hint) => path.includes(`/${hint}`))) {
      return [];
    }
    return {};
  }

  return { success: true };
}

function extractRoutes(appSource: string) {
  const routes = new Set<string>();
  const routePattern = /path\s*[:=]\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null = null;
  while ((match = routePattern.exec(appSource))) {
    const route = match[1]?.trim();
    if (!route || route === '*' || route === '/') {
      continue;
    }
    routes.add(route);
  }
  return Array.from(routes).sort((a, b) => a.localeCompare(b));
}

function fillDynamicSegments(route: string) {
  let filled = route;
  for (const [pattern, replacement] of DYNAMIC_REPLACEMENTS) {
    filled = filled.replace(pattern, replacement);
  }
  return filled;
}

function encodeRoute(route: string) {
  return route.replace(/&/g, '%26');
}

function routeToFileName(route: string) {
  const cleaned = route.replace(/^\//, '');
  if (!cleaned) return 'root';
  return cleaned
    .replace(/[/?&=]/g, '_')
    .replace(/[:]/g, '')
    .replace(/__+/g, '_');
}

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

test.describe('Visual Audit Capture', () => {
  test.describe.configure({ timeout: 10 * 60 * 1000 });

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const user = {
        id: 123,
        user_id: 123,
        fullName: 'Test User',
        email: 'test.user@example.com'
      };
      const now = Date.now();
      const location = {
        latitude: 17.385,
        longitude: 78.4867,
        accuracy: 50,
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        area: 'Bachupally',
        locality: 'Bachupally',
        provider: 'visual_audit_cache',
        timestamp: now
      };
      localStorage.setItem('authToken', 'visual-audit-token');
      localStorage.setItem('authSession', 'true');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userId', '123');
      localStorage.setItem('user_id', '123');
      localStorage.setItem('mhub_location', JSON.stringify(location));
      localStorage.setItem('mhub_user_city', location.city);
    });

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      const isAuth = url.includes('/api/auth/');
      const isHealth = url.includes('/api/health');
      const isAnalytics = url.includes('/api/analytics/');
      const isLocation = url.includes('/api/location');

      if (isAuth || isHealth || isAnalytics || isLocation) {
        return route.fallback();
      }

      const method = route.request().method().toLowerCase();
      const payload = buildMockPayload(url, method);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload)
      });
    });

    await page.route('**/api/health**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', db: 'connected', time: new Date().toISOString() })
      });
    });

    await page.route('**/api/analytics/**', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true })
      });
    });

    await page.route('**/api/location**', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/api/auth/csrf-token**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'XSRF-TOKEN=visual-audit; Path=/; SameSite=Lax'
        },
        body: JSON.stringify({ ok: true })
      });
    });

    await page.route('**/api/auth/session**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          canRefresh: true,
          hasRefreshCookie: true,
          authState: 'active',
          user: { id: 123, user_id: 123, fullName: 'Test User', email: 'test.user@example.com' }
        })
      });
    });

    await page.route('**/api/auth/me**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 123, user_id: 123, fullName: 'Test User', email: 'test.user@example.com' })
      });
    });

    await page.route('**/api/auth/refresh-token**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'visual-audit-token',
          user: { id: 123, user_id: 123, fullName: 'Test User', email: 'test.user@example.com' }
        })
      });
    });

    await page.route('**/socket.io/**', async (route) => {
      await route.abort('failed');
    });
  });

  test('capture all routed pages', async ({ page, baseURL }) => {
    if (!baseURL) {
      throw new Error('Missing Playwright baseURL.');
    }

    await ensureOutputDir();

    const appSource = await fs.readFile(APP_FILE, 'utf8');
    const routes = extractRoutes(appSource);

    await page.setViewportSize({ width: 1440, height: 900 });

    for (const route of routes) {
      const filledRoute = fillDynamicSegments(route);
      const encodedRoute = encodeRoute(filledRoute);
      const targetUrl = new URL(encodedRoute, baseURL).toString();
      const screenshotName = `${routeToFileName(route)}.png`;
      const screenshotPath = path.join(OUTPUT_DIR, screenshotName);

      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
        await page.waitForTimeout(1000);
      } catch (error) {
        console.warn(`[visual-audit] Navigation failed for ${targetUrl}:`, error);
      }

      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[visual-audit] Saved ${screenshotName}`);
    }
  });
});
