function loadSchemaGuardWithQueryMock(queryImpl) {
  jest.resetModules();

  const query = jest.fn(async (queryConfig) => queryImpl(queryConfig));
  const logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };

  jest.doMock('../src/config/db', () => ({ query }));
  jest.doMock('../src/utils/logger', () => logger);

  const schemaGuard = require('../src/services/schemaGuard');
  return { schemaGuard, query, logger };
}

function makeColumns(columns) {
  return (columns || []).map((columnName) => ({ column_name: columnName }));
}

const baseColumns = {
  users: ['user_id', 'username', 'email', 'password_hash', 'role', 'created_at'],
  profiles: ['user_id', 'full_name', 'phone', 'address', 'avatar_url', 'bio', 'verified', 'created_at'],
  preferences: ['user_id', 'location', 'min_price', 'max_price', 'categories', 'created_at'],
  channels: ['channel_id', 'owner_id', 'name', 'description', 'created_at'],
  posts: ['post_id', 'user_id', 'category_id', 'title', 'description', 'price', 'status', 'created_at']
};

describe('schemaGuard contract evaluation', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns warn when users two_fa columns are absent but fallback table schema is present', async () => {
    const columnsMap = {
      ...baseColumns,
      user_two_factor_settings: ['user_id', 'enabled', 'secret', 'backup_codes', 'created_at', 'updated_at']
    };

    const { schemaGuard } = loadSchemaGuardWithQueryMock(async ({ text, values }) => {
      const sql = String(text || '');
      if (sql.includes('FROM information_schema.columns')) {
        const tableName = String(values?.[0] || '');
        return { rows: makeColumns(columnsMap[tableName] || []) };
      }
      throw new Error(`Unexpected query in warn scenario: ${sql}`);
    });

    const report = await schemaGuard.evaluateSchemaContract({ autoCreateTwoFactorFallback: false });
    expect(report.status).toBe('warn');
    expect(report.twoFactor.mode).toBe('fallback_table');
    expect(report.twoFactor.missingUsersColumns).toEqual(
      expect.arrayContaining(['two_fa_enabled', 'two_fa_secret', 'two_fa_backup_codes'])
    );
  });

  it('returns fail when required profile columns are missing', async () => {
    const columnsMap = {
      ...baseColumns,
      profiles: ['user_id', 'full_name', 'phone', 'address', 'bio', 'verified', 'created_at'],
      users: [
        ...baseColumns.users,
        'two_fa_enabled',
        'two_fa_secret',
        'two_fa_backup_codes'
      ]
    };

    const { schemaGuard } = loadSchemaGuardWithQueryMock(async ({ text, values }) => {
      const sql = String(text || '');
      if (sql.includes('FROM information_schema.columns')) {
        const tableName = String(values?.[0] || '');
        return { rows: makeColumns(columnsMap[tableName] || []) };
      }
      throw new Error(`Unexpected query in fail scenario: ${sql}`);
    });

    const report = await schemaGuard.evaluateSchemaContract({ autoCreateTwoFactorFallback: false });
    expect(report.status).toBe('fail');
    expect(report.tableChecks.profiles.missingColumns).toEqual(expect.arrayContaining(['avatar_url']));
  });

  it('returns pass when legacy users two_factor_* columns are present', async () => {
    const columnsMap = {
      ...baseColumns,
      users: [
        ...baseColumns.users,
        'two_factor_enabled',
        'two_factor_secret',
        'backup_codes'
      ]
    };

    const { schemaGuard } = loadSchemaGuardWithQueryMock(async ({ text, values }) => {
      const sql = String(text || '');
      if (sql.includes('FROM information_schema.columns')) {
        const tableName = String(values?.[0] || '');
        return { rows: makeColumns(columnsMap[tableName] || []) };
      }
      throw new Error(`Unexpected query in legacy pass scenario: ${sql}`);
    });

    const report = await schemaGuard.evaluateSchemaContract({ autoCreateTwoFactorFallback: false });
    expect(report.status).toBe('pass');
    expect(report.twoFactor.mode).toBe('users_columns');
    expect(report.twoFactor.usersColumnVariant).toBe('legacy');
    expect(report.twoFactor.warning).toBeNull();
  });
});
