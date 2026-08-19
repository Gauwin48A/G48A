/**
 * Schema Guard Service
 *
 * Validates the database schema contract at startup: checks required
 * tables/columns, auto-provisions 2FA columns, optional post columns,
 * tier columns, and a fallback 2FA table when needed.
 */

const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const path = require("path");
const fs = require("fs");

/* ------------------------------------------------------------------ */
/*  Configuration                                                     */
/* ------------------------------------------------------------------ */

const TWO_FACTOR_FALLBACK_TABLE = "user_two_factor_settings";

/** Path to the comprehensive schema initialization SQL file */
const INIT_SQL_PATH = path.join(__dirname, "..", "database", "init.sql");

let initSqlRan = false;

const REQUIRED_TABLE_COLUMNS = Object.freeze({
  users: ["user_id", "username", "email", "password_hash", "role", "created_at"],
  profiles: [
    "user_id", "full_name", "phone", "address",
    "avatar_url", "bio", "verified", "created_at",
    "payout_upi_id", "payout_bank_details",
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

function buildMissingList(required, availableSet) {
  return required.filter((columnName) => !availableSet.has(columnName));
}

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
    // Subcategory scoping — required by For You preference filtering, the
    // subcategory_ids filter, and every subcategories JOIN. Live posts table
    // is TEXT (like category_id); subcategories.subcategory_id is UUID, so
    // queries compare via ::text casts.
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS subcategory_id TEXT"
    );

    // ── Core marketplace columns the app queries but the slim live posts
    //    table lacks (posts is NOT defined in init.sql, so CREATE TABLE IF
    //    NOT EXISTS can't help — these must be provisioned here). ──
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS tier_priority INT DEFAULT 1"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count INT DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INT DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares INT DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_from_location TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_to_location TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'product'"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS condition TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS contact_number TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS age_months INTEGER"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN NOT NULL DEFAULT false"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS ownership TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS boost_level INT DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()"
    );

    // Channel-post columns — channelController inserts into the SAME posts
    // table for channel feed posts (channel_id, content, type, media_url,
    // posted_date). Without these the channel post creation 500s.
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS channel_id TEXT");
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS content TEXT");
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS type VARCHAR(20)");
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_url TEXT");
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS posted_date TIMESTAMPTZ");
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_posts_channel ON posts(channel_id)"
    );
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision optional post columns", {
      message: error.message,
    });
    return false;
  }
}

async function ensureSubcategoriesOptionalColumns() {
  try {
    // The live subcategories table was created with a slim shape missing the
    // metadata columns queried by categoryController/subcategoryController
    // (display_order, description, icon_url, seo_slug, search_keywords,
    // featured, popularity_score). Without these, /api/subcategories/grouped
    // and /api/categories?include_subcategories=true 500 with
    // "column s.display_order does not exist".
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS description TEXT"
    );
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS icon_url VARCHAR(255)"
    );
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS seo_slug TEXT"
    );
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS search_keywords JSONB DEFAULT '[]'::jsonb"
    );
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE"
    );
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS popularity_score INT DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"
    );
    await runQuery(
      "ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"
    );
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision subcategories columns", {
      message: error.message,
    });
    return false;
  }
}

async function ensureTransactionsOptionalColumns() {
  try {
    await runQuery(
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ"
    );
    await runQuery(
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ"
    );
    // Commission/fee columns for platform revenue capture on legacy V0 sales
    await runQuery(
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gst_on_fee DECIMAL(10,2) DEFAULT 0"
    );
    await runQuery(
      "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_payout DECIMAL(10,2) DEFAULT 0"
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
 * Provision the legacy `transactions` and `offers` tables. Neither exists in
 * init.sql (only page_posts/subscription_transactions do), and schemaGuard
 * previously only ALTERed them — so on a DB where they were never created,
 * every sale/offer/review/coin endpoint 500s with "relation does not exist".
 * Columns cover every column referenced by saleController, offersController,
 * reviewsController, coinController, transactions routes and analytics.
 */
async function ensureTransactionsOffersTables() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS transactions (
        transaction_id BIGSERIAL PRIMARY KEY,
        post_id TEXT,
        seller_id TEXT,
        buyer_id TEXT,
        amount DECIMAL(12,2) DEFAULT 0,
        agreed_price DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(32) DEFAULT 'pending',
        secret_otp TEXT,
        otp_hash TEXT,
        otp_expires_at TIMESTAMPTZ,
        otp_attempts INT DEFAULT 0,
        expires_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        cancel_reason TEXT,
        cancelled_by TEXT,
        mode VARCHAR(32),
        transfer VARCHAR(32),
        user_id TEXT,
        platform_fee DECIMAL(10,2) DEFAULT 0,
        gst_on_fee DECIMAL(10,2) DEFAULT 0,
        seller_payout DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runQuery("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS from_location TEXT");
    await runQuery("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS to_location TEXT");
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_transactions_post ON transactions(post_id)"
    );
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id)"
    );
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id)"
    );

    await runQuery(`
      CREATE TABLE IF NOT EXISTS offers (
        offer_id BIGSERIAL PRIMARY KEY,
        post_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        offered_price DECIMAL(12,2) NOT NULL,
        original_price DECIMAL(12,2),
        message TEXT,
        status VARCHAR(32) DEFAULT 'pending',
        counter_price DECIMAL(12,2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_offers_post ON offers(post_id)"
    );
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_id)"
    );
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id)"
    );
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to provision transactions/offers tables", {
      message: error.message,
    });
    return false;
  }
}

async function ensureSalesTables() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        post_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','approved','shipped','received','settled','fraud','rejected')),
        payment_mode VARCHAR(10) NOT NULL DEFAULT 'IN_APP',
        reported_party TEXT,
        fraud_reason TEXT,
        admin_notified BOOLEAN DEFAULT false,
        agreed_price DECIMAL(10,2),
        platform_fee DECIMAL(10,2) DEFAULT 0,
        gst_on_fee DECIMAL(10,2) DEFAULT 0,
        seller_payout DECIMAL(10,2) DEFAULT 0,
        razorpay_hold BOOLEAN DEFAULT false,
        currency VARCHAR(3) DEFAULT 'INR',
        shipping_tracking TEXT,
        shipping_courier TEXT,
        shipping_evidence JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS from_location TEXT");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS to_location TEXT");
    await runQuery(`
      CREATE TABLE IF NOT EXISTS suspensions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        sale_id INTEGER REFERENCES sales(id),
        reason TEXT NOT NULL,
        suspended_until TIMESTAMPTZ NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        responded BOOLEAN DEFAULT false,
        response_message TEXT,
        responded_at TIMESTAMPTZ,
        permanently_locked BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runQuery(`
      CREATE TABLE IF NOT EXISTS kyc_blacklist (
        id SERIAL PRIMARY KEY,
        aadhaar_hash TEXT,
        mobile_hash TEXT,
        pan_hash TEXT,
        user_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `);
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS buyer_rating INT");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS buyer_comment TEXT");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ");

    // Commission/fee columns for platform revenue capture
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS agreed_price DECIMAL(10,2)");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(10,2) DEFAULT 0");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS gst_on_fee DECIMAL(10,2) DEFAULT 0");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS seller_payout DECIMAL(10,2) DEFAULT 0");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS razorpay_hold BOOLEAN DEFAULT false");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR'");

    // ── Sale mode (IN_APP escrow vs OUTSIDE direct transfer) + shipping meta ──
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(10) NOT NULL DEFAULT 'IN_APP'");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_tracking TEXT");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_courier TEXT");
    await runQuery("ALTER TABLE sales ADD COLUMN IF NOT EXISTS shipping_evidence JSONB DEFAULT '[]'::jsonb");

    // Extend status CHECK to allow 'shipped', 'cancelled' and 'undone' — the
    // live tables carry the older CHECK which silently breaks cancelSale,
    // undoSale and adminResolveSale(BUYER_FAVOR → 'cancelled').
    await runQuery(`
      ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_status_check;
      ALTER TABLE sales ADD CONSTRAINT sales_status_check
        CHECK (status IN ('requested','approved','shipped','received','settled','fraud','rejected','cancelled','undone'))
    `).catch((e) => logger.warn("[SchemaGuard] sales status CHECK rebuild skipped:", e.message));

    await runQuery(`
      CREATE TABLE IF NOT EXISTS ratings (
        id SERIAL PRIMARY KEY,
        target_user_id TEXT NOT NULL,
        reviewer_id TEXT NOT NULL,
        post_id TEXT,
        score INT NOT NULL CHECK (score >= 1 AND score <= 5),
        review TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(reviewer_id, post_id)
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS financial_snapshots (
        id SERIAL PRIMARY KEY,
        entity_type VARCHAR(32) NOT NULL,
        entity_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        agreed_price NUMERIC(18,2) NOT NULL,
        commission_rate NUMERIC(6,4) NOT NULL,
        platform_fee NUMERIC(18,2) NOT NULL,
        gst_rate NUMERIC(6,4) NOT NULL DEFAULT 0.18,
        gst_on_fee NUMERIC(18,2) NOT NULL,
        seller_payout NUMERIC(18,2) NOT NULL,
        subscription_plan TEXT DEFAULT 'FREE',
        subscription_id TEXT,
        calculation_version TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(entity_type, entity_id)
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS api_idempotency_keys (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        response_body JSONB NOT NULL,
        status_code INT NOT NULL DEFAULT 200,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, endpoint, idempotency_key)
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS payout_records (
        payout_id SERIAL PRIMARY KEY,
        reference_id TEXT NOT NULL UNIQUE,
        seller_id TEXT NOT NULL,
        amount NUMERIC(18,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'INR',
        status VARCHAR(32) NOT NULL DEFAULT 'PAYOUT_PENDING',
        gateway_payout_id TEXT,
        gateway_reference TEXT,
        attempts INT DEFAULT 0,
        last_error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS webhook_events (
        id SERIAL PRIMARY KEY,
        gateway_event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED',
        processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS seller_balances (
        seller_id TEXT PRIMARY KEY,
        negative_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Financial Ledger (with UNIQUE constraint for DB-level idempotency) ──
    await runQuery(`
      CREATE TABLE IF NOT EXISTS financial_ledger (
        id BIGSERIAL PRIMARY KEY,
        reference_id VARCHAR(100) NOT NULL,
        order_id TEXT,
        user_id TEXT,
        event_type VARCHAR(50) NOT NULL,
        direction VARCHAR(10) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'INR',
        status VARCHAR(20) DEFAULT 'COMPLETED',
        provider VARCHAR(30) DEFAULT 'RAZORPAY',
        provider_reference VARCHAR(100),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // DB-level idempotency: prevent duplicate ledger entries for same reference + event
    // Uses a partial unique index since reference_id can be NULL for non-financial entries
    await runQuery(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_ledger_ref_event
      ON financial_ledger (reference_id, event_type)
      WHERE reference_id IS NOT NULL AND reference_id != ''
    `);

    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to create sales/suspension tables", {
      message: error.message,
    });
    return false;
  }
}

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
/*  Financial Ops tables (alerts, confirmations, payout accounts)     */
/* ------------------------------------------------------------------ */

async function ensureFinancialOpsTables() {
  try {
    // ── Financial alerts (Phase 6 item 54: alert on duplicate payout attempt,
    //    payout failure spike, gateway outage, reconciliation mismatch, stuck
    //    payout, large transaction, unusual refund activity, queue backlog) ──
    await runQuery(`
      CREATE TABLE IF NOT EXISTS financial_alerts (
        id BIGSERIAL PRIMARY KEY,
        alert_type VARCHAR(50) NOT NULL,
        severity VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
        entity_type VARCHAR(32),
        entity_id TEXT,
        user_id TEXT,
        message TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        is_resolved BOOLEAN NOT NULL DEFAULT false,
        resolved_by TEXT,
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_financial_alerts_type_created
      ON financial_alerts (alert_type, created_at)
    `);
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_financial_alerts_unresolved
      ON financial_alerts (is_resolved, created_at)
      WHERE is_resolved = false
    `);

    // ── Buyer/seller confirmation audit trail (Phase 4 item 43: record
    //    user_id, role, action, timestamp, transaction_id, previous/new state) ──
    await runQuery(`
      CREATE TABLE IF NOT EXISTS sale_confirmations (
        id BIGSERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        role VARCHAR(16) NOT NULL,
        action VARCHAR(50) NOT NULL,
        previous_state TEXT,
        new_state TEXT,
        request_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runQuery(`
      CREATE INDEX IF NOT EXISTS idx_sale_confirmations_sale
      ON sale_confirmations (sale_id, created_at)
    `);

    // ── Payout destination snapshot (Phase 4 item 28: lock payout destination
    //    at creation time so later bank/UPI changes don't affect this payout) ──
    await runQuery(
      "ALTER TABLE payout_records ADD COLUMN IF NOT EXISTS payout_account_id TEXT"
    );
    await runQuery(
      "ALTER TABLE payout_records ADD COLUMN IF NOT EXISTS gateway_fund_account_id TEXT"
    );
    await runQuery(
      "ALTER TABLE payout_records ADD COLUMN IF NOT EXISTS payout_upi_id TEXT"
    );
    await runQuery(
      "ALTER TABLE payout_records ADD COLUMN IF NOT EXISTS payout_bank_hash TEXT"
    );

    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision financial ops tables", {
      message: error.message,
    });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Rewards ledger (points, log, idempotency, streaks)                */
/* ------------------------------------------------------------------ */

async function ensureRewardsTables() {
  try {
    // rewards — rewardsLedgerService.ensureRewardsRow() INSERTs into this
    // table INSIDE the createPost/sale transactions. It was never provisioned
    // anywhere (not init.sql, not schemaGuard), so the INSERT threw, the
    // transaction aborted, and the final COMMIT silently rolled back — every
    // post creation reported success but saved nothing.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS rewards (
        user_id TEXT PRIMARY KEY,
        points INTEGER NOT NULL DEFAULT 0,
        tier VARCHAR(20) NOT NULL DEFAULT 'Bronze',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // reward_log — auto-created by rewardsLedgerService.ensureRewardLogTable()
    // but provision here too so first-time writes never race it.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS reward_log (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        action VARCHAR(80) NOT NULL,
        points INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_reward_log_user_created ON reward_log(user_id, created_at DESC)"
    );

    // reward_idempotency — ledger idempotency table (guarded, but provision).
    await runQuery(`
      CREATE TABLE IF NOT EXISTS reward_idempotency (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        idempotency_key VARCHAR(255) NOT NULL,
        action VARCHAR(80),
        points_delta INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, idempotency_key)
      )
    `);

    // user_streaks — streakRewardsService.createTableIfNeeded() runs this
    // CREATE on the shared client inside the createPost transaction; a missing
    // table on first post also aborts the transaction. Provision up-front.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        user_id TEXT PRIMARY KEY,
        visit_streak INTEGER NOT NULL DEFAULT 0,
        post_streak INTEGER NOT NULL DEFAULT 0,
        last_visit_date DATE,
        last_post_date DATE,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision rewards tables", {
      message: error.message,
    });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Translation queue (auto-translate on post create)                */
/* ------------------------------------------------------------------ */

async function ensureTranslationTables() {
  try {
    // translation_queue — postController.createPost inserts a 'pending' row
    // inside the create transaction; translationController reads/updates it.
    // It was never in init.sql or provisioned, so every post creation rolled
    // back with `relation "translation_queue" does not exist`.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS translation_queue (
        queue_id BIGSERIAL PRIMARY KEY,
        post_id TEXT NOT NULL,
        source_text TEXT,
        source_lang VARCHAR(10) DEFAULT 'en',
        target_lang VARCHAR(10) DEFAULT 'hi',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        retry_count INT NOT NULL DEFAULT 0,
        translated_text TEXT,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_translation_queue_status ON translation_queue(status, created_at)"
    );
    await runQuery(
      "CREATE INDEX IF NOT EXISTS idx_translation_queue_post ON translation_queue(post_id)"
    );

    // translations — the translation worker upserts results here.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS translations (
        id BIGSERIAL PRIMARY KEY,
        entity_type VARCHAR(32) NOT NULL,
        entity_id TEXT NOT NULL,
        language VARCHAR(10) NOT NULL,
        field VARCHAR(50) NOT NULL,
        value TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS — guard via pg_constraint.
    await runQuery(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_translation') THEN
          ALTER TABLE translations
            ADD CONSTRAINT unique_translation UNIQUE (entity_type, entity_id, language, field);
        END IF;
      END $$;
    `);

    // posts translated-title/description columns written by the worker
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS translated_title TEXT"
    );
    await runQuery(
      "ALTER TABLE posts ADD COLUMN IF NOT EXISTS translated_description TEXT"
    );
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision translation tables", {
      message: error.message,
    });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Tier columns                                                      */
/* ------------------------------------------------------------------ */

async function ensureUserTierColumns() {
  if (tierColumnsReady) return;
  if (tierColumnsPromise) return tierColumnsPromise;

  tierColumnsPromise = (async () => {
    // users.status — account lifecycle state used by accountStateService and the
    // sale/dispute freeze flows (FROZEN / LOCKED / permanently_locked / ACTIVE).
    // Older schemas lack this column; backfill it idempotently.
    await runQuery(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active'"
    );
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

async function ensureUsersStatusColumns() {
  try {
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'PENDING'");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'ACTIVE'");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS current_tier VARCHAR(50) DEFAULT 'BASIC'");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ");
    // User trust/seller columns referenced by post list & sold-posts queries
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT false");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS isaadhaarverified BOOLEAN DEFAULT false");
    // Auth/login columns referenced by authController.login & getMe
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_until TIMESTAMPTZ");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(20) DEFAULT 'en'");
    // Additional users columns referenced by salesController / suspensionCron /
    // webauthnController / routes/users.js queries
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT");
    // One-time backfill: existing users have users.full_name NULL while
    // profiles.full_name is populated — sync them so u.full_name selects work.
    await runQuery(`
      UPDATE users u
      SET full_name = p.full_name
      FROM profiles p
      WHERE p.user_id::text = u.user_id::text
        AND u.full_name IS NULL
        AND p.full_name IS NOT NULL
    `);
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision users status columns", { message: error.message });
    return false;
  }
}

async function ensureKycTables() {
  try {
    // NO FK to users(user_id) — live users.user_id is INTEGER; a TEXT FK would
    // fail with a type mismatch and silently prevent table creation.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS kyc_verifications (
        kyc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
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
        user_id TEXT NOT NULL,
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

async function ensureSubscriptionTables() {
  try {
    // subscription_plans — ensure all controller-referenced columns exist
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
    // Columns referenced by subscriptionController (older schemas may lack them)
    await runQuery("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS slug VARCHAR(50)");
    await runQuery("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS description TEXT");
    await runQuery("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS billing_period VARCHAR(20) DEFAULT 'monthly'");
    await runQuery("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS gst_rate DECIMAL(5,2) DEFAULT 18.00");
    await runQuery("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0");
    await runQuery("ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()");

    // user_subscriptions — NO FK to users(user_id): the live DB stores
    // users.user_id as INTEGER while app code references it as TEXT via ::text.
    // A TEXT FK reference would fail with a type mismatch and silently prevent
    // table creation. Integrity is enforced at the application layer instead.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        sub_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        plan_id UUID REFERENCES subscription_plans(plan_id),
        razorpay_subscription_id VARCHAR(100),
        razorpay_order_id VARCHAR(100),
        status VARCHAR(20) NOT NULL,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NOT NULL,
        auto_renew BOOLEAN DEFAULT TRUE,
        cancelled_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    // Idempotent column backfills for older schemas
    await runQuery("ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100)");
    await runQuery("ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT TRUE");
    await runQuery("ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ");

    // subscription_events — used by purchase / verify / admin override flows
    await runQuery(`
      CREATE TABLE IF NOT EXISTS subscription_events (
        event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        sub_id UUID,
        event_type VARCHAR(50) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // subscription_features + plan_feature_limits — feature entitlement resolution
    await runQuery(`
      CREATE TABLE IF NOT EXISTS subscription_features (
        feature_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        feature_code VARCHAR(50) UNIQUE NOT NULL,
        feature_name VARCHAR(100) NOT NULL,
        description TEXT,
        feature_type VARCHAR(20) DEFAULT 'boolean',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await runQuery(`
      CREATE TABLE IF NOT EXISTS plan_feature_limits (
        limit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id UUID NOT NULL,
        feature_id UUID NOT NULL,
        value TEXT DEFAULT 'false',
        overage_price DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(plan_id, feature_id)
      )
    `);

    // Trial flag for user_subscriptions — lets the trial flow enforce
    // "one free trial per user" and mark trial-activated rows.
    await runQuery(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE"
    );
    // DB-level once-only guard: at most one trial row per user ever (also
    // closes the concurrent-double-claim race window).
    await runQuery(
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sub_trial_once ON user_subscriptions(user_id) WHERE is_trial = true"
    );

    // ── Seed the 6 subscription plans (idempotent — inserts only missing slugs) ──
    // Prices/durations/features mirror the Android gatewayTiers fallback so the
    // live DB-driven Plans screen matches the hardcoded cards exactly.
    const PLAN_SEEDS = [
      {
        slug: "starter", name: "Starter Plan", billing: "monthly", sort: 1, price: 111, days: 30,
        description: "1 Month Access (30 Days) — taste Premium for less",
        features: [
          "✨ 1 Month Access (30 Days)",
          "📸 1 Photo per Post",
          "✍️ 1 Post Per Day Limit",
          "💰 100 Coins Bonus on Activation",
          "🆔 KYC Verification Included",
          "🛡️ Inclusive of GST & all fees",
        ],
      },
      {
        slug: "basic", name: "Basic", billing: "monthly", sort: 2, price: 500, days: 30,
        description: "Single post credit — pay per listing",
        features: ["📄 1 Post Credit", "⏱️ 30 Days Visibility", "📸 1 Photo per Post", "✍️ 1 Post Per Day"],
      },
      {
        slug: "bronze", name: "Bronze", billing: "quarterly", sort: 3, price: 850, days: 90,
        description: "Up to 100 posts for 3 months",
        features: ["📦 Up to 100 Posts", "⏱️ 30 Days Visibility/Post", "📸 1 Photo per Post", "✍️ 1 Post Per Day", "🏅 Seller Badge", "📊 Basic Analytics"],
      },
      {
        slug: "silver", name: "Silver", billing: "half-yearly", sort: 4, price: 1200, days: 180,
        description: "Up to 200 posts for 6 months",
        features: ["📦 Up to 200 Posts", "⏱️ 30 Days Visibility/Post", "📸 1 Photo per Post", "✍️ 1 Post Per Day", "🚀 Boosts & Featured", "✅ Verified Badge", "🔝 Priority Search", "📊 Full Analytics", "🎁 7-Day Free Trial"],
      },
      {
        slug: "gold", name: "Gold", billing: "yearly", sort: 5, price: 1500, days: 270,
        description: "Up to 500 posts for 9 months",
        features: ["📦 Up to 500 Posts", "⏱️ 30 Days Visibility/Post", "📸 1 Photo per Post", "✍️ 1 Post Per Day", "🥇 Gold Badge", "🔝 Top Search Priority", "📊 Full Analytics", "🎁 7-Day Free Trial"],
      },
      {
        slug: "premium", name: "Premium", billing: "yearly", sort: 6, price: 1800, days: 365,
        description: "Unlimited posts — full God Mode",
        features: [
          "📦 Unlimited Posts",
          "⏱️ 45 Days Visibility",
          "🔥 2 Posts Per Day",
          "🔥 10 Photos per Post",
          "🔥 5x Coin Valuation (100c = ₹5.00)",
          "👑 Crown Badge & Priority Support",
          "🚀 10 Boosts + 10 Featured + 10 Spotlights/Month",
          "🔝 Top of Feed Priority",
          "📊 Full Analytics Dashboard",
          "🎁 14-Day Free Trial",
        ],
      },
    ];

    for (const p of PLAN_SEEDS) {
      // Explicit casts avoid pg's "inconsistent types deduced for parameter"
      // error when a bound param ($1/$2) is reused across column + subquery.
      await runQuery(
        `INSERT INTO subscription_plans (plan_name, slug, description, price, currency, duration_days, features, billing_period, gst_rate, sort_order, is_active)
         SELECT $1::text, $2::text, $3::text, $4::numeric, 'INR', $5::int, $6::jsonb, $7::text, 18.00, $8::int, TRUE
         WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE slug = $2::text OR LOWER(plan_name) = LOWER($1::text))`,
        [p.name, p.slug, p.description, p.price, p.days, JSON.stringify(p.features), p.billing, p.sort]
      );
    }

    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision Subscription tables", { message: error.message });
    return false;
  }
}

async function ensurePaymentTables() {
  try {
    // NO FK to users(user_id) — live users.user_id is INTEGER while this table
    // stores TEXT user references (consistent with ::text comparisons app-wide).
    await runQuery(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        order_id UUID,
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
    await runQuery(`ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS coins_deducted INT DEFAULT 0`);
    await runQuery(`ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS order_id UUID`);
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision Payment tables", { message: error.message });
    return false;
  }
}

async function ensureCouponTables() {
  try {
    await runQuery(`
      CREATE TABLE IF NOT EXISTS influencer_coupons (
        coupon_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        influencer_name VARCHAR(100) NOT NULL,
        discount_percent DECIMAL(5, 2) DEFAULT 25.00,
        is_active BOOLEAN DEFAULT TRUE,
        use_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS coupon_redemptions (
        redemption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id UUID REFERENCES influencer_coupons(coupon_id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        razorpay_order_id VARCHAR(100),
        discount_amount DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed 15 unique, password-level influencer coupon codes (5 per tier)
    await runQuery(`
      INSERT INTO influencer_coupons (code, influencer_name, discount_percent)
      VALUES 
        -- 25% Tier
        ('MHB-25-T7Y9-K3F5-X8W2', 'Influencer A (25)', 25.00),
        ('MHB-25-N4P6-R2D8-Q7M1', 'Influencer B (25)', 25.00),
        ('MHB-25-V1K9-S4Z6-J2H8', 'Influencer C (25)', 25.00),
        ('MHB-25-C3W5-X7A1-B9D2', 'Influencer D (25)', 25.00),
        ('MHB-25-L6N4-P8R2-Q5M7', 'Influencer E (25)', 25.00),
        
        -- 30% Tier
        ('MHB-30-K2F9-T7Y1-X3S8', 'Influencer F (30)', 30.00),
        ('MHB-30-W5B8-M2P6-Q4R9', 'Influencer G (30)', 30.00),
        ('MHB-30-Z7H1-D4N6-S8V3', 'Influencer H (30)', 30.00),
        ('MHB-30-A2K9-X6Y3-Z8P1', 'Influencer I (30)', 30.00),
        ('MHB-30-J4H7-N8S2-K3D9', 'Influencer J (30)', 30.00),
        
        -- 40% Tier
        ('MHB-40-S8F9-Z3M6-T7A1', 'Influencer K (40)', 40.00),
        ('MHB-40-W2R5-D8Y1-K6N4', 'Influencer L (40)', 40.00),
        ('MHB-40-P9X3-Q7H1-M2B8', 'Influencer M (40)', 40.00),
        ('MHB-40-V4K6-D8S2-J1H9', 'Influencer N (40)', 40.00),
        ('MHB-40-Z3Y7-X1W5-T8F9', 'Influencer O (40)', 40.00)
      ON CONFLICT (code) DO NOTHING
    `);
    return true;
  } catch (error) {
    logger.warn(`[SchemaGuard] Unable to auto-provision Coupon tables: ${error.message} - ${error.stack}`);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  init.sql runner (runs BEFORE individual table creation)           */
/* ------------------------------------------------------------------ */

/**
 * Split a multi-statement SQL string into individual top-level statements.
 * Understands dollar-quoted bodies ($$ ... $$), single/double-quoted strings,
 * line comments (--), and block comments (/* ... *\/).
 */
function splitSqlStatements(sql) {
  const statements = [];
  let buf = "";
  let i = 0;
  const n = sql.length;

  while (i < n) {
    const ch = sql[i];
    const two = sql.slice(i, i + 2);

    if (two === "$$") {
      buf += two;
      i += 2;
      const close = sql.indexOf("$$", i);
      if (close === -1) {
        buf += sql.slice(i);
        i = n;
      } else {
        buf += sql.slice(i, close + 2);
        i = close + 2;
      }
      continue;
    }

    if (ch === "'") {
      buf += ch;
      i += 1;
      while (i < n) {
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            buf += "''";
            i += 2;
            continue;
          }
          buf += "'";
          i += 1;
          break;
        }
        buf += sql[i];
        i += 1;
      }
      continue;
    }

    if (ch === '"') {
      buf += ch;
      i += 1;
      while (i < n) {
        if (sql[i] === '"') {
          buf += '"';
          i += 1;
          break;
        }
        buf += sql[i];
        i += 1;
      }
      continue;
    }

    if (two === "--") {
      while (i < n && sql[i] !== "\n") {
        buf += sql[i];
        i += 1;
      }
      continue;
    }

    if (two === "/*") {
      const close = sql.indexOf("*/", i + 2);
      if (close === -1) {
        buf += sql.slice(i);
        i = n;
      } else {
        buf += sql.slice(i, close + 2);
        i = close + 2;
      }
      continue;
    }

    if (ch === ";") {
      const trimmed = buf.trim();
      if (trimmed) statements.push(trimmed);
      buf = "";
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  const trailing = buf.trim();
  if (trailing) statements.push(trailing);
  return statements;
}

/**
 * Reconcile schemaGuard-created tables that share a name with init.sql tables
 * but were created with a slimmer shape (so init.sql indexes/ALTERs work).
 */
const RECONCILE_STATEMENTS = [
  // webhook_events is created by ensureSalesTables() without the init.sql
  // columns that its indexes reference — add them so the indexes don't fail.
  "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false",
  "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS provider VARCHAR(50)",
  "ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
];

/**
 * Run the comprehensive init.sql file to create ALL database tables.
 * Statements are executed INDIVIDUALLY (not as one all-or-nothing batch) so
 * a single statement that fails against the live schema (e.g. an FK type
 * mismatch or an index on a column the existing table lacks) cannot abort
 * creation of every subsequent table. Failed statements are logged as
 * warnings; the rest of the schema still initializes.
 * Must run BEFORE schemaGuard's individual table/column creation.
 */
async function runInitSql() {
  if (initSqlRan) return true;

  try {
    if (!fs.existsSync(INIT_SQL_PATH)) {
      logger.warn(`[SchemaGuard] init.sql not found at ${INIT_SQL_PATH} — skipping`);
      return false;
    }

    const sql = fs.readFileSync(INIT_SQL_PATH, "utf8");
    const statements = splitSqlStatements(sql);

    let succeeded = 0;
    let failed = 0;
    const failures = [];

    const runStatement = async (statement, label) => {
      try {
        await runQuery(statement);
        succeeded += 1;
        return true;
      } catch (err) {
        failed += 1;
        if (failures.length < 8) {
          failures.push(`${label}: ${String(err.message || err).slice(0, 140)}`);
        }
        return false;
      }
    };

    for (const statement of RECONCILE_STATEMENTS) {
      await runStatement(statement, statement.slice(0, 60));
    }

    for (const statement of statements) {
      await runStatement(statement, String(statement).slice(0, 90));
    }

    initSqlRan = true;
    if (failed === 0) {
      logger.info(`[SchemaGuard] init.sql executed successfully (${succeeded} statements)`);
    } else {
      logger.warn(
        `[SchemaGuard] init.sql executed with ${failed} skipped statement(s) (${succeeded} ok). Examples:`
      );
      for (const f of failures) {
        logger.warn(`  - ${f}`);
      }
    }
    return failed === 0;
  } catch (err) {
    logger.error(`[SchemaGuard] Failed to read init.sql: ${err.message}`);
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Preflight                                                         */
/* ------------------------------------------------------------------ */

async function ensureCoreTablesAndColumns() {
  try {
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'");
    await runQuery("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()");

    await runQuery(`
      CREATE TABLE IF NOT EXISTS profiles (
        user_id TEXT PRIMARY KEY,
        full_name VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        avatar_url TEXT,
        bio TEXT,
        verified BOOLEAN DEFAULT false,
        payout_upi_id VARCHAR(100),
        payout_bank_details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await runQuery("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_upi_id VARCHAR(100)");
    await runQuery("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_bank_details JSONB DEFAULT '{}'::jsonb");
    await runQuery("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS razorpay_contact_id VARCHAR(100)");
    await runQuery("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS razorpay_fund_account_id VARCHAR(100)");

    await runQuery(`
      CREATE TABLE IF NOT EXISTS preferences (
        user_id TEXT PRIMARY KEY,
        location TEXT,
        min_price DECIMAL(10,2) DEFAULT 0,
        max_price DECIMAL(10,2) DEFAULT 100000,
        categories JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS channels (
        channel_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        owner_id TEXT NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'General',
        logo_url TEXT,
        cover_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // posts is NOT defined in init.sql (only page_posts), so a fresh DB would
    // have no listing table and every subsequent ALTER would fail. Create the
    // baseline shape here; ensurePostsOptionalColumns() backfills the rest.
    await runQuery(`
      CREATE TABLE IF NOT EXISTS posts (
        post_id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT,
        description TEXT,
        price DECIMAL(12,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS category_id TEXT");
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS description TEXT");
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS title TEXT");
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS price DECIMAL(12,2) DEFAULT 0");
    await runQuery("ALTER TABLE posts ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'");
    return true;
  } catch (error) {
    logger.warn("[SchemaGuard] Unable to auto-provision core tables/columns", { message: error.message });
    return false;
  }
}

async function ensureSchemaPreflight({
  strict = false,
  autoCreateTwoFactorFallback = true,
  autoCreateUsersTwoFactorColumns = true,
  autoCreatePostsOptionalColumns = true,
} = {}) {
  /* STEP 0: Run comprehensive init.sql FIRST */
  await runInitSql();

  /* STEP 1: Core tables & columns (backward compat fallback) */
  await ensureCoreTablesAndColumns();
  if (autoCreatePostsOptionalColumns) {
    await ensurePostsOptionalColumns();
  }
  // Create the legacy transactions/offers tables FIRST so the ALTER-only
  // backfill functions below don't warn about missing relations on fresh DBs.
  await ensureTransactionsOffersTables();
  await ensureTransactionsOptionalColumns();
  await ensureOffersOptionalColumns();
  await ensureUserSettingsTable();
  await ensureUsersStatusColumns();
  await ensureSubcategoriesOptionalColumns();
  await ensureKycTables();
  await ensureSalesTables();
  await ensureFinancialOpsTables();
  await ensureSubscriptionTables();
  await ensurePaymentTables();
  await ensureCouponTables();
  await ensureTranslationTables();
  await ensureRewardsTables();

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
  ensureTransactionsOffersTables,
  ensureUserSettingsTable,
  ensureUsersStatusColumns,
  ensureSubcategoriesOptionalColumns,
  ensureKycTables,
  ensureSalesTables,
  ensureFinancialOpsTables,
  ensureSubscriptionTables,
  ensurePaymentTables,
  ensureCouponTables,
  ensureTranslationTables,
  ensureRewardsTables,
  runInitSql,
};
