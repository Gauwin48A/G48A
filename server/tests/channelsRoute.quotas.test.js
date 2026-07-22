const express = require('express');
const request = require('supertest');

function loadChannelsRouterWithMocks(queryImpl, authUser = { userId: 'creator-1' }) {
  jest.resetModules();

  const query = jest.fn(async (queryConfig) => queryImpl(queryConfig));
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);
  jest.doMock('../src/middleware/rateLimiter', () => ({
    publicReadSlowDown: (req, res, next) => next(),
    apiSpeedLimiter: (req, res, next) => next(),
    apiLimiter: (req, res, next) => next(),
  }));
  jest.doMock('../src/middleware/auth', () => ({
    protect: (req, _res, next) => {
      req.user = authUser;
      return next();
    },
    optionalAuth: (req, _res, next) => {
      req.user = authUser;
      return next();
    }
  }));
  jest.doMock('../src/services/ChannelService', () => ({
    ensureChannelPostsTable: jest.fn(async () => true)
  }));

  const router = require('../src/routes/channels');
  return { router, query, logger };
}

function createExpressApp(router) {
  const app = express();
  app.use(express.json());
  app.use('/api/channels', router);
  return app;
}

describe('channels posting quota restrictions', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects post publishing if user is not premium', async () => {
    const { router } = loadChannelsRouterWithMocks(async ({ text, values }) => {
      const sql = String(text || '');
      if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
        return { rows: [{ available: false }] };
      }
      if (sql.includes('FROM channels')) {
        return { rows: [{ 1: 1 }] };
      }
      if (sql.includes('FROM users')) {
        return { rows: [{ tier: 'basic', is_demo: false }] };
      }
      return { rows: [] };
    }, { userId: 'basic-user' });

    const app = createExpressApp(router);
    const response = await request(app)
      .post('/api/channels/chan-1/posts')
      .send({ description: 'Text post', type: 'text' });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Active Premium Plan subscription is required');
  });

  it('allows unlimited text-only posts for premium creators', async () => {
    const { router } = loadChannelsRouterWithMocks(async ({ text, values }) => {
      const sql = String(text || '');
      if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
        return { rows: [{ available: false }] };
      }
      if (sql.includes('FROM channels')) {
        return { rows: [{ 1: 1 }] };
      }
      if (sql.includes('FROM users')) {
        return { rows: [{ tier: 'premium', is_demo: false }] };
      }
      if (sql.includes('INSERT INTO channel_posts')) {
        return { rows: [{ post_id: '1', description: values[2] }] };
      }
      return { rows: [] };
    });

    const app = createExpressApp(router);
    const response = await request(app)
      .post('/api/channels/chan-1/posts')
      .send({ description: 'Text post only', type: 'text' });

    expect(response.status).toBe(200);
    expect(response.body.description).toBe('Text post only');
  });

  it('enforces 1 image post per day quota', async () => {
    const { router } = loadChannelsRouterWithMocks(async ({ text, values }) => {
      const sql = String(text || '');
      if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
        return { rows: [{ available: false }] };
      }
      if (sql.includes('FROM channels')) {
        return { rows: [{ 1: 1 }] };
      }
      if (sql.includes('FROM users')) {
        return { rows: [{ tier: 'premium', is_demo: false }] };
      }
      if (sql.includes('SELECT COUNT(*)::int AS count') && sql.includes('image_url IS NOT NULL')) {
        return { rows: [{ count: 1 }] };
      }
      return { rows: [] };
    });

    const app = createExpressApp(router);
    const response = await request(app)
      .post('/api/channels/chan-1/posts')
      .send({ description: 'Another image', type: 'image', media_url: 'http://example.com/img.jpg' });

    expect(response.status).toBe(429);
    expect(response.body.error).toContain('Daily image post quota reached');
  });

  it('enforces 1 video post per week quota', async () => {
    const { router } = loadChannelsRouterWithMocks(async ({ text, values }) => {
      const sql = String(text || '');
      if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
        return { rows: [{ available: false }] };
      }
      if (sql.includes('FROM channels')) {
        return { rows: [{ 1: 1 }] };
      }
      if (sql.includes('FROM users')) {
        return { rows: [{ tier: 'premium', is_demo: false }] };
      }
      if (sql.includes('SELECT COUNT(*)::int AS count') && sql.includes('video_url IS NOT NULL')) {
        return { rows: [{ count: 1 }] };
      }
      return { rows: [] };
    });

    const app = createExpressApp(router);
    const response = await request(app)
      .post('/api/channels/chan-1/posts')
      .send({ description: 'Weekly video', type: 'video', media_url: 'http://example.com/vid.mp4' });

    expect(response.status).toBe(429);
    expect(response.body.error).toContain('Weekly video post quota reached');
  });
});
