import { expect, test } from '@playwright/test';

test.describe('Route State Smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Bootstrap preflight probes /api/health before routes render.
    await page.route('**/api/health**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok', db: 'connected', time: new Date().toISOString() })
      });
    });

    // Keep background telemetry/refresh/location calls deterministic in smoke mode.
    await page.route('**/api/auth/refresh-token**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'Not authenticated' })
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

    await page.route('**/api/posts/*/view**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    await page.route('**/socket.io/**', async (route) => {
      await route.abort('failed');
    });
  });

  test('shows recoverable search category error state', async ({ page }) => {
    await page.route('**/api/categories**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'forced_category_error' })
      });
    });

    await page.goto('/search');

    await expect(page.getByText('Category suggestions unavailable')).toBeVisible();
    await expect(page.locator('[data-ux-state="error"]')).toBeVisible();

    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.getByText('Category suggestions unavailable')).toBeVisible();
  });

  test('shows security auth gate and recovery CTA when logged out', async ({ page }) => {
    await page.goto('/security');

    await expect(page.getByText('Authentication Required')).toBeVisible();
    await expect(page.locator('[data-ux-state="auth-gate"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Go to Login' })).toBeVisible();
  });

  test('shows feed-detail error state with retry and back actions', async ({ page }) => {
    await page.route('**/api/posts/123', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'forced_feed_detail_error' })
      });
    });

    await page.goto('/feed/123');

    await expect(page.getByText(/post_not_found|post unavailable/i)).toBeVisible();
    await expect(page.locator('[data-ux-state="error"]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Feed' })).toBeVisible();
  });
});
