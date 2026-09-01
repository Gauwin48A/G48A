/**
 * rateLimiter.fixes.test.js
 *
 * Tests for the rate limiter fixes:
 * 1. suspiciousActivityTracker is synchronous (calls next() directly)
 * 2. suspiciousActivityTracker never throws/rejects
 * 3. In-memory tracking still works correctly
 * 4. Redis failures don't crash the request pipeline
 */

const express = require('express');
const request = require('supertest');

// Mock redisSession to control Redis availability
jest.mock('../src/config/redisSession', () => ({
  incr: jest.fn(async () => 1),
  expire: jest.fn(async () => 'OK'),
  get: jest.fn(async () => null),
  del: jest.fn(async () => 1),
  isRedisAvailable: jest.fn(() => false),
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const redisSession = require('../src/config/redisSession');
const { suspiciousActivityTracker } = require('../src/middleware/rateLimiter');

describe('suspiciousActivityTracker — synchronous behavior', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use(suspiciousActivityTracker);
    app.get('/test', (req, res) => {
      res.json({ success: true });
    });
  });

  it('calls next() synchronously (does not return a promise)', () => {
    const req = {
      ip: '127.0.0.1',
      connection: { remoteAddress: '127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
      path: '/test',
    };
    const res = {};
    let nextCalled = false;
    const next = () => { nextCalled = true; };

    suspiciousActivityTracker(req, res, next);

    // The critical test: next() must be called SYNCHRONOUSLY
    // If it were async, nextCalled would still be false at this point
    expect(nextCalled).toBe(true);
  });

  it('always calls next() even when Redis throws', async () => {
    redisSession.isRedisAvailable.mockReturnValue(true);
    redisSession.incr.mockRejectedValue(new Error('Redis connection lost'));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('always calls next() even when Redis expire throws', async () => {
    redisSession.isRedisAvailable.mockReturnValue(true);
    redisSession.incr.mockResolvedValue(1);
    redisSession.expire.mockRejectedValue(new Error('expire failed'));

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
  });

  it('processes multiple requests without crashing', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });

  it('tracks requests in-memory when Redis is unavailable', async () => {
    redisSession.isRedisAvailable.mockReturnValue(false);

    // Make several requests from the same IP
    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }

    // Redis should not have been called
    expect(redisSession.incr).not.toHaveBeenCalled();
  });

  it('does not block requests when Redis tracking fails', async () => {
    redisSession.isRedisAvailable.mockReturnValue(true);
    redisSession.incr.mockRejectedValue(new Error('Redis down'));

    // Should still process the request
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('rateLimiter exports', () => {
  it('exports all required rate limiters', () => {
    const rateLimiter = require('../src/middleware/rateLimiter');
    expect(rateLimiter.apiLimiter).toBeDefined();
    expect(rateLimiter.authLimiter).toBeDefined();
    expect(rateLimiter.signupLimiter).toBeDefined();
    expect(rateLimiter.postLimiter).toBeDefined();
    expect(rateLimiter.searchSlowDown).toBeDefined();
    expect(rateLimiter.publicReadSlowDown).toBeDefined();
    expect(rateLimiter.loginSlowDown).toBeDefined();
    expect(rateLimiter.suspiciousActivityTracker).toBeDefined();
  });

  it('suspiciousActivityTracker is a function (middleware)', () => {
    const { suspiciousActivityTracker } = require('../src/middleware/rateLimiter');
    expect(typeof suspiciousActivityTracker).toBe('function');
  });
});
