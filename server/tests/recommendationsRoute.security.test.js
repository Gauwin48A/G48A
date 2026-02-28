jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../src/middleware/auth', () => ({
  optionalAuth: (req, res, next) => {
    const userId = req.headers['x-test-user-id'];
    req.user = userId ? { userId: String(userId) } : null;
    return next();
  }
}));

const express = require('express');
const request = require('supertest');
const router = require('../src/routes/recommendations');
const pool = require('../src/config/db');

describe('recommendations route security behavior', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/recommendations', router);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores unauthenticated query userId for saved preference hydration', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get('/api/recommendations?userId=victim-user');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(1);

    const dbCall = pool.query.mock.calls[0][0];
    expect(dbCall.text).toContain('FROM posts p');
    expect(dbCall.values).not.toContain('victim-user');
  });

  it('uses authenticated user context for saved preference hydration', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ location: 'Mumbai', min_price: 100, max_price: 1000, categories: ['electronics'] }]
      })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get('/api/recommendations?userId=user-1')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        values: ['user-1']
      })
    );
    expect(pool.query.mock.calls[1][0].values).toContain('user-1');
  });

  it('ignores cross-user override and sticks to authenticated user context', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ location: 'Hyderabad', min_price: 200, max_price: 2000, categories: ['mobiles'] }]
      })
      .mockResolvedValueOnce({ rows: [] });

    const response = await request(app)
      .get('/api/recommendations?userId=user-2')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][0].values).toEqual(['user-1']);
    expect(pool.query.mock.calls[1][0].values).toContain('user-1');
    expect(pool.query.mock.calls[1][0].values).not.toContain('user-2');
  });
});
