// Verify API returns images + do authenticated login with proper integrity headers
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
  // 1. Check API images
  console.log('=== CHECKING API IMAGES ===');
  const postsRes = await httpGet('http://127.0.0.1:5001/api/posts?page=1&limit=2');
  const postsData = JSON.parse(postsRes.body);
  const posts = postsData.data || postsData.posts || postsData;
  if (Array.isArray(posts)) {
    posts.slice(0, 2).forEach(p => {
      console.log(`  ${p.title}: image_url=${p.image_url}, images=${JSON.stringify(p.images)}`);
    });
  }

  // 2. Get CSRF token - the endpoint sets XSRF-TOKEN cookie AND returns token in body
  console.log('\n=== LOGIN ATTEMPT ===');
  const csrfRes = await httpGet('http://127.0.0.1:5001/api/auth/csrf-token');
  const csrfData = JSON.parse(csrfRes.body);
  const csrfToken = csrfData.csrfToken || csrfData.token || '';
  console.log('CSRF token:', csrfToken ? csrfToken.substring(0, 16) + '...' : 'none');
  
  // The cookie value must match the header value (double-submit pattern)
  // The endpoint sets a NEW cookie with the token from the body, so use that token as both
  const cookieHeader = `XSRF-TOKEN=${csrfToken}`;

  // 3. Login with timestamp + nonce + CSRF cookie + header
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString('hex');
  const loginBody = { identifier: 'priya@mhub.com', password: 'Test@1234', _timestamp: timestamp };
  
  const loginHeaders = {
    'X-XSRF-TOKEN': csrfToken,
    'X-Mhub-Timestamp': timestamp,
    'X-Mhub-Nonce': nonce,
    'Cookie': cookieHeader,
  };

  const loginRes = await httpPost('http://127.0.0.1:5001/api/auth/login', loginBody, loginHeaders);
  console.log('Login status:', loginRes.status);
  console.log('Login body:', loginRes.body.substring(0, 500));
  console.log('Set-Cookie count:', loginRes.cookies.length);
  loginRes.cookies.forEach(c => console.log('  Cookie:', c.split(';')[0].substring(0, 60) + '...'));
})();
