const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const TWO_FACTOR_FALLBACK_TABLE = 'user_two_factor_settings';
const REQUIRED_TABLE_COLUMNS = Object.freeze({
  users: ['user_id', 'username', 'email', 'password_hash', 'role', 'created_at'],
  profiles: ['user_id', 'full_name', 'phone', 'address', 'avatar_url', 'bio', 'verified', 'created_at'],
  preferences: ['user_id', 'location', 'min_price', 'max_price', 'categories', 'created_at'],
  channels: ['channel_id', 'owner_id', 'name', 'description', 'created_at'],
  posts: ['post_id', 'user_id', 'category_id', 'title', 'description', 'price', 'status', 'created_at']
});
const REQUIRED_TWO_FACTOR_COLUMN_VARIANTS = Object.freeze({
  modern: ['two_fa_enabled', 'two_fa_secret', 'two_fa_backup_codes'],
  legacy: ['two_factor_enabled', 'two_factor_secret', 'backup_codes']
});
const REQUIRED_TWO_FACTOR_FALLBACK_COLUMNS = ['user_id', 'enabled', 'secret', 'backup_codes', 'created_at', 'updated_at'];

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

let tierColumnsReady = false;
let tierColumnsPromise = null;

function buildMissingList(required, availableSet) {
  return required.filter((columnName) => !availableSet.has(columnName));
}

async function getTableColumnSet(tableName) {
  const result = await runQuery(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
    `,
    [tableName]
  );
  return new Set((result.rows || []).map((row) => String(row.column_name)));
}

async function ensureTwoFactorFallbackTable() {
  await runQuery(
    `
      CREATE TABLE IF NOT EXISTS ${TWO_FACTOR_FALLBACK_TABLE} (
        user_id text PRIMARY KEY,
        enabled boolean NOT NULL DEFAULT false,
        secret text,
        backup_codes jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `
  );
}

async function ensureUsersTwoFactorColumns() {
  try {
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT false`);
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_secret TEXT`);
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_backup_codes JSONB`);
    return true;
  } catch (error) {
    logger.warn('[SchemaGuard] Unable to auto-provision users 2FA columns', { message: error.message });
    return false;
  }
}

async function evaluateSchemaContract({
  autoCreateTwoFactorFallback = false,
  autoCreateUsersTwoFactorColumns = false
} = {}) {
  const tableChecks = {};
  const tableColumnSets = {};
  let hardFailures = 0;

  const tableCheckResults = await Promise.all(
    Object.entries(REQUIRED_TABLE_COLUMNS).map(async ([tableName, requiredColumns]) => {
      const available = await getTableColumnSet(tableName);
      const missingColumns = buildMissingList(requiredColumns, available);
      const exists = available.size > 0;

      return {
        tableName,
        requiredColumns,
        available,
        missingColumns,
        exists
      };
    })
  );

  for (const tableResult of tableCheckResults) {
    const {
      tableName,
      requiredColumns,
      available,
      missingColumns,
      exists
    } = tableResult;

    tableColumnSets[tableName] = available;
    if (!exists || missingColumns.length > 0) {
      hardFailures += 1;
    }
    tableChecks[tableName] = {
      exists,
      missingColumns,
      requiredCount: requiredColumns.length,
      availableCount: available.size
    };
  }

  let usersColumns = tableColumnSets.users || new Set();
  if (usersColumns.size === 0) {
    usersColumns = await getTableColumnSet('users');
  }
  let missingUsersTwoFactorColumnsByVariant = {};
  let supportedUsersTwoFactorVariant = null;

  const resolveUsersTwoFactorColumnsState = () => {
    const byVariant = {};
    for (const [variant, requiredColumns] of Object.entries(REQUIRED_TWO_FACTOR_COLUMN_VARIANTS)) {
      byVariant[variant] = buildMissingList(requiredColumns, usersColumns);
    }

    const supportedVariant = Object.entries(byVariant)
      .find(([, missingColumns]) => missingColumns.length === 0)?.[0] || null;

    return {
      byVariant,
      supportedVariant
    };
  };

  ({ byVariant: missingUsersTwoFactorColumnsByVariant, supportedVariant: supportedUsersTwoFactorVariant } = resolveUsersTwoFactorColumnsState());

  if (!supportedUsersTwoFactorVariant && autoCreateUsersTwoFactorColumns) {
    const autoProvisioned = await ensureUsersTwoFactorColumns();
    if (autoProvisioned) {
      usersColumns = await getTableColumnSet('users');
      ({ byVariant: missingUsersTwoFactorColumnsByVariant, supportedVariant: supportedUsersTwoFactorVariant } = resolveUsersTwoFactorColumnsState());
    }
  }

  const preferredMissingUsersTwoFactorColumns = supportedUsersTwoFactorVariant
    ? []
    : (missingUsersTwoFactorColumnsByVariant.modern || []);

  let twoFactorMode = 'users_columns';
  let twoFactorWarning = null;
  let twoFactorMissingFallbackColumns = [];
  let twoFactorUsersColumnVariant = supportedUsersTwoFactorVariant;

  if (!supportedUsersTwoFactorVariant) {
    twoFactorMode = 'fallback_table';
    twoFactorUsersColumnVariant = null;
    if (autoCreateTwoFactorFallback) {
      await ensureTwoFactorFallbackTable();
    }
    const fallbackColumns = await getTableColumnSet(TWO_FACTOR_FALLBACK_TABLE);
    twoFactorMissingFallbackColumns = buildMissingList(REQUIRED_TWO_FACTOR_FALLBACK_COLUMNS, fallbackColumns);
    if (fallbackColumns.size === 0 || twoFactorMissingFallbackColumns.length > 0) {
      hardFailures += 1;
      twoFactorMode = 'unavailable';
    } else {
      twoFactorWarning = 'users 2FA columns missing; using fallback table storage';
    }
  }

  const status = hardFailures > 0 ? 'fail' : (twoFactorWarning ? 'warn' : 'pass');
  return {
    status,
    checkedAt: new Date().toISOString(),
    tableChecks,
    twoFactor: {
      mode: twoFactorMode,
      usersColumnVariant: twoFactorUsersColumnVariant,
      missingUsersColumns: preferredMissingUsersTwoFactorColumns,
      missingUsersColumnsByVariant: missingUsersTwoFactorColumnsByVariant,
      missingFallbackColumns: twoFactorMissingFallbackColumns,
      warning: twoFactorWarning
    }
  };
}

async function ensureUserTierColumns() {
  if (tierColumnsReady) {
    return;
  }
  if (tierColumnsPromise) {
    return tierColumnsPromise;
  }

  tierColumnsPromise = (async () => {
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic'`);
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ`);
    await runQuery(`ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INT DEFAULT 1`);
    await runQuery(`
      UPDATE users
      SET tier = COALESCE(tier, 'basic'),
          post_credits = COALESCE(post_credits, 1)
      WHERE tier IS NULL OR post_credits IS NULL
    `);
    tierColumnsReady = true;
    logger.info('[SchemaGuard] User tier columns verified');
  })()
    .finally(() => {
      tierColumnsPromise = null;
    });

  return tierColumnsPromise;
}

async function ensureSchemaPreflight({
  strict = false,
  autoCreateTwoFactorFallback = true,
  autoCreateUsersTwoFactorColumns = true
} = {}) {
  const report = await evaluateSchemaContract({
    autoCreateTwoFactorFallback,
    autoCreateUsersTwoFactorColumns
  });
  if (report.status === 'fail') {
    const error = new Error('[SchemaGuard] Schema contract check failed');
    error.report = report;
    logger.error(error.message, report);
    if (strict) {
      throw error;
    }
    return report;
  }

  if (report.status === 'warn') {
    logger.warn('[SchemaGuard] Schema contract passed with warnings', report);
  } else {
    logger.info('[SchemaGuard] Schema contract verified');
  }
  return report;
}

module.exports = {
  ensureUserTierColumns,
  ensureSchemaPreflight,
  evaluateSchemaContract,
  ensureTwoFactorFallbackTable
};
