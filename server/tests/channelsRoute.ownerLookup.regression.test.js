function loadChannelsRouterWithQueryMock(queryImpl, authUser = { userId: 'viewer-1' }) {
  jest.resetModules();

  const query = jest.fn(async (queryConfig) => queryImpl(queryConfig));
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);
  jest.doMock('../src/middleware/auth', () => ({
    protect: (req, _res, next) => {
      req.user = authUser;
      return next();
    }
  }));
  jest.doMock('../src/services/ChannelService', () => ({
    listUserChannels: jest.fn(async () => []),
    createChannel: jest.fn(async () => ({})),
    listChannels: jest.fn(async () => []),
    listFollowedChannels: jest.fn(async () => []),
    followChannel: jest.fn(async () => ({})),
    unfollowChannel: jest.fn(async () => ({})),
    editChannel: jest.fn(async () => ({})),
    getChannel: jest.fn(async () => null),
    getPosts: jest.fn(async () => []),
    createPost: jest.fn(async () => ({}))
  }));

  const router = require('../src/routes/channels');
  return { router, query, logger };
}

function createExpressApp(router) {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/api/channels', router);
  return app;
}

describe('channels owner lookup regression behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with null channel payload when owner has no channel', async () => {
    const { router, query } = loadChannelsRouterWithQueryMock(async ({ text, values }) => {
      const sql = String(text || '');

      if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
        return { rows: [{ available: false }] };
      }

      if (
        sql.includes('SELECT user_id::text AS user_id')
        && sql.includes('FROM users')
        && sql.includes('WHERE user_id::text = $1')
      ) {
        return { rows: [{ user_id: String(values?.[0] || '') }] };
      }

      if (sql.includes('FROM channels c') && sql.includes('WHERE c.owner_id::text = $1')) {
        expect(values).toEqual(['260', 'viewer-1']);
        return { rows: [] };
      }

      throw new Error(`Unexpected query in owner lookup test: ${sql}`);
    });

    const request = require('supertest');
    const app = createExpressApp(router);

    const response = await request(app).get('/api/channels/owner/260');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      channel: null,
      posts: []
    });
    expect(query).toHaveBeenCalled();
  });

  it('resolves legacy user id to canonical user_id before owner channel lookup', async () => {
    const canonicalOwnerId = '11111111-1111-4111-8111-111111111111';
    const canonicalViewerId = '22222222-2222-4222-8222-222222222222';

    const { router, query } = loadChannelsRouterWithQueryMock(
      async ({ text, values }) => {
        const sql = String(text || '');

        if (sql.includes("table_name = 'users'") && sql.includes("column_name = 'id'")) {
          return { rows: [{ available: true }] };
        }

        if (
          sql.includes('SELECT user_id::text AS user_id')
          && sql.includes('FROM users')
          && sql.includes('OR id::text = $1')
        ) {
          if (values?.[0] === '260') {
            return { rows: [{ user_id: canonicalOwnerId }] };
          }
          if (values?.[0] === 'legacy-viewer-id') {
            return { rows: [{ user_id: canonicalViewerId }] };
          }
        }

        if (sql.includes('FROM channels c') && sql.includes('WHERE c.owner_id::text = $1')) {
          expect(values).toEqual([canonicalOwnerId, canonicalViewerId]);
          return { rows: [] };
        }

        throw new Error(`Unexpected query in canonicalization test: ${sql}`);
      },
      { id: 'legacy-viewer-id' }
    );

    const request = require('supertest');
    const app = createExpressApp(router);
    const response = await request(app).get('/api/channels/owner/260');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      channel: null,
      posts: []
    });
    expect(query).toHaveBeenCalled();
  });
});
