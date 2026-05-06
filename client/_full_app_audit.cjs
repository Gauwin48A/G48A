const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

function getPages() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:9222/json', r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const SCREENSHOTS_DIR = path.join(__dirname, 'audit-screenshots');
if (!fs.existsSync(SCREENSHOTS_DIR)) fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

async function main() {
  const pages = await getPages();
  console.log('Page URL:', pages[0].url);
  const wsUrl = pages[0].webSocketDebuggerUrl;
  
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = {};
  const results = {};
  
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const myId = id++;
      const timer = setTimeout(() => { delete pending[myId]; resolve({ error: 'timeout' }); }, 30000);
      pending[myId] = (r) => { clearTimeout(timer); resolve(r); };
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  }
  
  ws.on('message', d => {
    const m = JSON.parse(d);
    if (m.id && pending[m.id]) {
      pending[m.id](m.result);
      delete pending[m.id];
    }
  });
  
  await new Promise(r => ws.on('open', r));
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  // Set mobile viewport
  await send('Emulation.setDeviceMetricsOverride', {
    width: 412, height: 915, deviceScaleFactor: 2.625, mobile: true
  });

  // ===== STEP 1: Login with demo credentials =====
  console.log('\n=== STEP 1: Login ===');
  
  // First get CSRF token and login via API
  const loginResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      try {
        // Get CSRF token
        const csrfRes = await fetch('http://10.0.2.2:5001/api/auth/csrf-token', { credentials: 'include' });
        const csrfData = await csrfRes.json();
        const csrfToken = csrfData.csrfToken || csrfData.token;
        
        // Login
        const loginRes = await fetch('http://10.0.2.2:5001/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          credentials: 'include',
          body: JSON.stringify({ phone: '9876543210', password: 'Test@12345' })
        });
        const loginData = await loginRes.json();
        
        if (loginRes.ok && loginData.user) {
          // Store auth in localStorage
          localStorage.setItem('authSession', 'true');
          localStorage.setItem('userId', loginData.user.id || loginData.user.user_id);
          localStorage.setItem('user_id', loginData.user.id || loginData.user.user_id);
          localStorage.setItem('user', JSON.stringify(loginData.user));
          return { success: true, user: loginData.user.name, id: loginData.user.id };
        }
        return { success: false, status: loginRes.status, body: JSON.stringify(loginData).slice(0,200) };
      } catch(e) {
        return { success: false, error: e.message };
      }
    })()`,
    awaitPromise: true, returnByValue: true
  });
  
  console.log('Login result:', JSON.stringify(loginResult?.result?.value));
  
  if (!loginResult?.result?.value?.success) {
    console.log('Login failed - trying direct navigation to login page');
  }

  // Reload app to pick up auth state
  await send('Page.navigate', { url: 'http://localhost/' });
  await sleep(8000);

  // ===== STEP 2: Audit each page =====
  console.log('\n=== STEP 2: Page Audit ===');
  
  const pagesToAudit = [
    { name: 'home', path: '/' },
    { name: 'all-posts', path: '/all-posts' },
    { name: 'sell', path: '/sell' },
    { name: 'chat', path: '/chat' },
    { name: 'profile', path: '/profile' },
    { name: 'listings', path: '/listings' },
    { name: 'category-hub', path: '/category-hub' },
    { name: 'category-mode', path: '/category-mode' },
    { name: 'notifications', path: '/notifications' },
    { name: 'saved', path: '/saved' },
    { name: 'settings', path: '/settings' },
    { name: 'my-ads', path: '/my-ads' },
    { name: 'help', path: '/help' },
  ];
  
  for (const page of pagesToAudit) {
    console.log(`\n--- Auditing: ${page.name} (${page.path}) ---`);
    
    // Navigate using SPA routing
    const navResult = await send('Runtime.evaluate', {
      expression: `(() => {
        window.history.pushState({}, '', '${page.path}');
        window.dispatchEvent(new PopStateEvent('popstate'));
        return window.location.pathname;
      })()`,
      returnByValue: true
    });
    
    await sleep(4000);
    
    // Comprehensive page audit
    const audit = await send('Runtime.evaluate', {
      expression: `(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const issues = [];
        
        // 1. Check for horizontal overflow
        const docWidth = document.documentElement.scrollWidth;
        if (docWidth > vw + 5) {
          issues.push('OVERFLOW: Page width ' + docWidth + 'px > viewport ' + vw + 'px');
        }
        
        // 2. Check for elements overflowing viewport
        const overflowing = [];
        document.querySelectorAll('*').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.right > vw + 10) {
            const tag = el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : '');
            if (!overflowing.includes(tag)) overflowing.push(tag);
          }
        });
        if (overflowing.length > 0) {
          issues.push('ELEMENTS_OVERFLOW: ' + overflowing.slice(0,5).join(', '));
        }
        
        // 3. Check for tiny touch targets (< 44px)
        const smallTargets = [];
        document.querySelectorAll('button, a, input, [role="button"], [onclick]').forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44)) {
            const label = el.textContent?.trim().slice(0,20) || el.className?.split(' ')[0] || el.tagName;
            smallTargets.push(label + '(' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ')');
          }
        });
        
        // 4. Check for text too small (< 12px)
        const smallText = [];
        document.querySelectorAll('p, span, div, li, a, td, th, label').forEach(el => {
          if (el.children.length === 0 && el.textContent?.trim()) {
            const fs = parseFloat(getComputedStyle(el).fontSize);
            if (fs < 12) {
              smallText.push(el.textContent.trim().slice(0,15) + '(' + fs + 'px)');
            }
          }
        });
        
        // 5. Check for loading spinners / skeleton still visible
        const loadingEls = document.querySelectorAll('.spinner, .loading, .skeleton, [class*="shimmer"], [class*="pulse"], [class*="animate-pulse"]');
        const stillLoading = [];
        loadingEls.forEach(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            stillLoading.push(el.className.split(' ')[0]);
          }
        });
        
        // 6. Check for auth gate
        const authGate = document.querySelector('[data-marker="auth-gate"], .auth-gate');
        
        // 7. Check for empty content
        const mainContent = document.querySelector('main, [role="main"], .page-content, #root > div > div');
        const contentHeight = mainContent ? mainContent.getBoundingClientRect().height : 0;
        
        // 8. Check bottom nav visibility
        const bottomNav = document.querySelector('.mhub-bottom-nav');
        const bottomNavVisible = bottomNav ? bottomNav.getBoundingClientRect().height > 0 : false;
        
        // 9. Check for broken images
        const brokenImages = [];
        document.querySelectorAll('img').forEach(img => {
          if (!img.complete || img.naturalWidth === 0) {
            brokenImages.push(img.src?.slice(-40));
          }
        });
        
        // 10. Check for console errors (stored)
        const errors = window.__auditErrors || [];
        
        // 11. Check for fixed elements overlapping
        const fixedEls = [];
        document.querySelectorAll('*').forEach(el => {
          const pos = getComputedStyle(el).position;
          if (pos === 'fixed' || pos === 'sticky') {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              fixedEls.push({ tag: el.className?.split(' ')[0] || el.tagName, top: Math.round(rect.top), bottom: Math.round(rect.bottom), height: Math.round(rect.height) });
            }
          }
        });
        
        // 12. Content clipping - check if content is behind fixed headers/footers
        const topFixed = fixedEls.filter(e => e.top < 10);
        const bottomFixed = fixedEls.filter(e => e.bottom > vh - 10);
        const usableHeight = vh - (topFixed.length ? Math.max(...topFixed.map(e=>e.height)) : 0) - (bottomFixed.length ? Math.max(...bottomFixed.map(e=>e.height)) : 0);
        
        return {
          url: window.location.pathname,
          viewport: { width: vw, height: vh },
          docWidth,
          issues,
          overflowElements: overflowing.slice(0,5),
          smallTargets: smallTargets.slice(0,10),
          smallText: smallText.slice(0,5),
          stillLoading,
          authGate: !!authGate,
          contentHeight: Math.round(contentHeight),
          bottomNavVisible,
          brokenImages: brokenImages.slice(0,5),
          fixedElements: fixedEls.length,
          usableHeight: Math.round(usableHeight),
          totalInteractiveElements: document.querySelectorAll('button, a, input, select, textarea').length,
          totalImages: document.querySelectorAll('img').length,
          hasContent: contentHeight > 100
        };
      })()`,
      returnByValue: true
    });
    
    const data = audit?.result?.value;
    results[page.name] = data;
    
    if (data) {
      console.log(`  URL: ${data.url}`);
      console.log(`  Viewport: ${data.viewport?.width}x${data.viewport?.height}`);
      console.log(`  Doc width: ${data.docWidth} ${data.docWidth > (data.viewport?.width || 412) + 5 ? '⚠️ OVERFLOW' : '✓'}`);
      console.log(`  Content height: ${data.contentHeight}px, Usable: ${data.usableHeight}px`);
      console.log(`  Bottom nav: ${data.bottomNavVisible ? '✓' : '⚠️ MISSING'}`);
      console.log(`  Auth gate: ${data.authGate ? '⚠️ BLOCKED' : '✓ none'}`);
      console.log(`  Loading indicators: ${data.stillLoading?.length || 0}`);
      console.log(`  Small targets (<44px): ${data.smallTargets?.length || 0}`);
      console.log(`  Small text (<12px): ${data.smallText?.length || 0}`);
      console.log(`  Broken images: ${data.brokenImages?.length || 0}`);
      if (data.issues?.length) console.log(`  Issues: ${data.issues.join('; ')}`);
      if (data.smallTargets?.length) console.log(`  Small targets: ${data.smallTargets.slice(0,5).join(', ')}`);
      if (data.stillLoading?.length) console.log(`  Still loading: ${data.stillLoading.join(', ')}`);
    } else {
      console.log('  ERROR: No audit data returned');
    }
    
    // Take screenshot
    const screenshot = await send('Page.captureScreenshot', { format: 'png', quality: 80 });
    if (screenshot?.data) {
      fs.writeFileSync(path.join(SCREENSHOTS_DIR, `audit_${page.name}.png`), Buffer.from(screenshot.data, 'base64'));
    }
  }

  // ===== STEP 3: Check JS console errors =====
  console.log('\n=== STEP 3: Console Errors Check ===');
  
  // Navigate to home and listen for errors
  await send('Runtime.evaluate', {
    expression: `(() => {
      window.__consoleErrors = [];
      const origError = console.error;
      console.error = (...args) => { window.__consoleErrors.push(args.map(a => String(a)).join(' ')); origError(...args); };
      window.addEventListener('error', (e) => { window.__consoleErrors.push('UNCAUGHT: ' + e.message); });
      window.addEventListener('unhandledrejection', (e) => { window.__consoleErrors.push('UNHANDLED_PROMISE: ' + e.reason); });
    })()`,
    returnByValue: true
  });
  
  // Navigate through key pages to trigger errors
  for (const p of ['/', '/all-posts', '/sell', '/chat', '/profile']) {
    await send('Runtime.evaluate', {
      expression: `(() => { window.history.pushState({}, '', '${p}'); window.dispatchEvent(new PopStateEvent('popstate')); })()`,
      returnByValue: true
    });
    await sleep(3000);
  }
  
  const errorsResult = await send('Runtime.evaluate', {
    expression: `JSON.stringify(window.__consoleErrors || [])`,
    returnByValue: true
  });
  
  const consoleErrors = JSON.parse(errorsResult?.result?.value || '[]');
  console.log(`Console errors found: ${consoleErrors.length}`);
  consoleErrors.slice(0, 20).forEach((e, i) => console.log(`  ${i+1}. ${e.slice(0, 150)}`));

  // ===== STEP 4: Network Failures Check =====
  console.log('\n=== STEP 4: Network Analysis ===');
  
  const networkResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      const res = await fetch('http://10.0.2.2:5001/api/auth/me', { credentials: 'include' });
      const data = await res.text();
      return { status: res.status, authenticated: res.ok, body: data.slice(0, 200) };
    })()`,
    awaitPromise: true, returnByValue: true
  });
  console.log('Auth /me check:', JSON.stringify(networkResult?.result?.value));

  // ===== STEP 5: Responsive Design Issues Summary =====
  console.log('\n=== FINAL SUMMARY ===');
  
  let totalIssues = 0;
  const criticalPages = [];
  
  for (const [name, data] of Object.entries(results)) {
    if (!data) { criticalPages.push({ name, reason: 'NO_DATA' }); continue; }
    const pageIssues = [];
    if (data.authGate) pageIssues.push('AUTH_BLOCKED');
    if (!data.bottomNavVisible) pageIssues.push('NO_BOTTOM_NAV');
    if (data.docWidth > (data.viewport?.width || 412) + 5) pageIssues.push('OVERFLOW');
    if (!data.hasContent) pageIssues.push('EMPTY');
    if (data.stillLoading?.length > 0) pageIssues.push('STILL_LOADING');
    if (data.brokenImages?.length > 0) pageIssues.push('BROKEN_IMAGES');
    if (data.smallTargets?.length > 3) pageIssues.push('MANY_SMALL_TARGETS');
    
    if (pageIssues.length > 0) {
      totalIssues += pageIssues.length;
      criticalPages.push({ name, issues: pageIssues });
    }
  }
  
  console.log(`\nTotal pages audited: ${Object.keys(results).length}`);
  console.log(`Pages with issues: ${criticalPages.length}`);
  criticalPages.forEach(p => {
    console.log(`  ⚠️ ${p.name}: ${p.issues?.join(', ') || p.reason}`);
  });
  
  // Save full results
  fs.writeFileSync(path.join(SCREENSHOTS_DIR, 'full-audit-results.json'), JSON.stringify({ results, consoleErrors, criticalPages }, null, 2));
  console.log(`\nFull results saved to audit-screenshots/full-audit-results.json`);
  
  ws.close();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
