jest.mock('../src/controllers/postController', () => ({
  getAllPosts: jest.fn((req, res) => res.json({ posts: [], total: 0 })),
  getUserPosts: jest.fn((req, res) => res.json({ posts: [], total: 0 })),
  getNearbyPosts: jest.fn((req, res) => res.json({ posts: [] })),
  getSimilarPosts: jest.fn((req, res) => res.json({ posts: [] })),
  getUserTrustScore: jest.fn((req, res) => res.json({ score: 0 })),
  getGuaranteedReachPosts: jest.fn((req, res) => res.json({ posts: [] })),
  getCacheStats: jest.fn((req, res) => res.json({})),
  createPost: jest.fn((req, res) => res.status(201).json({})),
  markAsSold: jest.fn((req, res) => res.json({ success: true })),
  reactivatePost: jest.fn((req, res) => res.json({ success: true })),
  getPostById: jest.fn((req, res) => res.json({}))
}));

jest.mock('../src/middleware/validators', () => ({
  validate: (req, res, next) => next(),
  postValidation: {
    nearby: (req, res, next) => next(),
    create: (req, res, next) => next()
  }
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
  },
  optionalAuth: (req, _res, next) => {
    const userId = req.headers['x-test-user-id'];
    req.user = userId ? { userId: String(userId), role: req.headers['x-test-role'] || null } : null;
    return next();
  }
}));

jest.mock('../src/middleware/upload', () => ({
  fields: () => (req, res, next) => next()
}));

jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/services/searchService', () => ({
  searchPosts: jest.fn(async () => []),
  getNearbyPosts: jest.fn(async () => [])
}));

jest.mock('../src/services/postViewBufferService', () => ({
  enqueueBatchView: jest.fn(async () => ({
    mode: 'buffered',
    queued: 0,
    skipped: 0,
    updated: 0,
    flushScheduled: false
  })),
  getQueueStats: jest.fn(() => ({ pending: 0 }))
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../src/middleware/imageOptimizer', () => (req, res, next) => next());

const express = require('express');
const request = require('supertest');
const router = require('../src/routes/posts');
const pool = require('../src/config/db');

describe('posts route security behavior', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/posts', router);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated access to /undone', async () => {
    const response = await request(app).get('/api/posts/undone');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Unauthorized');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('returns only authenticated user undone posts', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ post_id: 'p1', user_id: 'user-1', status: 'undone' }]
    });

    const response = await request(app)
      .get('/api/posts/undone')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.objectContaining({
        values: ['user-1']
      })
    );
    expect(response.body).toEqual([{ post_id: 'p1', user_id: 'user-1', status: 'undone' }]);
  });

  it('blocks non-admin cross-user requests for /undone', async () => {
    const response = await request(app)
      .get('/api/posts/undone?userId=user-2')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Not authorized to fetch other users' undone posts");
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('allows admin cross-user requests for /undone', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ post_id: 'p2', user_id: 'user-2', status: 'undone' }]
    });

    const response = await request(app)
      .get('/api/posts/undone?userId=user-2')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(pool.query).toHaveBeenCalledWith(
      expect.objectContaining({
        values: ['user-2']
      })
    );
    expect(response.body).toEqual([{ post_id: 'p2', user_id: 'user-2', status: 'undone' }]);
  });

  it('rejects non-admin /cache-stats requests', async () => {
    const response = await request(app)
      .get('/api/posts/cache-stats')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin access required');
  });

  it('allows admin /cache-stats requests', async () => {
    const response = await request(app)
      .get('/api/posts/cache-stats')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
  });

  it('rejects non-admin /batch-view/stats requests', async () => {
    const response = await request(app)
      .get('/api/posts/batch-view/stats')
      .set('x-test-user-id', 'user-1');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Admin access required');
  });

  it('allows admin /batch-view/stats requests', async () => {
    const response = await request(app)
      .get('/api/posts/batch-view/stats')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-role', 'admin');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
