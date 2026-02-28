jest.mock('../src/config/db', () => ({
  query: jest.fn()
}));

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../src/config/tierRules', () => ({
  getTierRules: jest.fn(() => ({
    name: 'Basic',
    features: [],
    visibilityDays: 7,
    dailyLimit: 1,
    priority: 1
  })),
  getSubscriptionExpiry: jest.fn(() => null)
}));

jest.mock('../src/middleware/upload', () => ({
  getImageUrl: jest.fn(() => null)
}));

jest.mock('../src/services/schemaGuard', () => ({
  ensureUserTierColumns: jest.fn(async () => {})
}));

jest.mock('../src/services/kycAutomationService', () => ({
  processKycSubmission: jest.fn(async () => ({ decision: 'manual_review' }))
}));

const pool = require('../src/config/db');
const { ensureUserTierColumns } = require('../src/services/schemaGuard');
const userController = require('../src/controllers/userController');

function createRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('userController security guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated getProfile even when query userId is present', async () => {
    const req = { user: null, query: { userId: 'victim-user' } };
    const res = createRes();

    await userController.getProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(ensureUserTierColumns).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects cross-user getProfile attempts for authenticated user', async () => {
    const req = { user: { userId: 'user-1' }, query: { userId: 'user-2' } };
    const res = createRes();

    await userController.getProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user profile' });
    expect(ensureUserTierColumns).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('rejects cross-user getTierStatus attempts for authenticated user', async () => {
    const req = { user: { user_id: 'user-1' }, query: { userId: 'user-2' } };
    const res = createRes();

    await userController.getTierStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cannot access another user profile' });
    expect(ensureUserTierColumns).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('allows same-user getTierStatus and uses authenticated user id', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ tier: 'basic', subscription_expiry: null, post_credits: 3 }]
    });

    const req = { user: { id: 'user-1' }, query: { userId: 'user-1' } };
    const res = createRes();

    await userController.getTierStatus(req, res);

    expect(ensureUserTierColumns).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledTimes(1);
    expect(pool.query.mock.calls[0][0].values[0]).toBe('user-1');
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });
});
