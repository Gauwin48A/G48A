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
const {
  buildPaymentReconciliationReport,
  executePaymentReconciliation,
  getLastPaymentReconciliationReport,
} = require("../services/paymentReconciliationService");
const logger = require("../utils/logger");
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

const INTEGER_COLUMN_TYPES = new Set(["smallint", "integer", "bigint"]);

// ---------------------------------------------------------------------------
// Schema-inspection cached promises
// ---------------------------------------------------------------------------

let paymentsSchemaConfigPromise = null;
let userSubscriptionsSchemaConfigPromise = null;
let usersSubscriptionIdColumnPromise = null;
let usersLegacyIdColumnPromise = null;

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
    userSubscriptionsSchemaConfigPromise = runQuery(
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
        "UPDATE user_subscriptions SET is_active = false WHERE user_id = $1 AND is_active = true",
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
    `UPDATE users SET ${assignments.join(", ")} WHERE user_id = $${params.length}`,
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
    } = req.body;

    if (!authUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const resolvedUserContext = await resolvePaymentUserContext(authUserId);
    if (!resolvedUserContext) {
      return res.status(403).json({
        error: "Unable to map authenticated account to payment records",
      });
    }

    const paymentUserId = resolvedUserContext.paymentUserId;
    const notificationUserId =
      resolvedUserContext.canonicalUserId || paymentUserId;

    if (!plan_type || !SUPPORTED_PLANS.includes(plan_type)) {
      return res.status(400).json({
        error:
          "Invalid plan type. Must be: basic, bronze, silver, or premium",
      });
    }

    if (!transaction_id || transaction_id.length < 6) {
      return res.status(400).json({
        error: "Valid transaction ID required (min 6 characters)",
      });
    }

    const rules = getTierRules(plan_type);
    const expectedAmount = rules.priceINR;
    if (!expectedAmount || expectedAmount <= 0) {
      return res.status(500).json({
        error: "Invalid plan configuration. Contact support.",
      });
    }

    const [existing, pendingCheck] = await Promise.all([
      runQuery("SELECT id FROM payments WHERE transaction_id = $1", [
        transaction_id,
      ]),
      runQuery(
        `SELECT id FROM payments
         WHERE user_id::text = $1
           AND plan_purchased = $2
           AND status = 'pending'`,
        [String(paymentUserId), plan_type]
      ),
    ]);

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: "This transaction ID has already been submitted",
      });
    }

    if (pendingCheck.rows.length > 0) {
      return res.status(400).json({
        error:
          "You already have a pending payment for this plan. Please wait for verification.",
        pending_id: pendingCheck.rows[0].id,
      });
    }

    const result = await runQuery(
      `INSERT INTO payments
         (user_id, amount, payment_method, transaction_id, upi_id, status, plan_purchased, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW() + INTERVAL '48 hours')
       RETURNING id, created_at`,
      [
        paymentUserId,
        expectedAmount,
        payment_method,
        transaction_id,
        upi_id || null,
        plan_type,
      ]
    );

    await runQuery(
      `INSERT INTO notifications (user_id, type, title, message, created_at)
       VALUES ($1, 'payment_submitted', 'Payment Submitted', $2, NOW())`,
      [
        notificationUserId,
        `Your payment of INR ${expectedAmount} for ${plan_type.toUpperCase()} plan is being verified. This usually takes 2-4 hours.`,
      ]
    );

    invalidatePaymentCaches(authUserId);
    if (notificationUserId !== authUserId) {
      invalidatePaymentCaches(notificationUserId);
    }

    logger.info(
      `[Payment] New submission: User ${paymentUserId}, Plan: ${plan_type}, Amount: INR ${expectedAmount}, TxnID: ${transaction_id}`
    );

    res.status(201).json({
      success: true,
      message: "Payment submitted for verification",
      payment_id: result.rows[0].id,
      amount: expectedAmount,
      plan: plan_type,
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
          `SELECT id, amount, plan_purchased, status, transaction_id,
                  created_at, verified_at, expires_at
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

    const paymentResult = await runQuery(
      `SELECT id, user_id, status, plan_purchased, amount
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
    const expectedAmount = resolveExpectedAmountForPlan(plan_purchased);

    if (expectedAmount === null) {
      return res.status(500).json({
        error: "Invalid plan configuration. Contact support.",
      });
    }

    if (!amountsEquivalent(expectedAmount, payment.amount)) {
      logger.error(
        `[SECURITY] Payment amount mismatch for ID ${id}:`
      );
      logger.error(
        `  Expected: INR ${expectedAmount}, Received: INR ${payment.amount}`
      );
      logger.error(`  Plan: ${plan_purchased}, User: ${user_id}`);
      return res.status(400).json({
        error: "Payment amount mismatch. Cannot approve.",
        details: {
          expected_amount: expectedAmount,
          received_amount: payment.amount,
          plan: plan_purchased,
          mismatch: payment.amount - expectedAmount,
        },
        action:
          "Please reject this payment and ask user to resubmit with correct amount",
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const applied = await applyVerifiedPayment(client, payment, {
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
        `[Payment] Verified: ID ${id}, User ${user_id}, Plan: ${plan_purchased}, Amount: INR ${payment.amount}`
      );

      return res.json({
        success: true,
        message: `Payment verified. User upgraded to ${plan_purchased.toUpperCase()}`,
        user_id,
        plan: plan_purchased,
        amount: payment.amount,
        expires_at: applied.endDate,
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
      const tiers = SUPPORTED_PLANS.reduce((acc, plan) => {
        const rules = getTierRules(plan);
        acc[plan] = {
          amount: rules.priceINR,
          description: rules.features?.[0] || `${rules.name} Plan`,
        };
        return acc;
      }, {});

      return {
        upi_id: process.env.UPI_ID || "merchant@upi",
        merchant_name: process.env.MERCHANT_NAME || "MHub Premium",
        tiers,
        instructions: [
          "Open any UPI app (GPay, PhonePe, Paytm)",
          "Scan the QR code or enter UPI ID",
          "Pay the exact amount for your chosen plan",
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

    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("[Payment] WEBHOOK_SECRET not configured");
      return res
        .status(500)
        .json({ error: "Server configuration error" });
    }

    const rawPayload = JSON.stringify(req.body || {});
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

    if (!context.transactionId) {
      logger.warn("[Payment] Webhook rejected: Missing transaction ID");
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

    // Look up payment by transaction ID
    const paymentResult = await runQuery(
      `SELECT id, user_id, status, plan_purchased, amount
       FROM payments
       WHERE transaction_id = $1
       LIMIT 1`,
      [context.transactionId]
    );

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

    // Amount validation
    const expectedAmount = resolveExpectedAmountForPlan(
      payment.plan_purchased
    );
    if (expectedAmount === null) {
      throw new Error(
        `Invalid plan configuration for ${payment.plan_purchased}`
      );
    }

    if (!amountsEquivalent(expectedAmount, payment.amount)) {
      logger.error("[Payment] Stored amount mismatch vs tier rule", {
        payment_id: payment.id,
        transaction_id: context.transactionId,
        expected: expectedAmount,
        stored: payment.amount,
        plan: payment.plan_purchased,
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
        plan: payment.plan_purchased,
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

      const applied = await applyVerifiedPayment(client, payment, {
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
        plan: payment.plan_purchased,
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
