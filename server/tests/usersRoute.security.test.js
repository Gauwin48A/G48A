jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../src/controllers/userController', () => ({
  getProfile: jest.fn((req, res) => res.json({})),
  updateProfile: jest.fn((req, res) => res.json({})),
  upgradeTier: jest.fn((req, res) => res.json({})),
  getTierStatus: jest.fn((req, res) => res.json({})),
  submitKYC: jest.fn((req, res) => res.json({})),
  getKYCStatus: jest.fn((req, res) => res.json({}))
}));

jest.mock('../src/middleware/auth', () => ({
  protect: (req, res, next) => {
    const userId = req.headers['x-test-user-id'];
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.user = {
      userId: String(userId),
      role: req.headers['x-test-role'] || null
    };
    return next();
  }
}));

jest.mock('../src/middleware/upload', () => ({
  fields: () => (req, res, next) => next()
}));

jest.mock('../src/middleware/imageOptimizer', () => (req, res, next) => next());

const express = require('express');
const request = require('supertest');
const router = require('../src/routes/users');
const pool = require('../src/config/db');

describe('users route security behavior', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', router);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated /:id requests', async () => {
    const response = await request(app).get('/api/users/user-1');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects non-admin cross-user /:id requests', async () => {
    const response = await request(app)
      .get('/api/users/user-2')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Not authorized to access this user profile');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('allows self-access /:id requests', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ user_id: 'user-1', username: 'alice' }]
    });

    const response = await request(app)
      .get('/api/users/user-1')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.objectContaining({
        values: ['user-1']
      })
    );
    expect(response.body).toEqual({ user_id: 'user-1', username: 'alice' });
  });

  it('allows admin cross-user /:id requests', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ user_id: 'user-2', username: 'bob' }]
    });

    const response = await request(app)
      .get('/api/users/user-2')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.objectContaining({
        values: ['user-2']
      })
    );
    expect(response.body).toEqual({ user_id: 'user-2', username: 'bob' });
  });
});
