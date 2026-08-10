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
  await send('Network.enable');

  console.log('=== Testing CSRF with body token as header ===');
  
  // The key insight: use body token as header value, and the browser will also send cookie automatically
  const result = await send('Runtime.evaluate', {
    expression: `(async () => {
      // Step 1: Get fresh CSRF token from endpoint
      const csrfRes = await fetch('http://10.0.2.2:5001/api/auth/csrf-token', { credentials: 'include' });
      const csrfData = await csrfRes.json();
      const bodyToken = csrfData.csrfToken;
      
      // Step 2: Send login with body token as X-XSRF-TOKEN header
      // The cookie will also be automatically sent if sameSite=none + thirdPartyCookies enabled
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
          deviceId: localStorage.getItem('mhub_device_id') || 'cdp-device-test'
        })
      });
      
      const loginData = await loginRes.json();
      
      if (loginRes.ok && loginData.user) {
        // Store auth state
        localStorage.setItem('authSession', 'true');
        localStorage.setItem('userId', loginData.user.id || loginData.user.user_id);
        localStorage.setItem('user', JSON.stringify(loginData.user));
        return { success: true, status: loginRes.status, user: loginData.user.name, id: loginData.user.id };
      }
      
      return { 
        success: false, 
        status: loginRes.status, 
        error: loginData.error,
        message: loginData.message,
        bodyToken: bodyToken?.slice(0, 20)
      };
    })()`,
    awaitPromise: true, returnByValue: true
  });
  
  console.log('Result:', JSON.stringify(result?.result?.value, null, 2));
  
  if (!result?.result?.value?.success) {
    // The cookie isn't being sent. Let's check with Network domain
    console.log('\n--- Trying alternative: skip CSRF for Capacitor ---');
    console.log('The Double Submit Cookie pattern is fundamentally incompatible with cross-origin Capacitor WebView.');
    console.log('Solution: Server should skip CSRF for requests with valid device fingerprint/ID header.');
  }
  
  ws.close();
}
main().catch(e => console.error('Error:', e));
