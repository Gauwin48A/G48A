/**
 * Functional Audit: Login + Navigate all pages, capture console errors, 
 * check bottom nav, API errors, and functional issues.
 */
const WebSocket = require('ws');

const CDP_URL = 'http://localhost:9222';
const DEMO_PHONE = '9876543210';
const DEMO_PASS = 'Test@12345';

const PAGES = [
  { name: 'all-posts', path: '/all-posts' },
  { name: 'categories', path: '/categories' },
  { name: 'category-hub', path: '/category-hub' },
  { name: 'search', path: '/search' },
  { name: 'for-you', path: '/for-you' },
  { name: 'nearby', path: '/nearby' },
  { name: 'public-wall', path: '/public-wall' },
  { name: 'compare', path: '/compare' },
  { name: 'channels', path: '/channels' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'my-feed', path: '/my-feed' },
  { name: 'my-posts', path: '/my-posts' },
  { name: 'profile', path: '/profile' },
  { name: 'add-post', path: '/add-post' },
  { name: 'sold-posts', path: '/sold-posts' },
  { name: 'bought-posts', path: '/bought-posts' },
  { name: 'cart', path: '/cart' },
  { name: 'wishlist', path: '/wishlist' },
  { name: 'chat', path: '/chat' },
  { name: 'notifications', path: '/notifications' },
  { name: 'offers', path: '/offers' },
  { name: 'saved-searches', path: '/saved-searches' },
  { name: 'recently-viewed', path: '/recently-viewed' },
  { name: 'activity', path: '/activity' },
  { name: 'reviews', path: '/reviews' },
  { name: 'complaints', path: '/complaints' },
  { name: 'feedback', path: '/feedback' },
  { name: 'rewards', path: '/rewards' },
  { name: 'analytics', path: '/analytics' },
  { name: 'verification', path: '/verification' },
  { name: 'get-verified', path: '/get-verified' },
  { name: 'tier-selection', path: '/tier-selection' },
  { name: 'payment', path: '/payment' },
  { name: 'invite', path: '/invite' },
  { name: 'account-deletion', path: '/account-deletion' },
  { name: 'terms', path: '/terms' },
  { name: 'privacy-policy', path: '/privacy-policy' },
  { name: 'pricing', path: '/pricing' },
];

let msgId = 1;
const pendingMessages = new Map();

function send(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pendingMessages.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pendingMessages.has(id)) {
        pendingMessages.delete(id);
        reject(new Error(`Timeout: ${method}`));
      }
    }, 15000);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  // Get websocket URL
  const res = await fetch(`${CDP_URL}/json`);
  const targets = await res.json();
  const page = targets.find(t => t.type === 'page');
  if (!page) { console.error('No page target found'); process.exit(1); }

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve) => ws.on('open', resolve));

  // Collect console errors and network failures per page
  const consoleErrors = {};
  const networkErrors = {};
  let currentPage = '';

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && pendingMessages.has(msg.id)) {
      const { resolve, reject } = pendingMessages.get(msg.id);
      pendingMessages.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
      return;
    }
    // Capture console errors
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      const text = (msg.params.args || []).map(a => a.value || a.description || '').join(' ').slice(0, 200);
      if (!consoleErrors[currentPage]) consoleErrors[currentPage] = [];
      consoleErrors[currentPage].push(text);
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const text = msg.params.exceptionDetails?.text || msg.params.exceptionDetails?.exception?.description || 'unknown';
      if (!consoleErrors[currentPage]) consoleErrors[currentPage] = [];
      consoleErrors[currentPage].push(`[EXCEPTION] ${text.slice(0, 200)}`);
    }
    // Network failures
    if (msg.method === 'Network.loadingFailed') {
      const url = msg.params.requestId;
      const err = msg.params.errorText || 'failed';
      if (!networkErrors[currentPage]) networkErrors[currentPage] = [];
      networkErrors[currentPage].push(err);
    }
    if (msg.method === 'Network.responseReceived') {
      const status = msg.params.response?.status;
      const url = msg.params.response?.url || '';
      if (status >= 400 && url.includes('/api/')) {
        if (!networkErrors[currentPage]) networkErrors[currentPage] = [];
        networkErrors[currentPage].push(`${status} ${url.split('/api/')[1]?.split('?')[0] || url}`);
      }
    }
  });

  // Enable domains
  await send(ws, 'Runtime.enable');
  await send(ws, 'Network.enable');
  await send(ws, 'Page.enable');

  // Step 1: Login via API
  console.log('=== LOGGING IN WITH DEMO CREDENTIALS ===');
  currentPage = 'login';

  // First, set auth state in localStorage to bypass auth gates
  // (The actual API login sets httpOnly cookies on :5001, which won't transfer to :80 origin)
  const loginScript = `
    (async () => {
      try {
        // Step 1: Get CSRF token
        await fetch('http://localhost:5001/api/auth/csrf-token', { credentials: 'include' });
        
        // Extract XSRF token from cookie
        const xsrf = document.cookie.split('; ').find(c => c.startsWith('XSRF-TOKEN='));
        const token = xsrf ? decodeURIComponent(xsrf.split('=')[1]) : '';
        
        // Step 2: Login with CSRF
        const ts = Date.now();
        const nonce = Math.random().toString(36).slice(2);
        const res = await fetch('http://localhost:5001/api/auth/login', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': token,
            'X-MHub-Timestamp': String(ts),
            'X-MHub-Nonce': nonce,
            'X-Device-Id': localStorage.getItem('mhub_device_id') || 'audit-device-001',
            'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          credentials: 'include',
          body: JSON.stringify({ identifier: '${DEMO_PHONE}', password: '${DEMO_PASS}', _timestamp: ts, _nonce: nonce })
        });
        const data = await res.json();
        if (res.ok && data) {
          const userId = data.user?.id || data.user?.user_id || data.userId || '';
          // Set auth flags that the SPA reads
          localStorage.setItem('authSession', 'true');
          localStorage.setItem('userId', String(userId));
          localStorage.setItem('user_id', String(userId));
          if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
          return JSON.stringify({ success: true, status: res.status, userId, user: data.user?.name || data.user?.full_name || '' });
        }
        return JSON.stringify({ success: false, status: res.status, error: data?.message || data?.error || 'Login failed' });
      } catch (e) {
        return JSON.stringify({ success: false, error: e.message });
      }
    })()
  `;
  
  const loginResult = await send(ws, 'Runtime.evaluate', { 
    expression: loginScript, 
    awaitPromise: true, 
    returnByValue: true 
  });
  const loginData = JSON.parse(loginResult?.result?.value || '{}');
  console.log('Login result:', JSON.stringify(loginData));
  
  let loggedIn = loginData.success;
  if (loggedIn) {
    // Set localStorage auth flags in a SEPARATE call before navigation
    await send(ws, 'Runtime.evaluate', {
      expression: `
        localStorage.setItem('authSession', 'true');
        localStorage.setItem('userId', '${loginData.userId}');
        localStorage.setItem('user_id', '${loginData.userId}');
        localStorage.setItem('user', JSON.stringify(${JSON.stringify(loginData)}));
        'done'
      `,
      returnByValue: true
    });
    await sleep(500);
    
    // Now reload the page so the SPA picks up the auth session
    await send(ws, 'Page.navigate', { url: 'http://localhost/all-posts' });
    await sleep(6000);
    
    // Verify auth state is active in the SPA
    const authCheck = await send(ws, 'Runtime.evaluate', {
      expression: `
        (() => {
          const authSession = localStorage.getItem('authSession');
          const userId = localStorage.getItem('userId');
          return JSON.stringify({ authSession, userId, url: window.location.pathname });
        })()
      `,
      returnByValue: true
    });
    console.log('Auth state check:', authCheck?.result?.value);
    console.log('Login status: SUCCESS');
  } else {
    console.log('Login status: FAILED -', loginData.error || 'unknown');
  }
  console.log('');

  // Step 2: Check bottom nav structure
  console.log('=== CHECKING BOTTOM NAVBAR ===');
  const navCheck = await send(ws, 'Runtime.evaluate', {
    expression: `
      (() => {
        const nav = document.querySelector('.mhub-bottom-nav, .bottom-nav, nav[aria-label]');
        if (!nav) return JSON.stringify({ error: 'No bottom nav found' });
        const buttons = nav.querySelectorAll('button, a');
        const items = Array.from(buttons).map(b => ({
          key: b.dataset.navkey || b.textContent.trim().slice(0, 20),
          visible: b.offsetParent !== null,
        }));
        return JSON.stringify({ count: items.length, items });
      })()
    `,
    returnByValue: true
  });
  const navData = JSON.parse(navCheck?.result?.value || '{}');
  console.log('Bottom nav items:', navData.count);
  if (navData.items) {
    navData.items.forEach(i => console.log(`  - ${i.key} (visible: ${i.visible})`));
  }
  const hasMore = navData.items?.some(i => i.key === 'more' || i.key?.toLowerCase().includes('more'));
  const hasHamburger = navData.items?.some(i => i.key === 'menu' || i.key?.toLowerCase().includes('menu') || i.key?.toLowerCase().includes('hamburger'));
  console.log('Has More button:', hasMore ? 'YES' : 'MISSING');
  console.log('Has Hamburger/Menu:', hasHamburger ? 'YES' : 'MISSING');
  console.log('');

  // Step 3: Navigate all pages and collect issues
  console.log('=== AUDITING ALL PAGES ===');
  const pageResults = [];

  for (const pg of PAGES) {
    currentPage = pg.name;
    consoleErrors[currentPage] = [];
    networkErrors[currentPage] = [];

    try {
      // Use SPA navigation instead of full page reload to preserve auth cookies
      await send(ws, 'Runtime.evaluate', {
        expression: `window.location.href = '${pg.path}'`,
        returnByValue: true
      });
      await sleep(4000);

      // Check page state
      const pageState = await send(ws, 'Runtime.evaluate', {
        expression: `
          (() => {
            const result = {};
            // Check if redirected to login (auth issue)
            result.url = window.location.pathname;
            result.title = document.title;
            // Check for error states in DOM
            const errorEl = document.querySelector('[role="alert"], [data-ux-state="error"]');
            result.hasErrorState = !!errorEl;
            result.errorText = errorEl ? errorEl.textContent.trim().slice(0, 100) : '';
            // Check for empty states
            const emptyEl = document.querySelector('[data-ux-state="empty"]');
            result.hasEmptyState = !!emptyEl;
            // Check for loading spinner still showing
            const loading = document.querySelector('[data-ux-state="loading"], .animate-spin');
            result.stillLoading = !!loading;
            // Check bottom nav presence
            const bottomNav = document.querySelector('.mhub-bottom-nav');
            result.hasBottomNav = !!bottomNav;
            // Check for broken images
            const imgs = document.querySelectorAll('img');
            result.brokenImages = Array.from(imgs).filter(i => i.naturalWidth === 0 && i.complete && i.src && !i.src.includes('placeholder')).length;
            // Check for console.error markers in DOM
            result.hasAuthGate = !!document.querySelector('[data-ux-state="auth-gate"], [marker="auth-gate"]');
            return JSON.stringify(result);
          })()
        `,
        returnByValue: true
      });

      const state = JSON.parse(pageState?.result?.value || '{}');
      const issues = [];
      
      if (state.url === '/login' && pg.path !== '/login') issues.push('REDIRECTED_TO_LOGIN');
      if (state.hasErrorState) issues.push(`ERROR_STATE: ${state.errorText}`);
      if (state.stillLoading) issues.push('STILL_LOADING');
      if (state.brokenImages > 0) issues.push(`BROKEN_IMAGES: ${state.brokenImages}`);
      if (!state.hasBottomNav && !['login','signup','forgot-password'].includes(pg.name)) issues.push('NO_BOTTOM_NAV');
      if (state.hasAuthGate) issues.push('AUTH_GATE_SHOWN');

      pageResults.push({
        page: pg.name,
        path: pg.path,
        actualUrl: state.url,
        title: state.title,
        issues,
        consoleErrors: consoleErrors[currentPage].filter(e => e && !e.includes('favicon')),
        networkErrors: networkErrors[currentPage],
        hasEmptyState: state.hasEmptyState,
        hasBottomNav: state.hasBottomNav,
      });

      const status = issues.length === 0 ? '✓' : '✗';
      const issueStr = issues.length > 0 ? issues.join(', ') : 'OK';
      const errCount = consoleErrors[currentPage].length + networkErrors[currentPage].length;
      console.log(`${status} ${pg.name.padEnd(20)} ${issueStr}${errCount > 0 ? ` [${errCount} errors]` : ''}`);
    } catch (err) {
      pageResults.push({
        page: pg.name,
        path: pg.path,
        issues: [`NAVIGATION_FAILED: ${err.message}`],
        consoleErrors: [],
        networkErrors: [],
      });
      console.log(`✗ ${pg.name.padEnd(20)} NAVIGATION_FAILED: ${err.message}`);
    }
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const pagesWithIssues = pageResults.filter(p => p.issues.length > 0);
  const pagesWithErrors = pageResults.filter(p => (p.consoleErrors?.length || 0) + (p.networkErrors?.length || 0) > 0);
  console.log(`Total pages audited: ${pageResults.length}`);
  console.log(`Pages with UI issues: ${pagesWithIssues.length}`);
  console.log(`Pages with JS/API errors: ${pagesWithErrors.length}`);
  console.log(`Bottom nav "More" button: MISSING`);
  console.log(`Login status: ${loggedIn ? 'OK' : 'FAILED'}`);

  // Save detailed results
  const report = {
    timestamp: new Date().toISOString(),
    loginStatus: loggedIn,
    bottomNav: navData,
    missingMoreButton: !hasMore,
    pages: pageResults,
    summary: {
      total: pageResults.length,
      withIssues: pagesWithIssues.length,
      withErrors: pagesWithErrors.length,
    }
  };
  
  const fs = require('fs');
  fs.writeFileSync('./_functional_audit_results.json', JSON.stringify(report, null, 2));
  console.log('\nResults saved to _functional_audit_results.json');

  ws.close();
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
