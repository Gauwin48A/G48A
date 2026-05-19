/**
 * MHub Web App — Full Screenshot Capture Script
 * Logs in with demo credentials, navigates every page, captures screenshots.
 * Output: c:\Users\laksh\GITHUB\1hub\repo1\latest_web\
 */
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:8081';
const OUT_DIR = path.resolve(__dirname);
const CREDS = { mobile: '9999999999', password: 'Test@12345' };

// All routes to capture (based on web app source analysis)
const PAGES = [
  // Public pages (before login)
  { name: '01-login-page', path: '/login', needsAuth: false },
  
  // After login — Main navigation
  { name: '02-home-category-hub', path: '/category-hub' },
  { name: '03-all-posts', path: '/all-posts' },
  { name: '04-for-you', path: '/for-you' },
  { name: '05-feed', path: '/feed' },
  { name: '06-search', path: '/search' },
  
  // Seller pages
  { name: '07-sell-post-welcome', path: '/post-welcome' },
  { name: '08-add-post', path: '/add-post' },
  { name: '09-sold-posts', path: '/sold-posts' },
  { name: '10-saledone', path: '/saledone' },
  { name: '11-saleundone', path: '/saleundone' },
  { name: '12-dashboard', path: '/dashboard' },
  { name: '13-analytics', path: '/analytics' },
  
  // Buyer pages
  { name: '14-bought-posts', path: '/bought-posts' },
  { name: '15-wishlist', path: '/wishlist' },
  { name: '16-cart', path: '/cart' },
  { name: '17-compare', path: '/compare' },
  { name: '18-recently-viewed', path: '/recently-viewed' },
  { name: '19-saved-searches', path: '/saved-searches' },
  { name: '20-nearby', path: '/nearby' },
  
  // Account pages
  { name: '21-profile', path: '/profile' },
  { name: '22-notifications', path: '/notifications' },
  { name: '23-rewards', path: '/rewards' },
  { name: '24-verification', path: '/verification' },
  { name: '25-security', path: '/security' },
  
  // Social pages
  { name: '26-public-wall', path: '/public-wall' },
  { name: '27-chat', path: '/chat' },
  { name: '28-channels', path: '/channels' },
  { name: '29-offers', path: '/offers' },
  { name: '30-reviews', path: '/reviews' },
  { name: '31-feedback', path: '/feedback' },
  { name: '32-complaints', path: '/complaints' },
  
  // Commerce
  { name: '33-tier-selection-plans', path: '/tier-selection' },
  { name: '34-pricing', path: '/pricing' },
  { name: '35-centre', path: '/centre' },
  
  // Categories
  { name: '36-subcategories', path: '/subcategories' },
  { name: '37-category-mode', path: '/category-mode' },
  
  // Static/Legal
  { name: '38-terms', path: '/terms' },
  { name: '39-privacy-policy', path: '/privacy-policy' },
  { name: '40-refund-policy', path: '/refund-policy' },
  
  // Misc
  { name: '41-invite', path: '/invite' },
  { name: '42-signup', path: '/signup' },
  { name: '43-forgot-password', path: '/forgot-password' },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== MHub Web Screenshot Capture ===');
  console.log(`Output: ${OUT_DIR}`);
  console.log(`Pages: ${PAGES.length}`);
  console.log('');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Mobile viewport (Pixel 7 size)
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  // Step 1: Capture login page BEFORE login
  console.log('[1/3] Capturing login page...');
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT_DIR, '01-login-page.png'), fullPage: true });
  console.log('  ✓ 01-login-page.png');

  // Step 2: Login
  console.log('[2/3] Logging in with demo credentials...');
  try {
    // Try to find mobile/phone input
    const phoneInput = await page.locator('input[type="tel"], input[name="mobile"], input[name="phone"], input[name="identifier"], input[placeholder*="phone" i], input[placeholder*="mobile" i], input[placeholder*="number" i]').first();
    if (await phoneInput.isVisible()) {
      await phoneInput.fill(CREDS.mobile);
    } else {
      // Try generic first input
      const firstInput = await page.locator('input').first();
      await firstInput.fill(CREDS.mobile);
    }
    
    const passInput = await page.locator('input[type="password"]').first();
    await passInput.fill(CREDS.password);
    
    // Click login button
    const loginBtn = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Log in")').first();
    await loginBtn.click();
    
    // Wait for navigation
    await sleep(3000);
    await page.waitForLoadState('networkidle');
    console.log('  ✓ Logged in successfully');
    console.log(`  Current URL: ${page.url()}`);
  } catch (e) {
    console.log(`  ⚠ Login attempt: ${e.message}`);
    console.log('  Continuing with whatever state we have...');
  }

  // Step 3: Capture all pages
  console.log('[3/3] Capturing all pages...');
  let captured = 1; // login already captured
  
  for (const pg of PAGES) {
    if (pg.name === '01-login-page') continue; // already done
    
    const filename = `${pg.name}.png`;
    try {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await sleep(1500); // Let animations/data load
      
      // Wait for network to settle
      try {
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch(e) { /* timeout ok */ }
      
      await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
      captured++;
      console.log(`  ✓ ${filename} (${page.url()})`);
    } catch (e) {
      console.log(`  ✗ ${filename} — ${e.message.split('\n')[0]}`);
      // Still try to screenshot whatever is showing
      try {
        await page.screenshot({ path: path.join(OUT_DIR, filename), fullPage: true });
        captured++;
        console.log(`    → saved partial screenshot`);
      } catch(e2) {}
    }
  }

  // Step 4: Capture hamburger/more menu
  console.log('\n[BONUS] Capturing hamburger menu...');
  try {
    await page.goto(`${BASE}/all-posts`, { waitUntil: 'networkidle', timeout: 10000 });
    await sleep(1000);
    
    // Click "More" or hamburger button
    const moreBtn = await page.locator('button:has-text("More"), [aria-label="Menu"], [aria-label="More"], button:has(svg[class*="menu" i]), nav button:last-child').first();
    if (await moreBtn.isVisible()) {
      await moreBtn.click();
      await sleep(800);
      await page.screenshot({ path: path.join(OUT_DIR, '44-hamburger-menu-open.png'), fullPage: true });
      captured++;
      console.log('  ✓ 44-hamburger-menu-open.png');
    } else {
      console.log('  ⚠ Could not find More/Hamburger button');
    }
  } catch (e) {
    console.log(`  ✗ hamburger menu — ${e.message.split('\n')[0]}`);
  }

  // Step 5: Capture bottom navbar detail
  console.log('\n[BONUS] Capturing bottom navbar states...');
  const navPages = [
    { name: '45-nav-home-active', path: '/category-hub' },
    { name: '46-nav-allposts-active', path: '/all-posts' },
    { name: '47-nav-sell-active', path: '/post-welcome' },
    { name: '48-nav-chat-active', path: '/chat' },
    { name: '49-nav-profile-active', path: '/profile' },
  ];
  
  for (const np of navPages) {
    try {
      await page.goto(`${BASE}${np.path}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
      await sleep(1000);
      // Capture just viewport (not fullPage) to see navbar
      await page.screenshot({ path: path.join(OUT_DIR, `${np.name}.png`) });
      captured++;
      console.log(`  ✓ ${np.name}.png`);
    } catch(e) {
      console.log(`  ✗ ${np.name} — ${e.message.split('\n')[0]}`);
    }
  }

  await browser.close();
  console.log(`\n=== DONE: ${captured} screenshots captured ===`);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
