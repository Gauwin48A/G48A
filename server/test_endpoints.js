const http = require('http');
const crypto = require('crypto');

function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers }, (res) => {
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
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data, cookies }));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function run() {
  console.log("1. Fetching CSRF Token...");
  const csrfRes = await httpGet('http://localhost:5001/api/auth/csrf-token');
  console.log("CSRF response status:", csrfRes.status);
  console.log("CSRF response body:", csrfRes.body);
  
  const csrfData = JSON.parse(csrfRes.body);
  const csrfToken = csrfData.csrfToken || csrfData.token || '';
  const cookieHeader = `XSRF-TOKEN=${csrfToken}`;

  console.log("\n2. Logging in with user 'rahul.sharma@mhub.com'...");
  const timestamp = String(Date.now());
  const nonce = crypto.randomBytes(16).toString('hex');
  const loginBody = { identifier: 'rahul.sharma@mhub.com', password: 'Test@1234', _timestamp: timestamp, deviceFingerprint: "device_fingerprint_demo_user_test" };
  
  const loginHeaders = {
    'X-XSRF-TOKEN': csrfToken,
    'X-Mhub-Timestamp': timestamp,
    'X-Mhub-Nonce': nonce,
    'Cookie': cookieHeader,
  };

  const loginRes = await httpPost('http://localhost:5001/api/auth/login', loginBody, loginHeaders);
  console.log("Login response status:", loginRes.status);
  console.log("Login response body:", loginRes.body);

  if (loginRes.status !== 200) {
    console.error("Login failed!");
    return;
  }

  // Extract session cookies (jwt token and xsrf token)
  const sessionCookies = loginRes.cookies.map(c => c.split(';')[0]).join('; ');
  console.log("Cookies:", sessionCookies);

  console.log("\n3. Requesting /api/v1/auth/me...");
  const meRes = await httpGet('http://localhost:5001/api/v1/auth/me', {
    'Cookie': sessionCookies,
    'X-XSRF-TOKEN': csrfToken,
  });
  console.log("Me (v1) response status:", meRes.status);
  console.log("Me (v1) response body:", meRes.body);

  console.log("\n3b. Requesting /api/auth/me...");
  const meResNoV1 = await httpGet('http://localhost:5001/api/auth/me', {
    'Cookie': sessionCookies,
    'X-XSRF-TOKEN': csrfToken,
  });
  console.log("Me (no v1) response status:", meResNoV1.status);
  console.log("Me (no v1) response body:", meResNoV1.body);

  console.log("\n4. Requesting /api/v1/rewards...");
  const rewardsRes = await httpGet('http://localhost:5001/api/v1/rewards', {
    'Cookie': sessionCookies,
    'X-XSRF-TOKEN': csrfToken,
  });
  console.log("Rewards response status:", rewardsRes.status);
  console.log("Rewards response body:", rewardsRes.body);
}

run().catch(console.error);
