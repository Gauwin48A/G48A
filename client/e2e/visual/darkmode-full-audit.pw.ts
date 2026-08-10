import { test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { isDevServerResource, safeScreenshot } from '../comprehensive/e2e-helpers';

const OUTPUT_DIR = path.resolve(process.cwd(), '..', 'analysis', 'darkmode-full-audit');
const RATINGS_PATH = path.join(OUTPUT_DIR, 'ratings.json');
const RATINGS_CSV_PATH = path.join(OUTPUT_DIR, 'ratings.csv');

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

function clamp(value: number, min = 1, max = 10) {
  return Math.min(max, Math.max(min, value));
}

async function saveRatings(rows: Array<Record<string, unknown>>) {
  await fs.writeFile(RATINGS_PATH, JSON.stringify(rows, null, 2));
  const headers = ['route', 'appearance', 'stunning', 'ux', 'paletteCount', 'gradientCount', 'lightSurfaceCount', 'contrastScore', 'notes'];
  const csvLines = [headers.join(',')];
  for (const row of rows) {
    const line = headers.map((key) => {
      const value = row[key] ?? '';
      const sanitized = String(value).replace(/"/g, '""');
      return `"${sanitized}"`;
    });
    csvLines.push(line.join(','));
  }
  await fs.writeFile(RATINGS_CSV_PATH, csvLines.join('\n'));
}

test.describe('Dark Mode Full Audit', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
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
      localStorage.setItem(
        'mhub_location_skipped',
        JSON.stringify({ skipped: true, timestamp: now })
      );

      // Force dark mode
      localStorage.setItem('mhub-theme', 'dark');
      localStorage.setItem('darkMode', 'true');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.setAttribute('data-theme-mode', 'dark');
      document.body?.setAttribute('data-theme', 'dark');
      document.body?.setAttribute('data-theme-mode', 'dark');
    });

    await page.route('**/api/**', async (route) => {
      const url = route.request().url();
      if (isDevServerResource(url)) {
        return route.fallback();
      }
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

  test('capture and rate all routes in dark mode', async ({ page, baseURL }) => {
    test.setTimeout(10 * 60 * 1000);
    if (!baseURL) throw new Error('Missing baseURL');
    await ensureOutputDir();
    await page.setViewportSize({ width: 1440, height: 900 });

    const routes = [
      '/',
      '/category-hub',
      '/all-posts',
      '/listings',
      '/for-you',
      '/feed',
      '/rewards',
      '/profile',
      '/profile?tab=overview',
      '/profile?tab=personal',
      '/profile?tab=preferences',
      '/profile?tab=settings',
      '/post-welcome',
      '/tier-selection',
      '/tiers',
      '/pricing',
      '/centre',
      '/nearby',
      '/category-mode',
      '/subcategories',
      '/categories',
      '/categories/mobiles',
      '/categories/electronics',
      '/chat',
      '/feedback',
      '/complaints',
      '/verification',
      '/dashboard',
      '/admin-panel',
      '/login',
      '/signup',
      '/invite/demo',
      '/forgot-password',
      '/reset-password/demo',
      '/home',
      '/activity',
      '/public-wall',
      '/search',
      '/post/123',
      '/listing/123',
      '/add-post',
      '/sell',
      '/post_add',
      '/feed/feedpostadd',
      '/edit-post/123',
      '/my-home',
      '/my-posts',
      '/bought-posts',
      '/sold-posts',
      '/buyer-view',
      '/saledone',
      '/saleundone',
      '/feed/123',
      '/my-feed',
      '/offers',
      '/reviews/123',
      '/wishlist',
      '/cart',
      '/recently-viewed',
      '/saved-searches',
      '/channels',
      '/channels/create',
      '/channels/123',
      '/centre/create',
      '/centre/123',
      '/centre/123/listings',
      '/notifications',
      '/security',
      '/payment',
      '/kyc',
      '/aadhaar-verify',
      '/analytics',
      '/t&c',
      '/terms',
      '/privacy-policy',
      '/refund-policy',
      '/support-ticket-policy'
    ];

    const uniqueRoutes = Array.from(new Set(routes));
    const results: Array<Record<string, unknown>> = [];

    for (const route of uniqueRoutes) {
      const targetUrl = new URL(route, baseURL).toString();
      const name = route.replace(/^\//, '').replace(/\W+/g, '_') || 'root';
      let notes = '';

      try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.addStyleTag({ content: DISABLE_ANIMATIONS_CSS });
        await page.waitForTimeout(800);
      } catch (error) {
        notes = `Navigation failed: ${(error as Error).message}`;
      }

      const metrics = await page.evaluate(() => {
        const parseColor = (value: string) => {
          if (!value || value === 'transparent') return null;
          const match = value.match(/rgba?\\(([^)]+)\\)/i);
          if (!match) return null;
          const [r, g, b, a] = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
          if ([r, g, b].some((channel) => Number.isNaN(channel))) return null;
          if (typeof a === 'number' && a <= 0.05) return null;
          return [r, g, b];
        };

        const luminance = (rgb: number[]) => {
          const [r, g, b] = rgb.map((channel) => {
            const value = channel / 255;
            return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const contrastRatio = (a: number[], b: number[]) => {
          const l1 = luminance(a) + 0.05;
          const l2 = luminance(b) + 0.05;
          return l1 > l2 ? l1 / l2 : l2 / l1;
        };

        const quantize = (rgb: number[]) =>
          rgb.map((channel) => Math.round(channel / 12) * 12).join(',');

        const bodyStyle = window.getComputedStyle(document.body);
        const bodyBg = parseColor(bodyStyle.backgroundColor) ?? [10, 14, 20];
        const bodyText = parseColor(bodyStyle.color) ?? [232, 237, 244];
        const bodyBgLuminance = luminance(bodyBg);

        const palette = new Set<string>();
        let lightSurfaceCount = 0;
        let gradientCount = 0;
        let shadowCount = 0;
        let cardCount = 0;
        let interactiveCount = 0;
        let visibleTextCount = 0;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const elements = Array.from(document.body.querySelectorAll<HTMLElement>('*'));

        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.width * rect.height < 1800) continue;
          if (rect.bottom < 0 || rect.top > viewportHeight) continue;
          if (rect.right < 0 || rect.left > viewportWidth) continue;

          const style = window.getComputedStyle(el);
          const bg = parseColor(style.backgroundColor);
          if (bg) {
            palette.add(quantize(bg));
            if (luminance(bg) > 0.8) lightSurfaceCount += 1;
          }
          if (style.backgroundImage && style.backgroundImage !== 'none' && style.backgroundImage.includes('gradient')) {
            gradientCount += 1;
          }
          if (style.boxShadow && style.boxShadow !== 'none') {
            shadowCount += 1;
          }

          const radius = Number.parseFloat(style.borderRadius || '0');
          const hasBorder = style.borderStyle !== 'none' && Number.parseFloat(style.borderWidth || '0') > 0;
          if ((radius >= 12 && (hasBorder || style.boxShadow !== 'none')) || style.className?.toString?.().includes('card')) {
            cardCount += 1;
          }

          const tag = el.tagName.toLowerCase();
          if (['button', 'a', 'input', 'select', 'textarea'].includes(tag)) {
            interactiveCount += 1;
          }

          if (el.textContent && el.textContent.trim().length > 8) {
            visibleTextCount += 1;
          }
        }

        const textSamples = elements.filter((el) => el.textContent && el.textContent.trim().length > 8).slice(0, 160);
        const ratios: number[] = [];
        for (const el of textSamples) {
          const style = window.getComputedStyle(el);
          const text = parseColor(style.color);
          const bg = parseColor(style.backgroundColor) ?? bodyBg;
          if (!text) continue;
          ratios.push(contrastRatio(text, bg));
        }

        const avgContrast = ratios.length ? ratios.reduce((sum, val) => sum + val, 0) / ratios.length : 0;
        const contrastScore = avgContrast >= 7 ? 10
          : avgContrast >= 5 ? 8
          : avgContrast >= 4.5 ? 7
          : avgContrast >= 3 ? 5
          : avgContrast >= 2 ? 3
          : 1;

        return {
          bodyBgLuminance,
          paletteCount: palette.size,
          gradientCount,
          shadowCount,
          cardCount,
          interactiveCount,
          visibleTextCount,
          lightSurfaceCount,
          contrastScore,
          avgContrast
        };
      });

      const paletteCount = Number(metrics.paletteCount || 0);
      const gradientCount = Number(metrics.gradientCount || 0);
      const lightSurfaceCount = Number(metrics.lightSurfaceCount || 0);
      const contrastScore = Number(metrics.contrastScore || 1);
      const shadowCount = Number(metrics.shadowCount || 0);
      const cardCount = Number(metrics.cardCount || 0);
      const interactiveCount = Number(metrics.interactiveCount || 0);
      const visibleTextCount = Number(metrics.visibleTextCount || 0);

      const appearance =
        clamp(
          4 +
            Math.min(2.5, paletteCount / 6) +
            (gradientCount > 0 ? 1.2 : 0.4) +
            Math.min(2, cardCount / 8) +
            Math.min(1, visibleTextCount / 40) +
            (shadowCount > 8 ? 0.6 : 0) -
            Math.min(2, lightSurfaceCount / 4),
        );

      const stunning =
        clamp(
          4 +
            (gradientCount > 1 ? 1.6 : 0.8) +
            Math.min(1.5, paletteCount / 6) +
            Math.min(1.5, cardCount / 10) +
            (shadowCount > 10 ? 0.6 : 0) +
            (contrastScore >= 7 ? 1 : 0.4) -
            Math.min(2, lightSurfaceCount / 4),
        );

      const ux =
        clamp(
          4.5 +
            contrastScore / 2 +
            Math.min(1.5, interactiveCount / 12) +
            Math.min(1, visibleTextCount / 60) -
            (visibleTextCount < 6 ? 1 : 0) -
            Math.min(2, lightSurfaceCount / 8),
        );

      const screenshotPath = path.join(OUTPUT_DIR, `${name}.png`);
      await safeScreenshot(page, { path: screenshotPath, fullPage: true });
      console.log(`[darkmode-full-audit] Saved ${name}.png`);

      results.push({
        route,
        appearance: appearance.toFixed(1),
        stunning: stunning.toFixed(1),
        ux: ux.toFixed(1),
        paletteCount,
        gradientCount,
        lightSurfaceCount,
        contrastScore,
        notes
      });
    }

    await saveRatings(results);
  });
});
