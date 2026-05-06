const http = require('http');
const WebSocket = require('ws');

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

async function main() {
  const pages = await getPages();
  console.log('Page URL:', pages[0].url);
  const wsUrl = pages[0].webSocketDebuggerUrl;
  
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = {};
  
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const myId = id++;
      pending[myId] = resolve;
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
  
  // Navigate to all-posts
  await send('Page.navigate', { url: 'http://localhost/all-posts' });
  await sleep(12000);
  
  // Check DOM state
  const r1 = await send('Runtime.evaluate', {
    expression: `(() => {
      const nav = document.querySelector('.mhub-bottom-nav');
      const allNavs = document.querySelectorAll('nav');
      const btns = nav ? nav.querySelectorAll('button, a') : [];
      return JSON.stringify({
        hasBottomNav: !!nav,
        navCount: allNavs.length,
        navClasses: Array.from(allNavs).map(n => n.className.slice(0, 100)),
        bottomNavBtnCount: btns.length,
        bottomNavLabels: Array.from(btns).map(b => (b.dataset.navkey || b.textContent.trim()).slice(0, 30)),
        url: location.pathname,
        authSession: localStorage.getItem('authSession'),
        userId: localStorage.getItem('userId'),
      });
    })()`,
    returnByValue: true
  });
  console.log('DOM State:', r1.result.value);
  
  // Click the More button
  const r2 = await send('Runtime.evaluate', {
    expression: `(() => {
      const nav = document.querySelector('.mhub-bottom-nav');
      const btns = nav.querySelectorAll('button');
      const moreBtn = Array.from(btns).find(b => b.dataset.navkey === 'more' || b.textContent.trim().toLowerCase().includes('more'));
      if (moreBtn) { moreBtn.click(); return 'clicked'; }
      return 'not_found';
    })()`,
    returnByValue: true
  });
  console.log('More button click:', r2.result.value);
  await sleep(1000);
  
  // Check if drawer opened
  const r3 = await send('Runtime.evaluate', {
    expression: `(() => {
      const drawer = document.querySelector('[role="dialog"], .mhub-more-drawer, [data-state="open"]');
      const portal = document.querySelector('#mhub-more-portal');
      const portalContent = portal ? portal.innerHTML.slice(0, 200) : 'NO_PORTAL';
      return JSON.stringify({
        hasDrawer: !!drawer,
        hasPortal: !!portal,
        portalContent,
        drawerClass: drawer?.className?.slice(0, 100) || 'none',
      });
    })()`,
    returnByValue: true
  });
  console.log('Drawer state:', r3.result.value);
  
  ws.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
