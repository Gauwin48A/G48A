/**
 * Schema Guard Service
 *
 * Validates the database schema contract at startup: checks required
 * tables/columns, auto-provisions 2FA columns, optional post columns,
 * tier columns, and a fallback 2FA table when needed.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

const TWO_FACTOR_FALLBACK_TABLE = "user_two_factor_settings";

const REQUIRED_TABLE_COLUMNS = Object.freeze({
  users: ["user_id", "username", "email", "password_hash", "role", "created_at"],
  profiles: [
    "user_id", "full_name", "phone", "address",
    "avatar_url", "bio", "verified", "created_at",
  ],
  preferences: [
    "user_id", "location", "min_price", "max_price",
    "categories", "created_at",
  ],
  channels: ["channel_id", "owner_id", "name", "description", "created_at"],
  posts: [
    "post_id", "user_id", "category_id", "title",
    "description", "price", "status", "created_at",
  ],
});

const REQUIRED_TWO_FACTOR_COLUMN_VARIANTS = Object.freeze({
  modern: ["two_fa_enabled", "two_fa_secret", "two_fa_backup_codes"],
  legacy: ["two_factor_enabled", "two_factor_secret", "backup_codes"],
});

const REQUIRED_TWO_FACTOR_FALLBACK_COLUMNS = [
  "user_id", "enabled", "secret", "backup_codes", "created_at", "updated_at",
];

/* ------------------------------------------------------------------ */
/*  Module-level state                                                */
/* ------------------------------------------------------------------ */

let tierColumnsReady = false;
let tierColumnsPromise = null;

/* ------------------------------------------------------------------ */
/*  Internal helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Return column names from `required` that are absent from `availableSet`.
 * @param {string[]} required
 * @param {Set<string>} availableSet
 * @returns {string[]}
 */
function buildMissingList(required, availableSet) {
  return required.filter((columnName) => !availableSet.has(columnName));
}

/**
 * Fetch the set of column names for a table in the public schema.
 * @param {string} tableName
 * @returns {Promise<Set<string>>}
 */
async function getTableColumnSet(tableName) {
  const result = await runQuery(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1`,
    [tableName]
  );
  return new Set((result.rows || []).map((row) => String(row.column_name)));
}

/**
 * Create the fallback two-factor settings table if it does not exist.
 */
async function ensureTwoFactorFallbackTable() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS ${TWO_FACTOR_FALLBACK_TABLE} (
      user_id text PRIMARY KEY,
      enabled boolean NOT NULL DEFAULT false,
      secret text,
      backup_codes jsonb,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Add modern 2FA columns to the users table.
 * @returns {Promise<boolean>} Whether provisioning succeeded.
 */
async function ensureUsersTwoFactorColumns() {
  try {
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT false"
    );
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_secret TEXT"
    );
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_backup_codes JSONB"
    );
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision users 2FA columns", {
      message: error.message,
    });
    return false;
  }
}

/**
 * Add optional columns (audio_url, is_flash_sale) to the posts table.
 * @returns {Promise<boolean>}
 */
async function ensurePostsOptionalColumns() {
  try {
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN NOT NULL DEFAULT false"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS brand TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS model TEXT"
    );
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision optional post columns", {
      message: error.message,
    });
    return false;
  }
}

/**
 * Add optional columns to the transactions table used by cron/sale flows.
 * @returns {Promise<boolean>}
 */
async function ensureTransactionsOptionalColumns() {
  try {
    await runQuery(
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ"
    );
    await runQuery(
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ"
    );
    return true;
  } catch (error) {
    logger.warn(
      "[SchemaGuard] Unable to auto-provision optional transaction columns",
      { message: error.message }
    );
    return false;
  }
}

/**
 * Add optional columns to offers for updated_at tracking.
 * @returns {Promise<boolean>}
 */
async function ensureOffersOptionalColumns() {
  try {
    await runQuery(
      "ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"
    );
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision offers columns", {
      message: error.message,
    });
    return false;
  }
}

/**
 * Auto-provision user_settings table for push/email notification toggles.
 * @returns {Promise<boolean>}
 */
async function ensureUserSettingsTable() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        push_enabled BOOLEAN NOT NULL DEFAULT true,
        email_enabled BOOLEAN NOT NULL DEFAULT true,
        sms_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision user_settings table", {
      message: error.message,
    });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Schema contract evaluation                                        */
/* ------------------------------------------------------------------ */

/**
 * Evaluate whether the current database schema satisfies the contract.
 * Optionally auto-creates missing 2FA structures.
 * @param {object} [options]
 * @param {boolean} [options.autoCreateTwoFactorFallback=false]
 * @param {boolean} [options.autoCreateUsersTwoFactorColumns=false]
 * @returns {Promise<object>} Schema report with status, tableChecks, twoFactor details.
 */
async function evaluateSchemaContract({
  autoCreateTwoFactorFallback = false,
  autoCreateUsersTwoFactorColumns = false,
} = {}) {
  const tableChecks = {};
  const tableColumnSets = {};
  let hardFailures = 0;

  const tableCheckResults = await Promise.all(
    Object.entries(REQUIRED_TABLE_COLUMNS).map(
      async ([tableName, requiredColumns]) => {
        const available = await getTableColumnSet(tableName);
        const missingColumns = buildMissingList(requiredColumns, available);
        const exists = available.size > 0;
        return { tableName, requiredColumns, available, missingColumns, exists };
      }
    )
  );

  for (const tableResult of tableCheckResults) {
    const { tableName, requiredColumns, available, missingColumns, exists } =
      tableResult;
    tableColumnSets[tableName] = available;

    if (!exists || missingColumns.length > 0) {
      hardFailures += 1;
    }

    tableChecks[tableName] = {
      exists,
      missingColumns,
      requiredCount: requiredColumns.length,
      availableCount: available.size,
    };
  }

  /* ---- Two-factor column resolution ---- */

  let usersColumns = tableColumnSets.users || new Set();
  if (usersColumns.size === 0) {
    usersColumns = await getTableColumnSet("users");
  }

  let missingUsersTwoFactorColumnsByVariant = {};
  let supportedUsersTwoFactorVariant = null;

  const resolveUsersTwoFactorColumnsState = () => {
    const byVariant = {};
    for (const [variant, requiredColumns] of Object.entries(
      REQUIRED_TWO_FACTOR_COLUMN_VARIANTS
    )) {
      byVariant[variant] = buildMissingList(requiredColumns, usersColumns);
    }
    const supportedVariant =
      Object.entries(byVariant).find(
        ([, missingColumns]) => missingColumns.length === 0
      )?.[0] || null;
    return { byVariant, supportedVariant };
  };

  ({
    byVariant: missingUsersTwoFactorColumnsByVariant,
    supportedVariant: supportedUsersTwoFactorVariant,
  } = resolveUsersTwoFactorColumnsState());

  if (!supportedUsersTwoFactorVariant && autoCreateUsersTwoFactorColumns) {
    const autoProvisioned = await ensureUsersTwoFactorColumns();
    if (autoProvisioned) {
      usersColumns = await getTableColumnSet("users");
      ({
        byVariant: missingUsersTwoFactorColumnsByVariant,
        supportedVariant: supportedUsersTwoFactorVariant,
      } = resolveUsersTwoFactorColumnsState());
    }
  }

  const preferredMissingUsersTwoFactorColumns =
    supportedUsersTwoFactorVariant
      ? []
      : missingUsersTwoFactorColumnsByVariant.modern || [];

  let twoFactorMode = "users_columns";
  let twoFactorWarning = null;
  let twoFactorMissingFallbackColumns = [];
  let twoFactorUsersColumnVariant = supportedUsersTwoFactorVariant;

  if (!supportedUsersTwoFactorVariant) {
    twoFactorMode = "fallback_table";
    twoFactorUsersColumnVariant = null;

    if (autoCreateTwoFactorFallback) {
      await ensureTwoFactorFallbackTable();
    }

    const fallbackColumns = await getTableColumnSet(TWO_FACTOR_FALLBACK_TABLE);
    twoFactorMissingFallbackColumns = buildMissingList(
      REQUIRED_TWO_FACTOR_FALLBACK_COLUMNS,
      fallbackColumns
    );

    if (
      fallbackColumns.size === 0 ||
      twoFactorMissingFallbackColumns.length > 0
    ) {
      hardFailures += 1;
      twoFactorMode = "unavailable";
    } else {
      twoFactorWarning =
        "users 2FA columns missing; using fallback table storage";
    }
  }

  const status =
    hardFailures > 0 ? "fail" : twoFactorWarning ? "warn" : "pass";

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
      warning: twoFactorWarning,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Tier columns                                                      */
/* ------------------------------------------------------------------ */

/**
 * Ensure tier-related columns exist on the users table and backfill defaults.
 * Memoized so the ALTER TABLE calls only run once per process.
 * @returns {Promise<void>}
 */
async function ensureUserTierColumns() {
  if (tierColumnsReady) return;
  if (tierColumnsPromise) return tierColumnsPromise;

  tierColumnsPromise = (async () => {
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic'"
    );
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ"
    );
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INT DEFAULT 1"
    );
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_plan TEXT"
    );
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id INTEGER"
    );

    await runQuery(`
      UPDATE users
      SET tier = COALESCE(tier, 'basic'),
          current_plan = COALESCE(current_plan, tier, 'basic'),
          post_credits = COALESCE(post_credits, 1)
      WHERE tier IS NULL OR post_credits IS NULL OR current_plan IS NULL
    `);

    tierColumnsReady = true;
    logger.info("[SchemaGuard] User tier columns verified");
  })().finally(() => {
    tierColumnsPromise = null;
  });

  return tierColumnsPromise;
}

/**
 * Add required users status columns for production
 */
async function ensureUsersStatusColumns() {
  try {
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'PENDING'");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'ACTIVE'");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS current_tier VARCHAR(50) DEFAULT 'BASIC'");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ");
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision users status columns", { message: error.message });
    return false;
  }
}

/**
 * Auto-provision KYC tables
 */
async function ensureKycTables() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS kyc_verifications (
        kyc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
        pan_hash TEXT,
        pan_full_name VARCHAR(100),
        pan_status VARCHAR(20),
        surepass_pan_ref_id VARCHAR(100),
        aadhaar_hash TEXT,
        aadhaar_last_four VARCHAR(4),
        surepass_aadhaar_client_id VARCHAR(100),
        encrypted_dob TEXT,
        encrypted_address TEXT,
        status VARCHAR(20) DEFAULT 'PENDING',
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_kyc_pan_hash ON kyc_verifications(pan_hash)`);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_kyc_aadhaar_hash ON kyc_verifications(aadhaar_hash)`);
    
    await runQuery(`
      CREATE TABLE IF NOT EXISTS kyc_audit_logs (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(user_id),
        action VARCHAR(50) NOT NULL,
        provider VARCHAR(50) DEFAULT 'SUREPASS',
        provider_response_code VARCHAR(20),
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision KYC tables", { message: error.message });
    return false;
  }
}

/**
 * Auto-provision subscription tables
 */
async function ensureSubscriptionTables() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        plan_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_name VARCHAR(50) NOT NULL,
        razorpay_plan_id VARCHAR(100),
        price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        duration_days INT NOT NULL,
        features JSONB,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        sub_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(user_id) ON DELETE CASCADE,
        plan_id UUID REFERENCES subscription_plans(plan_id),
        razorpay_subscription_id VARCHAR(100),
        status VARCHAR(20) NOT NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision Subscription tables", { message: error.message });
    return false;
  }
}

/**
 * Auto-provision Payment tables
 */
async function ensurePaymentTables() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT REFERENCES users(user_id),
        plan_id UUID REFERENCES subscription_plans(plan_id),
        razorpay_order_id VARCHAR(100) NOT NULL,
        razorpay_payment_id VARCHAR(100),
        razorpay_signature VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status VARCHAR(20) DEFAULT 'CREATED',
        error_code VARCHAR(50),
        error_description TEXT,
        raw_response JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await runQuery(`CREATE INDEX IF NOT EXISTS idx_payment_order_id ON payment_transactions(razorpay_order_id)`);
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision Payment tables", { message: error.message });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Preflight                                                         */
/* ------------------------------------------------------------------ */

/**
 * Run a full schema preflight check, optionally auto-provisioning missing
 * structures. In strict mode, throws on hard failures.
 * @param {object} [options]
 * @param {boolean} [options.strict=false]
 * @param {boolean} [options.autoCreateTwoFactorFallback=true]
 * @param {boolean} [options.autoCreateUsersTwoFactorColumns=true]
 * @param {boolean} [options.autoCreatePostsOptionalColumns=true]
 * @returns {Promise<object>} Schema report.
 */
async function ensureSchemaPreflight({
  strict = false,
  autoCreateTwoFactorFallback = true,
  autoCreateUsersTwoFactorColumns = true,
  autoCreatePostsOptionalColumns = true,
} = {}) {
  if (autoCreatePostsOptionalColumns) {
    await ensurePostsOptionalColumns();
  }
  await ensureTransactionsOptionalColumns();
  await ensureOffersOptionalColumns();
  await ensureUserSettingsTable();
  await ensureUsersStatusColumns();
  await ensureKycTables();
  await ensureSubscriptionTables();
  await ensurePaymentTables();

  const report = await evaluateSchemaContract({
    autoCreateTwoFactorFallback,
    autoCreateUsersTwoFactorColumns,
  });

  if (report.status === "fail") {
    const error = new Error("[SchemaGuard] Schema contract check failed");
    error.report = report;
    logger.error(error.message, report);
    if (strict) throw error;
    return report;
  }

  if (report.status === "warn") {
    logger.warn("[SchemaGuard] Schema contract passed with warnings", report);
  } else {
    logger.info("[SchemaGuard] Schema contract verified");
  }

  return report;
}

/* ------------------------------------------------------------------ */
/*  Exports                                                           */
/* ------------------------------------------------------------------ */

module.exports = {
  ensureUserTierColumns,
  ensureSchemaPreflight,
  evaluateSchemaContract,
  ensureTwoFactorFallbackTable,
  ensurePostsOptionalColumns,
  ensureTransactionsOptionalColumns,
  ensureOffersOptionalColumns,
  ensureUserSettingsTable,
  ensureUsersStatusColumns,
  ensureKycTables,
  ensureSubscriptionTables,
  ensurePaymentTables,
};
