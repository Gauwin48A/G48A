/**
 * coverage.security.test.js
 *
 * Comprehensive tests for security.js to improve coverage:
 * - authenticateToken (valid, expired, revoked, password-changed tokens)
 * - optionalAuthenticateToken (with/without token)
 * - sanitizeInput (body, query, params sanitization)
 * - apiLimiter configuration
 */

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

// ── Mocks ────────────────────────────────────────────────
jest.mock('../src/config/jwtConfig', () => ({
  SECRET: 'test-secret-key-12345',
  ISSUER: 'zaruda-test',
  AUDIENCE: 'zaruda-client',
  ALLOWED_AUDIENCES: ['zaruda-client', 'zaruda-web'],
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../src/config/redisSession', () => ({
  get: jest.fn(async () => null),
  set: jest.fn(async () => 'OK'),
  incr: jest.fn(async () => 1),
  expire: jest.fn(async () => 'OK'),
  del: jest.fn(async () => 1),
  isRedisAvailable: jest.fn(() => false),
}));

jest.mock('../src/services/tokenVerificationCache', () => ({
  verifyToken: jest.fn((token, secret) => {
    if (token === 'valid-token') {
      return { id: 'user-1', userId: 'user-1', role: 'user' };
    }
    if (token === 'admin-token') {
      return { id: 'admin-1', userId: 'admin-1', role: 'admin' };
    }
    throw new Error('invalid token');
  }),
}));

jest.mock('../src/services/accessTokenPolicyService', () => ({
  isAccessTokenRevoked: jest.fn(async () => false),
  isAccessTokenInvalidByPasswordChange: jest.fn(async () => false),
}));

jest.mock('../src/utils/requestAuth', () => ({
  getAccessTokenFromRequest: jest.fn(() => null),
  getBearerTokenFromHeader: jest.fn((header) => {
    if (!header) return null;
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : null;
  }),
}));

jest.mock('../src/utils/authResolver', () => ({
  resolveVerifiedAuth: jest.fn((req) => {
    const auth = req.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    const token = match ? match[1] : null;
    if (!token) return null;
    if (token === 'admin-token') return { token, payload: { id: 'admin-1', userId: 'admin-1', role: 'admin' } };
    if (token === 'valid-token') return { token, payload: { id: 'user-1', userId: 'user-1', role: 'user' } };
    return null; // invalid tokens
  }),
}));

jest.mock('sanitize-html', () => (str, opts) => str.replace(/<[^>]*>/g, ''));

// Load after mocks
const { authenticateToken, optionalAuthenticateToken, sanitizeInput, apiLimiter } = require('../src/middleware/security');
const { isAccessTokenRevoked, isAccessTokenInvalidByPasswordChange } = require('../src/services/accessTokenPolicyService');

// ── Test App Builder ─────────────────────────────────────
function buildApp() {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(sanitizeInput);

  app.get('/protected', authenticateToken, (req, res) => {
    res.json({ userId: req.user?.id || req.user?.userId, role: req.user?.role });
  });

  app.get('/optional', optionalAuthenticateToken, (req, res) => {
    res.json({ authState: req.authState, hasUser: Boolean(req.user) });
  });

  app.post('/test-sanitize', (req, res) => {
    res.json({ body: req.body, query: req.query });
  });

  return app;
}

// ── Tests ────────────────────────────────────────────────
describe('security.js — authenticateToken', () => {
  let app;
  beforeEach(() => { jest.clearAllMocks(); });
  beforeAll(() => { app = buildApp(); });

  it('allows valid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-1');
  });

  it('allows admin token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  it('rejects missing token', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('rejects invalid token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
  });

  it('rejects revoked token', async () => {
    isAccessTokenRevoked.mockResolvedValueOnce(true);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('revoked');
  });

  it('rejects token invalidated by password change', async () => {
    isAccessTokenInvalidByPasswordChange.mockResolvedValueOnce(true);

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('password change');
  });

  it('rejects token when policy check throws', async () => {
    isAccessTokenRevoked.mockRejectedValueOnce(new Error('Redis down'));

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(500);
  });
});

describe('security.js — optionalAuthenticateToken', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  it('sets anonymous state when no token', async () => {
    const res = await request(app).get('/optional');
    expect(res.status).toBe(200);
    expect(res.body.authState).toBe('anonymous');
    expect(res.body.hasUser).toBe(false);
  });

  it('sets authenticated state with valid token', async () => {
    const res = await request(app)
      .get('/optional')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.authState).toBe('authenticated');
    expect(res.body.hasUser).toBe(true);
  });

  it('sets invalid_token state with bad token', async () => {
    const res = await request(app)
      .get('/optional')
      .set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(200);
    expect(res.body.authState).toBe('invalid_token');
    expect(res.body.hasUser).toBe(false);
  });
});

describe('security.js — sanitizeInput', () => {
  let app;
  beforeAll(() => { app = buildApp(); });

  it('sanitizes NoSQL operators in body', async () => {
    const res = await request(app)
      .post('/test-sanitize')
      .send({ user: { $gt: 'admin', name: 'safe' } });

    expect(res.status).toBe(200);
    expect(res.body.body.user.$gt).toBeUndefined();
    expect(res.body.body.user.name).toBe('safe');
  });

  it('sanitizes __proto__ in body', async () => {
    const res = await request(app)
      .post('/test-sanitize')
      .send({ safe: 'ok', __proto__: { polluted: true } });

    expect(res.status).toBe(200);
    expect(res.body.body.safe).toBe('ok');
  });

  it('sanitizes XSS patterns in strings', async () => {
    const res = await request(app)
      .post('/test-sanitize')
      .send({ field: 'javascript:alert(1)' });

    expect(res.status).toBe(200);
    expect(res.body.body.field).toBe('');
  });

  it('handles empty body', async () => {
    const res = await request(app)
      .post('/test-sanitize')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({});
  });
});

describe('security.js — apiLimiter configuration', () => {
  it('apiLimiter is defined and is a function (middleware)', () => {
    expect(typeof apiLimiter).toBe('function');
  });
});
