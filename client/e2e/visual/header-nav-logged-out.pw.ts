import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isDevServerResource, safeScreenshot } from '../comprehensive/e2e-helpers';

const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'analysis', 'header-nav-audit');

const DISABLE_ANIMATIONS_CSS = `
*,
*::before,
*::after {
  animation: none !important;
  transition: none !important;
  scroll-behavior: auto !important;
}
`;

async function ensureOutputDir() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

test.describe('Header/Nav Logged-Out', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      const now = Date.now();
      localStorage.removeItem('authToken');
      localStorage.removeItem('authSession');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      localStorage.removeItem('user_id');
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
      localStorage.setItem('mhub_location', JSON.stringify(location));
      localStorage.setItem('mhub_user_city', location.city);
      localStorage.setItem(
        'mhub_location_skipped',
        JSON.stringify({ skipped: true, timestamp: now })
      );
    });

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (isDevServerResource(url)) {
        return route.fallback();
      }
      if (url.includes('/api/health')) return route.fallback();
      if (url.includes('/api/auth/session')) return route.fallback();
      if (url.includes('/api/auth/me')) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ authenticated: false })
        });
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({})
      });
    });

    await page.route('**/api/health**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', db: 'connected', time: new Date().toISOString() })
      });
    });

    await page.route('**/api/auth/session**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ authenticated: false, canRefresh: false, hasRefreshCookie: false })
      });
    });

    await page.route('**/socket.io/**', async (route) => {
      await route.abort('failed');
    });
  });

  test('capture logged-out header states', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('Missing baseURL');
    await ensureOutputDir();
    await page.setViewportSize({ width: 1440, height: 900 });

    const routes = [
      { path: '/all-posts', name: 'all_posts_logged_out' },
      { path: '/login', name: 'login_logged_out' },
      { path: '/signup', name: 'signup_logged_out' },
      { path: '/forgot-password', name: 'forgot_password_logged_out' },
      { path: '/reset-password', name: 'reset_password_logged_out' }
    ];

    for (const route of routes) {
      const targetUrl = new URL(route.path, baseURL).toString();
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
      await page.waitForTimeout(1000);

      const screenshotPath = path.join(OUTPUT_DIR, `${route.name}.png`);
      await safeScreenshot(page, { path: screenshotPath, fullPage: true });
      console.log(`[header-nav-audit] Saved ${route.name}.png`);
    }
  });
});
