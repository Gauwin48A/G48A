function createResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function loadControllerWithMocks(queryImpl) {
  jest.resetModules();

  const query = jest.fn(queryImpl);
  const redisCache = {
    get: jest.fn(async () => null),
    set: jest.fn(async () => true),
    recordHit: jest.fn(),
    recordMiss: jest.fn(),
    getStats: jest.fn(() => ({ isRedisAvailable: false, hitRate: '0%' })),
    healthCheck: jest.fn(async () => ({ ok: true })),
    isRedisAvailable: jest.fn(() => false)
  };
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/config/redisCache', () => redisCache);
  jest.doMock('../src/utils/logger', () => logger);

  const controller = require('../src/controllers/postGuaranteedReachController');
  return { controller, query };
}

describe('postGuaranteedReachController security behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  test('ignores unauthenticated query userId override', async () => {
    const { controller, query } = loadControllerWithMocks(async () => ({
      rows: [{ post_id: 'p1', feed_phase: 'fresh', category_name: 'General', author_name: 'Seller', author_id: 'a1', images: [] }]
    }));

    const req = {
      user: null,
      query: { userId: 'victim-user', limit: '20' }
    };
    const res = createResponse();

    await controller.getGuaranteedReachPosts(req, res);

    const queryArg = query.mock.calls[0][0];
    expect(queryArg.values[0]).toBe(null);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
  });

  test('ignores cross-user query override and uses authenticated user', async () => {
    const { controller, query } = loadControllerWithMocks(async () => ({
      rows: [{ post_id: 'p2', feed_phase: 'fresh', category_name: 'General', author_name: 'Seller', author_id: 'a1', images: [] }]
    }));

    const req = {
      user: { userId: 'user-1' },
      query: { userId: 'user-2', limit: '20' }
    };
    const res = createResponse();

    await controller.getGuaranteedReachPosts(req, res);

    const queryArg = query.mock.calls[0][0];
    expect(queryArg.values[0]).toBe('user-1');
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalled();
  });
});
