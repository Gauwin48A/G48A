function createResponseMock() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function loadAuthControllerWithQueryMock(queryImpl) {
  jest.resetModules();
  jest.doMock('../src/config/db', () => ({
    query: jest.fn(queryImpl),
    connect: jest.fn()
  }));
  // eslint-disable-next-line global-require
  const authController = require('../src/controllers/authController');
  // eslint-disable-next-line global-require
  const mockedPool = require('../src/config/db');
  return { authController, queryMock: mockedPool.query };
}

describe('authController.getMe', () => {
  it('returns Bronze tier when rewards table is unavailable', async () => {
    const querySteps = [
      { rows: [{ rewards_table: null }] },
      {
        rows: [
          {
            user_id: 12,
            name: 'User',
            phone_number: '9999999999',
            email: 'u@example.com',
            role: 'user',
            tier: 'Bronze'
          }
        ]
      }
    ];
    const { authController, queryMock } = loadAuthControllerWithQueryMock(() =>
      Promise.resolve(querySteps.shift() || { rows: [] })
    );

    const req = { user: { id: 12 } };
    const res = createResponseMock();
    await authController.getMe(req, res);

    expect(queryMock).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        tier: 'Bronze'
      })
    );
  });

  it('falls back to Bronze query when rewards join throws undefined_table', async () => {
    const undefinedTableError = Object.assign(new Error('relation "rewards" does not exist'), {
      code: '42P01'
    });
    const queryMockImpl = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ rewards_table: 'rewards' }] })
      .mockRejectedValueOnce(undefinedTableError)
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 22,
            name: 'Fallback User',
            phone_number: '8888888888',
            email: 'fallback@example.com',
            role: 'user',
            tier: 'Bronze'
          }
        ]
      });

    const { authController, queryMock } = loadAuthControllerWithQueryMock(queryMockImpl);
    const req = { user: { id: 22 } };
    const res = createResponseMock();
    await authController.getMe(req, res);

    expect(queryMock).toHaveBeenCalledTimes(3);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 22,
        tier: 'Bronze'
      })
    );
  });
});
