jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/config/redisSession', () => ({
  get: jest.fn(async () => null),
  set: jest.fn(async () => true),
}));

const pool = require('../src/config/db');
const {
  clearAccessTokenPolicyCaches,
  isAccessTokenInvalidByPasswordChange,
} = require('../src/services/accessTokenPolicyService');

describe('accessTokenPolicyService password-change invalidation', () => {
  beforeEach(() => {
    clearAccessTokenPolicyCaches();
    pool.query.mockReset();
  });

  test('does not invalidate token issued within tolerance window', async () => {
    const iat = 1_773_000_000; // seconds
    pool.query.mockResolvedValueOnce({
      rows: [{ password_changed_at_ms: iat * 1000 + 500 }],
    });

    const invalid = await isAccessTokenInvalidByPasswordChange({
      id: '101',
      iat,
    });

    expect(invalid).toBe(false);
  });

  test('invalidates token issued before password change beyond tolerance window', async () => {
    const iat = 1_773_000_100; // seconds
    pool.query.mockResolvedValueOnce({
      rows: [{ password_changed_at_ms: iat * 1000 + 3_000 }],
    });

    const invalid = await isAccessTokenInvalidByPasswordChange({
      id: '102',
      iat,
    });

    expect(invalid).toBe(true);
  });
});

