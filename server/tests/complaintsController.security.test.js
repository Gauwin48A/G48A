function loadControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(queryImpl);
  const logger = {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);

  const controller = require('../src/controllers/complaintsController');
  return { controller, query };
}

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('complaintsController security behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('rejects non-admin complaint listing requests', async () => {
    const { controller, query } = loadControllerWithQueryMock(async () => ({ rows: [] }));
    const req = {
      user: { userId: 'user-1', role: 'user' },
      query: {}
    };
    const res = createResponseMock();

    await controller.getComplaints(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin or moderator access required' });
    expect(query).not.toHaveBeenCalled();
  });

  it('allows moderator complaint listing requests', async () => {
    const { controller, query } = loadControllerWithQueryMock(async ({ text }) => {
      if (text.includes("SELECT to_regclass('public.complaints')")) {
        return { rows: [{ available: true }] };
      }
      if (text.includes('ALTER TABLE complaints') || text.includes('CREATE INDEX IF NOT EXISTS idx_complaints')) {
        return { rows: [] };
      }
      if (text.includes('UPDATE complaints') && text.includes('SET sla_breached_at = NOW()')) {
        return { rows: [] };
      }
      if (text.includes('COUNT(*) OVER()::int AS total_count') && text.includes('FROM complaints c')) {
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = {
      user: { userId: 'mod-1', role: 'moderator' },
      query: { page: '1', limit: '20' }
    };
    const res = createResponseMock();

    await controller.getComplaints(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(query).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      complaints: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0
      }
    });
  });
});
