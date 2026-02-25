const { spawn } = require('child_process');
const path = require('path');
const { Pool } = require('pg');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

jest.setTimeout(180000);

const SERVER_DIR = path.join(__dirname, '..');
const AUTH_ITEST_PORT = Number(process.env.AUTH_ITEST_PORT || 5055);
const BASE_URL = `http://127.0.0.1:${AUTH_ITEST_PORT}`;

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  database: process.env.DB_NAME || 'mhub_db',
  password: process.env.DB_PASSWORD || 'password',
  port: Number(process.env.DB_PORT || 5432),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let serverProcess;
let capturedStdout = '';
let capturedStderr = '';
const cookieJar = new Map();
let testUser = null;
let originalPassword = null;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSetCookies = (response) => {
  if (typeof response.headers.getSetCookie === 'function') {
    return response.headers.getSetCookie();
  }

  const headerValue = response.headers.get('set-cookie');
  if (!headerValue) return [];
  return headerValue.split(/,(?=[^;=]+=[^;]+)/g);
};

const updateCookieJar = (response) => {
  for (const rawCookie of getSetCookies(response)) {
    const cookiePair = rawCookie.split(';')[0];
    const separatorIndex = cookiePair.indexOf('=');
    if (separatorIndex <= 0) continue;

    const name = cookiePair.slice(0, separatorIndex).trim();
    const value = cookiePair.slice(separatorIndex + 1).trim();

    if (!value) {
      cookieJar.delete(name);
    } else {
      cookieJar.set(name, value);
    }
  }
};

const cookieHeader = () => {
  if (cookieJar.size === 0) return '';
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
};

const apiRequest = async (route, { method = 'GET', body, token, useCookies = true } = {}) => {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (useCookies && cookieJar.size > 0) headers.Cookie = cookieHeader();

  const response = await fetch(`${BASE_URL}${route}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  updateCookieJar(response);

  const text = await response.text();
  let json = {};
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  return { status: response.status, body: json };
};

const waitForServer = async () => {
  const maxRetries = 45;
  const retryDelayMs = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      // Retry until server is ready.
    }
    await delay(retryDelayMs);
  }

  throw new Error(
    `Server did not become healthy on ${BASE_URL}/health.\nSTDOUT:\n${capturedStdout}\nSTDERR:\n${capturedStderr}`
  );
};

const startServer = async () => {
  serverProcess = spawn(process.execPath, ['src/index.js'], {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      PORT: String(AUTH_ITEST_PORT),
      NODE_ENV: process.env.NODE_ENV || 'test',
      DISABLE_BACKGROUND_JOBS: process.env.DISABLE_BACKGROUND_JOBS || 'true',
      AUTH_EXPOSE_TEST_SECRETS: process.env.AUTH_EXPOSE_TEST_SECRETS || 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  serverProcess.stdout.on('data', (chunk) => {
    capturedStdout += chunk.toString();
  });
  serverProcess.stderr.on('data', (chunk) => {
    capturedStderr += chunk.toString();
  });

  await waitForServer();
};

const stopServer = async () => {
  if (!serverProcess || serverProcess.exitCode !== null) return;

  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };

    serverProcess.once('exit', finish);

    try {
      serverProcess.kill('SIGTERM');
    } catch {
      finish();
      return;
    }

    setTimeout(() => {
      if (serverProcess.exitCode === null) {
        try {
          serverProcess.kill('SIGKILL');
        } catch {
          // Ignore hard-kill failures.
        }
      }
    }, 1500);

    setTimeout(finish, 5000);
  });
};

describe('Auth Real Integration (Express + DB)', () => {
  beforeAll(async () => {
    await pool.query('SELECT 1');
    await startServer();
  });

  afterAll(async () => {
    try {
      if (testUser?.id) {
        await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [testUser.id]);
        await pool.query('DELETE FROM users WHERE user_id = $1', [testUser.id]);
      }
    } finally {
      await stopServer();
      await pool.end();
    }
  });

  test('signup -> login -> me (bearer and cookie) -> user_sessions persistence', async () => {
    const uniqueSuffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-9);
    const phone = `9${uniqueSuffix}`;
    const email = `auth.integration.${Date.now()}@example.com`;
    const password = 'StrongPass123!A';
    originalPassword = password;

    const signupRes = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: {
        fullName: 'Auth Integration User',
        email,
        phone,
        password
      }
    });

    expect(signupRes.status).toBe(201);
    expect(signupRes.body.success).toBe(true);
    expect(signupRes.body.token).toBeTruthy();
    expect(signupRes.body.user?.id).toBeTruthy();
    testUser = {
      id: signupRes.body.user.id,
      email,
      phone
    };

    const sessionRows = await pool.query(
      'SELECT session_id, token_hash, is_active FROM user_sessions WHERE user_id = $1',
      [testUser.id]
    );
    expect(sessionRows.rows.length).toBeGreaterThan(0);
    expect(sessionRows.rows.every((row) => row.is_active)).toBe(true);

    const refreshColumnResult = await pool.query(
      `SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'refresh_token'
      ) AS has_refresh_token`
    );
    if (refreshColumnResult.rows[0]?.has_refresh_token) {
      const refreshTokenColumn = await pool.query('SELECT refresh_token FROM users WHERE user_id = $1', [testUser.id]);
      expect(refreshTokenColumn.rows[0]?.refresh_token).toBeNull();
    }

    cookieJar.clear();
    const loginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeTruthy();

    const meByBearer = await apiRequest('/api/auth/me', {
      method: 'GET',
      token: loginRes.body.token
    });
    expect(meByBearer.status).toBe(200);
    expect(meByBearer.body.id).toBe(testUser.id);

    const meByCookie = await apiRequest('/api/auth/me', { method: 'GET' });
    expect(meByCookie.status).toBe(200);
    expect(meByCookie.body.id).toBe(testUser.id);
  });

  test('refresh -> logout -> refresh denied and sessions revoked', async () => {
    const loginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: testUser.email, password: originalPassword }
    });
    expect(loginRes.status).toBe(200);

    const refreshRes = await apiRequest('/api/auth/refresh-token', {
      method: 'POST',
      body: {}
    });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.token).toBeTruthy();

    const logoutRes = await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: {}
    });
    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toMatch(/logged out/i);

    const activeSessions = await pool.query(
      'SELECT COUNT(*)::int AS active_count FROM user_sessions WHERE user_id = $1 AND is_active = true',
      [testUser.id]
    );
    expect(activeSessions.rows[0].active_count).toBe(0);

    const refreshAfterLogout = await apiRequest('/api/auth/refresh-token', {
      method: 'POST',
      body: {}
    });
    expect([401, 403]).toContain(refreshAfterLogout.status);
  });

  test('forgot-password + reset-password (token flow) updates credentials in real DB', async () => {
    const forgotRes = await apiRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: { identifier: testUser.email }
    });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.message).toMatch(/if this account exists/i);
    expect(forgotRes.body.resetToken).toBeTruthy();
    expect(forgotRes.body.otp).toBeTruthy();

    const newPassword = 'NewStrongPass456!B';
    const resetRes = await apiRequest('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: forgotRes.body.resetToken,
        newPassword
      }
    });
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.message).toMatch(/password reset successfully/i);

    cookieJar.clear();
    const oldLoginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: testUser.email, password: originalPassword }
    });
    expect(oldLoginRes.status).toBe(401);

    const newLoginRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: testUser.email, password: newPassword }
    });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);
  });
});
