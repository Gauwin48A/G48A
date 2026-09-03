function loadProfileControllerWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(async (queryConfig) => queryImpl(queryConfig));
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

  const controller = require('../src/controllers/profileController');
  return { controller, query, logger, cacheService };
}

function createResponseMock() {
  const res = {
    status: jest.fn(),
    json: jest.fn()
  };
  res.status.mockReturnValue(res);
  return res;
}

describe('profileController regression behavior', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getProfile returns verification, subscription, and updated-at fields from the flat profile payload', async () => {
    const { controller } = loadProfileControllerWithQueryMock(async ({ text, values }) => {
      const sql = String(text || '');

      if (sql.includes("table_name = 'profiles'") && sql.includes("column_name = 'updated_at'")) {
        return { rows: [{ available: true }] };
      }

      if (sql.includes('FROM users u') && sql.includes('LEFT JOIN profiles p')) {
        expect(values).toEqual(['260']);
        expect(sql).toContain("NULLIF(to_jsonb(u)->>'current_plan', '') AS current_plan");
        expect(sql).toContain("AS email_verified");
        expect(sql).toContain("p.updated_at");
        return {
          rows: [
            {
              user_id: '260',
              user_name: 'Test User',
              username: 'test260',
              email: 'test@example.com',
              role: 'member',
              created_at: '2026-03-01T00:00:00.000Z',
              tier: 'silver',
              current_plan: 'silver',
              subscription_expiry: '2026-09-01T00:00:00.000Z',
              post_credits: '3',
              email_verified: true,
              phone_verified: false,
              kyc_verified: true,
              profile_id: 9,
              full_name: 'Test User',
              phone: '9876543210',
              address: 'Addr',
              avatar_url: 'https://cdn.example/avatar.png',
              bio: 'Seller bio',
              updated_at: '2026-03-10T00:00:00.000Z',
              verified: true,
            }
          ]
        };
      }

      throw new Error(`Unexpected query in profile get test: ${sql}`);
    });

    const req = {
      user: { userId: '260' },
      query: {},
    };
    const res = createResponseMock();

    await controller.getProfile(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: '260',
        full_name: 'Test User',
        email_verified: true,
        phone_verified: false,
        kyc_verified: true,
        current_plan: 'silver',
        tier: 'silver',
        post_credits: 3,
        updated_at: '2026-03-10T00:00:00.000Z',
      })
    );
  });

  it('updateProfile works when profiles.updated_at column is absent', async () => {
    const { controller } = loadProfileControllerWithQueryMock(async ({ text, values }) => {
      const sql = String(text || '');

      if (sql.includes("table_name = 'profiles'") && sql.includes("column_name = 'updated_at'")) {
        return { rows: [{ available: false }] };
      }

      if (sql.includes('INSERT INTO profiles') && sql.includes('ON CONFLICT (user_id)')) {
        expect(sql).not.toContain('updated_at');
        expect(values.slice(0, 6)).toEqual(['260', 'Test User', '9876543210', 'Addr', null, 'Bio']);
        return {
          rows: [
            {
              profile_id: 1,
              user_id: '260',
              full_name: 'Test User',
              phone: '9876543210',
              address: 'Addr',
              avatar_url: null,
              bio: 'Bio',
              verified: false,
              created_at: '2026-03-01T00:00:00.000Z'
            }
          ]
        };
      }

      throw new Error(`Unexpected query in profile update test: ${sql}`);
    });

    const req = {
      user: { userId: '260' },
      body: {
        full_name: 'Test User',
        phone: '9876543210',
        address: 'Addr',
        bio: 'Bio'
      }
    };
    const res = createResponseMock();

    await controller.updateProfile(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: '260',
        full_name: 'Test User',
        updated_at: null
      })
    );
  });

  it('updateProfile falls back when profiles.user_id has no unique constraint', async () => {
    const { controller } = loadProfileControllerWithQueryMock(async ({ text, values }) => {
      const sql = String(text || '');

      if (sql.includes("table_name = 'profiles'") && sql.includes("column_name = 'updated_at'")) {
        return { rows: [{ available: false }] };
      }

      if (sql.includes('INSERT INTO profiles') && sql.includes('ON CONFLICT (user_id)')) {
        const error = new Error('no unique or exclusion constraint matching the ON CONFLICT specification');
        error.code = '42P10';
        throw error;
      }

      if (sql.includes('UPDATE profiles') && sql.includes('WHERE user_id::text = $1')) {
        return { rows: [] };
      }

      if (sql.includes('INSERT INTO profiles') && !sql.includes('ON CONFLICT')) {
        expect(values.slice(0, 6)).toEqual(['260', 'legacy260', '9876543210', null, null, null]);
        return {
          rows: [
            {
              profile_id: 2,
              user_id: '260',
              full_name: 'legacy260',
              phone: '9876543210',
              address: null,
              avatar_url: null,
              bio: null,
              verified: false,
              created_at: '2026-03-01T00:00:00.000Z'
            }
          ]
        };
      }

      throw new Error(`Unexpected query in profile unique-constraint fallback test: ${sql}`);
    });

    const req = {
      user: { userId: '260', username: 'legacy260' },
      body: {
        phone: '9876543210'
      }
    };
    const res = createResponseMock();

    await controller.updateProfile(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: '260',
        full_name: 'legacy260',
        updated_at: null
      })
    );
  });
});
