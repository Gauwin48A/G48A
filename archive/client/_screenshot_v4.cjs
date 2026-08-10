const pw = require('@playwright/test');
const crypto = require('crypto');
const http = require('http');

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

function httpPost(url, body, headers = {}) {
  const u = new URL(url);
  const bodyStr = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
    }, (res) => {
      let data = '';
      const cookies = res.headers['set-cookie'] || [];
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, cookies }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

(async () => {
  // ── Step 1: Login via raw HTTP to get auth cookies ──
  console.log('=== LOGGING IN ===');
  const csrfRes = await httpGet('http://127.0.0.1:5001/api/auth/csrf-token');
  const csrfData = JSON.parse(csrfRes.body);
  const csrfToken = csrfData.csrfToken || csrfData.token || '';
  
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const loginRes = await httpPost('http://127.0.0.1:5001/api/auth/login', 
    { identifier: 'priya@mhub.com', password: 'Test@1234', _timestamp: timestamp },
    {
      'X-XSRF-TOKEN': csrfToken,
      'X-Mhub-Timestamp': timestamp,
      'X-Mhub-Nonce': nonce,
      'Cookie': `XSRF-TOKEN=${csrfToken}`,
    }
  );
  
  console.log('Login status:', loginRes.status);
  const loginBody = JSON.parse(loginRes.body);
  const user = loginBody.user;
  console.log('User:', user?.name || 'unknown');
  
  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.body.substring(0, 200));
    process.exit(1);
  }
  
  // Parse Set-Cookie headers into Playwright cookie format
  const authCookies = loginRes.cookies.map(raw => {
    const parts = raw.split(';').map(s => s.trim());
    const [nameVal, ...attrs] = parts;
    const eqIdx = nameVal.indexOf('=');
    const name = nameVal.substring(0, eqIdx);
    const value = nameVal.substring(eqIdx + 1);
    return {
      name,
      value,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: attrs.some(a => a.toLowerCase() === 'httponly'),
      secure: false,
      sameSite: 'Lax',
    };
  });
  console.log('Auth cookies:', authCookies.map(c => c.name));

  // ── Step 2: Create browser with cookies ──
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
  });
  
  // Add auth cookies for both server and client domains
  await ctx.addCookies(authCookies);
  // Also add for localhost (client domain)
  await ctx.addCookies(authCookies.map(c => ({ ...c, domain: 'localhost' })));

  // Set localStorage auth markers
  const setupPage = await ctx.newPage();
  await setupPage.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
  await setupPage.evaluate((u) => {
    localStorage.setItem('authSession', 'true');
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('userId', u.id || u.user_id);
    localStorage.setItem('user_id', u.id || u.user_id);
  }, user);
  await setupPage.close();

  // ── Step 3: Screenshot all pages ──
  const pages = [
    ['all-posts', 'v3-01-allposts'],
    ['category-hub', 'v3-02-categoryhub'],
    ['listings', 'v3-03-listings'],
    ['channels', 'v3-04-channels'],
    ['feed', 'v3-05-feed'],
    ['search', 'v3-06-search'],
    ['for-you', 'v3-07-foryou'],
    ['login', 'v3-08-login'],
    ['signup', 'v3-09-signup'],
    ['profile', 'v3-10-profile'],
    ['rewards', 'v3-11-rewards'],
    ['security', 'v3-12-security'],
    ['notifications', 'v3-13-notifs'],
    ['cart', 'v3-14-cart'],
    ['wishlist', 'v3-15-wishlist'],
    ['chat', 'v3-16-chat'],
    ['centre', 'v3-17-centre'],
    ['my-posts', 'v3-18-myposts'],
    ['my-home', 'v3-19-myhome'],
    ['my-feed', 'v3-20-myfeed'],
    ['add-post', 'v3-21-addpost'],
    ['sell', 'v3-22-sell'],
    ['dashboard', 'v3-23-dashboard'],
    ['activity', 'v3-24-activity'],
    ['analytics', 'v3-25-analytics'],
    ['nearby', 'v3-26-nearby'],
    ['recently-viewed', 'v3-27-recentview'],
    ['tier-selection', 'v3-28-tierselect'],
    ['pricing', 'v3-29-pricing'],
    ['payment', 'v3-30-payment'],
    ['sold-posts', 'v3-31-soldposts'],
    ['bought-posts', 'v3-32-boughtposts'],
    ['kyc', 'v3-33-kyc'],
    ['verification', 'v3-34-verification'],
    ['channels/create', 'v3-35-chcreate'],
    ['centre/create', 'v3-36-centrecreate'],
    ['public-wall', 'v3-37-publicwall'],
    ['terms', 'v3-38-terms'],
  ];

  for (const [url, name] of pages) {
    const p = await ctx.newPage();
    await p.goto('http://127.0.0.1:4173/' + url, { waitUntil: 'networkidle', timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.screenshot({ path: '../../screenshots/' + name + '.png', fullPage: false });
    console.log(name + ' OK');
    await p.close();
  }

  await b.close();
  console.log('\n=== ALL DONE ===');
})();
