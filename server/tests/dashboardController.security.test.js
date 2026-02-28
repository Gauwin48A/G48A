function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

function loadControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(queryImpl);
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  const cacheService = {
    getOrSetWithStampedeProtection: jest.fn(async (_key, producer) => producer()),
    del: jest.fn(),
    clearPattern: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);
  jest.doMock('../src/services/cacheService', () => cacheService);

  const controller = require('../src/controllers/dashboardController');
  return { controller, query };
}

describe('dashboardController security behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    const { controller, query } = loadControllerWithQueryMock(async () => ({ rows: [] }));
    const req = { user: null, query: { userId: 'victim-user' } };
    const res = createResponseMock();

    await controller.getDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects cross-user dashboard access attempts', async () => {
    const { controller, query } = loadControllerWithQueryMock(async () => ({ rows: [] }));
    const req = {
      user: { userId: 'user-1' },
      query: { userId: 'user-2' }
    };
    const res = createResponseMock();

    await controller.getDashboard(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user dashboard' });
    expect(query).not.toHaveBeenCalled();
  });

  it('allows same-user dashboard access', async () => {
    const { controller, query } = loadControllerWithQueryMock(async ({ text, values }) => {
      if (text.includes('FROM users') && text.includes('WHERE user_id::text = $1')) {
        expect(values).toEqual(['user-1']);
        return {
          rows: [{ user_id: 'user-1', username: 'alice', email: 'a@example.com', rating: '4.2', created_at: '2026-02-20T00:00:00.000Z' }]
        };
      }

      if (text.includes('COUNT(*) FILTER (WHERE status = \'active\')')) {
        return {
          rows: [{ active_posts: '1', sold_posts: '2', total_posts: '3', total_views: '25' }]
        };
      }

      if (text.includes('SELECT post_id, title, status, created_at, price')) {
        return {
          rows: [{ post_id: 'post-1', title: 'Sample', status: 'active', created_at: '2026-02-21T00:00:00.000Z', price: '100' }]
        };
      }

      if (text.includes('ORDER BY sales_count DESC')) {
        return {
          rows: [{ user_id: 'user-1', username: 'alice', rating: '4.2', sales_count: '2' }]
        };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const req = {
      user: { id: 'user-1' },
      query: { userId: 'user-1' }
    };
    const res = createResponseMock();

    await controller.getDashboard(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({
          id: 'user-1',
          name: 'alice'
        })
      })
    );
  });
});
