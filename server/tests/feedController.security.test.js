jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/services/cacheService', () => ({
  get: jest.fn(() => undefined),
  getOrSetWithStampedeProtection: jest.fn(async (_key, producer) => producer())
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const pool = require('../src/config/db');
const feedController = require('../src/controllers/feedController');

function createResponse() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.set = jest.fn(() => res);
  return res;
}

describe('feedController security behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMyFeed ignores query userId override and uses authenticated user', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ post_id: 'p1' }] });
    const req = {
      user: { userId: 'user-1' },
      query: { userId: 'user-2' }
    };
    const res = createResponse();

    await feedController.getMyFeed(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values[0]).toBe('user-1');
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith([{ post_id: 'p1' }]);
  });

  test('getDynamicFeed ignores unauthenticated query userId override', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ post_id: 'p2', feed_phase: 'fresh' }]
    });

    const req = {
      user: null,
      query: { userId: 'victim-user', limit: '20' }
    };
    const res = createResponse();

    await feedController.getDynamicFeed(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values[0]).toBe(null);
    expect(res.json).toHaveBeenCalled();
  });

  test('getDynamicFeed ignores cross-user query override and uses authenticated user', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ post_id: 'p3', feed_phase: 'fresh' }]
    });

    const req = {
      user: { user_id: 'user-1' },
      query: { userId: 'user-2', limit: '20' }
    };
    const res = createResponse();

    await feedController.getDynamicFeed(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values[0]).toBe('user-1');
    expect(res.json).toHaveBeenCalled();
  });
});
