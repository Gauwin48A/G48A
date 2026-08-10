const pw = require('@playwright/test');
const crypto = require('crypto');

const PHASE = parseInt(process.argv[2] || '1');
const BASE = 'http://127.0.0.1:4173';
const SHOT_DIR = '../../screenshots';

const ALL_PAGES = {
  1: [ // Phase 1: Login + Public pages
    ['all-posts', 'v4-01-allposts'],
    ['category-hub', 'v4-02-categoryhub'],
    ['listings', 'v4-03-listings'],
    ['channels', 'v4-04-channels'],
    ['feed', 'v4-05-feed'],
    ['search', 'v4-06-search'],
    ['for-you', 'v4-07-foryou'],
    ['login', 'v4-08-login'],
    ['signup', 'v4-09-signup'],
    ['public-wall', 'v4-10-publicwall'],
  ],
  2: [ // Phase 2: Auth pages batch 1
    ['profile', 'v4-11-profile'],
    ['rewards', 'v4-12-rewards'],
    ['security', 'v4-13-security'],
    ['notifications', 'v4-14-notifs'],
    ['cart', 'v4-15-cart'],
    ['wishlist', 'v4-16-wishlist'],
    ['chat', 'v4-17-chat'],
    ['centre', 'v4-18-centre'],
    ['my-posts', 'v4-19-myposts'],
    ['my-home', 'v4-20-myhome'],
  ],
  3: [ // Phase 3: Auth pages batch 2
    ['my-feed', 'v4-21-myfeed'],
    ['add-post', 'v4-22-addpost'],
    ['sell', 'v4-23-sell'],
    ['dashboard', 'v4-24-dashboard'],
    ['activity', 'v4-25-activity'],
    ['analytics', 'v4-26-analytics'],
    ['nearby', 'v4-27-nearby'],
    ['recently-viewed', 'v4-28-recentview'],
    ['tier-selection', 'v4-29-tierselect'],
    ['pricing', 'v4-30-pricing'],
  ],
  4: [ // Phase 4: Auth pages batch 3
    ['payment', 'v4-31-payment'],
    ['sold-posts', 'v4-32-soldposts'],
    ['bought-posts', 'v4-33-boughtposts'],
    ['kyc', 'v4-34-kyc'],
    ['verification', 'v4-35-verification'],
    ['channels/create', 'v4-36-chcreate'],
    ['centre/create', 'v4-37-centrecreate'],
    ['terms', 'v4-38-terms'],
    ['privacy-policy', 'v4-39-privacy'],
    ['refund-policy', 'v4-40-refund'],
  ],
};

async function login(ctx) {
  console.log('  Logging in via browser...');
  const page = await ctx.newPage();
  
  // Navigate to login page
  await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  
  // Fill login form
  const emailInput = await page.$('input[type="email"], input[type="text"][name*="identifier"], input[placeholder*="email" i], input[placeholder*="phone" i], input[placeholder*="Aadhaar" i]');
  if (!emailInput) {
    // Try any visible text input
    const inputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"]');
    if (inputs.length > 0) {
      await inputs[0].fill('priya@mhub.com');
    } else {
      console.log('  WARNING: No email input found');
    }
  } else {
    await emailInput.fill('priya@mhub.com');
  }
  
  await page.waitForTimeout(500);
  
  const pwInput = await page.$('input[type="password"]');
  if (pwInput) {
    await pwInput.fill('Test@1234');
  }
  
  await page.waitForTimeout(500);
  
  // Click submit
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
    await page.waitForTimeout(4000);
  }
  
  // Check if login succeeded
  const currentUrl = page.url();
  const cookies = await ctx.cookies();
  const hasAuth = cookies.some(c => c.name === 'accessToken');
  const hasSession = await page.evaluate(() => localStorage.getItem('authSession'));
  
  console.log('  URL after login:', currentUrl);
  console.log('  Has accessToken cookie:', hasAuth);
  console.log('  Has authSession:', hasSession);
  
  if (!hasAuth) {
    // Fallback: direct API login through proxy
    console.log('  Form login may not have worked, trying API login through proxy...');
    const csrfRes = await page.evaluate(async () => {
      const r = await fetch('/api/auth/csrf-token', { credentials: 'include' });
      return r.json();
    });
    const csrfToken = csrfRes.csrfToken || csrfRes.token || '';
    
    const timestamp = String(Date.now());
    const nonce = [...Array(32)].map(() => Math.random().toString(36)[2]).join('');
    
    const loginResult = await page.evaluate(async ({ csrfToken, timestamp, nonce }) => {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfToken,
          'X-Mhub-Timestamp': timestamp,
          'X-Mhub-Nonce': nonce,
        },
        body: JSON.stringify({
          identifier: 'priya@mhub.com',
          password: 'Test@1234',
          _timestamp: timestamp,
        }),
      });
      const data = await r.json();
      return { status: r.status, user: data.user, success: data.success };
    }, { csrfToken, timestamp, nonce });
    
    console.log('  API login result:', loginResult.status, loginResult.success);
    
    if (loginResult.success && loginResult.user) {
      // Set localStorage markers
      await page.evaluate((user) => {
        localStorage.setItem('authSession', 'true');
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userId', user.id || user.user_id);
        localStorage.setItem('user_id', user.id || user.user_id);
      }, loginResult.user);
    }
  }
  
  await page.close();
}

(async () => {
  const pages = ALL_PAGES[PHASE];
  if (!pages) {
    console.error('Invalid phase:', PHASE, '(use 1-4)');
    process.exit(1);
  }
  
  console.log(`=== PHASE ${PHASE}: ${pages.length} pages ===`);
  
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  
  // Login for all phases (cookies persist in context)
  await login(ctx);
  
  // Screenshot pages
  for (const [url, name] of pages) {
    const p = await ctx.newPage();
    await p.goto(BASE + '/' + url, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.screenshot({ path: SHOT_DIR + '/' + name + '.png', fullPage: false });
    console.log('  ' + name + ' OK');
    await p.close();
  }
  
  await b.close();
  console.log(`\n=== PHASE ${PHASE} DONE ===`);
})();
