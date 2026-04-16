const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const SERVER_DIR = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PORT = Number(process.env.RUNTIME_CONTRACT_PORT || 5081);
const BOOT_TIMEOUT_MS = 45000;
const REQUEST_TIMEOUT_MS = 7000;
const CORS_TEST_ORIGIN = 'http://localhost:5173';

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

function normalizeSpace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
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

function buildFailureMessage(probe, result, extra = '') {
  if (!result.ok) {
    return `[FAIL] ${probe.name}: network error (${result.error})`;
  }
  const snippet = normalizeSpace(result.body).slice(0, 220);
  const suffix = extra ? ` (${extra})` : '';
  return `[FAIL] ${probe.name}: status ${result.status}${suffix} body="${snippet}"`;
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
    if (logs.length > 6000) {
      logs = logs.slice(-6000);
    }
  };
  serverProcess.stdout.on('data', keepLogTail);
  serverProcess.stderr.on('data', keepLogTail);

  try {
    const booted = await waitForBoot(BOOT_TIMEOUT_MS);
    if (!booted) {
      throw new Error(`server did not become reachable on http://${HOST}:${PORT}/health`);
    }

    const probes = [
      {
        name: 'GET /api/health',
        request: { method: 'GET', path: '/api/health' },
        validate: (result) => {
          if (result.status === 404) return 'unexpected 404';
          if (!normalizeSpace(result.body).toLowerCase().includes('mhub-backend')) {
            return 'missing mhub-backend fingerprint';
          }
          return '';
        }
      },
      {
        name: 'GET /api/categories',
        request: { method: 'GET', path: '/api/categories' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/channels',
        request: { method: 'GET', path: '/api/channels' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/channels/owner/:userId',
        request: { method: 'GET', path: '/api/channels/owner/runtime-probe-user?limit=1' },
        validate: (result) => {
          if (result.status === 404) return 'unexpected 404';
          if (![401, 403].includes(result.status)) return 'expected auth-guarded status (401/403)';
          return '';
        }
      },
      {
        name: 'GET /api/channel',
        request: { method: 'GET', path: '/api/channel' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'POST /api/channel/create',
        request: {
          method: 'POST',
          path: '/api/channel/create',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/posts/for-you?page=1&limit=6',
        request: { method: 'GET', path: '/api/posts/for-you?page=1&limit=6' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/profile',
        request: { method: 'GET', path: '/api/profile' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/profile/preferences',
        request: { method: 'GET', path: '/api/profile/preferences' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/users/kyc/status',
        request: { method: 'GET', path: '/api/users/kyc/status' },
        validate: (result) => {
          if (result.status === 404) return 'unexpected 404';
          if (![401, 403].includes(result.status)) return 'expected auth-guarded status (401/403)';
          return '';
        }
      },
      {
        name: 'GET /api/feed?page=1&limit=1',
        request: { method: 'GET', path: '/api/feed?page=1&limit=1' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/feed/mine?page=1&limit=1',
        request: { method: 'GET', path: '/api/feed/mine?page=1&limit=1' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/notifications?page=1&limit=1',
        request: { method: 'GET', path: '/api/notifications?page=1&limit=1' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/wishlist?page=1&limit=1',
        request: { method: 'GET', path: '/api/wishlist?page=1&limit=1' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/recently-viewed?page=1&limit=1',
        request: { method: 'GET', path: '/api/recently-viewed?page=1&limit=1' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/saved-searches?page=1&limit=1',
        request: { method: 'GET', path: '/api/saved-searches?page=1&limit=1' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'POST /api/auth/refresh-token',
        request: {
          method: 'POST',
          path: '/api/auth/refresh-token',
          headers: { 'Content-Type': 'application/json' },
          body: '{}'
        },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'POST /api/location',
        request: {
          method: 'POST',
          path: '/api/location',
          headers: { 'Content-Type': 'application/json' },
          body: '{"lat":12.9,"lng":77.5}'
        },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/publicwall',
        request: { method: 'GET', path: '/api/publicwall?page=1&limit=1' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /api/public-wall',
        request: { method: 'GET', path: '/api/public-wall?page=1&limit=1' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'GET /socket.io/?EIO=4&transport=polling',
        request: { method: 'GET', path: '/socket.io/?EIO=4&transport=polling' },
        validate: (result) => (result.status === 404 ? 'unexpected 404' : '')
      },
      {
        name: 'OPTIONS /api/categories (CORS preflight)',
        request: {
          method: 'OPTIONS',
          path: '/api/categories',
          headers: {
            Origin: CORS_TEST_ORIGIN,
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'content-type,authorization'
          }
        },
        validate: (result) => {
          if (result.status === 404) return 'unexpected 404';
          const allowOrigin = result.headers['access-control-allow-origin'];
          if (!allowOrigin) return 'missing access-control-allow-origin';
          if (allowOrigin !== '*' && allowOrigin !== CORS_TEST_ORIGIN) {
            return `unexpected access-control-allow-origin=${allowOrigin}`;
          }
          return '';
        }
      }
    ];

    let failures = 0;

    for (const probe of probes) {
      // eslint-disable-next-line no-await-in-loop
      const result = await httpRequest(probe.request);
      if (!result.ok) {
        failures += 1;
        console.error(buildFailureMessage(probe, result));
        continue;
      }

      if (result.status === 429) {
        failures += 1;
        console.error(buildFailureMessage(probe, result, 'unexpected 429 rate-limit'));
        continue;
      }

      const validationIssue = probe.validate(result);
      if (validationIssue) {
        failures += 1;
        console.error(buildFailureMessage(probe, result, validationIssue));
      } else {
        console.log(`[PASS] ${probe.name}: status ${result.status}`);
      }
    }

    if (failures > 0) {
      throw new Error(`runtime contract probe failed with ${failures} issue(s)`);
    }

    console.log('Runtime contract probe passed.');
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
