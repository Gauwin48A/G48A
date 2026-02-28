function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
    clearCookie: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

function loadGdprControllerWithMocks(queryImpl, compareImpl = async () => true) {
  jest.resetModules();

  const query = jest.fn(queryImpl);
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
  const logSecurityEvent = jest.fn();

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);
  jest.doMock('../src/config/auditLogger', () => ({
    logSecurityEvent,
    EVENTS: {
      DATA_EXPORT: 'DATA_EXPORT',
      ACCOUNT_DELETED: 'ACCOUNT_DELETED'
    }
  }));
  jest.doMock(
    'bcryptjs',
    () => ({
      compare: jest.fn(compareImpl)
    }),
    { virtual: true }
  );

  const controller = require('../src/controllers/gdprController');
  return { controller, query, logSecurityEvent };
}

describe('gdprController regression behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('exportUserData accepts req.user.user_id when id is absent', async () => {
    const { controller, query, logSecurityEvent } = loadGdprControllerWithMocks(async ({ text }) => {
      if (text.includes('FROM users WHERE user_id = $1')) return { rows: [{ user_id: 'u-legacy' }] };
      return { rows: [] };
    });

    const req = {
      user: { user_id: 'u-legacy' },
      ip: '127.0.0.1',
      get: jest.fn(() => 'jest-agent')
    };
    const res = createResponseMock();

    await controller.exportUserData(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
    expect(query).toHaveBeenCalled();
    for (const call of query.mock.calls) {
      const values = call[0].values || [];
      if (values.length > 0) {
        expect(values[0]).toBe('u-legacy');
      }
    }
    expect(logSecurityEvent).toHaveBeenCalled();
  });

  it('deleteUserData accepts req.user.user_id when id is absent', async () => {
    const { controller, query, logSecurityEvent } = loadGdprControllerWithMocks(async ({ text }) => {
      if (text.includes('SELECT password_hash FROM users')) {
        return { rows: [{ password_hash: 'hash' }] };
      }
      return { rows: [] };
    });

    const req = {
      user: { user_id: 'u-legacy' },
      body: {
        password: 'secret',
        confirmation: 'DELETE MY ACCOUNT'
      },
      ip: '127.0.0.1'
    };
    const res = createResponseMock();

    await controller.deleteUserData(req, res);

    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Your account and all associated data have been permanently deleted.'
    });
    const deleteUsersCall = query.mock.calls.find((call) =>
      call[0].text.includes('DELETE FROM users WHERE user_id = $1')
    );
    expect(deleteUsersCall[0].values[0]).toBe('u-legacy');
    expect(logSecurityEvent).toHaveBeenCalled();
  });
});
