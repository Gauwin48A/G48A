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
  await new Promise(r => setTimeout(r, 1500));
  
  // Debug: check what's in the DOM
  const debug = await page.evaluate(() => {
    const nav = document.querySelector('.mhub-bottom-nav, [class*="bottom-nav"], nav[aria-label*="bottom"]');
    const allBtns = document.querySelectorAll('[data-navkey]');
    const allNavBtns = document.querySelectorAll('nav button');
    const fixedElements = document.querySelectorAll('[class*="fixed"][class*="bottom"]');
    return {
      navExists: !!nav,
      navHtml: nav ? nav.innerHTML.substring(0, 500) : 'NONE',
      dataNavKeys: [...allBtns].map(b => b.getAttribute('data-navkey')),
      navButtonCount: allNavBtns.length,
      fixedBottomCount: fixedElements.length,
    };
  });
  console.log('=== DOM DEBUG ===');
  console.log(JSON.stringify(debug, null, 2));
  
  // Try to click More via different approach
  if (debug.dataNavKeys.includes('more')) {
    await page.locator('[data-navkey="more"]').click();
  } else {
    // Find bottom-most nav and click last button
    await page.evaluate(() => {
      const navs = document.querySelectorAll('nav');
      const bottomNav = [...navs].find(n => n.className.includes('bottom'));
      if (bottomNav) {
        const btns = bottomNav.querySelectorAll('button');
        if (btns.length > 0) btns[btns.length - 1].click();
      }
    });
  }
  
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: path.join(OUT, '44-hamburger-menu-open.png'), fullPage: true });
  console.log('Saved 44-hamburger-menu-open.png');
  
  await browser.close();
})();
