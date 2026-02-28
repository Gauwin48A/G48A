function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

function loadReferralControllerWithQueryMock(queryImpl) {
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

function loadReferralControllerWithClientMock(clientQueryImpl) {
  jest.resetModules();

  const clientQuery = jest.fn(clientQueryImpl);
  const release = jest.fn();
  const connect = jest.fn(async () => ({ query: clientQuery, release }));
  const query = jest.fn();
  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query, connect }));
  jest.doMock('../src/utils/logger', () => logger);

  const controller = require('../src/controllers/referralController');
  return { controller, query, connect, clientQuery, release };
}

describe('referralController regression behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('getReferral accepts req.user.user_id when query userId is missing', async () => {
    const referralRow = {
      user_id: 'legacy-user',
      referral_code: 'LEG-12345',
      referred_by: null,
      referral_count: '3'
    };
    const { controller, query } = loadReferralControllerWithQueryMock(async ({ text }) => {
      if (text.includes('FROM users u WHERE u.user_id = $1')) {
        return { rows: [referralRow] };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = { query: {}, user: { user_id: 'legacy-user' } };
    const res = createResponseMock();

    await controller.getReferral(req, res);

    expect(res.status).not.toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(referralRow);
    expect(query).toHaveBeenCalledWith(
      expect.objectContaining({
        values: ['legacy-user']
      })
    );
  });

  it('createReferral accepts req.user.user_id when id is missing', async () => {
    const { controller, query } = loadReferralControllerWithQueryMock(async ({ text }) => {
      if (text.includes('SELECT username, referral_code FROM users')) {
        return { rows: [{ username: 'legacyname', referral_code: null }] };
      }
      if (text.includes('UPDATE users SET referral_code = $1 WHERE user_id = $2 AND referral_code IS NULL RETURNING referral_code')) {
        return { rows: [{ referral_code: 'LEG-ABCDE' }] };
      }
      throw new Error(`Unexpected query: ${text}`);
    });

    const req = { user: { user_id: 'legacy-user' } };
    const res = createResponseMock();

    await controller.createReferral(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Referral code generated'
      })
    );
    const userLookupCall = query.mock.calls.find((call) =>
      call[0].text.includes('SELECT username, referral_code FROM users')
    );
    expect(userLookupCall[0].values[0]).toBe('legacy-user');
  });

  it('trackReferral is idempotent when referral already applied', async () => {
    const { controller, clientQuery, release } = loadReferralControllerWithClientMock(async (queryArg) => {
      if (queryArg === 'BEGIN' || queryArg === 'ROLLBACK') {
        return {};
      }

      const { text } = queryArg;
      if (text.includes('SELECT user_id FROM users WHERE referral_code = $1')) {
        return { rows: [{ user_id: 'ref-1' }] };
      }
      if (text.includes('UPDATE users SET referred_by = $1 WHERE user_id = $2 AND referred_by IS NULL RETURNING user_id')) {
        return { rowCount: 0, rows: [] };
      }
      if (text.includes('SELECT referred_by FROM users WHERE user_id = $1 LIMIT 1')) {
        return { rows: [{ referred_by: 'ref-1' }] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const req = { body: { referralCode: 'REF-CODE', newUserId: 'new-user' } };
    const res = createResponseMock();

    await controller.trackReferral(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Referral already tracked',
      referrerId: 'ref-1'
    });
    expect(clientQuery).toHaveBeenCalledWith('BEGIN');
    expect(clientQuery).toHaveBeenCalledWith('ROLLBACK');
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('trackReferral commits once for first-time valid referral', async () => {
    const { controller, clientQuery, release } = loadReferralControllerWithClientMock(async (queryArg) => {
      if (queryArg === 'BEGIN' || queryArg === 'COMMIT') {
        return {};
      }

      const { text } = queryArg;
      if (text.includes('SELECT user_id FROM users WHERE referral_code = $1')) {
        return { rows: [{ user_id: 'ref-1' }] };
      }
      if (text.includes('UPDATE users SET referred_by = $1 WHERE user_id = $2 AND referred_by IS NULL RETURNING user_id')) {
        return { rowCount: 1, rows: [{ user_id: 'new-user' }] };
      }
      if (text.includes('INSERT INTO reward_log')) {
        return { rows: [] };
      }
      if (text.includes('INSERT INTO rewards')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query: ${text}`);
    });

    const req = { body: { referralCode: 'REF-CODE', newUserId: 'new-user' } };
    const res = createResponseMock();

    await controller.trackReferral(req, res);

    expect(res.status).not.toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Referral tracked successfully',
      referrerId: 'ref-1'
    });
    expect(clientQuery).toHaveBeenCalledWith('BEGIN');
    expect(clientQuery).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
