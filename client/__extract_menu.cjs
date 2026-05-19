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
  page.setDefaultTimeout(15000);
  
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
  
  // Navigate to all-posts
  await page.goto('http://localhost:8081/all-posts', { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Click More button
  await page.evaluate(() => {
    const nav = document.querySelector('.mhub-bottom-nav');
    const btns = nav.querySelectorAll('button');
    btns[btns.length - 1].click(); // More is last
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Capture full page with drawer open
  await page.screenshot({ path: path.join(OUT, '44-hamburger-menu-open.png'), fullPage: true });
  
  // Extract ALL text from the page (the drawer content)
  const fullPageText = await page.evaluate(() => {
    // Get all elements that are at z-index > 100 (drawer/overlay)
    const allEls = document.querySelectorAll('*');
    let drawerContent = '';
    for (const el of allEls) {
      const style = window.getComputedStyle(el);
      const z = parseInt(style.zIndex) || 0;
      if (z >= 100 && el.children.length === 0 && el.textContent.trim()) {
        drawerContent += el.textContent.trim() + '\n';
      }
    }
    return drawerContent;
  });
  console.log('=== DRAWER/OVERLAY TEXT ===');
  console.log(fullPageText.substring(0, 3000));
  
  // Also get structured menu by looking at the aside/drawer element
  const menuStructure = await page.evaluate(() => {
    // The More menu appears as a fixed overlay. Find it.
    const fixedEls = document.querySelectorAll('[style*="z-index"], [class*="z-["]');
    let highZEl = null;
    let maxZ = 0;
    for (const el of fixedEls) {
      const cls = el.className || '';
      const match = cls.match(/z-\[(\d+)\]/);
      if (match && parseInt(match[1]) > maxZ) {
        maxZ = parseInt(match[1]);
        highZEl = el;
      }
    }
    if (!highZEl) return { found: false };
    
    // Get the content
    const text = highZEl.textContent.replace(/\s+/g, ' ').trim();
    const links = highZEl.querySelectorAll('a, button[onclick], [role="link"]');
    const items = [...links].map(l => ({
      text: l.textContent.trim().substring(0, 50),
      href: l.getAttribute('href') || '',
    })).filter(i => i.text.length > 1);
    
    return { found: true, zIndex: maxZ, text: text.substring(0, 2000), items };
  });
  console.log('\n=== MENU STRUCTURE ===');
  console.log(JSON.stringify(menuStructure, null, 2));
  
  await browser.close();
})();
