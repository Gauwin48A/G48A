import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'analysis', 'allposts-audit');

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

test.describe('AllPosts Spotcheck', () => {
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

      const defaultPayload = { status: 'ok' };
      const json = (body: unknown) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      });

      if (url.includes('/api/posts')) {
        return json({ posts: [], data: [] });
      }
      if (url.includes('/api/categories') || url.includes('/api/subcategories')) {
        return json({ categories: [], subcategories: [], data: [] });
      }
      if (url.includes('/api/coins/engagement')) {
        return json({
          dailyCheckIn: { hasCheckedInToday: true, streak: 3, nextReward: 10 },
          spin: { hasSpunToday: false },
          scratch: { available: 0, totalReferrals: 0, claimed: 0 },
          referralMilestone: { target: 3, reward: 50, current: 0, claimed: false, eligible: false }
        });
      }

      return json(defaultPayload);
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

  test('capture all-posts overlays and sticky header', async ({ page, baseURL }) => {
    if (!baseURL) throw new Error('Missing baseURL');
    await ensureOutputDir();
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto(new URL('/all-posts', baseURL).toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
    await page.waitForTimeout(1000);

    await page.screenshot({ path: path.join(OUTPUT_DIR, 'allposts-default.png'), fullPage: true });

    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUTPUT_DIR, 'allposts-sticky.png'), fullPage: true });

    const filterButton = page.getByRole('button', { name: /filter/i }).first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'allposts-filter.png'), fullPage: true });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    await page.goto(new URL('/all-posts', baseURL).toString(), { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
    await page.waitForTimeout(800);

    const languageTrigger = page.locator('button[aria-haspopup="listbox"]').first();
    if (await languageTrigger.isVisible()) {
      await languageTrigger.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'allposts-language.png'), fullPage: true });
    }

    const layoutTrigger = page.getByRole('button', { name: /layout/i }).first();
    if (await layoutTrigger.isVisible()) {
      await layoutTrigger.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'allposts-layout.png'), fullPage: true });
      await page.keyboard.press('Escape');
    }
  });
});
