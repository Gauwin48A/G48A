const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const SERVER_DIR = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PAGE_FLOW_CONTRACT_PORT || 5083);
const BOOT_TIMEOUT_MS = 45000;
const REQUEST_TIMEOUT_MS = 8000;

function httpRequest({ method = 'GET', path: requestPath = '/', headers = {}, body = '' }) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: HOST,
        port: PORT,
        path: requestPath,
        method,
        headers,
        timeout: REQUEST_TIMEOUT_MS
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            ok: true,
            status: res.statusCode || 0,
            headers: res.headers || {},
            body: data
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('request-timeout'));
    });

    req.on('error', (error) => {
      resolve({
        ok: false,
        error: error.message || 'request-error'
      });
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(String(value || ''));
  } catch {
    return null;
  }
}

function normalizeSpace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function getCookieHeaderFromSetCookie(setCookieHeader) {
  if (!setCookieHeader) return '';
  const source = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  return source
    .map((entry) => String(entry || '').split(';')[0].trim())
    .filter(Boolean)
    .join('; ');
}

async function waitForBoot(maxWaitMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < maxWaitMs) {
    // eslint-disable-next-line no-await-in-loop
    const response = await httpRequest({ path: '/health' });
    if (response.ok && response.status >= 200 && response.status < 500) {
      return true;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function buildFailureMessage(name, result, reason = '') {
  if (!result.ok) {
    return `[FAIL] ${name}: network error (${result.error})`;
  }
  const snippet = normalizeSpace(result.body).slice(0, 220);
  const suffix = reason ? ` (${reason})` : '';
  return `[FAIL] ${name}: status ${result.status}${suffix} body="${snippet}"`;
}

async function stopServer(serverProcess) {
  if (!serverProcess || serverProcess.killed) {
    return;
  }

  const exited = new Promise((resolve) => {
    serverProcess.once('close', () => resolve(true));
  });

  serverProcess.kill('SIGINT');
  const graceful = await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(() => resolve(false), 4000))
  ]);

  if (!graceful) {
    serverProcess.kill('SIGKILL');
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 2000))
    ]);
  }
}

function buildSignupIdentity() {
  const seed = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  const nineDigits = seed.slice(-9).padStart(9, '0');
  return {
    fullName: 'Proactive Contract Probe',
    phone: `9${nineDigits}`,
    email: `proactive.contract.${seed}@example.com`,
    password: 'StrongPass123!A'
  };
}

async function authenticateFlowUser() {
  const configuredIdentifier = String(process.env.PROACTIVE_TEST_USER_IDENTIFIER || '').trim();
  const configuredPassword = String(process.env.PROACTIVE_TEST_USER_PASSWORD || '').trim();

  if (configuredIdentifier && configuredPassword) {
    const loginPayload = JSON.stringify({
      identifier: configuredIdentifier,
      password: configuredPassword
    });
    const loginResult = await httpRequest({
      method: 'POST',
      path: '/api/auth/login',
      headers: { 'Content-Type': 'application/json' },
      body: loginPayload
    });

    if (!loginResult.ok) {
      throw new Error(buildFailureMessage('POST /api/auth/login', loginResult));
    }
    if (loginResult.status !== 200) {
      throw new Error(buildFailureMessage('POST /api/auth/login', loginResult, 'expected status 200'));
    }

    const loginBody = parseJsonSafe(loginResult.body);
    const token = loginBody?.token;
    const userId = loginBody?.user?.id || loginBody?.user?.user_id || null;
    if (!token || !userId) {
      throw new Error('[FAIL] login auth probe: missing token or user id in response');
    }

    return {
      token,
      userId: String(userId),
      cookieHeader: getCookieHeaderFromSetCookie(loginResult.headers['set-cookie'])
    };
  }

  const signupIdentity = buildSignupIdentity();
  const signupResult = await httpRequest({
    method: 'POST',
    path: '/api/auth/signup',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signupIdentity)
  });

  if (!signupResult.ok) {
    throw new Error(buildFailureMessage('POST /api/auth/signup', signupResult));
  }
  if (signupResult.status !== 201) {
    throw new Error(buildFailureMessage('POST /api/auth/signup', signupResult, 'expected status 201'));
  }

  const signupBody = parseJsonSafe(signupResult.body);
  const token = signupBody?.token;
  const userId = signupBody?.user?.id || signupBody?.user?.user_id || null;
  if (!token || !userId) {
    throw new Error('[FAIL] signup auth probe: missing token or user id in response');
  }

  return {
    token,
    userId: String(userId),
    cookieHeader: getCookieHeaderFromSetCookie(signupResult.headers['set-cookie'])
  };
}

function buildAuthHeaders(authContext) {
  const headers = {
    Authorization: `Bearer ${authContext.token}`
  };
  if (authContext.cookieHeader) {
    headers.Cookie = authContext.cookieHeader;
  }
  return headers;
}

async function run() {
  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: process.env.NODE_ENV || 'development'
  };

  const serverProcess = spawn(process.execPath, ['src/index.js'], {
    cwd: SERVER_DIR,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let logs = '';
  const keepLogTail = (chunk) => {
    logs += chunk.toString();
    if (logs.length > 8000) {
      logs = logs.slice(-8000);
    }
  };
  serverProcess.stdout.on('data', keepLogTail);
  serverProcess.stderr.on('data', keepLogTail);

  try {
    const booted = await waitForBoot(BOOT_TIMEOUT_MS);
    if (!booted) {
      throw new Error(`server did not become reachable on http://${HOST}:${PORT}/health`);
    }

    const authContext = await authenticateFlowUser();
    const authHeaders = buildAuthHeaders(authContext);
    const encodedUserId = encodeURIComponent(authContext.userId);

    const pageProbes = [
      { name: 'Profile data', path: '/api/profile', allowed: [200] },
      {
        name: 'Profile update submit',
        method: 'POST',
        path: '/api/profile/update',
        allowed: [200],
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: 'Proactive Contract Probe' }),
        validate: (result) => {
          const payload = parseJsonSafe(result.body);
          if (!payload || typeof payload !== 'object') {
            return 'expected JSON payload';
          }
          if (!payload.user_id) {
            return 'missing user_id field';
          }
          return '';
        }
      },
      { name: 'Profile preferences', path: '/api/profile/preferences', allowed: [200] },
      { name: 'KYC status page', path: '/api/users/kyc/status', allowed: [200] },
      {
        name: '2FA setup bootstrap',
        method: 'POST',
        path: '/api/auth/2fa/setup',
        allowed: [200],
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        validate: (result) => {
          const payload = parseJsonSafe(result.body);
          if (!payload || typeof payload !== 'object') {
            return 'expected JSON payload';
          }
          if (!payload.success) {
            return 'missing success=true flag';
          }
          if (!payload.secret || !payload.qrCode) {
            return 'missing secret or qrCode';
          }
          return '';
        }
      },
      { name: 'User posts (mine)', path: `/api/posts/mine?userId=${encodedUserId}&limit=1&page=1`, allowed: [200] },
      { name: 'Rewards by user', path: `/api/rewards/user/${encodedUserId}`, allowed: [200] },
      {
        name: 'Channel by owner',
        path: `/api/channels/owner/${encodedUserId}?limit=1`,
        allowed: [200],
        validate: (result) => {
          const payload = parseJsonSafe(result.body);
          if (!payload || typeof payload !== 'object') {
            return 'expected JSON payload';
          }
          if (!Object.prototype.hasOwnProperty.call(payload, 'channel')) {
            return 'missing channel field';
          }
          if (!Array.isArray(payload.posts)) {
            return 'missing posts array';
          }
          return '';
        }
      },
      { name: 'Channels page', path: '/api/channels', allowed: [200] },
      { name: 'Followed channels page', path: '/api/channels/followed', allowed: [200] },
      { name: 'Feed page', path: '/api/feed?page=1&limit=1', allowed: [200] },
      { name: 'Categories page', path: '/api/categories', allowed: [200] },
      { name: 'Public wall page', path: '/api/publicwall?page=1&limit=1', allowed: [200] },
      { name: 'Notifications page', path: '/api/notifications?page=1&limit=1', allowed: [200] },
      { name: 'Wishlist page', path: '/api/wishlist?limit=1', allowed: [200] },
      { name: 'Recently viewed page', path: '/api/recently-viewed?limit=1', allowed: [200] },
      { name: 'Saved searches page', path: '/api/saved-searches', allowed: [200] }
    ];

    let failures = 0;

    for (const probe of pageProbes) {
      // eslint-disable-next-line no-await-in-loop
      const headers = {
        ...authHeaders,
        ...(probe.headers || {})
      };
      const result = await httpRequest({
        method: probe.method || 'GET',
        path: probe.path,
        headers,
        body: probe.body || ''
      });

      if (!result.ok) {
        failures += 1;
        console.error(buildFailureMessage(probe.name, result));
        continue;
      }
      if (result.status === 429) {
        failures += 1;
        console.error(buildFailureMessage(probe.name, result, 'unexpected 429 rate-limit'));
        continue;
      }
      if (!probe.allowed.includes(result.status)) {
        failures += 1;
        console.error(
          buildFailureMessage(
            probe.name,
            result,
            `expected status ${probe.allowed.join(' or ')}`
          )
        );
        continue;
      }
      if (typeof probe.validate === 'function') {
        const validationIssue = probe.validate(result);
        if (validationIssue) {
          failures += 1;
          console.error(buildFailureMessage(probe.name, result, validationIssue));
          continue;
        }
      }

      console.log(`[PASS] ${probe.name}: status ${result.status}`);
    }

    const burstPaths = [
      '/api/profile',
      '/api/profile/preferences',
      '/api/users/kyc/status',
      `/api/posts/mine?userId=${encodedUserId}&limit=1&page=1`,
      `/api/rewards/user/${encodedUserId}`,
      '/api/channels',
      '/api/notifications?page=1&limit=1',
      '/api/wishlist?limit=1',
      '/api/recently-viewed?limit=1'
    ];

    const burstRequests = [...burstPaths, ...burstPaths].map((requestPath) =>
      httpRequest({
        method: 'GET',
        path: requestPath,
        headers: authHeaders
      })
    );
    const burstResults = await Promise.all(burstRequests);

    let burstFailures = 0;
    burstResults.forEach((result, index) => {
      const probeName = `Burst request #${index + 1}`;
      if (!result.ok) {
        burstFailures += 1;
        console.error(buildFailureMessage(probeName, result));
        return;
      }
      if (result.status === 429) {
        burstFailures += 1;
        console.error(buildFailureMessage(probeName, result, 'unexpected 429 rate-limit'));
        return;
      }
      if (result.status >= 500) {
        burstFailures += 1;
        console.error(buildFailureMessage(probeName, result, 'unexpected 5xx response'));
      }
    });

    if (burstFailures === 0) {
      console.log(`[PASS] Page burst contract: ${burstResults.length} requests without 429/5xx`);
    } else {
      failures += burstFailures;
    }

    if (failures > 0) {
      throw new Error(`page-flow contract probe failed with ${failures} issue(s)`);
    }

    console.log('Page-flow contract probe passed.');
  } catch (error) {
    console.error(error.message || String(error));
    if (logs) {
      console.error('--- Server log tail ---');
      console.error(logs);
    }
    process.exitCode = 1;
  } finally {
    await stopServer(serverProcess);
  }
}

run();
