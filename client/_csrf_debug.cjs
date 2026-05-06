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
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  let id = 1;
  const pending = {};
  function send(method, params = {}) {
    return new Promise((resolve) => {
      const myId = id++;
      const timer = setTimeout(() => { delete pending[myId]; resolve({ error: 'timeout' }); }, 30000);
      pending[myId] = (r) => { clearTimeout(timer); resolve(r); };
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  }
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending[m.id]) { pending[m.id](m.result); delete pending[m.id]; } });
  await new Promise(r => ws.on('open', r));

  console.log('=== Deep CSRF Debug ===');
  
  // Step 1: Get fresh CSRF token and inspect everything
  const csrfDebug = await send('Runtime.evaluate', {
    expression: `(async () => {
      // First fetch CSRF token endpoint
      const res = await fetch('http://10.0.2.2:5001/api/auth/csrf-token', { credentials: 'include' });
      const body = await res.json();
      
      // Check response headers
      const allHeaders = {};
      res.headers.forEach((v, k) => { allHeaders[k] = v; });
      
      // Check document cookies
      const docCookies = document.cookie;
      
      // Extract XSRF-TOKEN from cookies
      const match = docCookies.match(/XSRF-TOKEN=([^;]+)/);
      const xsrfFromCookie = match ? decodeURIComponent(match[1]) : null;
      
      return {
        status: res.status,
        bodyToken: body.csrfToken || body.token,
        responseHeaders: allHeaders,
        docCookies: docCookies,
        xsrfFromCookie: xsrfFromCookie,
        tokensMatch: xsrfFromCookie === (body.csrfToken || body.token)
      };
    })()`,
    awaitPromise: true, returnByValue: true
  });
  console.log('CSRF Debug:', JSON.stringify(csrfDebug?.result?.value, null, 2));

  // Step 2: Try login with explicit XSRF token from cookie AND from body
  const loginTest = await send('Runtime.evaluate', {
    expression: `(async () => {
      // Get fresh CSRF
      const csrfRes = await fetch('http://10.0.2.2:5001/api/auth/csrf-token', { credentials: 'include' });
      const csrfBody = await csrfRes.json();
      const bodyToken = csrfBody.csrfToken || csrfBody.token;
      
      // Read cookie token
      const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
      const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : '';
      
      // Try with BODY token (most reliable)
      const loginRes = await fetch('http://10.0.2.2:5001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-XSRF-TOKEN': bodyToken
        },
        credentials: 'include',
        body: JSON.stringify({
          identifier: '9876543210',
          password: 'Test@12345',
          deviceId: localStorage.getItem('mhub_device_id') || 'test-device-001'
        })
      });
      
      const loginBody = await loginRes.text();
      
      return {
        cookieToken: cookieToken?.slice(0, 20) + '...',
        bodyToken: bodyToken?.slice(0, 20) + '...',
        loginStatus: loginRes.status,
        loginBody: loginBody.slice(0, 300),
        loginHeaders: Object.fromEntries([...loginRes.headers.entries()])
      };
    })()`,
    awaitPromise: true, returnByValue: true
  });
  console.log('\nLogin with body token:', JSON.stringify(loginTest?.result?.value, null, 2));

  ws.close();
}
main().catch(e => console.error('Error:', e));
