jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const pool = require('../src/config/db');
const controller = require('../src/controllers/recentlyViewedController');

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('recentlyViewedController security guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated history reads even with query userId', async () => {
    const req = { user: null, query: { userId: 'victim' }, body: {} };
    const res = createRes();

    await controller.getRecentlyViewed(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects cross-user history reads for authenticated users', async () => {
    const req = { user: { userId: 'user-1' }, query: { userId: 'user-2' }, body: {} };
    const res = createRes();

    await controller.getRecentlyViewed(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user history' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects cross-user track requests even when authenticated', async () => {
    const req = {
      user: { user_id: 'user-1' },
      body: { postId: 'post-1', userId: 'user-2', source: 'feed' },
      query: {}
    };
    const res = createRes();

    await controller.addRecentlyViewed(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user history' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('tracks view for authenticated user and ignores same-id body override', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ exists: true }] })
      .mockResolvedValueOnce({
        rows: [
          { column_name: 'id' },
          { column_name: 'user_id' },
          { column_name: 'post_id' },
          { column_name: 'view_count' },
          { column_name: 'viewed_at' },
          { column_name: 'source' }
        ]
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, user_id: 'user-1', post_id: 'post-1', view_count: 1, source: 'feed' }]
      });

    const req = {
      user: { id: 'user-1' },
      body: { postId: 'post-1', userId: 'user-1', source: 'feed' },
      query: {}
    };
    const res = createRes();

    await controller.addRecentlyViewed(req, res);

    expect(pool.query).toHaveBeenCalled();
    const userScopedCall = pool.query.mock.calls.find(
      (call) => Array.isArray(call?.[0]?.values) && call[0].values[0] === 'user-1'
    );
    expect(userScopedCall).toBeDefined();
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('rejects clearHistory when query override targets another user', async () => {
    const req = {
      user: { userId: 'user-1' },
      query: { userId: 'user-2' },
      body: {}
    };
    const res = createRes();

    await controller.clearHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user history' });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
