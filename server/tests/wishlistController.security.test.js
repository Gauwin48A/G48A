jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const pool = require('../src/config/db');
const controller = require('../src/controllers/wishlistController');

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('wishlistController security guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated wishlist read even with query userId', async () => {
    const req = { user: null, query: { userId: 'victim-user', limit: '10' }, body: {} };
    const res = createRes();

    await controller.getWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects cross-user wishlist read for authenticated user', async () => {
    const req = { user: { userId: 'user-1' }, query: { userId: 'user-2' }, body: {} };
    const res = createRes();

    await controller.getWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user wishlist' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects cross-user addToWishlist body override', async () => {
    const req = {
      user: { user_id: 'user-1' },
      query: {},
      body: { userId: 'user-2', postId: 'post-1' }
    };
    const res = createRes();

    await controller.addToWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user wishlist' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('uses authenticated user id when same-id override is provided', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // existing check
      .mockResolvedValueOnce({ rows: [{ wishlist_id: 'w1', user_id: 'user-1', post_id: 'post-1' }] }); // insert

    const req = {
      user: { id: 'user-1' },
      query: {},
      body: { userId: 'user-1', postId: 'post-1', notes: 'keep' }
    };
    const res = createRes();

    await controller.addToWishlist(req, res);

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][0].values[0]).toBe('user-1');
    expect(pool.query.mock.calls[1][0].values[0]).toBe('user-1');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects cross-user removeFromWishlist query override', async () => {
    const req = {
      user: { userId: 'user-1' },
      query: { userId: 'user-2' },
      body: {},
      params: { postId: 'post-1' }
    };
    const res = createRes();

    await controller.removeFromWishlist(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user wishlist' });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
