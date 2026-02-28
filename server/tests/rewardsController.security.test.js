function loadControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(queryImpl);
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  };
  const cacheService = {
    getOrSetWithStampedeProtection: jest.fn(async (_key, producer) => producer()),
    del: jest.fn(),
    clearPattern: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);
  jest.doMock('../src/services/cacheService', () => cacheService);

  const controller = require('../src/controllers/rewardsController');
  return { controller, query, logger, cacheService };
}

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('rewardsController security behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated getRewardsByUser requests', async () => {
    const { controller, query } = loadControllerWithQueryMock(async () => ({ rows: [] }));
    const req = { user: null, query: { userId: 'victim-user' }, params: {} };
    const res = createResponseMock();

    await controller.getRewardsByUser(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects cross-user getRewardsByUser requests', async () => {
    const { controller, query } = loadControllerWithQueryMock(async () => ({ rows: [] }));
    const req = {
      user: { userId: 'user-1' },
      query: { userId: 'user-2' },
      params: {}
    };
    const res = createResponseMock();

    await controller.getRewardsByUser(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user rewards' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects cross-user getRewardLog requests', async () => {
    const { controller, query } = loadControllerWithQueryMock(async () => ({ rows: [] }));
    const req = {
      user: { id: 'user-1' },
      query: { userId: 'user-2', limit: '5' }
    };
    const res = createResponseMock();

    await controller.getRewardLog(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user rewards' });
    expect(query).not.toHaveBeenCalled();
  });

  it('allows same-user getRewardLog and returns payload', async () => {
    const { controller, query } = loadControllerWithQueryMock(async ({ text, values }) => {
      if (text.includes("table_name = 'users'") && text.includes("column_name = 'id'")) {
        return { rows: [{ available: false }] };
      }
      if (text.includes('SELECT user_id::text AS user_id') && text.includes('WHERE user_id::text = $1')) {
        expect(values).toEqual(['user-1']);
        return { rows: [{ user_id: 'user-1' }] };
      }
      if (text.includes('FROM reward_log')) {
        expect(values).toEqual(['user-1', 5]);
        return {
          rows: [{ user_id: 'user-1', action: 'bonus', points: 10, description: 'bonus', created_at: '2026-02-28T00:00:00.000Z' }]
        };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = {
      user: { user_id: 'user-1' },
      query: { userId: 'user-1', limit: '5' }
    };
    const res = createResponseMock();

    await controller.getRewardLog(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: 'user-1',
        points: 10
      })
    ]);
  });
});
