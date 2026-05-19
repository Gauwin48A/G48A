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
  const phoneInput = page.locator('input[type="tel"], input[placeholder*="phone" i], input[placeholder*="mobile" i], input[placeholder*="number" i]').first();
  if (await phoneInput.count() > 0) {
    await phoneInput.fill('9999999999');
  } else {
    await page.locator('input').first().fill('9999999999');
  }
  await page.locator('input[type="password"]').first().fill('Test@12345');
  await page.locator('button[type="submit"]').first().click();
  await new Promise(r => setTimeout(r, 3000));
  
  // Go to all-posts
  await page.goto('http://localhost:8081/all-posts', { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Find mhub-bottom-nav specifically and click More
  const result = await page.evaluate(() => {
    const bottomNav = document.querySelector('.mhub-bottom-nav');
    if (!bottomNav) {
      // Check all nav elements
      const allNavs = document.querySelectorAll('nav');
      return { found: false, navCount: allNavs.length, navClasses: [...allNavs].map(n => n.className.substring(0, 100)) };
    }
    const btns = bottomNav.querySelectorAll('button');
    const btnInfo = [...btns].map(b => ({ key: b.getAttribute('data-navkey'), text: b.textContent.trim().substring(0, 20) }));
    // Click the last one (More)
    const lastBtn = btns[btns.length - 1];
    if (lastBtn) lastBtn.click();
    return { found: true, buttons: btnInfo, clickedLast: !!lastBtn };
  });
  console.log('Bottom nav:', JSON.stringify(result, null, 2));
  
  await new Promise(r => setTimeout(r, 1500));
  
  // Check if drawer/overlay is now visible
  const drawerCheck = await page.evaluate(() => {
    const overlays = document.querySelectorAll('[class*="overlay"], [class*="drawer"], [class*="more-menu"], [role="dialog"], [class*="fixed"][class*="inset"]');
    return { overlayCount: overlays.length, classes: [...overlays].map(o => o.className.substring(0, 80)) };
  });
  console.log('After click:', JSON.stringify(drawerCheck, null, 2));
  
  await page.screenshot({ path: path.join(OUT, '44-hamburger-menu-open.png'), fullPage: true });
  console.log('Saved 44-hamburger-menu-open.png');
  
  // Extract menu items text
  const menuItems = await page.evaluate(() => {
    const items = document.querySelectorAll('[class*="more-menu"] a, [class*="drawer"] a, [class*="aside"] a, aside a');
    return [...items].map(a => ({ text: a.textContent.trim().substring(0, 40), href: a.getAttribute('href') }));
  });
  console.log('Menu items:', JSON.stringify(menuItems, null, 2));
  
  await browser.close();
})();
