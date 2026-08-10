const pw = require('@playwright/test');

(async () => {
  const b = await pw.chromium.launch();
  const ctx = await b.newContext({
    viewport: { width: 360, height: 800 },
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true,
  });

  // ── Step 1: Real login to get httpOnly cookies ──
  console.log('=== LOGGING IN ===');
  const loginPage = await ctx.newPage();
  
  // First, try the API login directly to get cookies
  const loginRes = await loginPage.evaluate(async () => {
    try {
      // Get CSRF token first
      const csrfRes = await fetch('http://127.0.0.1:5001/api/auth/csrf-token', {
        credentials: 'include'
      });
      const csrfData = await csrfRes.json();
      
      const res = await fetch('http://127.0.0.1:5001/api/auth/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': csrfData?.token || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          identifier: 'priya@mhub.com',
          password: 'Test@1234'
        })
      });
      const data = await res.json();
      return { status: res.status, data: JSON.stringify(data).substring(0, 500) };
    } catch (e) {
      return { error: e.message };
    }
  });
  console.log('Login response:', JSON.stringify(loginRes));
  
  // If direct API login didn't work, try through the UI
  if (loginRes.status !== 200) {
    console.log('API login returned', loginRes.status, '- trying UI login...');
    await loginPage.goto('http://127.0.0.1:4173/login', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await loginPage.waitForTimeout(2000);
    
    // Try filling in the login form
    const emailInput = await loginPage.$('input[type="email"], input[name="email"], input[name="identifier"], input[placeholder*="email" i], input[placeholder*="phone" i], input[placeholder*="aadhaar" i]');
    if (emailInput) {
      await emailInput.fill('priya@mhub.com');
      const pwInput = await loginPage.$('input[type="password"]');
      if (pwInput) {
        await pwInput.fill('Test@1234');
        const submitBtn = await loginPage.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await loginPage.waitForTimeout(3000);
        }
      }
    }
  }
  
  // Set localStorage auth markers (the cookies are already set from login)
  await loginPage.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await loginPage.evaluate(() => {
    localStorage.setItem('authSession', 'true');
    localStorage.setItem('user', JSON.stringify({
      id: 'e391ed64-c2b4-4ad7-9c80-84fb81363668',
      user_id: 'e391ed64-c2b4-4ad7-9c80-84fb81363668',
      name: 'Priya Patel',
      email: 'priya@mhub.com',
      avatar: null
    }));
    localStorage.setItem('userId', 'e391ed64-c2b4-4ad7-9c80-84fb81363668');
    localStorage.setItem('user_id', 'e391ed64-c2b4-4ad7-9c80-84fb81363668');
  });
  await loginPage.close();
  
  // ── Step 2: Screenshot public pages (with images now) ──
  const publicPages = [
    ['all-posts', 'v2-01-allposts'],
    ['category-hub', 'v2-02-categoryhub'],
    ['listings', 'v2-03-listings'],
    ['channels', 'v2-04-channels'],
    ['feed', 'v2-05-feed'],
    ['search', 'v2-06-search'],
    ['for-you', 'v2-07-foryou'],
  ];
  
  for (const [url, name] of publicPages) {
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      localStorage.setItem('authSession', 'true');
      localStorage.setItem('user', JSON.stringify({
        id: 'e391ed64-c2b4-4ad7-9c80-84fb81363668',
        user_id: 'e391ed64-c2b4-4ad7-9c80-84fb81363668',
        name: 'Priya Patel',
        email: 'priya@mhub.com',
        avatar: null
      }));
      localStorage.setItem('userId', 'e391ed64-c2b4-4ad7-9c80-84fb81363668');
      localStorage.setItem('user_id', 'e391ed64-c2b4-4ad7-9c80-84fb81363668');
    });
    await p.goto('http://127.0.0.1:4173/' + url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.screenshot({ path: '../../screenshots/' + name + '.png', fullPage: false });
    console.log(name + ' OK');
    await p.close();
  }

  // ── Step 3: Screenshot auth-gated pages ──
  const authPages = [
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

  for (const [url, name] of authPages) {
    const p = await ctx.newPage();
    await p.addInitScript(() => {
      localStorage.setItem('authSession', 'true');
      localStorage.setItem('user', JSON.stringify({
        id: 'e391ed64-c2b4-4ad7-9c80-84fb81363668',
        user_id: 'e391ed64-c2b4-4ad7-9c80-84fb81363668',
        name: 'Priya Patel',
        email: 'priya@mhub.com',
        avatar: null
      }));
      localStorage.setItem('userId', 'e391ed64-c2b4-4ad7-9c80-84fb81363668');
      localStorage.setItem('user_id', 'e391ed64-c2b4-4ad7-9c80-84fb81363668');
    });
    await p.goto('http://127.0.0.1:4173/' + url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.screenshot({ path: '../../screenshots/' + name + '.png', fullPage: false });
    console.log(name + ' OK');
    await p.close();
  }

  await b.close();
  console.log('\n=== ALL DONE ===');
})();
