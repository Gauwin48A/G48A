const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
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
  
  // Navigate
  await page.goto('http://localhost:8081/all-posts', { waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 2000));
  
  // Get HTML before clicking More
  const beforeCount = await page.evaluate(() => document.body.children.length);
  
  // Click More
  await page.evaluate(() => {
    const nav = document.querySelector('.mhub-bottom-nav');
    const btns = nav.querySelectorAll('button');
    btns[btns.length - 1].click();
  });
  await new Promise(r => setTimeout(r, 2000));
  
  // Get all body > direct children that appeared after click (portals)
  const afterCount = await page.evaluate(() => document.body.children.length);
  console.log(`Before: ${beforeCount} elements, After: ${afterCount} elements`);
  
  // Get the content of ANY new portals and all visible text
  const drawerInfo = await page.evaluate(() => {
    // Check for React portals at body level
    const bodyChildren = [...document.body.children];
    const results = [];
    
    for (let i = 0; i < bodyChildren.length; i++) {
      const el = bodyChildren[i];
      const style = window.getComputedStyle(el);
      // Look for fixed/absolute positioned overlays
      if (style.position === 'fixed' || style.position === 'absolute') {
        const text = el.textContent.replace(/\s+/g, ' ').trim();
        if (text.length > 10) {
          results.push({ index: i, tag: el.tagName, class: el.className.substring(0, 100), textLen: text.length, text: text.substring(0, 1500) });
        }
      }
    }
    
    // Also check for any visible aside/drawer
    const asides = document.querySelectorAll('aside, [class*="drawer"], [class*="sidebar"]');
    for (const a of asides) {
      const style = window.getComputedStyle(a);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        results.push({ tag: 'ASIDE', class: a.className.substring(0, 100), text: a.textContent.replace(/\s+/g, ' ').trim().substring(0, 1500) });
      }
    }
    
    return results;
  });
  
  console.log('\n=== DRAWER/OVERLAY CONTENT ===');
  for (const d of drawerInfo) {
    console.log(`\n--- ${d.tag} (${d.class.substring(0, 50)}) ---`);
    console.log(d.text);
  }
  
  // Save screenshot
  await page.screenshot({ path: path.join(OUT, '44-hamburger-menu-open.png'), fullPage: true });
  console.log('\nSaved 44-hamburger-menu-open.png');
  
  // Save the drawer text to a file for analysis
  const allText = drawerInfo.map(d => d.text).join('\n\n---\n\n');
  fs.writeFileSync(path.join(OUT, '_menu_content.txt'), allText);
  console.log('Saved _menu_content.txt');
  
  await browser.close();
})();
