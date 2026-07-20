const { pool, runQuery, DB_QUERY_TIMEOUT_MS } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

let subscriptionSchemaReadyPromise = null;

async function safeRun(query, values = []) {
  try {
    await runQuery(query, values);
    return true;
  } catch (error) {
    logger.warn("[SubscriptionSchema] Non-fatal schema step failed", {
      message: error.message,
    });
    return false;
  }
}

async function ensureSubscriptionSchema() {
  if (subscriptionSchemaReadyPromise) {
    return subscriptionSchemaReadyPromise;
  }

  subscriptionSchemaReadyPromise = (async () => {
    await safeRun(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_name VARCHAR(20) NOT NULL,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        payment_id TEXT,
        boost_used_this_month INTEGER DEFAULT 0,
        featured_used_this_month INTEGER DEFAULT 0,
        spotlight_used_this_month INTEGER DEFAULT 0,
        quota_reset_at TIMESTAMPTZ DEFAULT NOW(),
        listings_count INTEGER DEFAULT 0,
        is_trial BOOLEAN DEFAULT FALSE,
        cancelled_at TIMESTAMPTZ,
        cancel_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await safeRun(`
      ALTER TABLE user_subscriptions
      DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey
    `);

    await safeRun(`
      ALTER TABLE user_subscriptions
      ALTER COLUMN user_id TYPE TEXT
      USING user_id::text
    `);

    await safeRun(`
      ALTER TABLE user_subscriptions
      ALTER COLUMN payment_id TYPE TEXT
      USING payment_id::text
    `);

    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW()",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS payment_id TEXT",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS boost_used_this_month INTEGER DEFAULT 0",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS featured_used_this_month INTEGER DEFAULT 0",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS spotlight_used_this_month INTEGER DEFAULT 0",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ DEFAULT NOW()",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS listings_count INTEGER DEFAULT 0",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT",
    );
    await safeRun(
      "ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
    );

    await safeRun(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'basic'",
    );
    await safeRun(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_plan VARCHAR(20) DEFAULT 'basic'",
    );
    await safeRun(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id INTEGER",
    );
    await safeRun(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ",
    );
    await safeRun(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INTEGER DEFAULT 0",
    );

    // Payments table schema expansions
    await safeRun("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_plan_purchased_check");
    await safeRun("ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_payment_method_check");
    await safeRun("ALTER TABLE payments ADD COLUMN IF NOT EXISTS raw_payload JSONB");
    await safeRun("ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT");
    await safeRun("ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT");
    await safeRun("ALTER TABLE payments ADD COLUMN IF NOT EXISTS razorpay_signature TEXT");

    await safeRun(
      "CREATE INDEX IF NOT EXISTS idx_user_sub_active ON user_subscriptions(user_id, is_active)",
    );
    await safeRun(
      "CREATE INDEX IF NOT EXISTS idx_user_sub_expires ON user_subscriptions(expires_at) WHERE is_active = true",
    );

    return true;
  })().catch((error) => {
    subscriptionSchemaReadyPromise = null;
    logger.error("[SubscriptionSchema] Failed to ensure subscription schema", error);
    throw error;
  });

  return subscriptionSchemaReadyPromise;
}

async function withSubscriptionLock(client, userId) {
  if (!client || typeof client.query !== "function") {
    return;
  }

  await client.query({
    text: "SELECT pg_advisory_xact_lock(hashtext($1))",
    values: [`subscription:${String(userId || "")}`],
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });
}

function deriveSubscriptionStatus(row, now = new Date()) {
  if (!row) return "unknown";
  if (row.cancelled_at) return "cancelled";
  if (row.is_active) return "active";

  const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
  if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt > now) {
    return "inactive";
  }
  return "expired";
}

function serializeSubscriptionHistoryRow(row) {
  return {
    id: row.id,
    planName: row.plan_name,
    startedAt: row.started_at || row.created_at || null,
    expiresAt: row.expires_at || null,
    isActive: Boolean(row.is_active),
    isTrial: Boolean(row.is_trial),
    cancelledAt: row.cancelled_at || null,
    cancelReason: row.cancel_reason || "",
    paymentId: row.payment_id || null,
    quotaResetAt: row.quota_reset_at || null,
    listingsCount: Number(row.listings_count || 0),
    status: deriveSubscriptionStatus(row),
    createdAt: row.created_at || null,
  };
}

module.exports = {
  ensureSubscriptionSchema,
  withSubscriptionLock,
  deriveSubscriptionStatus,
  serializeSubscriptionHistoryRow,
};
