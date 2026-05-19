const { chromium } = require('@playwright/test');
const path = require('path');
const OUT = path.resolve(__dirname, '..', 'latest_web');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625, isMobile: true, hasTouch: true,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  
  // Login
  await page.goto('http://localhost:8081/login', { waitUntil: 'networkidle' });
  await page.locator('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="mobile" i]').first().fill('9999999999');
  await page.locator('input[type="password"]').first().fill('Test@12345');
  await page.locator('button[type="submit"]').first().click();
  await new Promise(r => setTimeout(r, 3000));
  
  // Go to all-posts
  await page.goto('http://localhost:8081/all-posts', { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 1000));
  
  // Click More button using data-navkey attribute
  const clicked = await page.evaluate(() => {
    const moreBtn = document.querySelector('[data-navkey="more"]');
    if (moreBtn) {
      moreBtn.click();
      return 'clicked more button';
    }
    return 'not found';
  });
  console.log('More button:', clicked);
  
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '44-hamburger-menu-open.png'), fullPage: true });
  console.log('Saved hamburger menu screenshot');
  
  // Also scroll within the drawer to capture full menu
  await page.evaluate(() => {
    const drawer = document.querySelector('[class*="drawer"], [class*="sidebar"], [class*="menu-overlay"], [role="dialog"]');
    if (drawer) drawer.scrollTop = 500;
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '44b-hamburger-menu-scrolled.png'), fullPage: true });
  console.log('Saved hamburger menu scrolled screenshot');
  
  await browser.close();
})();
