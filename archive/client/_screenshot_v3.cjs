const pw = require('@playwright/test');

(async () => {
  const b = await pw.chromium.launch();

  // ── Step 1: Login via API to get auth cookies ──
  console.log('=== LOGGING IN VIA API ===');
  
  // Use Playwright request context to hit the server directly
  const apiCtx = await pw.request.newContext({ baseURL: 'http://127.0.0.1:5001' });
  
  // Get CSRF token first
  let csrfToken = '';
  try {
    const csrfRes = await apiCtx.get('/api/auth/csrf-token');
    const csrfData = await csrfRes.json();
    csrfToken = csrfData?.token || csrfData?.csrfToken || '';
    console.log('CSRF token:', csrfToken ? 'obtained' : 'none');
  } catch (e) {
    console.log('CSRF fetch failed:', e.message);
  }

  const crypto = require('crypto');
  
  // Login
  const timestamp = String(Date.now());
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const loginRes = await apiCtx.post('/api/auth/login', {
    data: {
      identifier: 'priya@mhub.com',
      password: 'Test@1234',
    },
    headers: {
      ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      'X-Mhub-Timestamp': timestamp,
      'X-Mhub-Nonce': nonce,
    },
  });
  
  const loginStatus = loginRes.status();
  const loginBody = await loginRes.json().catch(() => ({}));
  console.log('Login status:', loginStatus);
  console.log('Login body:', JSON.stringify(loginBody).substring(0, 500));
  console.log('Login user:', loginBody?.user?.name || 'unknown');
  
  // Extract cookies from the API response
  const allCookies = await apiCtx.storageState();
  console.log('Cookies obtained:', allCookies.cookies?.length || 0);
  
  // ── Step 2: Create browser context with cookies and localStorage ──
  const ctx = await b.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    storageState: allCookies,
  });

  // Set localStorage auth markers on the client domain
  const setupPage = await ctx.newPage();
  await setupPage.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  
  // Also manually add cookies for the client domain (4173)
  const serverCookies = allCookies.cookies || [];
  for (const c of serverCookies) {
    try {
      await ctx.addCookies([{
        name: c.name,
        value: c.value,
        domain: '127.0.0.1',
        path: c.path || '/',
        httpOnly: c.httpOnly || false,
        secure: false,
        sameSite: 'Lax',
      }]);
    } catch (e) {
      // ignore cookie setting errors
    }
  }
  
  await setupPage.evaluate((userData) => {
    localStorage.setItem('authSession', 'true');
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('userId', userData.id);
    localStorage.setItem('user_id', userData.id);
  }, loginBody?.user || {
    id: 'e391ed64-c2b4-4ad7-9c80-84fb81363668',
    user_id: 'e391ed64-c2b4-4ad7-9c80-84fb81363668',
    name: 'Priya Patel',
    email: 'priya@mhub.com',
  });
  await setupPage.close();

  // ── Step 3: Screenshot all pages ──
  const pages = [
    // Public / browsing pages
    ['all-posts', 'v2-01-allposts'],
    ['category-hub', 'v2-02-categoryhub'],
    ['listings', 'v2-03-listings'],
    ['channels', 'v2-04-channels'],
    ['feed', 'v2-05-feed'],
    ['search', 'v2-06-search'],
    ['for-you', 'v2-07-foryou'],
    // Auth-gated pages
    ['profile', 'v2-10-profile'],
    ['rewards', 'v2-11-rewards'],
    ['security', 'v2-12-security'],
    ['notifications', 'v2-13-notifs'],
    ['cart', 'v2-14-cart'],
    ['wishlist', 'v2-15-wishlist'],
    ['chat', 'v2-16-chat'],
    ['centre', 'v2-17-centre'],
    ['my-posts', 'v2-18-myposts'],
    ['my-home', 'v2-19-myhome'],
    ['my-feed', 'v2-20-myfeed'],
    ['add-post', 'v2-21-addpost'],
    ['sell', 'v2-22-sell'],
    ['dashboard', 'v2-23-dashboard'],
    ['activity', 'v2-24-activity'],
    ['analytics', 'v2-25-analytics'],
    ['nearby', 'v2-26-nearby'],
    ['recently-viewed', 'v2-27-recentview'],
    ['tier-selection', 'v2-28-tierselect'],
    ['pricing', 'v2-29-pricing'],
    ['payment', 'v2-30-payment'],
    ['sold-posts', 'v2-31-soldposts'],
    ['bought-posts', 'v2-32-boughtposts'],
    ['kyc', 'v2-33-kyc'],
    ['verification', 'v2-34-verification'],
    ['channels/create', 'v2-35-chcreate'],
    ['centre/create', 'v2-36-centrecreate'],
  ];

  for (const [url, name] of pages) {
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:4173/' + url, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.screenshot({ path: '../../screenshots/' + name + '.png', fullPage: false });
    console.log(name + ' OK');
    await p.close();
  }

  await apiCtx.dispose();
  await b.close();
  console.log('\n=== ALL DONE ===');
})();
