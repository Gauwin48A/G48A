import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

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

test.describe('Header/Nav Spotcheck', () => {
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

  test('capture header/nav spotcheck pages', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('Missing baseURL');
    await ensureOutputDir();
    await page.setViewportSize({ width: 1440, height: 900 });

    const routes = [
      '/listings',
      '/all-posts',
      '/home',
      '/notifications',
      '/cart',
      '/wishlist',
      '/recently-viewed'
    ];
    for (const route of routes) {
      const targetUrl = new URL(route, baseURL).toString();
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
      await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
      await page.waitForTimeout(1000);
      const name = route.replace(/^\//, '').replace(/\W+/g, '_') || 'root';
      const screenshotPath = path.join(OUTPUT_DIR, `${name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`[header-nav-audit] Saved ${name}.png`);
    }
  });
});
