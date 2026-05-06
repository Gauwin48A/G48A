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
      pending[myId] = resolve;
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  }
  ws.on('message', d => { const m = JSON.parse(d); if (m.id && pending[m.id]) { pending[m.id](m.result); delete pending[m.id]; } });
  await new Promise(r => ws.on('open', r));

  // Navigate to login
  console.log('Navigating to /login...');
  await send('Page.navigate', { url: 'http://localhost/login' });
  await sleep(6000);

  // Check what's on the login page
  const pageState = await send('Runtime.evaluate', {
    expression: `(() => {
      const inputs = document.querySelectorAll('input');
      const buttons = document.querySelectorAll('button');
      const inputInfo = Array.from(inputs).map(i => ({ type: i.type, name: i.name, placeholder: i.placeholder, id: i.id }));
      const buttonInfo = Array.from(buttons).map(b => ({ text: b.textContent?.trim().slice(0,30), type: b.type }));
      return { url: window.location.pathname, inputs: inputInfo, buttons: buttonInfo, bodyPreview: document.body.innerText?.slice(0, 300) };
    })()`,
    returnByValue: true
  });
  console.log('Login page state:', JSON.stringify(pageState?.result?.value, null, 2));

  // Fill and submit login form
  const loginAttempt = await send('Runtime.evaluate', {
    expression: `(async () => {
      let phoneInput = document.querySelector('input[name="phone"], input[type="tel"], input[placeholder*="phone" i], input[placeholder*="mobile" i], input[placeholder*="number" i]');
      let passInput = document.querySelector('input[name="password"], input[type="password"]');
      
      if (!phoneInput) {
        // Try first input
        const allInputs = document.querySelectorAll('input');
        if (allInputs.length >= 2) {
          phoneInput = allInputs[0];
          passInput = allInputs[1];
        }
      }
      
      if (phoneInput && passInput) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        
        nativeInputValueSetter.call(phoneInput, '9876543210');
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        nativeInputValueSetter.call(passInput, 'Test@12345');
        passInput.dispatchEvent(new Event('input', { bubbles: true }));
        passInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        await new Promise(r => setTimeout(r, 500));
        
        const submitBtn = document.querySelector('button[type="submit"], form button, button');
        if (submitBtn) {
          submitBtn.click();
          return { action: 'clicked_submit', phoneVal: phoneInput.value, passVal: passInput.value?.length };
        }
        return { action: 'no_submit_found' };
      }
      return { action: 'inputs_not_found', html: document.body.innerHTML?.slice(0, 500) };
    })()`,
    awaitPromise: true, returnByValue: true
  });
  console.log('Login attempt:', JSON.stringify(loginAttempt?.result?.value));

  // Wait for navigation/auth
  await sleep(6000);

  // Check post-login state
  const afterLogin = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        url: window.location.pathname,
        authSession: localStorage.getItem('authSession'),
        userId: localStorage.getItem('userId'),
        userName: (() => { try { return JSON.parse(localStorage.getItem('user'))?.name } catch(e) { return null } })(),
        bodyPreview: document.body.innerText?.slice(0, 200)
      };
    })()`,
    returnByValue: true
  });
  console.log('After login state:', JSON.stringify(afterLogin?.result?.value, null, 2));
  
  ws.close();
}
main().catch(e => console.error('Error:', e));
