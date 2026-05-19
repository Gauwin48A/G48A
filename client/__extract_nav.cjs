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
  
  // Extract bottom nav info first
  const bottomNav = await page.evaluate(() => {
    const nav = document.querySelector('.mhub-bottom-nav');
    if (!nav) return { found: false };
    const btns = nav.querySelectorAll('button');
    return {
      found: true,
      tabs: [...btns].map(b => ({
        text: b.textContent.trim(),
        classes: b.className.substring(0, 60),
      }))
    };
  });
  console.log('=== BOTTOM NAVBAR (ACTUAL) ===');
  console.log(JSON.stringify(bottomNav, null, 2));
  
  // Click More to open drawer
  await page.evaluate(() => {
    const nav = document.querySelector('.mhub-bottom-nav');
    const btns = nav.querySelectorAll('button');
    btns[btns.length - 1].click();
  });
  await new Promise(r => setTimeout(r, 1500));
  
  // Screenshot the open menu
  await page.screenshot({ path: path.join(OUT, '44-hamburger-menu-open.png'), fullPage: true });
  console.log('Saved 44-hamburger-menu-open.png');
  
  // Extract ALL menu items from the drawer
  const menuData = await page.evaluate(() => {
    // Find the drawer/overlay that's z-200 (the more menu)
    const overlay = document.querySelector('.fixed.inset-0[class*="z-[200]"]') ||
                    document.querySelector('[class*="z-[200]"]') ||
                    document.querySelector('[class*="more-drawer"]');
    
    if (!overlay) return { found: false, reason: 'no overlay found' };
    
    // Get all clickable items in the overlay
    const allItems = overlay.querySelectorAll('button, a, [role="button"], [role="menuitem"]');
    const items = [...allItems].map(el => ({
      text: el.textContent.trim().substring(0, 60),
      tag: el.tagName,
      href: el.getAttribute('href'),
    })).filter(i => i.text.length > 0 && i.text.length < 50);
    
    // Get grouped sections
    const sections = overlay.querySelectorAll('[class*="group"], [class*="section"], h3, h4, [class*="heading"]');
    const sectionTexts = [...sections].map(s => s.textContent.trim().substring(0, 60));
    
    // Get all text content of the drawer for reference
    const fullText = overlay.textContent.replace(/\s+/g, ' ').trim().substring(0, 2000);
    
    return { found: true, items, sectionTexts, fullText };
  });
  console.log('\n=== HAMBURGER MENU CONTENT ===');
  console.log(JSON.stringify(menuData, null, 2));
  
  // Scroll the drawer and capture second state
  await page.evaluate(() => {
    const overlay = document.querySelector('.fixed.inset-0[class*="z-[200]"]') ||
                    document.querySelector('[class*="z-[200]"]');
    if (overlay) {
      const scrollable = overlay.querySelector('[class*="overflow"]') || overlay;
      scrollable.scrollTop = 500;
    }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(OUT, '44b-hamburger-menu-scrolled.png'), fullPage: true });
  console.log('Saved 44b-hamburger-menu-scrolled.png');
  
  // Also extract the TOP NAVBAR structure
  await page.keyboard.press('Escape');
  await new Promise(r => setTimeout(r, 500));
  
  const topNav = await page.evaluate(() => {
    const nav = document.querySelector('.mhub-top-nav, [class*="top-nav"], nav[class*="sticky"]');
    if (!nav) return { found: false };
    return {
      found: true,
      html: nav.innerHTML.substring(0, 1000),
      text: nav.textContent.replace(/\s+/g, ' ').trim().substring(0, 300),
    };
  });
  console.log('\n=== TOP NAVBAR ===');
  console.log(topNav.text || 'not found');
  
  await browser.close();
})();
