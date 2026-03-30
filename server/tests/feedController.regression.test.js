jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/services/cacheService', () => ({
  get: jest.fn(() => undefined),
  getOrSetWithStampedeProtection: jest.fn(async (_key, fetcher) => fetcher())
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

describe('feedController regression coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getFeed caps limit and calculates offset safely', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ post_id: 'p1' }] });
    const req = { query: { page: '3', limit: '999' } };
    const res = createResponse();

    await feedController.getFeed(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values.slice(-2)).toEqual([100, 50]);
    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith([{ post_id: 'p1' }]);
  });

  test('getFeed falls back to defaults for invalid page/limit values', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ post_id: 'p2' }] });
    const req = { query: { page: '-1', limit: 'not-a-number' } };
    const res = createResponse();

    await feedController.getFeed(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values.slice(-2)).toEqual([0, 10]);
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  test('getDynamicFeed caps limit at max and forwards bounded value to DB query', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ post_id: 'p3', feed_phase: 'fresh' }]
    });

    const req = {
      user: { id: 'user-1' },
      query: { limit: '1000' }
    };
    const res = createResponse();

    await feedController.getDynamicFeed(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values[0]).toBe('user-1');
    expect(queryArg.values[1]).toBe(50);
    expect(res.json).toHaveBeenCalled();
  });

  test('getMyFeed accepts req.user.user_id when id is absent', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ post_id: 'p4' }] });
    const req = {
      user: { user_id: 'user-2' },
      query: {}
    };
    const res = createResponse();

    await feedController.getMyFeed(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values[0]).toBe('user-2');
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith([{ post_id: 'p4' }]);
  });

  test('getDynamicFeed accepts req.user.user_id when id is absent', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ post_id: 'p5', feed_phase: 'fresh' }]
    });

    const req = {
      user: { user_id: 'user-legacy-3' },
      query: { limit: '20' }
    };
    const res = createResponse();

    await feedController.getDynamicFeed(req, res);

    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.values[0]).toBe('user-legacy-3');
    expect(res.json).toHaveBeenCalled();
  });

  test('trackImpression deduplicates and bounds post IDs before DB write', async () => {
    const rawPostIds = [];
    for (let i = 0; i < 220; i += 1) {
      rawPostIds.push(`post-${i}`);
    }
    rawPostIds.push('post-1');
    rawPostIds.push('  post-2  ');
    rawPostIds.push('');
    rawPostIds.push(null);

    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const req = { body: { postIds: rawPostIds } };
    const res = createResponse();

    await feedController.trackImpression(req, res);

    expect(pool.query).toHaveBeenCalledTimes(1);
    const queryArg = pool.query.mock.calls[0][0];
    expect(queryArg.text).toContain('WHERE post_id::text = ANY($1::text[])');
    expect(queryArg.values[0].length).toBe(200);
    expect(new Set(queryArg.values[0]).size).toBe(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      tracked: 200,
      dropped: rawPostIds.length - 200
    });
  });

  test('trackImpression rejects empty or invalid postIds payload', async () => {
    const req = { body: { postIds: ['', null, '   '] } };
    const res = createResponse();

    await feedController.trackImpression(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'postIds array required' });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
