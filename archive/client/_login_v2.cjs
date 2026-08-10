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

  console.log('=== Login via App React Context ===');
  
  // Navigate to login page
  await send('Page.navigate', { url: 'http://localhost/login' });
  await sleep(5000);

  // Fill the form using React-compatible approach:
  // We need to trigger React's synthetic event system properly
  const fillResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      const phoneInput = document.getElementById('mobile');
      const passInput = document.getElementById('password');
      
      if (!phoneInput || !passInput) {
        return { error: 'Inputs not found', phone: !!phoneInput, pass: !!passInput };
      }
      
      // Get React fiber instance to find the onChange handler
      function getReactProps(el) {
        const key = Object.keys(el).find(k => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
        if (!key) return null;
        let fiber = el[key];
        while (fiber) {
          if (fiber.memoizedProps?.onChange) return fiber.memoizedProps;
          fiber = fiber.return;
        }
        return null;
      }
      
      // Method: Use native setter + React synthetic events
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      
      // Fill phone
      nativeSetter.call(phoneInput, '9876543210');
      phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
      phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Fill password
      nativeSetter.call(passInput, 'Test@12345');
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
      
      await new Promise(r => setTimeout(r, 300));
      
      return { 
        phoneValue: phoneInput.value, 
        passValue: passInput.value.length,
        ready: true
      };
    })()`,
    awaitPromise: true, returnByValue: true
  });
  console.log('Fill result:', JSON.stringify(fillResult?.result?.value));

  // Now submit the form
  const submitResult = await send('Runtime.evaluate', {
    expression: `(async () => {
      const form = document.querySelector('form');
      const submitBtn = document.querySelector('button[type="submit"]');
      
      if (form) {
        // Dispatch submit event
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      } else if (submitBtn) {
        submitBtn.click();
      }
      
      return { form: !!form, btn: !!submitBtn, url: window.location.pathname };
    })()`,
    awaitPromise: true, returnByValue: true
  });
  console.log('Submit:', JSON.stringify(submitResult?.result?.value));

  // Wait for login to process
  await sleep(8000);

  // Check auth state
  const authState = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        url: window.location.pathname + window.location.search,
        authSession: localStorage.getItem('authSession'),
        userId: localStorage.getItem('userId'),
        cookies: document.cookie.slice(0, 200),
        bodyText: document.body?.innerText?.slice(0, 300),
        diagBuffer: (window.__mhubDiagBuffer || []).slice(-10).map(e => e.tag + ':' + (e.detail||'').slice(0,50))
      };
    })()`,
    returnByValue: true
  });
  console.log('\nAuth state after login:', JSON.stringify(authState?.result?.value, null, 2));

  // If still not logged in, try direct API login and store result
  if (!authState?.result?.value?.authSession) {
    console.log('\n--- Trying direct API login through the app\'s api module ---');
    
    const directLogin = await send('Runtime.evaluate', {
      expression: `(async () => {
        try {
          // Ensure CSRF cookie is fresh
          await fetch('http://10.0.2.2:5001/api/auth/csrf-token', { credentials: 'include' });
          await new Promise(r => setTimeout(r, 500));
          
          // Read the CSRF cookie
          const cookies = document.cookie;
          const csrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/);
          const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';
          
          // Make login request with proper CSRF
          const res = await fetch('http://10.0.2.2:5001/api/auth/login', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'X-XSRF-TOKEN': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ 
              identifier: '9876543210', 
              password: 'Test@12345',
              deviceId: localStorage.getItem('mhub_device_id') || 'cdp-test-device'
            })
          });
          
          const data = await res.json();
          
          if (res.ok && data.user) {
            localStorage.setItem('authSession', 'true');
            localStorage.setItem('userId', data.user.id || data.user.user_id);
            localStorage.setItem('user_id', data.user.id || data.user.user_id);
            localStorage.setItem('user', JSON.stringify(data.user));
            return { success: true, user: data.user.name, userId: data.user.id };
          }
          return { success: false, status: res.status, error: data.error || data.message, body: JSON.stringify(data).slice(0, 200) };
        } catch(e) {
          return { success: false, error: e.message, stack: e.stack?.slice(0, 200) };
        }
      })()`,
      awaitPromise: true, returnByValue: true
    });
    console.log('Direct login result:', JSON.stringify(directLogin?.result?.value, null, 2));

    if (directLogin?.result?.value?.success) {
      // Reload to pick up auth
      await send('Page.navigate', { url: 'http://localhost/all-posts' });
      await sleep(5000);
      
      const finalState = await send('Runtime.evaluate', {
        expression: `(() => ({
          url: window.location.pathname,
          authSession: localStorage.getItem('authSession'),
          body: document.body?.innerText?.slice(0, 200)
        }))()`,
        returnByValue: true
      });
      console.log('Final state:', JSON.stringify(finalState?.result?.value, null, 2));
    }
  }
  
  ws.close();
}
main().catch(e => console.error('Error:', e));
