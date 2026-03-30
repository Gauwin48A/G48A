const { pool, runQuery } = require("../utils/dbHelpers");
const {
  parseOptionalString,
  parsePositiveInt,
  parseBoolean,
} = require("../utils/parseHelpers");
const {
  getTierRules,
  applyPromoCode,
  getSubscriptionExpiry,
} = require("../config/tierRules");
const cacheService = require("../services/cacheService");
const { ensureSubscriptionSchema } = require("../services/subscriptionSchemaService");
const axios = require("axios");
const {
  buildPaymentReconciliationReport,
  executePaymentReconciliation,
  getLastPaymentReconciliationReport,
} = require("../services/paymentReconciliationService");
const logger = require("../utils/logger");
const { verifyRazorpaySignature } = require("../services/paymentGateway");
const crypto = require("crypto");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_PLANS = ["basic", "bronze", "silver", "premium"];
const DEFAULT_PENDING_LIMIT = 50;
const MAX_PENDING_LIMIT = 200;

const PAYMENT_STATUS_CACHE_TTL_SECONDS = 20;
const PAYMENT_PENDING_CACHE_TTL_SECONDS = 20;
const PAYMENT_STATS_CACHE_TTL_SECONDS = 30;
const UPI_DETAILS_CACHE_TTL_SECONDS = 3600;
const WEBHOOK_DEDUP_TTL_SECONDS = 24 * 60 * 60;
const WEBHOOK_PROCESSING_TTL_SECONDS = 2 * 60;
const RAZORPAY_API_BASE =
  process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1";
const RAZORPAY_RECEIPT_PREFIX = "mhub";

const INTEGER_COLUMN_TYPES = new Set(["smallint", "integer", "bigint"]);
const BOOST_PURCHASE_OPTIONS = {
  boost: {
    label: "Boost",
    amount: 49,
    durationDays: 7,
    boostLevel: 1,
    description: "Higher in search results",
  },
  featured: {
    label: "Featured",
    amount: 99,
    durationDays: 14,
    boostLevel: 2,
    description: "Featured badge + feed priority",
  },
  spotlight: {
    label: "Spotlight",
    amount: 199,
    durationDays: 30,
    boostLevel: 3,
    description: "Homepage top placement",
  },
};
const PURCHASE_TYPES = {
  SUBSCRIPTION: "subscription",
  BOOST: "boost",
};

// ---------------------------------------------------------------------------
// Schema-inspection cached promises
// ---------------------------------------------------------------------------

let paymentsSchemaConfigPromise = null;
let userSubscriptionsSchemaConfigPromise = null;
let usersSubscriptionIdColumnPromise = null;
let usersLegacyIdColumnPromise = null;
let paymentsExtendedSchemaPromise = null;
let boostSchemaPromise = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Return the lowercased role string from the request user.
 * @param {import("express").Request} req
 * @returns {string}
 */
function getRequesterRole(req) {
  return String(req.user?.role || "").toLowerCase();
}

/**
 * Check whether the requesting user has payment-admin privileges.
 * @param {import("express").Request} req
 * @returns {boolean}
 */
function hasPaymentAdminAccess(req) {
  const role = getRequesterRole(req);
  return role === "admin" || role === "superadmin";
}

/**
 * Extract the authenticated user ID from the request object.
 * Works identically to the shared getAuthUserId but returns via
 * parseOptionalString for consistency with the rest of this module.
 * @param {import("express").Request} req
 * @returns {string|null}
 */
function getAuthenticatedUserId(req) {
  return parseOptionalString(
    req.user?.userId || req.user?.id || req.user?.user_id
  );
}

/**
 * Resolve Razorpay credentials from the environment.
 * @returns {{ keyId: string, keySecret: string }|null}
 */
function getRazorpayCredentials() {
  const keyId = parseOptionalString(process.env.RAZORPAY_KEY_ID);
  const keySecret = parseOptionalString(process.env.RAZORPAY_KEY_SECRET);
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

/**
 * Resolve webhook secret (Razorpay preferred, fallback to generic).
 * @returns {string|null}
 */
function getWebhookSecret() {
  return parseOptionalString(
    process.env.RAZORPAY_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET
  );
}

/**
 * Build a receipt string for Razorpay orders.
 * @param {Object} options
 * @param {string} options.purchaseType
 * @param {string|null} options.planType
 * @param {string|null} options.boostType
 * @param {string|null} options.postId
 * @param {string} options.userId
 * @returns {string}
 */
function buildRazorpayReceipt({
  purchaseType,
  planType,
  boostType,
  postId,
  userId,
}) {
  const segments = [
    RAZORPAY_RECEIPT_PREFIX,
    String(purchaseType || "purchase"),
    String(planType || boostType || "na"),
    String(postId || "na"),
    String(userId || "anon"),
    Date.now(),
  ];
  return segments.join("_");
}

/**
 * Create a Razorpay order via the API.
 * @param {Object} payload
 * @param {number} payload.amountInr
 * @param {string} payload.receipt
 * @param {Object} payload.notes
 * @returns {Promise<Object>}
 */
async function createRazorpayOrder({ amountInr, receipt, notes }) {
  const credentials = getRazorpayCredentials();
  if (!credentials) {
    throw new Error("RAZORPAY credentials not configured");
  }

  const amountPaise = Math.round(Number(amountInr) * 100);
  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw new Error("Invalid Razorpay amount");
  }

  const response = await axios.post(
    `${RAZORPAY_API_BASE}/orders`,
    {
      amount: amountPaise,
      currency: "INR",
      receipt,
      payment_capture: 1,
      notes: notes || {},
    },
    {
      auth: {
        username: credentials.keyId,
        password: credentials.keySecret,
      },
      timeout: 15000,
    }
  );

  return response?.data || {};
}

/**
 * Check whether a string looks like a valid UUID v1-v5.
 * @param {*} value
 * @returns {boolean}
 */
function isUuidLike(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value).trim()
  );
}

// ---------------------------------------------------------------------------
// Schema introspection (lazy, cached)
// ---------------------------------------------------------------------------

/**
 * Inspect the payments table schema once and cache the result.
 * @returns {Promise<{userIdDataType: string, hasRetryCount: boolean, hasUpdatedAt: boolean}>}
 */
async function getPaymentsSchemaConfig() {
  if (!paymentsSchemaConfigPromise) {
    paymentsSchemaConfigPromise = runQuery(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'payments'
         AND column_name IN ('user_id', 'retry_count', 'updated_at')`
    )
      .then((result) => {
        const rows = result?.rows || [];
        const dataTypeByColumn = new Map(
          rows.map((row) => [row.column_name, row.data_type])
        );
        return {
          userIdDataType: dataTypeByColumn.get("user_id") || "text",
          hasRetryCount: dataTypeByColumn.has("retry_count"),
          hasUpdatedAt: dataTypeByColumn.has("updated_at"),
        };
      })
      .catch((error) => {
        logger.warn(
          "[Payment] Schema inspection failed; using compatibility defaults",
          { message: error.message }
        );
        return {
          userIdDataType: "text",
          hasRetryCount: false,
          hasUpdatedAt: false,
        };
      });
  }
  return paymentsSchemaConfigPromise;
}

/**
 * Inspect user_subscriptions table schema once and cache the result.
 * @returns {Promise<Object>}
 */
async function getUserSubscriptionsSchemaConfig() {
  if (!userSubscriptionsSchemaConfigPromise) {
    userSubscriptionsSchemaConfigPromise = ensureSubscriptionSchema()
      .then(() =>
        runQuery(
          `SELECT column_name, data_type
           FROM information_schema.columns
           WHERE table_schema = 'public'
             AND table_name = 'user_subscriptions'
             AND column_name IN (
               'plan_name','plan_type','started_at','start_date',
               'expires_at','end_date','payment_id','payment_reference',
               'quota_reset_at','is_active','id'
             )`
        )
      )
      .then((result) => {
        const rows = result?.rows || [];
        const dataTypeByColumn = new Map(
          rows.map((row) => [row.column_name, row.data_type])
        );
        const has = (column) => dataTypeByColumn.has(column);

        const planColumn = has("plan_name")
          ? "plan_name"
          : has("plan_type")
            ? "plan_type"
            : null;
        const startedColumn = has("started_at")
          ? "started_at"
          : has("start_date")
            ? "start_date"
            : null;
        const expiresColumn = has("expires_at")
          ? "expires_at"
          : has("end_date")
            ? "end_date"
            : null;
        const paymentRefColumn = has("payment_id")
          ? "payment_id"
          : has("payment_reference")
            ? "payment_reference"
            : null;
        const paymentRefType = paymentRefColumn
          ? dataTypeByColumn.get(paymentRefColumn) || null
          : null;
        const hasQuotaReset = has("quota_reset_at");
        const hasIsActive = has("is_active");
        const idDataType = dataTypeByColumn.get("id") || null;

        return {
          planColumn,
          startedColumn,
          expiresColumn,
          paymentRefColumn,
          paymentRefType,
          hasQuotaReset,
          hasIsActive,
          idDataType,
        };
      })
      .catch((error) => {
        logger.warn(
          "[Payment] Failed to inspect user_subscriptions schema",
          { message: error.message }
        );
        return {
          planColumn: null,
          startedColumn: null,
          expiresColumn: null,
          paymentRefColumn: null,
          paymentRefType: null,
          hasQuotaReset: false,
          hasIsActive: false,
          idDataType: null,
        };
      });
  }
  return userSubscriptionsSchemaConfigPromise;
}

/**
 * Inspect users.subscription_id column type (cached).
 * @returns {Promise<{dataType: string|null}>}
 */
async function getUsersSubscriptionIdColumn() {
  if (!usersSubscriptionIdColumnPromise) {
    usersSubscriptionIdColumnPromise = runQuery(
      `SELECT data_type
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'users'
         AND column_name = 'subscription_id'
       LIMIT 1`
    )
      .then((result) => ({
        dataType: result?.rows?.[0]?.data_type || null,
      }))
      .catch((error) => {
        logger.warn("[Payment] Failed to inspect users.subscription_id", {
          message: error.message,
        });
        return { dataType: null };
      });
  }
  return usersSubscriptionIdColumnPromise;
}

/**
 * Ensure extended payment columns exist for non-subscription purchases.
 * @returns {Promise<void>}
 */
async function ensurePaymentsExtendedSchema() {
  if (!paymentsExtendedSchemaPromise) {
    paymentsExtendedSchemaPromise = (async () => {
      await runQuery(
        `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS purchase_type TEXT`
      ).catch(() => {});
      await runQuery(
        `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS boost_type TEXT`
      ).catch(() => {});
      await runQuery(
        `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS post_id TEXT`
      ).catch(() => {});
      await runQuery(
        `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS metadata JSONB`
      ).catch(() => {});
      await runQuery(
        `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS payment_provider TEXT`
      ).catch(() => {});
      await runQuery(
        `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS provider_order_id TEXT`
      ).catch(() => {});
      await runQuery(
        `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS provider_payment_id TEXT`
      ).catch(() => {});
      await runQuery(
        `ALTER TABLE payments
         ADD COLUMN IF NOT EXISTS provider_signature TEXT`
      ).catch(() => {});
      await runQuery(
        `UPDATE payments
         SET purchase_type = $1
         WHERE purchase_type IS NULL`,
        [PURCHASE_TYPES.SUBSCRIPTION]
      ).catch(() => {});
    })().catch((error) => {
      logger.warn("[Payment] Failed to extend payments schema", {
        message: error.message,
      });
    });
  }
  return paymentsExtendedSchemaPromise;
}

/**
 * Ensure post boost schema exists (shared by boost payments).
 * @returns {Promise<void>}
 */
async function ensureBoostSchema() {
  if (!boostSchemaPromise) {
    boostSchemaPromise = (async () => {
      await runQuery(
        `CREATE TABLE IF NOT EXISTS post_boosts (
          boost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          post_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          boost_type TEXT NOT NULL,
          source TEXT DEFAULT 'payment',
          status TEXT DEFAULT 'active',
          starts_at TIMESTAMPTZ DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )`
      ).catch(() => {});
      await runQuery(
        `ALTER TABLE posts
         ADD COLUMN IF NOT EXISTS boost_level INT DEFAULT 0`
      ).catch(() => {});
      await runQuery(
        `CREATE INDEX IF NOT EXISTS idx_post_boosts_active
         ON post_boosts(post_id, status)
         WHERE status = 'active'`
      ).catch(() => {});
    })().catch((error) => {
      logger.warn("[Payment] Failed to ensure boost schema", {
        message: error.message,
      });
    });
  }
  return boostSchemaPromise;
}

/**
 * Normalize a reference value to match the target column type (uuid, int, text).
 * @param {*} value
 * @param {string} columnType
 * @returns {string|number|null}
 */
function normalizeReferenceForColumn(value, columnType) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;
  if (columnType === "uuid") {
    return isUuidLike(normalized) ? normalized : null;
  }
  if (INTEGER_COLUMN_TYPES.has(columnType)) {
    return /^\d+$/.test(normalized)
      ? Number.parseInt(normalized, 10)
      : null;
  }
  return normalized;
}

/**
 * Whether a subscription ID can be safely assigned to users.subscription_id.
 * @param {*} subscriptionId
 * @param {string|null} subscriptionIdType
 * @returns {boolean}
 */
function canAssignSubscriptionId(subscriptionId, subscriptionIdType) {
  const normalized = parseOptionalString(subscriptionId);
  if (!normalized || !subscriptionIdType) return false;
  if (subscriptionIdType === "uuid") return isUuidLike(normalized);
  if (INTEGER_COLUMN_TYPES.has(subscriptionIdType))
    return /^\d+$/.test(normalized);
  return false;
}

/**
 * Check whether the legacy `id` column exists on the users table (cached).
 * @returns {Promise<boolean>}
 */
async function hasUsersLegacyIdColumn() {
  if (!usersLegacyIdColumnPromise) {
    usersLegacyIdColumnPromise = runQuery(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'id'
       ) AS available`
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((error) => {
        logger.warn(
          "[Payment] Failed to inspect users.id availability",
          { message: error.message }
        );
        return false;
      });
  }
  return usersLegacyIdColumnPromise;
}

/**
 * Resolve a raw auth user ID to the canonical user_id in the users table.
 * @param {*} rawAuthUserId
 * @returns {Promise<string|null>}
 */
async function resolveCanonicalUserId(rawAuthUserId) {
  const authUserId = parseOptionalString(rawAuthUserId);
  if (!authUserId) return null;

  const usersHasLegacyId = await hasUsersLegacyIdColumn();

  const userLookup = await runQuery(
    usersHasLegacyId
      ? `SELECT user_id::text AS canonical_user_id
         FROM users
         WHERE user_id::text = $1 OR id::text = $1
         LIMIT 1`
      : `SELECT user_id::text AS canonical_user_id
         FROM users
         WHERE user_id::text = $1
         LIMIT 1`,
    [authUserId]
  );

  return parseOptionalString(userLookup.rows[0]?.canonical_user_id);
}

/**
 * Resolve the payment-compatible user context for a given auth user ID.
 * Takes care of mapping canonical vs. legacy numeric IDs depending on the
 * payments.user_id column type.
 * @param {*} rawAuthUserId
 * @returns {Promise<{paymentUserId: string, canonicalUserId: string}|null>}
 */
async function resolvePaymentUserContext(rawAuthUserId) {
  const authUserId = parseOptionalString(rawAuthUserId);
  if (!authUserId) return null;

  const [schemaConfig, usersHasLegacyId] = await Promise.all([
    getPaymentsSchemaConfig(),
    hasUsersLegacyIdColumn(),
  ]);

  const userLookup = await runQuery(
    usersHasLegacyId
      ? `SELECT user_id::text AS canonical_user_id,
                id::text AS legacy_user_id
         FROM users
         WHERE user_id::text = $1 OR id::text = $1
         LIMIT 1`
      : `SELECT user_id::text AS canonical_user_id,
                NULL::text AS legacy_user_id
         FROM users
         WHERE user_id::text = $1
         LIMIT 1`,
    [authUserId]
  );

  if (!userLookup.rows.length) return null;

  const row = userLookup.rows[0];
  const canonicalUserId = parseOptionalString(row.canonical_user_id);
  const legacyUserId = parseOptionalString(row.legacy_user_id);
  const userIdDataType = schemaConfig.userIdDataType;

  if (userIdDataType === "uuid") {
    if (!isUuidLike(canonicalUserId)) return null;
    return {
      paymentUserId: canonicalUserId,
      canonicalUserId: canonicalUserId,
    };
  }

  if (INTEGER_COLUMN_TYPES.has(userIdDataType)) {
    const numericCandidate =
      legacyUserId && /^\d+$/.test(legacyUserId)
        ? legacyUserId
        : /^\d+$/.test(authUserId)
          ? authUserId
          : null;
    if (!numericCandidate) return null;
    return {
      paymentUserId: numericCandidate,
      canonicalUserId: canonicalUserId || numericCandidate,
    };
  }

  return {
    paymentUserId: canonicalUserId || authUserId,
    canonicalUserId: canonicalUserId || authUserId,
  };
}

// ---------------------------------------------------------------------------
// Cache / money / plan helpers
// ---------------------------------------------------------------------------

/**
 * Invalidate all payment-related caches, optionally scoped to a user.
 * @param {string|null} [userId]
 */
function invalidatePaymentCaches(userId = null) {
  cacheService.clearPattern("payments:pending:*");
  cacheService.del("payments:stats");
  cacheService.del("payments:upi-details");
  if (userId) {
    cacheService.clearPattern(`payments:${userId}:*`);
  }
}

/**
 * Round a numeric value to two decimal places, or return null if non-finite.
 * @param {*} value
 * @returns {number|null}
 */
function normalizeMoney(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(2));
}

/**
 * Check whether two amounts are equivalent, accounting for the common
 * gateway convention of sending amounts in paise (value / 100).
 * @param {number} expectedAmountInr
 * @param {*} webhookAmountRaw
 * @returns {boolean}
 */
function amountsEquivalent(expectedAmountInr, webhookAmountRaw) {
  const expected = normalizeMoney(expectedAmountInr);
  if (expected === null) return false;
  const webhookAmount = normalizeMoney(webhookAmountRaw);
  if (webhookAmount === null) return false;

  const candidates = [webhookAmount, webhookAmount / 100];
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeMoney(candidate);
    return (
      normalizedCandidate !== null &&
      Math.abs(normalizedCandidate - expected) < 0.01
    );
  });
}

/**
 * Get the expiry date for a given plan type.
 * @param {string} planType
 * @returns {Date|null}
 */
function getPlanExpiryDate(planType) {
  const normalized = String(planType || "").toLowerCase();
  if (normalized === "basic") return null;

  const expiry = getSubscriptionExpiry(normalized);
  if (expiry) return expiry;

  const fallbackRules = getTierRules(normalized);
  if (fallbackRules?.durationMonths) {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + fallbackRules.durationMonths);
    return endDate;
  }
  return null;
}

/**
 * Look up the expected INR price for a plan.
 * @param {string} planType
 * @returns {number|null}
 */
function resolveExpectedAmountForPlan(planType) {
  const rules = getTierRules(planType);
  const expectedAmount = Number(rules?.priceINR);
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) return null;
  return expectedAmount;
}

/**
 * Look up the expected INR price for a boost purchase.
 * @param {string} boostType
 * @returns {number|null}
 */
function resolveExpectedAmountForBoost(boostType) {
  const option = BOOST_PURCHASE_OPTIONS[String(boostType || "").toLowerCase()];
  const expectedAmount = Number(option?.amount);
  if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) return null;
  return expectedAmount;
}

function getBoostPurchaseOption(boostType) {
  return BOOST_PURCHASE_OPTIONS[String(boostType || "").toLowerCase()] || null;
}

// ---------------------------------------------------------------------------
// Webhook helpers
// ---------------------------------------------------------------------------

/**
 * Build a cache key for webhook replay / deduplication.
 * @param {string} provider
 * @param {string|null} eventId
 * @param {string} signature
 * @param {string} payload
 * @returns {string}
 */
function buildWebhookReplayKey(provider, eventId, signature, payload) {
  if (eventId) {
    return `payments:webhook:${provider}:${eventId}`;
  }
  const digest = crypto
    .createHash("sha256")
    .update(`${provider}|${signature}|${payload}`)
    .digest("hex");
  return `payments:webhook:${provider}:hash:${digest}`;
}

/**
 * Parse provider, event, status, transaction ID and amount from a webhook request.
 * @param {import("express").Request} req
 * @param {Object} payload
 * @returns {Object}
 */
function extractWebhookContext(req, payload) {
  const headers = req.headers || {};

  const provider = headers["x-razorpay-signature"]
    ? "razorpay"
    : headers["x-stripe-signature"]
      ? "stripe"
      : "generic";

  const eventId = parseOptionalString(
    headers["x-razorpay-event-id"] ||
      headers["x-stripe-event-id"] ||
      headers["x-webhook-id"] ||
      payload?.event_id ||
      payload?.webhook_id
  );

  const eventType = parseOptionalString(payload?.event || payload?.type);

  const status = parseOptionalString(
    payload?.status ||
      payload?.data?.object?.status ||
      payload?.payload?.payment?.entity?.status
  );

  const transactionId = parseOptionalString(
    payload?.transaction_id ||
      payload?.payment_id ||
      payload?.razorpay_payment_id ||
      payload?.payload?.payment?.entity?.id ||
      payload?.data?.object?.id ||
      payload?.id
  );

  const orderId = parseOptionalString(
    payload?.order_id ||
      payload?.razorpay_order_id ||
      payload?.payload?.payment?.entity?.order_id ||
      payload?.payload?.order?.entity?.id ||
      payload?.data?.object?.order_id
  );

  const amount =
    payload?.amount ??
    payload?.data?.object?.amount ??
    payload?.payload?.payment?.entity?.amount ??
    null;

  return {
    provider,
    eventId,
    eventType,
    status: (status || "").toLowerCase(),
    transactionId,
    orderId,
    amount,
  };
}

/**
 * Determine whether a webhook context represents a successful payment event.
 * @param {Object} context
 * @returns {boolean}
 */
function isWebhookSuccess(context) {
  const status = String(context?.status || "").toLowerCase();
  const eventType = String(context?.eventType || "").toLowerCase();
  const successTokens = [
    "captured",
    "completed",
    "verified",
    "success",
    "succeeded",
    "paid",
  ];
  return successTokens.some(
    (token) => status.includes(token) || eventType.includes(token)
  );
}

// ---------------------------------------------------------------------------
// Core verification logic (used by both admin verify and webhook)
// ---------------------------------------------------------------------------

/**
 * Apply a verified payment inside an existing transaction client.
 *
 * Updates the payment row, inserts a subscription record, upgrades the user
 * tier, and sends a notification. Caller must handle BEGIN / COMMIT / ROLLBACK.
 *
 * @param {import("pg").PoolClient} client - Active transaction client
 * @param {Object} payment - Payment row (id, user_id, plan_purchased, amount, transaction_id)
 * @param {Object} [options]
 * @param {string|null} [options.verifiedBy]
 * @param {string|null} [options.adminNotes]
 * @param {string|null} [options.paymentReference]
 * @returns {Promise<{alreadyProcessed: boolean, endDate: Date|null}>}
 */
async function applyVerifiedPayment(client, payment, options = {}) {
  const {
    verifiedBy = null,
    adminNotes = null,
    paymentReference = null,
  } = options;

  const schemaConfig = await getPaymentsSchemaConfig();

  const paymentUpdate = await client.query(
    `UPDATE payments
     SET status = 'verified',
         verified_by = $1,
         verified_at = NOW(),
         admin_notes = COALESCE($2, admin_notes)${
           schemaConfig.hasUpdatedAt ? `,
         updated_at = NOW()` : ""
         }
     WHERE id = $3
       AND status = 'pending'
     RETURNING id`,
    [verifiedBy, adminNotes, payment.id]
  );

  if (paymentUpdate.rowCount === 0) {
    return { alreadyProcessed: true, endDate: null };
  }

  const normalizedPlan = String(payment.plan_purchased || "").toLowerCase();
  const endDate = getPlanExpiryDate(normalizedPlan);
  const subSchema = await getUserSubscriptionsSchemaConfig();
  const usersSubIdInfo = await getUsersSubscriptionIdColumn();

  let subscriptionId = null;
  const shouldDeactivateSubs = subSchema.hasIsActive;

  const deactivateSubs = async () => {
    if (!shouldDeactivateSubs) return;
    try {
      await client.query(
        `UPDATE user_subscriptions
         SET is_active = false
         WHERE user_id::text = $1::text AND is_active = true`,
        [payment.user_id]
      );
    } catch (deactivateErr) {
      logger.warn(
        "[Payment] Failed to deactivate prior subscriptions",
        { message: deactivateErr.message }
      );
    }
  };

  if (normalizedPlan !== "basic") {
    await deactivateSubs();

    if (subSchema.planColumn && subSchema.expiresColumn) {
      const columns = [
        "user_id",
        subSchema.planColumn,
        subSchema.expiresColumn,
      ];
      const params = [payment.user_id, normalizedPlan, endDate];
      const placeholders = params.map((_, idx) => `$${idx + 1}`);

      if (subSchema.startedColumn) {
        columns.push(subSchema.startedColumn);
        placeholders.push("NOW()");
      }
      if (subSchema.hasQuotaReset) {
        columns.push("quota_reset_at");
        placeholders.push("NOW()");
      }
      if (subSchema.paymentRefColumn) {
        const fallbackRef =
          paymentReference ||
          payment.transaction_id ||
          `payment_${payment.id}`;
        let paymentRefValue = null;

        if (subSchema.paymentRefColumn === "payment_id") {
          paymentRefValue =
            normalizeReferenceForColumn(
              payment.id,
              subSchema.paymentRefType
            ) ||
            normalizeReferenceForColumn(
              fallbackRef,
              subSchema.paymentRefType
            );
        } else {
          paymentRefValue = normalizeReferenceForColumn(
            fallbackRef,
            subSchema.paymentRefType
          );
        }

        if (paymentRefValue !== null) {
          columns.push(subSchema.paymentRefColumn);
          params.push(paymentRefValue);
          placeholders.push(`$${params.length}`);
        }
      }

      const insertResult = await client.query(
        `INSERT INTO user_subscriptions (${columns.join(", ")})
         VALUES (${placeholders.join(", ")})
         RETURNING id`,
        params
      );
      subscriptionId = insertResult.rows[0]?.id || null;
    } else {
      logger.warn(
        "[Payment] user_subscriptions schema missing plan/expiry columns; skipping subscription insert"
      );
    }
  } else {
    await deactivateSubs();
  }

  // Update the users table
  const assignments = ["tier = $1", "current_plan = $2"];
  const params = [normalizedPlan || "basic", normalizedPlan || "basic"];

  if (normalizedPlan === "basic") {
    assignments.push("subscription_expiry = NULL");
    assignments.push("post_credits = COALESCE(post_credits, 0) + 1");
    if (usersSubIdInfo?.dataType) {
      assignments.push("subscription_id = NULL");
    }
  } else {
    assignments.push(`subscription_expiry = $${params.length + 1}`);
    params.push(endDate);
    if (usersSubIdInfo?.dataType) {
      if (canAssignSubscriptionId(subscriptionId, usersSubIdInfo.dataType)) {
        assignments.push(`subscription_id = $${params.length + 1}`);
        params.push(subscriptionId);
      } else {
        assignments.push("subscription_id = NULL");
      }
    }
  }

  params.push(payment.user_id);
  await client.query(
    `UPDATE users SET ${assignments.join(", ")} WHERE user_id::text = $${params.length}::text`,
    params
  );

  const successMessage =
    normalizedPlan !== "basic"
      ? `Your ${normalizedPlan.toUpperCase()} plan is now active!${
          endDate
            ? ` Valid until ${endDate.toLocaleDateString("en-IN")}`
            : ""
        }`
      : "Your BASIC plan is now active! You can now create a post.";

  await client.query(
    `INSERT INTO notifications (user_id, type, title, message, created_at)
     VALUES ($1, 'payment_verified', 'Payment Verified!', $2, NOW())`,
    [payment.user_id, successMessage]
  );

  return { alreadyProcessed: false, endDate };
}

/**
 * Apply a verified boost payment inside an existing transaction client.
 *
 * Updates the payment row, inserts a boost record, updates the post boost
 * level, and sends a notification.
 *
 * @param {import("pg").PoolClient} client - Active transaction client
 * @param {Object} payment - Payment row (id, user_id, boost_type, post_id, amount)
 * @param {Object} [options]
 * @param {string|null} [options.verifiedBy]
 * @param {string|null} [options.adminNotes]
 * @param {string|null} [options.paymentReference]
 * @returns {Promise<{alreadyProcessed: boolean, boostExpiresAt: Date|null, boostId: string|null}>}
 */
async function applyVerifiedBoostPayment(client, payment, options = {}) {
  const {
    verifiedBy = null,
    adminNotes = null,
    paymentReference = null,
  } = options;

  const schemaConfig = await getPaymentsSchemaConfig();

  const paymentUpdate = await client.query(
    `UPDATE payments
     SET status = 'verified',
         verified_by = $1,
         verified_at = NOW(),
         admin_notes = COALESCE($2, admin_notes)${
           schemaConfig.hasUpdatedAt ? `,
         updated_at = NOW()` : ""
         }
     WHERE id = $3
       AND status = 'pending'
     RETURNING id`,
    [verifiedBy, adminNotes, payment.id]
  );

  if (paymentUpdate.rowCount === 0) {
    return { alreadyProcessed: true, boostExpiresAt: null, boostId: null };
  }

  const boostType = String(payment.boost_type || "").toLowerCase();
  const postId = parseOptionalString(payment.post_id);
  const boostOption = getBoostPurchaseOption(boostType);

  if (!boostOption || !postId) {
    throw new Error("Missing boost metadata for verified payment");
  }

  await ensureBoostSchema();

  const now = Date.now();
  const durationMs = Number(boostOption.durationDays || 0) * 24 * 60 * 60 * 1000;
  const boostExpiresAt = durationMs ? new Date(now + durationMs) : new Date(now);

  const boostInsert = await client.query(
    `INSERT INTO post_boosts (post_id, user_id, boost_type, source, status, starts_at, expires_at, created_at)
     VALUES ($1, $2, $3, 'payment', 'active', NOW(), $4, NOW())
     RETURNING boost_id`,
    [postId, payment.user_id, boostType, boostExpiresAt]
  );

  const boostLevel = Number(boostOption.boostLevel || 0);
  await client.query(
    `UPDATE posts
     SET boost_level = GREATEST(COALESCE(boost_level, 0), $1)
     WHERE post_id::text = $2`,
    [boostLevel, String(postId)]
  );

  const successMessage = `Your ${boostOption.label || boostType} boost is now active${
    boostExpiresAt ? ` until ${boostExpiresAt.toLocaleDateString("en-IN")}` : ""
  }.`;

  await client.query(
    `INSERT INTO notifications (user_id, type, title, message, created_at)
     VALUES ($1, 'payment_verified', 'Boost Activated', $2, NOW())`,
    [payment.user_id, successMessage]
  );

  return {
    alreadyProcessed: false,
    boostExpiresAt,
    boostId: boostInsert.rows[0]?.boost_id || null,
  };
}

// ---------------------------------------------------------------------------
// Exported route handlers
// ---------------------------------------------------------------------------

/**
 * POST /payments/validate-promo - Validate a promotional code for a plan.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.validatePromoCode = async (req, res) => {
  try {
    const { code, plan_type } = req.body;
    if (!code || !plan_type) {
      return res.status(400).json({ error: "code and plan_type required" });
    }

    const result = applyPromoCode(code, plan_type);
    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ valid: true, code: code.toUpperCase(), ...result });
  } catch (err) {
    logger.error("[Payment] Promo validation error:", err);
    res.status(500).json({ error: "Failed to validate promo code" });
  }
};

/**
 * POST /payments/:id/retry - Retry a rejected or expired payment with a new transaction ID.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.retryPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const authUserId = getAuthenticatedUserId(req);
    const { transaction_id } = req.body;
    const schemaConfig = await getPaymentsSchemaConfig();

    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    await ensurePaymentsExtendedSchema();

    const resolvedUserContext = await resolvePaymentUserContext(authUserId);
    if (!resolvedUserContext) {
      return res.status(403).json({
        error: "Unable to map authenticated account to payment records",
      });
    }

    const paymentResult = await runQuery(
      schemaConfig.hasRetryCount
        ? "SELECT status, retry_count FROM payments WHERE id = $1 AND user_id::text = $2"
        : "SELECT status FROM payments WHERE id = $1 AND user_id::text = $2",
      [id, String(resolvedUserContext.paymentUserId)]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const payment = paymentResult.rows[0];
    if (!["rejected", "expired"].includes(payment.status)) {
      return res.status(400).json({
        error: `Cannot retry a payment with status: ${payment.status}`,
      });
    }

    const retryCount = schemaConfig.hasRetryCount
      ? (payment.retry_count || 0) + 1
      : 1;

    if (schemaConfig.hasRetryCount && retryCount > 3) {
      return res.status(400).json({
        error: "Maximum retry attempts (3) reached. Please contact support.",
      });
    }

    if (!transaction_id || transaction_id.length < 6) {
      return res.status(400).json({
        error: "New transaction ID required (min 6 chars)",
      });
    }

    const dupeCheck = await runQuery(
      "SELECT id FROM payments WHERE transaction_id = $1",
      [transaction_id]
    );
    if (dupeCheck.rows.length > 0) {
      return res.status(400).json({
        error: "Transaction ID already submitted",
      });
    }

    if (schemaConfig.hasRetryCount) {
      await runQuery(
        `UPDATE payments
         SET status = 'pending',
             transaction_id = $1,
             retry_count = $2${schemaConfig.hasUpdatedAt ? ", updated_at = NOW()" : ""}
         WHERE id = $3`,
        [transaction_id, retryCount, id]
      );
    } else {
      await runQuery(
        `UPDATE payments
         SET status = 'pending',
             transaction_id = $1${schemaConfig.hasUpdatedAt ? ", updated_at = NOW()" : ""}
         WHERE id = $2`,
        [transaction_id, id]
      );
    }

    invalidatePaymentCaches(authUserId);
    if (
      resolvedUserContext.canonicalUserId &&
      resolvedUserContext.canonicalUserId !== authUserId
    ) {
      invalidatePaymentCaches(resolvedUserContext.canonicalUserId);
    }

    logger.info(
      `[Payment] Retry #${retryCount}: Payment ${id} by User ${resolvedUserContext.paymentUserId}`
    );

    res.json({
      success: true,
      message: schemaConfig.hasRetryCount
        ? `Payment resubmitted (attempt ${retryCount}/3)`
        : "Payment resubmitted",
      retry_count: schemaConfig.hasRetryCount ? retryCount : null,
    });
  } catch (err) {
    logger.error("[Payment] Retry error:", err);
    res.status(500).json({ error: "Failed to retry payment" });
  }
};

/**
 * POST /payments/razorpay/order - Create a Razorpay order for instant payment.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const credentials = getRazorpayCredentials();
    if (!credentials) {
      return res.status(503).json({
        error: "Payment gateway is not configured. Try manual UPI instead.",
      });
    }

    await ensurePaymentsExtendedSchema();

    const resolvedUserContext = await resolvePaymentUserContext(authUserId);
    if (!resolvedUserContext) {
      return res.status(403).json({
        error: "Unable to map authenticated account to payment records",
      });
    }

    const {
      plan_type,
      boost_type,
      boostType,
      post_id,
      postId,
      payment_method,
    } = req.body;

    const normalizedBoostType = parseOptionalString(boost_type || boostType);
    const normalizedPostId = parseOptionalString(post_id || postId);
    const purchaseType = normalizedBoostType
      ? PURCHASE_TYPES.BOOST
      : PURCHASE_TYPES.SUBSCRIPTION;

    if (normalizedBoostType && plan_type) {
      return res.status(400).json({
        error: "Provide either plan_type or boost_type, not both",
      });
    }

    let expectedAmount = null;
    let postSnapshot = null;

    if (purchaseType === PURCHASE_TYPES.SUBSCRIPTION) {
      if (!plan_type || !SUPPORTED_PLANS.includes(plan_type)) {
        return res.status(400).json({
          error:
            "Invalid plan type. Must be: basic, bronze, silver, or premium",
        });
      }
      expectedAmount = resolveExpectedAmountForPlan(plan_type);
    } else {
      if (!getBoostPurchaseOption(normalizedBoostType)) {
        return res.status(400).json({
          error: "Invalid boost type. Must be: boost, featured, or spotlight",
          options: Object.keys(BOOST_PURCHASE_OPTIONS),
        });
      }
      if (!normalizedPostId) {
        return res.status(400).json({
          error: "postId is required for boost payments",
        });
      }
      expectedAmount = resolveExpectedAmountForBoost(normalizedBoostType);

      const ownershipUserId =
        resolvedUserContext.canonicalUserId || authUserId;
      const postCheck = await runQuery(
        "SELECT user_id, title, status FROM posts WHERE post_id::text = $1 LIMIT 1",
        [normalizedPostId]
      );
      if (!postCheck.rows.length) {
        return res.status(404).json({ error: "Post not found" });
      }
      if (String(postCheck.rows[0].user_id) !== String(ownershipUserId)) {
        return res
          .status(403)
          .json({ error: "You can only boost your own posts" });
      }
      if (postCheck.rows[0].status !== "active") {
        return res
          .status(400)
          .json({ error: "Only active posts can be boosted" });
      }
      postSnapshot = postCheck.rows[0];
    }

    if (expectedAmount === null) {
      return res.status(500).json({
        error: "Invalid purchase configuration. Contact support.",
      });
    }

    const paymentUserId = resolvedUserContext.paymentUserId;
    const pendingCheckQuery =
      purchaseType === PURCHASE_TYPES.BOOST
        ? runQuery(
            `SELECT id FROM payments
             WHERE user_id::text = $1
               AND purchase_type = $2
               AND boost_type = $3
               AND post_id::text = $4
               AND status = 'pending'`,
            [
              String(paymentUserId),
              PURCHASE_TYPES.BOOST,
              normalizedBoostType,
              String(normalizedPostId),
            ]
          )
        : runQuery(
            `SELECT id FROM payments
             WHERE user_id::text = $1
               AND plan_purchased = $2
               AND status = 'pending'`,
            [String(paymentUserId), plan_type]
          );

    const pendingCheck = await pendingCheckQuery;
    if (pendingCheck.rows.length > 0) {
      return res.status(400).json({
        error:
          purchaseType === PURCHASE_TYPES.BOOST
            ? "You already have a pending boost payment for this post. Please wait for verification."
            : "You already have a pending payment for this plan. Please wait for verification.",
        pending_id: pendingCheck.rows[0].id,
      });
    }

    const receipt = buildRazorpayReceipt({
      purchaseType,
      planType: purchaseType === PURCHASE_TYPES.SUBSCRIPTION ? plan_type : null,
      boostType: purchaseType === PURCHASE_TYPES.BOOST ? normalizedBoostType : null,
      postId: purchaseType === PURCHASE_TYPES.BOOST ? normalizedPostId : null,
      userId: resolvedUserContext.canonicalUserId || paymentUserId,
    });

    const order = await createRazorpayOrder({
      amountInr: expectedAmount,
      receipt,
      notes: {
        purchase_type: purchaseType,
        plan: purchaseType === PURCHASE_TYPES.SUBSCRIPTION ? plan_type : null,
        boost_type:
          purchaseType === PURCHASE_TYPES.BOOST ? normalizedBoostType : null,
        post_id:
          purchaseType === PURCHASE_TYPES.BOOST ? normalizedPostId : null,
        user_id: resolvedUserContext.canonicalUserId || paymentUserId,
      },
    });

    if (!order || !order.id) {
      return res.status(502).json({
        error: "Failed to create payment order. Please try again.",
      });
    }

    const normalizedMethod = parseOptionalString(payment_method)?.toLowerCase();
    const allowedMethods = new Set([
      "upi",
      "card",
      "netbanking",
      "wallet",
      "manual",
    ]);
    const paymentMethod = allowedMethods.has(normalizedMethod)
      ? normalizedMethod
      : "upi";

    const metadata =
      purchaseType === PURCHASE_TYPES.BOOST && postSnapshot
        ? { post_title: postSnapshot.title, gateway_order_id: order.id }
        : { gateway_order_id: order.id };

    const insertResult = await runQuery(
      `INSERT INTO payments
         (user_id, amount, payment_method, status, plan_purchased, expires_at, purchase_type, boost_type, post_id, metadata, payment_provider, provider_order_id)
       VALUES ($1, $2, $3, 'pending', $4, NOW() + INTERVAL '48 hours', $5, $6, $7, $8, $9, $10)
       RETURNING id, created_at`,
      [
        paymentUserId,
        expectedAmount,
        paymentMethod,
        purchaseType === PURCHASE_TYPES.SUBSCRIPTION ? plan_type : null,
        purchaseType,
        purchaseType === PURCHASE_TYPES.BOOST ? normalizedBoostType : null,
        purchaseType === PURCHASE_TYPES.BOOST ? normalizedPostId : null,
        JSON.stringify(metadata),
        "razorpay",
        order.id,
      ]
    );

    const userProfile = await runQuery(
      `SELECT u.email, p.full_name, p.phone
       FROM users u
       LEFT JOIN profiles p ON p.user_id::text = u.user_id::text
       WHERE u.user_id::text = $1
       LIMIT 1`,
      [String(resolvedUserContext.canonicalUserId || paymentUserId)]
    );

    const prefillRow = userProfile.rows[0] || {};
    const prefill = {
      name: prefillRow.full_name || undefined,
      email: prefillRow.email || undefined,
      contact: prefillRow.phone || undefined,
    };

    invalidatePaymentCaches(authUserId);
    if (
      resolvedUserContext.canonicalUserId &&
      resolvedUserContext.canonicalUserId !== authUserId
    ) {
      invalidatePaymentCaches(resolvedUserContext.canonicalUserId);
    }

    return res.status(201).json({
      success: true,
      payment_id: insertResult.rows[0]?.id,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      key_id: credentials.keyId,
      purchase_type: purchaseType,
      plan: purchaseType === PURCHASE_TYPES.SUBSCRIPTION ? plan_type : null,
      boost_type:
        purchaseType === PURCHASE_TYPES.BOOST ? normalizedBoostType : null,
      post_id: purchaseType === PURCHASE_TYPES.BOOST ? normalizedPostId : null,
      prefill,
    });
  } catch (error) {
    logger.error("[Payment] Razorpay order error:", error);
    return res.status(500).json({
      error: "Failed to create payment order",
    });
  }
};

/**
 * POST /payments/razorpay/verify - Verify Razorpay payment signature and auto-apply.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: "Razorpay order, payment, and signature are required",
      });
    }

    const credentials = getRazorpayCredentials();
    if (!credentials) {
      return res.status(503).json({
        error: "Payment gateway is not configured. Try manual UPI instead.",
      });
    }

    const signatureOk = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      credentials.keySecret
    );

    if (!signatureOk) {
      return res.status(400).json({ error: "Invalid Razorpay signature" });
    }

    await ensurePaymentsExtendedSchema();

    const resolvedUserContext = await resolvePaymentUserContext(authUserId);
    if (!resolvedUserContext) {
      return res.status(403).json({
        error: "Unable to map authenticated account to payment records",
      });
    }

    const paymentResult = await runQuery(
      `SELECT id, user_id, status, plan_purchased, amount, purchase_type, boost_type, post_id, transaction_id
       FROM payments
       WHERE provider_order_id = $1
       LIMIT 1`,
      [razorpay_order_id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment order not found" });
    }

    const payment = paymentResult.rows[0];
    const paymentUserId = String(payment.user_id);
    const resolvedPaymentUserId = String(resolvedUserContext.paymentUserId);

    if (paymentUserId !== resolvedPaymentUserId) {
      return res.status(403).json({
        error: "You are not authorized to verify this payment",
      });
    }

    if (payment.status === "verified") {
      return res.json({
        success: true,
        already_verified: true,
        payment_id: payment.id,
      });
    }

    if (payment.status !== "pending") {
      return res.status(409).json({
        error: `Payment is ${payment.status}`,
      });
    }

    const duplicateCheck = await runQuery(
      `SELECT id FROM payments WHERE transaction_id = $1 AND id <> $2`,
      [razorpay_payment_id, payment.id]
    );
    if (duplicateCheck.rows.length) {
      return res.status(409).json({
        error: "This Razorpay payment has already been applied",
      });
    }

    const normalizedPurchaseType = parseOptionalString(payment.purchase_type);
    const purchaseType =
      normalizedPurchaseType ||
      (payment.boost_type ? PURCHASE_TYPES.BOOST : PURCHASE_TYPES.SUBSCRIPTION);
    const isBoostPurchase = purchaseType === PURCHASE_TYPES.BOOST;
    const expectedAmount = isBoostPurchase
      ? resolveExpectedAmountForBoost(payment.boost_type)
      : resolveExpectedAmountForPlan(payment.plan_purchased);

    if (expectedAmount === null) {
      return res.status(500).json({
        error: "Invalid purchase configuration. Contact support.",
      });
    }

    if (!amountsEquivalent(expectedAmount, payment.amount)) {
      return res.status(400).json({
        error: "Payment amount mismatch with plan rules",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `UPDATE payments
         SET transaction_id = COALESCE(transaction_id, $1),
             payment_provider = COALESCE(payment_provider, 'razorpay'),
             provider_payment_id = COALESCE(provider_payment_id, $1),
             provider_signature = COALESCE(provider_signature, $2)
         WHERE id = $3`,
        [razorpay_payment_id, razorpay_signature, payment.id]
      );

      const updatedPayment = {
        ...payment,
        transaction_id: payment.transaction_id || razorpay_payment_id,
      };

      const applied = isBoostPurchase
        ? await applyVerifiedBoostPayment(client, updatedPayment, {
            verifiedBy: null,
            adminNotes: "Auto-verified via Razorpay checkout",
            paymentReference: razorpay_payment_id,
          })
        : await applyVerifiedPayment(client, updatedPayment, {
            verifiedBy: null,
            adminNotes: "Auto-verified via Razorpay checkout",
            paymentReference: razorpay_payment_id,
          });

      if (applied.alreadyProcessed) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Payment already processed by another workflow",
        });
      }

      await client.query("COMMIT");
      invalidatePaymentCaches(payment.user_id);

      return res.json({
        success: true,
        payment_id: payment.id,
        plan: isBoostPurchase ? null : payment.plan_purchased,
        boost_type: isBoostPurchase ? payment.boost_type : null,
        post_id: isBoostPurchase ? payment.post_id : null,
        amount: payment.amount,
        expires_at: isBoostPurchase ? applied.boostExpiresAt : applied.endDate,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error("[Payment] Razorpay verify error:", error);
    return res.status(500).json({ error: "Failed to verify Razorpay payment" });
  }
};

/**
 * POST /payments/submit - Submit a new payment for verification.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.submitPayment = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    const {
      plan_type,
      transaction_id,
      upi_id,
      payment_method = "upi",
      boost_type,
      boostType,
      post_id,
      postId,
    } = req.body;

    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    await ensurePaymentsExtendedSchema();

    const resolvedUserContext = await resolvePaymentUserContext(authUserId);
    if (!resolvedUserContext) {
      return res.status(403).json({
        error: "Unable to map authenticated account to payment records",
      });
    }

    const paymentUserId = resolvedUserContext.paymentUserId;
    const notificationUserId =
      resolvedUserContext.canonicalUserId || paymentUserId;

    const normalizedBoostType = parseOptionalString(boost_type || boostType);
    const normalizedPostId = parseOptionalString(post_id || postId);
    const purchaseType = normalizedBoostType
      ? PURCHASE_TYPES.BOOST
      : PURCHASE_TYPES.SUBSCRIPTION;

    if (normalizedBoostType && plan_type) {
      return res.status(400).json({
        error: "Provide either plan_type or boost_type, not both",
      });
    }

    if (purchaseType === PURCHASE_TYPES.SUBSCRIPTION) {
      if (!plan_type || !SUPPORTED_PLANS.includes(plan_type)) {
        return res.status(400).json({
          error:
            "Invalid plan type. Must be: basic, bronze, silver, or premium",
        });
      }
    } else {
      const option = getBoostPurchaseOption(normalizedBoostType);
      if (!option) {
        return res.status(400).json({
          error: "Invalid boost type. Must be: boost, featured, or spotlight",
          options: Object.keys(BOOST_PURCHASE_OPTIONS),
        });
      }
      if (!normalizedPostId) {
        return res.status(400).json({
          error: "postId is required for boost payments",
        });
      }
    }

    if (!transaction_id || transaction_id.length < 6) {
      return res.status(400).json({
        error: "Valid transaction ID required (min 6 characters)",
      });
    }

    let expectedAmount = null;
    let boostMeta = null;
    let postSnapshot = null;

    if (purchaseType === PURCHASE_TYPES.SUBSCRIPTION) {
      const rules = getTierRules(plan_type);
      expectedAmount = rules.priceINR;
      if (!expectedAmount || expectedAmount <= 0) {
        return res.status(500).json({
          error: "Invalid plan configuration. Contact support.",
        });
      }
    } else {
      boostMeta = getBoostPurchaseOption(normalizedBoostType);
      expectedAmount = resolveExpectedAmountForBoost(normalizedBoostType);
      if (expectedAmount === null) {
        return res.status(500).json({
          error: "Invalid boost configuration. Contact support.",
        });
      }

      const ownershipUserId = resolvedUserContext.canonicalUserId || authUserId;
      const postCheck = await runQuery(
        "SELECT user_id, title, status FROM posts WHERE post_id::text = $1 LIMIT 1",
        [normalizedPostId],
      );
      if (!postCheck.rows.length) {
        return res.status(404).json({ error: "Post not found" });
      }
      if (String(postCheck.rows[0].user_id) !== String(ownershipUserId)) {
        return res
          .status(403)
          .json({ error: "You can only boost your own posts" });
      }
      if (postCheck.rows[0].status !== "active") {
        return res.status(400).json({ error: "Only active posts can be boosted" });
      }
      postSnapshot = postCheck.rows[0];
    }
    const pendingCheckQuery =
      purchaseType === PURCHASE_TYPES.BOOST
        ? runQuery(
            `SELECT id FROM payments
             WHERE user_id::text = $1
               AND purchase_type = $2
               AND boost_type = $3
               AND post_id::text = $4
               AND status = 'pending'`,
            [
              String(paymentUserId),
              PURCHASE_TYPES.BOOST,
              normalizedBoostType,
              String(normalizedPostId),
            ],
          )
        : runQuery(
            `SELECT id FROM payments
             WHERE user_id::text = $1
               AND plan_purchased = $2
               AND status = 'pending'`,
            [String(paymentUserId), plan_type],
          );

    const [existing, pendingCheck] = await Promise.all([
      runQuery("SELECT id FROM payments WHERE transaction_id = $1", [
        transaction_id,
      ]),
      pendingCheckQuery,
    ]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "This transaction ID has already been submitted",
      });
    }

    if (pendingCheck.rows.length > 0) {
      return res.status(400).json({
        error:
          purchaseType === PURCHASE_TYPES.BOOST
            ? "You already have a pending boost payment for this post. Please wait for verification."
            : "You already have a pending payment for this plan. Please wait for verification.",
        pending_id: pendingCheck.rows[0].id,
      });
    }

    const result = await runQuery(
      `INSERT INTO payments
         (user_id, amount, payment_method, transaction_id, upi_id, status, plan_purchased, expires_at, purchase_type, boost_type, post_id, metadata)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW() + INTERVAL '48 hours', $7, $8, $9, $10)
       RETURNING id, created_at`,
      [
        paymentUserId,
        expectedAmount,
        payment_method,
        transaction_id,
        upi_id || null,
        purchaseType === PURCHASE_TYPES.SUBSCRIPTION ? plan_type : null,
        purchaseType,
        purchaseType === PURCHASE_TYPES.BOOST ? normalizedBoostType : null,
        purchaseType === PURCHASE_TYPES.BOOST ? normalizedPostId : null,
        purchaseType === PURCHASE_TYPES.BOOST && postSnapshot
          ? JSON.stringify({ post_title: postSnapshot.title })
          : null,
      ]
    );

    const submissionMessage =
      purchaseType === PURCHASE_TYPES.BOOST
        ? `Your payment of INR ${expectedAmount} for ${boostMeta?.label || normalizedBoostType} boost${postSnapshot?.title ? ` on "${postSnapshot.title}"` : ""} is being verified. This usually takes 2-4 hours.`
        : `Your payment of INR ${expectedAmount} for ${plan_type.toUpperCase()} plan is being verified. This usually takes 2-4 hours.`;

    await runQuery(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'payment_submitted', 'Payment Submitted', $2, NOW())`,
      [notificationUserId, submissionMessage]
    );

    invalidatePaymentCaches(authUserId);
    if (notificationUserId !== authUserId) {
      invalidatePaymentCaches(notificationUserId);
    }

    logger.info(
      `[Payment] New submission: User ${paymentUserId}, ${
        purchaseType === PURCHASE_TYPES.BOOST
          ? `Boost: ${normalizedBoostType}, Post: ${normalizedPostId}`
          : `Plan: ${plan_type}`
      }, Amount: INR ${expectedAmount}, TxnID: ${transaction_id}`
    );

    res.status(201).json({
      success: true,
      message: "Payment submitted for verification",
      payment_id: result.rows[0].id,
      amount: expectedAmount,
      plan: purchaseType === PURCHASE_TYPES.SUBSCRIPTION ? plan_type : null,
      boost_type: purchaseType === PURCHASE_TYPES.BOOST ? normalizedBoostType : null,
      post_id: purchaseType === PURCHASE_TYPES.BOOST ? normalizedPostId : null,
      purchase_type: purchaseType,
      expected_verification_time: "2-4 hours",
      status: "pending",
    });
  } catch (err) {
    logger.error("[Payment] Submit error:", err);
    res.status(500).json({ error: "Failed to submit payment" });
  }
};

/**
 * GET /payments/status - Get the authenticated user's recent payment history.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const authUserId = getAuthenticatedUserId(req);
    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    await ensurePaymentsExtendedSchema();

    const resolvedUserContext = await resolvePaymentUserContext(authUserId);
    if (!resolvedUserContext) {
      return res.status(403).json({
        error: "Unable to map authenticated account to payment records",
      });
    }

    const paymentUserId = String(resolvedUserContext.paymentUserId);
    const cacheKeyIdentity =
      resolvedUserContext.canonicalUserId || authUserId;
    const cacheKey = `payments:${cacheKeyIdentity}:status`;

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `SELECT id, amount, plan_purchased, purchase_type, boost_type, post_id,
                  status, transaction_id, created_at, verified_at, expires_at, metadata
           FROM payments
           WHERE user_id::text = $1
           ORDER BY created_at DESC
           LIMIT 10`,
          [paymentUserId]
        );
        return {
          payments: result.rows,
          has_pending: result.rows.some((p) => p.status === "pending"),
        };
      },
      PAYMENT_STATUS_CACHE_TTL_SECONDS
    );

    res.json(payload);
  } catch (err) {
    logger.error("[Payment] Status error:", err);
    res.status(500).json({ error: "Failed to fetch payment status" });
  }
};

/**
 * GET /payments/pending - List pending payments (admin). Supports pagination.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getPendingPayments = async (req, res) => {
  try {
    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(
      req.query.limit,
      DEFAULT_PENDING_LIMIT,
      MAX_PENDING_LIMIT
    );
    const offset = (page - 1) * limit;

    await ensurePaymentsExtendedSchema();

    const cacheKey = `payments:pending:${page}:${limit}`;

    const payload = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(
          `SELECT
             COUNT(*) OVER()::int AS total_count,
             p.id,
            p.user_id,
            p.amount,
            p.plan_purchased,
            p.purchase_type,
            p.boost_type,
            p.post_id,
            p.transaction_id,
            p.upi_id,
            p.payment_method,
             p.created_at,
             p.expires_at,
             u.email AS user_email,
             pr.full_name AS user_name,
             pr.phone AS user_phone
           FROM payments p
           LEFT JOIN users u ON p.user_id::text = u.user_id::text
           LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
           WHERE p.status = 'pending'
           ORDER BY p.created_at ASC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        );

        const pendingCount = result.rows.length
          ? result.rows[0].total_count
          : 0;
        const payments = result.rows.map(
          ({ total_count, ...payment }) => payment
        );

        return {
          pending_count: pendingCount,
          payments,
          page,
          limit,
        };
      },
      PAYMENT_PENDING_CACHE_TTL_SECONDS
    );

    res.json(payload);
  } catch (err) {
    logger.error("[Payment] Pending list error:", err);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
};

/**
 * POST /payments/:id/verify - Admin: verify a pending payment and upgrade the user.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminIdRaw = getAuthenticatedUserId(req);

    if (!adminIdRaw) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const adminId = await resolveCanonicalUserId(adminIdRaw);
    if (!adminId) {
      return res.status(403).json({ error: "Unable to map admin account" });
    }

    const { admin_notes } = req.body;

    await ensurePaymentsExtendedSchema();

    const paymentResult = await runQuery(
      `SELECT id, user_id, status, plan_purchased, amount, purchase_type, boost_type, post_id
       FROM payments
       WHERE id = $1`,
      [id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== "pending") {
      return res
        .status(400)
        .json({ error: `Payment already ${payment.status}` });
    }

    const { user_id, plan_purchased } = payment;
    const normalizedPurchaseType = parseOptionalString(payment.purchase_type);
    const purchaseType =
      normalizedPurchaseType ||
      (payment.boost_type ? PURCHASE_TYPES.BOOST : PURCHASE_TYPES.SUBSCRIPTION);
    const isBoostPurchase = purchaseType === PURCHASE_TYPES.BOOST;
    const expectedAmount = isBoostPurchase
      ? resolveExpectedAmountForBoost(payment.boost_type)
      : resolveExpectedAmountForPlan(plan_purchased);

    if (expectedAmount === null) {
      return res.status(500).json({
        error: isBoostPurchase
          ? "Invalid boost configuration. Contact support."
          : "Invalid plan configuration. Contact support.",
      });
    }

    if (isBoostPurchase) {
      if (!parseOptionalString(payment.boost_type) || !parseOptionalString(payment.post_id)) {
        return res.status(400).json({
          error: "Boost payment is missing boost_type or post_id.",
        });
      }
    }

    if (!amountsEquivalent(expectedAmount, payment.amount)) {
      logger.error(
        `[SECURITY] Payment amount mismatch for ID ${id}:`
      );
      logger.error(
        `  Expected: INR ${expectedAmount}, Received: INR ${payment.amount}`
      );
      logger.error(
        isBoostPurchase
          ? `  Boost: ${payment.boost_type}, Post: ${payment.post_id}, User: ${user_id}`
          : `  Plan: ${plan_purchased}, User: ${user_id}`
      );
      return res.status(400).json({
        error: "Payment amount mismatch. Cannot approve.",
        details: {
          expected_amount: expectedAmount,
          received_amount: payment.amount,
          plan: isBoostPurchase ? null : plan_purchased,
          boost_type: isBoostPurchase ? payment.boost_type : null,
          post_id: isBoostPurchase ? payment.post_id : null,
          mismatch: payment.amount - expectedAmount,
        },
        action:
          "Please reject this payment and ask user to resubmit with correct amount",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const applied = isBoostPurchase
        ? await applyVerifiedBoostPayment(client, payment, {
            verifiedBy: adminId || null,
            adminNotes: admin_notes || null,
            paymentReference: `payment_${id}`,
          })
        : await applyVerifiedPayment(client, payment, {
            verifiedBy: adminId || null,
            adminNotes: admin_notes || null,
            paymentReference: `payment_${id}`,
          });

      if (applied.alreadyProcessed) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          error: "Payment already processed by another workflow",
        });
      }

      await client.query("COMMIT");
      invalidatePaymentCaches(user_id);

      logger.info(
        isBoostPurchase
          ? `[Payment] Verified: ID ${id}, User ${user_id}, Boost: ${payment.boost_type}, Post: ${payment.post_id}, Amount: INR ${payment.amount}`
          : `[Payment] Verified: ID ${id}, User ${user_id}, Plan: ${plan_purchased}, Amount: INR ${payment.amount}`
      );

      return res.json({
        success: true,
        message: isBoostPurchase
          ? `Payment verified. ${String(payment.boost_type || "boost").toUpperCase()} boost activated.`
          : `Payment verified. User upgraded to ${plan_purchased.toUpperCase()}`,
        user_id,
        plan: isBoostPurchase ? null : plan_purchased,
        boost_type: isBoostPurchase ? payment.boost_type : null,
        post_id: isBoostPurchase ? payment.post_id : null,
        amount: payment.amount,
        expires_at: isBoostPurchase ? applied.boostExpiresAt : applied.endDate,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error("[Payment] Verify error:", err);
    return res.status(500).json({ error: "Failed to verify payment" });
  }
};

/**
 * POST /payments/:id/reject - Admin: reject a pending payment.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.rejectPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const adminIdRaw = getAuthenticatedUserId(req);

    if (!adminIdRaw) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const adminId = await resolveCanonicalUserId(adminIdRaw);
    if (!adminId) {
      return res.status(403).json({ error: "Unable to map admin account" });
    }

    const { admin_notes, reason } = req.body;

    const paymentResult = await runQuery(
      `SELECT id, user_id, status
       FROM payments
       WHERE id = $1`,
      [id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: "Payment not found" });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== "pending") {
      return res
        .status(400)
        .json({ error: `Payment already ${payment.status}` });
    }

    await runQuery(
      `UPDATE payments
       SET status = 'rejected',
           verified_by = $1,
           verified_at = NOW(),
           admin_notes = $2
       WHERE id = $3`,
      [
        adminId,
        admin_notes || reason || "Transaction could not be verified",
        id,
      ]
    );

    await runQuery(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'payment_rejected', 'Payment Not Verified', $2, NOW())`,
      [
        payment.user_id,
        `Your payment could not be verified. Reason: ${
          reason || "Transaction ID not found"
        }. Please contact support if you believe this is an error.`,
      ]
    );

    invalidatePaymentCaches(payment.user_id);

    logger.info(
      `[Payment] Rejected: ID ${id}, User ${payment.user_id}`
    );

    res.json({ success: true, message: "Payment rejected", payment_id: id });
  } catch (err) {
    logger.error("[Payment] Reject error:", err);
    res.status(500).json({ error: "Failed to reject payment" });
  }
};

/**
 * GET /payments/stats - Aggregated payment statistics (admin).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getPaymentStats = async (req, res) => {
  try {
    const payload = await cacheService.getOrSetWithStampedeProtection(
      "payments:stats",
      async () => {
        const [stats, planBreakdown] = await Promise.all([
          runQuery(
            `SELECT
               COUNT(*) FILTER (WHERE status = 'pending')  AS pending_count,
               COUNT(*) FILTER (WHERE status = 'verified') AS verified_count,
               COUNT(*) FILTER (WHERE status = 'rejected') AS rejected_count,
               COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) AS total_revenue,
               COALESCE(SUM(amount) FILTER (WHERE status = 'verified' AND created_at > NOW() - INTERVAL '30 days'), 0) AS revenue_30d,
               COALESCE(SUM(amount) FILTER (WHERE status = 'verified' AND created_at > NOW() - INTERVAL '7 days'), 0)  AS revenue_7d
             FROM payments`
          ),
          runQuery(
            `SELECT
               plan_purchased,
               COUNT(*) AS count,
               SUM(amount) AS total
             FROM payments
             WHERE status = 'verified'
             GROUP BY plan_purchased`
          ),
        ]);
        return { ...stats.rows[0], by_plan: planBreakdown.rows };
      },
      PAYMENT_STATS_CACHE_TTL_SECONDS
    );

    res.json(payload);
  } catch (err) {
    logger.error("[Payment] Stats error:", err);
    res.status(500).json({ error: "Failed to fetch payment stats" });
  }
};

/**
 * GET /payments/reconciliation - Generate or retrieve a reconciliation report (admin).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getReconciliationReport = async (req, res) => {
  try {
    if (!hasPaymentAdminAccess(req)) {
      return res.status(403).json({
        error: "Admin access required for reconciliation reports",
      });
    }

    const lookbackHours = parsePositiveInt(
      req.query.lookback_hours,
      Number.parseInt(process.env.PAYMENT_RECON_LOOKBACK_HOURS, 10) || 72,
      24 * 90
    );
    const stalePendingHours = parsePositiveInt(
      req.query.stale_pending_hours,
      Number.parseInt(process.env.PAYMENT_RECON_STALE_PENDING_HOURS, 10) || 6,
      24 * 30
    );
    const sampleLimit = parsePositiveInt(
      req.query.sample_limit,
      Number.parseInt(process.env.PAYMENT_RECON_SAMPLE_LIMIT, 10) || 25,
      200
    );
    const pendingScanLimit = parsePositiveInt(
      req.query.pending_scan_limit,
      Number.parseInt(process.env.PAYMENT_RECON_PENDING_SCAN_LIMIT, 10) || 5000,
      20000
    );
    const useCached = parseBoolean(req.query.cached, false);

    if (useCached) {
      const cachedReport = getLastPaymentReconciliationReport();
      if (cachedReport) {
        return res.json({
          success: true,
          cached: true,
          reconciliation: cachedReport,
        });
      }
    }

    const report = await buildPaymentReconciliationReport({
      lookbackHours,
      stalePendingHours,
      sampleLimit,
      pendingScanLimit,
    });

    return res.json({
      success: true,
      cached: false,
      reconciliation: report,
    });
  } catch (err) {
    logger.error("[Payment] Reconciliation report error:", err);
    return res.status(500).json({
      error: "Failed to generate reconciliation report",
    });
  }
};

/**
 * POST /payments/reconciliation/run - Execute a reconciliation workflow (admin).
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.runReconciliation = async (req, res) => {
  try {
    if (!hasPaymentAdminAccess(req)) {
      return res.status(403).json({
        error: "Admin access required for reconciliation runs",
      });
    }

    const requestPayload = req.body || {};

    const lookbackHours = parsePositiveInt(
      requestPayload.lookback_hours ?? req.query.lookback_hours,
      Number.parseInt(process.env.PAYMENT_RECON_LOOKBACK_HOURS, 10) || 72,
      24 * 90
    );
    const stalePendingHours = parsePositiveInt(
      requestPayload.stale_pending_hours ?? req.query.stale_pending_hours,
      Number.parseInt(process.env.PAYMENT_RECON_STALE_PENDING_HOURS, 10) || 6,
      24 * 30
    );
    const sampleLimit = parsePositiveInt(
      requestPayload.sample_limit ?? req.query.sample_limit,
      Number.parseInt(process.env.PAYMENT_RECON_SAMPLE_LIMIT, 10) || 25,
      200
    );
    const pendingScanLimit = parsePositiveInt(
      requestPayload.pending_scan_limit ?? req.query.pending_scan_limit,
      Number.parseInt(process.env.PAYMENT_RECON_PENDING_SCAN_LIMIT, 10) || 5000,
      20000
    );
    const dryRun = parseBoolean(
      requestPayload.dry_run ?? req.query.dry_run,
      false
    );
    const adminId =
      req.user?.userId || req.user?.id || "unknown-admin";

    if (dryRun) {
      const report = await buildPaymentReconciliationReport({
        lookbackHours,
        stalePendingHours,
        sampleLimit,
        pendingScanLimit,
      });
      return res.json({
        success: true,
        dry_run: true,
        reconciliation: report,
      });
    }

    const reconciliationResult = await executePaymentReconciliation({
      lookbackHours,
      stalePendingHours,
      sampleLimit,
      pendingScanLimit,
      actor: `admin:${adminId}`,
    });

    return res.json({
      success: true,
      dry_run: false,
      reconciliation: reconciliationResult,
    });
  } catch (err) {
    logger.error("[Payment] Reconciliation run error:", err);
    return res.status(500).json({
      error: "Failed to run reconciliation workflow",
    });
  }
};

/**
 * GET /payments/upi-details - Return UPI payment instructions and plan tiers.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.getUpiDetails = async (req, res) => {
  const upiDetails = await cacheService.getOrSetWithStampedeProtection(
    "payments:upi-details",
    async () => {
      const razorpayKeyId = parseOptionalString(process.env.RAZORPAY_KEY_ID);
      const razorpayEnabled = Boolean(
        razorpayKeyId && parseOptionalString(process.env.RAZORPAY_KEY_SECRET)
      );
      const tiers = SUPPORTED_PLANS.reduce((acc, plan) => {
        const rules = getTierRules(plan);
        acc[plan] = {
          amount: rules.priceINR,
          description: rules.features?.[0] || `${rules.name} Plan`,
        };
        return acc;
      }, {});
      const boosts = Object.entries(BOOST_PURCHASE_OPTIONS).reduce(
        (acc, [key, option]) => {
          acc[key] = {
            amount: option.amount,
            description: option.description,
            label: option.label,
            durationDays: option.durationDays,
            boostLevel: option.boostLevel,
          };
          return acc;
        },
        {}
      );

      return {
        upi_id: process.env.UPI_ID || "merchant@upi",
        merchant_name: process.env.MERCHANT_NAME || "MHub Premium",
        gateway_enabled: razorpayEnabled,
        razorpay_key_id: razorpayEnabled ? razorpayKeyId : null,
        gateway_provider: razorpayEnabled ? "razorpay" : null,
        tiers,
        boosts,
        instructions: [
          "Open any UPI app (GPay, PhonePe, Paytm)",
          "Scan the QR code or enter UPI ID",
          "Pay the exact amount for your chosen plan or boost",
          "Copy the Transaction ID from payment confirmation",
          "Paste the Transaction ID in the form",
          "Wait for verification (usually 2-4 hours)",
        ],
      };
    },
    UPI_DETAILS_CACHE_TTL_SECONDS
  );

  res.json(upiDetails);
};

/**
 * POST /payments/webhook - Handle payment gateway webhooks (Razorpay / Stripe / generic).
 *
 * Validates the HMAC signature, deduplicates via replay keys, and auto-verifies
 * the payment when the webhook indicates a successful capture.
 *
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.handleWebhook = async (req, res) => {
  let replayKey = null;
  let replayLockHeld = false;

  try {
    const signature =
      req.headers["x-razorpay-signature"] ||
      req.headers["x-stripe-signature"] ||
      req.headers["x-webhook-signature"];

    if (!signature) {
      logger.warn("[Payment] Webhook rejected: Missing signature header");
      return res
        .status(403)
        .json({ error: "Invalid webhook: missing signature" });
    }

    const webhookSecret = getWebhookSecret();
    if (!webhookSecret) {
      logger.error("[Payment] WEBHOOK_SECRET not configured");
      return res
        .status(500)
        .json({ error: "Server configuration error" });
    }

    const rawPayload = req.rawBody
      ? req.rawBody.toString("utf8")
      : JSON.stringify(req.body || {});
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawPayload)
      .digest("hex");

    if (expectedSignature !== String(signature)) {
      logger.warn("[Payment] Webhook rejected: Invalid signature", {
        received: String(signature).substring(0, 16) + "...",
        ip: req.ip,
      });
      return res
        .status(403)
        .json({ error: "Invalid webhook signature" });
    }

    const context = extractWebhookContext(req, req.body || {});

    if (!context.transactionId && !context.orderId) {
      logger.warn("[Payment] Webhook rejected: Missing transaction/order ID");
      return res
        .status(400)
        .json({ error: "Invalid webhook payload: missing transaction ID" });
    }

    // Replay / dedup guard
    replayKey = buildWebhookReplayKey(
      context.provider,
      context.eventId,
      String(signature),
      rawPayload
    );

    const replayState = cacheService.get(replayKey);

    if (replayState?.state === "done") {
      return res.json({
        status: "ok",
        duplicate: true,
        replayKey,
      });
    }

    if (replayState?.state === "processing") {
      return res.json({
        status: "ok",
        in_progress: true,
        replayKey,
      });
    }

    cacheService.set(
      replayKey,
      { state: "processing", at: new Date().toISOString() },
      WEBHOOK_PROCESSING_TTL_SECONDS
    );
    replayLockHeld = true;

    // Non-success webhooks are acknowledged but ignored
    if (!isWebhookSuccess(context)) {
      cacheService.set(
        replayKey,
        { state: "done", ignored: true, reason: "non_success_status" },
        WEBHOOK_DEDUP_TTL_SECONDS
      );
      replayLockHeld = false;
      return res.json({
        status: "ok",
        ignored: true,
        reason: "Webhook status is not a success state",
      });
    }

    await ensurePaymentsExtendedSchema();

    // Look up payment by transaction ID
    let paymentResult = await runQuery(
      `SELECT id, user_id, status, plan_purchased, amount, purchase_type, boost_type, post_id,
              transaction_id, payment_provider, provider_order_id, provider_payment_id
       FROM payments
       WHERE transaction_id = $1
       LIMIT 1`,
      [context.transactionId]
    );

    if (paymentResult.rows.length === 0 && context.orderId) {
      paymentResult = await runQuery(
        `SELECT id, user_id, status, plan_purchased, amount, purchase_type, boost_type, post_id,
                transaction_id, payment_provider, provider_order_id, provider_payment_id
         FROM payments
         WHERE provider_order_id = $1
         LIMIT 1`,
        [context.orderId]
      );
    }

    if (paymentResult.rows.length === 0) {
      cacheService.set(
        replayKey,
        { state: "done", ignored: true, reason: "payment_not_found" },
        WEBHOOK_DEDUP_TTL_SECONDS
      );
      replayLockHeld = false;
      logger.warn("[Payment] Webhook payment not found", {
        transaction_id: context.transactionId,
        provider: context.provider,
        event_id: context.eventId || null,
      });
      return res.json({
        status: "ok",
        ignored: true,
        reason: "Payment record not found",
      });
    }

    const payment = paymentResult.rows[0];

    if (payment.status === "verified") {
      cacheService.set(
        replayKey,
        { state: "done", duplicate: true },
        WEBHOOK_DEDUP_TTL_SECONDS
      );
      replayLockHeld = false;
      return res.json({
        status: "ok",
        duplicate: true,
        reason: "Payment already verified",
      });
    }

    if (payment.status !== "pending") {
      cacheService.set(
        replayKey,
        { state: "done", ignored: true, reason: `status_${payment.status}` },
        WEBHOOK_DEDUP_TTL_SECONDS
      );
      replayLockHeld = false;
      return res.json({
        status: "ok",
        ignored: true,
        reason: `Payment is ${payment.status}`,
      });
    }

    if (context.transactionId || context.orderId) {
      await runQuery(
        `UPDATE payments
         SET transaction_id = COALESCE(transaction_id, $1),
             payment_provider = COALESCE(payment_provider, $2),
             provider_payment_id = COALESCE(provider_payment_id, $1),
             provider_order_id = COALESCE(provider_order_id, $3),
             provider_signature = COALESCE(provider_signature, $4)
         WHERE id = $5`,
        [
          context.transactionId || null,
          context.provider || null,
          context.orderId || null,
          String(signature || "") || null,
          payment.id,
        ]
      );

      if (!payment.transaction_id && context.transactionId) {
        payment.transaction_id = context.transactionId;
      }
      if (!payment.payment_provider && context.provider) {
        payment.payment_provider = context.provider;
      }
      if (!payment.provider_order_id && context.orderId) {
        payment.provider_order_id = context.orderId;
      }
    }

    // Amount validation
    const normalizedPurchaseType = parseOptionalString(payment.purchase_type);
    const purchaseType =
      normalizedPurchaseType ||
      (payment.boost_type ? PURCHASE_TYPES.BOOST : PURCHASE_TYPES.SUBSCRIPTION);
    const isBoostPurchase = purchaseType === PURCHASE_TYPES.BOOST;
    const expectedAmount = isBoostPurchase
      ? resolveExpectedAmountForBoost(payment.boost_type)
      : resolveExpectedAmountForPlan(payment.plan_purchased);
    if (expectedAmount === null) {
      throw new Error(
        isBoostPurchase
          ? `Invalid boost configuration for ${payment.boost_type}`
          : `Invalid plan configuration for ${payment.plan_purchased}`
      );
    }

    if (!amountsEquivalent(expectedAmount, payment.amount)) {
      logger.error("[Payment] Stored amount mismatch vs tier rule", {
        payment_id: payment.id,
        transaction_id: context.transactionId,
        expected: expectedAmount,
        stored: payment.amount,
        plan: isBoostPurchase ? null : payment.plan_purchased,
        boost_type: isBoostPurchase ? payment.boost_type : null,
      });
      cacheService.del(replayKey);
      replayLockHeld = false;
      return res
        .status(400)
        .json({ error: "Payment amount mismatch with plan rules" });
    }

    if (
      context.amount !== null &&
      context.amount !== undefined &&
      !amountsEquivalent(expectedAmount, context.amount)
    ) {
      logger.error("[Payment] Webhook amount mismatch", {
        payment_id: payment.id,
        transaction_id: context.transactionId,
        expected_inr: expectedAmount,
        webhook_amount: context.amount,
        plan: isBoostPurchase ? null : payment.plan_purchased,
        boost_type: isBoostPurchase ? payment.boost_type : null,
      });
      cacheService.del(replayKey);
      replayLockHeld = false;
      return res
        .status(400)
        .json({ error: "Webhook amount mismatch" });
    }

    // Apply the verification inside a transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const applied = isBoostPurchase
        ? await applyVerifiedBoostPayment(client, payment, {
            verifiedBy: null,
            adminNotes: `Auto-verified via webhook (${context.provider}${
              context.eventId ? `:${context.eventId}` : ""
            })`,
            paymentReference: context.transactionId,
          })
        : await applyVerifiedPayment(client, payment, {
            verifiedBy: null,
            adminNotes: `Auto-verified via webhook (${context.provider}${
              context.eventId ? `:${context.eventId}` : ""
            })`,
            paymentReference: context.transactionId,
          });

      if (applied.alreadyProcessed) {
        await client.query("ROLLBACK");
        cacheService.set(
          replayKey,
          { state: "done", duplicate: true },
          WEBHOOK_DEDUP_TTL_SECONDS
        );
        replayLockHeld = false;
        return res.json({
          status: "ok",
          duplicate: true,
          reason: "Payment processed concurrently",
        });
      }

      await client.query("COMMIT");
      invalidatePaymentCaches(payment.user_id);

      cacheService.set(
        replayKey,
        {
          state: "done",
          payment_id: payment.id,
          transaction_id: context.transactionId,
          provider: context.provider,
          verified_at: new Date().toISOString(),
        },
        WEBHOOK_DEDUP_TTL_SECONDS
      );
      replayLockHeld = false;

      logger.info("[Payment] Webhook processed successfully", {
        payment_id: payment.id,
        transaction_id: context.transactionId,
        user_id: payment.user_id,
        plan: isBoostPurchase ? null : payment.plan_purchased,
        boost_type: isBoostPurchase ? payment.boost_type : null,
        provider: context.provider,
        event_id: context.eventId || null,
      });

      return res.json({
        status: "ok",
        received: true,
        verified: true,
        payment_id: payment.id,
      });
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err) {
    if (replayLockHeld && replayKey) {
      cacheService.del(replayKey);
    }
    logger.error("[Payment] Webhook error:", err);
    return res
      .status(500)
      .json({ error: "Webhook processing failed" });
  }
};



