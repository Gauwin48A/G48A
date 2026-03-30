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
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);

  const controller = require('../src/controllers/referralController');
  return { controller, query };
}

describe('referralController security behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('rejects unauthenticated getReferral requests', async () => {
    const { controller, query } = loadControllerWithQueryMock(async () => ({ rows: [] }));
    const req = { user: null, query: { userId: 'victim-user' } };
    const res = createResponseMock();

    await controller.getReferral(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects cross-user getReferral requests for non-admin users', async () => {
    const { controller, query } = loadControllerWithQueryMock(async () => ({ rows: [] }));
    const req = {
      user: { userId: 'user-1', role: 'user' },
      query: { userId: 'user-2' }
    };
    const res = createResponseMock();

    await controller.getReferral(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user referral info' });
    expect(query).not.toHaveBeenCalled();
  });

  it('allows same-user getReferral requests', async () => {
    const referralRow = {
      user_id: 'user-1',
      referral_code: 'USR-ABCDE',
      referred_by: null,
      referral_count: '2'
    };
    const { controller, query } = loadControllerWithQueryMock(async ({ text, values }) => {
      if (text.includes('FROM users u WHERE u.user_id = $1')) {
        expect(values).toEqual(['user-1']);
        return { rows: [referralRow] };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = {
      user: { user_id: 'user-1' },
      query: { userId: 'user-1' }
    };
    const res = createResponseMock();

    await controller.getReferral(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(referralRow);
    expect(query).toHaveBeenCalled();
  });

  it('allows admin getReferral override requests', async () => {
    const referralRow = {
      user_id: 'user-2',
      referral_code: 'USR-FGHIJ',
      referred_by: 'user-1',
      referral_count: '1'
    };
    const { controller, query } = loadControllerWithQueryMock(async ({ text, values }) => {
      if (text.includes('FROM users u WHERE u.user_id = $1')) {
        expect(values).toEqual(['user-2']);
        return { rows: [referralRow] };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = {
      user: { userId: 'admin-1', role: 'admin' },
      query: { userId: 'user-2' }
    };
    const res = createResponseMock();

    await controller.getReferral(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(referralRow);
    expect(query).toHaveBeenCalled();
  });
});
