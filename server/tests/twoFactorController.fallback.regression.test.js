function loadTwoFactorControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(async (queryConfig) => queryImpl(queryConfig));
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);
  jest.doMock('qrcode', () => ({
    toDataURL: jest.fn(async () => 'data:image/png;base64,qr')
  }));
  jest.doMock('speakeasy', () => ({
    generateSecret: jest.fn(() => ({
      base32: 'BASE32SECRET',
      otpauth_url: 'otpauth://mhub/test'
    })),
    totp: {
      verify: jest.fn(() => true)
    }
  }));

  const controller = require('../src/controllers/twoFactorController');
  return { controller, query, logger };
}

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('twoFactorController fallback storage regression behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('setup2FA succeeds via fallback table when users.two_fa_* columns are missing', async () => {
    const { controller } = loadTwoFactorControllerWithQueryMock(async ({ text }) => {
      const sql = String(text || '');

      if (sql.includes("table_name = 'users'") && sql.includes('two_fa_enabled')) {
        return { rows: [] };
      }

      if (sql.includes('CREATE TABLE IF NOT EXISTS user_two_factor_settings')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_two_factor_settings') && sql.includes('WHERE user_id = $1')) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO user_two_factor_settings')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query in 2FA setup fallback test: ${sql}`);
    });

    const req = { user: { userId: '260', email: 'u260@example.com' } };
    const res = createResponseMock();

    await controller.setup2FA(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        secret: 'BASE32SECRET',
        qrCode: 'data:image/png;base64,qr'
      })
    );
  });

  it('verify2FA enables via fallback table with backup codes', async () => {
    const { controller } = loadTwoFactorControllerWithQueryMock(async ({ text }) => {
      const sql = String(text || '');

      if (sql.includes("table_name = 'users'") && sql.includes('two_fa_enabled')) {
        return { rows: [] };
      }

      if (sql.includes('CREATE TABLE IF NOT EXISTS user_two_factor_settings')) {
        return { rows: [] };
      }

      if (sql.includes('FROM user_two_factor_settings') && sql.includes('WHERE user_id = $1')) {
        return {
          rows: [
            {
              enabled: false,
              secret: 'BASE32SECRET',
              backup_codes: null
            }
          ]
        };
      }

      if (sql.includes('UPDATE user_two_factor_settings') && sql.includes('SET enabled = true')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query in 2FA verify fallback test: ${sql}`);
    });

    const req = {
      user: { userId: '260' },
      body: { code: '123456' }
    };
    const res = createResponseMock();

    await controller.verify2FA(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: '2FA enabled successfully!',
        backupCodes: expect.any(Array)
      })
    );
    const payload = res.json.mock.calls[0][0];
    expect(payload.backupCodes.length).toBeGreaterThan(0);
  });

  it('setup2FA succeeds when only legacy users.two_factor_* columns are available', async () => {
    const { controller, query } = loadTwoFactorControllerWithQueryMock(async ({ text }) => {
      const sql = String(text || '');

      if (sql.includes("table_name = 'users'") && sql.includes('two_fa_enabled')) {
        return {
          rows: [
            { column_name: 'two_factor_enabled' },
            { column_name: 'two_factor_secret' },
            { column_name: 'backup_codes' }
          ]
        };
      }

      if (sql.includes('FROM users') && sql.includes('two_factor_secret AS secret')) {
        return {
          rows: [
            {
              enabled: false,
              secret: null,
              backup_codes: null
            }
          ]
        };
      }

      if (sql.includes('UPDATE users') && sql.includes('SET two_factor_secret = $1')) {
        return { rows: [] };
      }

      throw new Error(`Unexpected query in legacy users-columns test: ${sql}`);
    });

    const req = { user: { userId: '260', email: 'u260@example.com' } };
    const res = createResponseMock();

    await controller.setup2FA(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        secret: 'BASE32SECRET',
        qrCode: 'data:image/png;base64,qr'
      })
    );
    expect(query.mock.calls.some(([queryConfig]) =>
      String(queryConfig?.text || '').includes('CREATE TABLE IF NOT EXISTS user_two_factor_settings')
    )).toBe(false);
  });
});
