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

  // Check CSRF
  const r = await send('Runtime.evaluate', {
    expression: `(async () => {
      const res = await fetch('http://10.0.2.2:5001/api/auth/csrf-token', { credentials: 'include' });
      const text = await res.text();
      const cookies = document.cookie;
      const setCookieHeader = res.headers.get('set-cookie');
      return JSON.stringify({
        status: res.status,
        body: text.slice(0, 300),
        documentCookies: cookies.slice(0, 300),
        setCookieHeader: setCookieHeader
      });
    })()`,
    awaitPromise: true, returnByValue: true
  });
  console.log('CSRF endpoint check:', r?.result?.value);

  // Check mhub diag buffer
  const diag = await send('Runtime.evaluate', {
    expression: `JSON.stringify(window.__mhubDiagBuffer?.slice(-20) || [])`,
    returnByValue: true
  });
  console.log('\nDiag buffer:', diag?.result?.value);

  ws.close();
}
main().catch(e => console.error(e));
