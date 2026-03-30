describe('tokenVerificationCache', () => {
  afterEach(() => {
    jest.dontMock('jsonwebtoken');
    delete process.env.AUTH_TOKEN_CACHE_TTL_MS;
    delete process.env.AUTH_TOKEN_CACHE_MAX;
    delete process.env.AUTH_TOKEN_CACHE_SWEEP_INTERVAL_MS;
  });

  it('caches verified payload for repeated token checks', () => {
    jest.resetModules();
    process.env.AUTH_TOKEN_CACHE_TTL_MS = '5000';
    process.env.AUTH_TOKEN_CACHE_MAX = '100';

    const verifyMock = jest.fn(() => ({
      id: 1,
      exp: Math.floor(Date.now() / 1000) + 60
    }));
    jest.doMock('jsonwebtoken', () => ({ verify: verifyMock }));

    // eslint-disable-next-line global-require
    const { verifyToken } = require('../src/services/tokenVerificationCache');

    const first = verifyToken('abc', 'secret');
    const second = verifyToken('abc', 'secret');

    expect(first).toEqual(second);
    expect(verifyMock).toHaveBeenCalledTimes(1);
  });

  it('sweeps expired cache entries and re-verifies when expired', async () => {
    jest.resetModules();
    process.env.AUTH_TOKEN_CACHE_TTL_MS = '1';
    process.env.AUTH_TOKEN_CACHE_MAX = '100';

    const verifyMock = jest.fn(() => ({
      id: 1,
      exp: Math.floor(Date.now() / 1000) + 60
    }));
    jest.doMock('jsonwebtoken', () => ({ verify: verifyMock }));

    // eslint-disable-next-line global-require
    const { verifyToken, sweepExpiredEntries } = require('../src/services/tokenVerificationCache');

    verifyToken('short-lived', 'secret');
    await new Promise((resolve) => setTimeout(resolve, 5));
    const removed = sweepExpiredEntries();
    verifyToken('short-lived', 'secret');

    expect(removed).toBeGreaterThanOrEqual(1);
    expect(verifyMock).toHaveBeenCalledTimes(2);
  });
});
