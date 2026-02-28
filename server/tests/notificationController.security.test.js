jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/services/cacheService', () => ({
  clearPattern: jest.fn(),
  getOrSetWithStampedeProtection: jest.fn(async (_key, loader) => loader())
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const pool = require('../src/config/db');
const cacheService = require('../src/services/cacheService');
const controller = require('../src/controllers/notificationController');

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('notificationController security guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated reads even if query userId is provided', async () => {
    const req = { user: null, query: { userId: 'victim-user' }, body: {} };
    const res = createRes();

    await controller.getNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects attempts to access another user notification list', async () => {
    const req = {
      user: { userId: 'user-1' },
      query: { userId: 'user-2', limit: '10' },
      body: {}
    };
    const res = createRes();

    await controller.getNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user notifications' });
    expect(cacheService.getOrSetWithStampedeProtection).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('uses authenticated user id and ignores redundant same-id override', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [{ notification_id: 'n1', user_id: 'user-1', is_read: false }]
      })
      .mockResolvedValueOnce({
        rows: [{ count: 1 }]
      });

    const req = {
      user: { id: 'user-1' },
      query: { userId: 'user-1', limit: '5' },
      body: {}
    };
    const res = createRes();

    await controller.getNotifications(req, res);

    expect(pool.query).toHaveBeenCalledTimes(2);
    expect(pool.query.mock.calls[0][0].values[0]).toBe('user-1');
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('rejects cross-user markAsRead mutation', async () => {
    const req = {
      user: { user_id: 'user-1' },
      params: { notificationId: 'notif-1' },
      query: { userId: 'user-2' },
      body: {}
    };
    const res = createRes();

    await controller.markAsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user notifications' });
    expect(pool.query).not.toHaveBeenCalled();
  });
});
