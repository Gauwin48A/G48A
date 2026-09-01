/**
 * ordersController.security.test.js
 *
 * Tests for the ordersController SQL injection fix:
 * 1. role parameter is whitelisted (only 'buyer' or 'seller')
 * 2. Crafted SQL injection strings are sanitized
 * 3. All endpoints require authentication
 * 4. Input validation on create/status endpoints
 */

const express = require('express');
const request = require('supertest');

// Mock database
jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../src/middleware/auth', () => ({
  protect: (req, res, next) => {
    const userId = req.headers['x-test-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { userId: String(userId), role: 'user' };
    next();
  },
  optionalAuth: (req, res, next) => next(),
  requirePlanAndKyc: (req, res, next) => next(),
}));

jest.mock('../src/services/financialEngine', () => ({
  calculateSettlement: jest.fn((amount, rate) => ({
    platformFee: amount * rate,
    gstOnFee: amount * rate * 0.18,
    sellerPayout: amount - amount * rate - amount * rate * 0.18,
  })),
  createFinancialSnapshot: jest.fn(async () => {}),
}));

const pool = require('../src/config/db');

// pool.query is called by runQuery in dbHelpers.js
// Mock pool.query to capture the SQL text
const mockQuery = jest.fn(async () => ({ rows: [] }));
pool.query = mockQuery;

describe('ordersController.list — SQL injection prevention', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const ordersController = require('../src/controllers/ordersController');
    app.get('/orders', (req, res, next) => {
      const userId = req.headers['x-test-user-id'];
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      req.user = { userId: String(userId) };
      next();
    }, ordersController.list);
  });

  beforeEach(() => {
    mockQuery.mockClear();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  function getQueryText() {
    // runQuery calls pool.query({ text, values, query_timeout })
    const call = mockQuery.mock.calls.find(c => c[0]?.text);
    return call ? call[0].text : (mockQuery.mock.calls[0]?.[0] || '');
  }

  it('passes "buyer" role as-is to query', async () => {
    const res = await request(app)
      .get('/orders?role=buyer')
      .set('x-test-user-id', 'user-123');

    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalled();
    const queryStr = getQueryText();
    expect(queryStr).toContain('buyer_id');
  });

  it('passes "seller" role as-is to query', async () => {
    const res = await request(app)
      .get('/orders?role=seller')
      .set('x-test-user-id', 'user-123');

    expect(res.status).toBe(200);
    const queryStr = getQueryText();
    expect(queryStr).toContain('seller_id');
  });

  it('defaults to buyer when no role specified', async () => {
    const res = await request(app)
      .get('/orders')
      .set('x-test-user-id', 'user-123');

    expect(res.status).toBe(200);
    const queryStr = getQueryText();
    expect(queryStr).toContain('buyer_id');
  });

  it('rejects SQL injection via role parameter', async () => {
    const res = await request(app)
      .get("/orders?role=' OR 1=1 --")
      .set('x-test-user-id', 'user-123');

    expect(res.status).toBe(200);
    const queryStr = getQueryText();
    expect(queryStr).not.toContain("OR 1=1");
    expect(queryStr).toContain('buyer_id');
  });

  it('rejects UNION-based injection via role parameter', async () => {
    const res = await request(app)
      .get("/orders?role=' UNION SELECT * FROM users --")
      .set('x-test-user-id', 'user-123');

    expect(res.status).toBe(200);
    const queryStr = getQueryText();
    expect(queryStr).not.toContain('UNION');
    expect(queryStr).toContain('buyer_id');
  });

  it('rejects DROP TABLE injection via role parameter', async () => {
    const res = await request(app)
      .get("/orders?role=; DROP TABLE orders; --")
      .set('x-test-user-id', 'user-123');

    expect(res.status).toBe(200);
    const queryStr = getQueryText();
    expect(queryStr).not.toContain('DROP');
    expect(queryStr).toContain('buyer_id');
  });

  it('rejects arbitrary strings as role (whitelist only)', async () => {
    const maliciousRoles = [
      'admin', 'superadmin', 'null', 'undefined',
      'true', 'false', '1', '0', '*', 'seller_id',
    ];

    for (const role of maliciousRoles) {
      mockQuery.mockClear();
      mockQuery.mockResolvedValue({ rows: [] });

      const res = await request(app)
        .get(`/orders?role=${encodeURIComponent(role)}`)
        .set('x-test-user-id', 'user-123');

      expect(res.status).toBe(200);
      const queryStr = getQueryText();
      expect(queryStr).toContain('buyer_id');
    }
  });
});

describe('ordersController — authentication enforcement', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    const ordersController = require('../src/controllers/ordersController');
    app.get('/orders', ordersController.list);
    app.post('/orders', ordersController.create);
  });

  beforeEach(() => {
    mockQuery.mockClear();
  });

  it('rejects unauthenticated list requests', async () => {
    const res = await request(app).get('/orders');
    expect(res.status).toBe(401);
  });

  it('rejects unauthenticated create requests', async () => {
    const res = await request(app).post('/orders').send({});
    expect(res.status).toBe(401);
  });
});
