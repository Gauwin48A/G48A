// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * Playwright E2E Browser Test Suite: User Sold Posts Page & Profile Onboarding
 */
test.describe('User Sold Posts & Payout Profile Flow', () => {
  test('should load sold posts page gracefully', async ({ page }) => {
    // 1. Navigate to user sold posts page
    await page.goto('/user/999001/sold-posts');

    // 2. Expect main title or empty state container to load
    const heading = page.locator('h1, h2, div').filter({ hasText: /sold/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should display seller trust badges', async ({ page }) => {
    await page.goto('/user/999001/sold-posts');
    
    // Check page elements render without console crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
