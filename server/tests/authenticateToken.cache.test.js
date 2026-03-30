const express = require('express');
const request = require('supertest');

function buildProtectedApp({ cacheTtlMs = '5000' } = {}) {
  jest.resetModules();
  process.env.AUTH_TOKEN_CACHE_TTL_MS = cacheTtlMs;
  process.env.AUTH_TOKEN_CACHE_MAX = '100';

  const verifyMock = jest.fn(() => ({
    id: 123,
    role: 'user',
    exp: Math.floor(Date.now() / 1000) + 60
  }));

  jest.doMock('jsonwebtoken', () => ({
    verify: verifyMock
  }));

  // Require after mock/env so middleware picks up the intended configuration.
  // eslint-disable-next-line global-require
  const { authenticateToken } = require('../src/middleware/security');

  const app = express();
  app.get('/protected', authenticateToken, (req, res) => {
    res.status(200).json({ id: req.user.id, role: req.user.role });
  });

  return { app, verifyMock };
}

describe('authenticateToken cache behavior', () => {
  afterEach(() => {
    jest.dontMock('jsonwebtoken');
    delete process.env.AUTH_TOKEN_CACHE_TTL_MS;
    delete process.env.AUTH_TOKEN_CACHE_MAX;
  });

  it('reuses verified token payload within cache ttl', async () => {
    const { app, verifyMock } = buildProtectedApp({ cacheTtlMs: '5000' });

    const first = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer cached-token');
    const second = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer cached-token');

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(verifyMock).toHaveBeenCalledTimes(1);
  });

  it('disables cache when ttl is zero', async () => {
    const { app, verifyMock } = buildProtectedApp({ cacheTtlMs: '0' });

    const first = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer uncached-token');
    const second = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer uncached-token');

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(verifyMock).toHaveBeenCalledTimes(2);
  });
});
