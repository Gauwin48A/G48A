/**
 * Payment Controller
 * Zero-Cost UPI Verification System
 *
 * Flow:
 * 1. User selects plan -> Shows UPI QR/ID (with optional promo code)
 * 2. User pays via any UPI app
 * 3. User submits transaction ID
 * 4. Admin verifies in dashboard (or webhook auto-verifies)
 * 5. Subscription activated
 *
 * Additions:
 *  - Promo code validation endpoint
 *  - Retry tracking (max 3 retries per payment)
 *  - Duplicate heuristics (amount + time window)
 */

const pool = require('../config/db');
const { getTierRules, applyPromoCode } = require('../config/tierRules');
const cacheService = require('../services/cacheService');
const {
    buildPaymentReconciliationReport,
    executePaymentReconciliation,
    getLastPaymentReconciliationReport
} = require('../services/paymentReconciliationService');
const logger = require('../utils/logger');
const crypto = require('crypto');

const SUPPORTED_PLANS = ['basic', 'silver', 'premium'];
const DEFAULT_PENDING_LIMIT = 50;
const MAX_PENDING_LIMIT = 200;
const PAYMENT_STATUS_CACHE_TTL_SECONDS = 20;
const PAYMENT_PENDING_CACHE_TTL_SECONDS = 20;
const PAYMENT_STATS_CACHE_TTL_SECONDS = 30;
const UPI_DETAILS_CACHE_TTL_SECONDS = 3600;
const WEBHOOK_DEDUP_TTL_SECONDS = 24 * 60 * 60;
const WEBHOOK_PROCESSING_TTL_SECONDS = 2 * 60;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const INTEGER_COLUMN_TYPES = new Set(['smallint', 'integer', 'bigint']);
let paymentsSchemaConfigPromise = null;
let usersLegacyIdColumnPromise = null;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function parseOptionalString(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const normalized = parseOptionalString(value);
    if (!normalized || !/^\d+$/.test(normalized)) return fallback;
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function parseBoolean(value, fallback = false) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function getRequesterRole(req) {
    return String(req.user?.role || '').toLowerCase();
}

function hasPaymentAdminAccess(req) {
    const role = getRequesterRole(req);
    return role === 'admin' || role === 'superadmin';
}

function getAuthenticatedUserId(req) {
    return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function isUuidLike(value) {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value).trim());
}

async function getPaymentsSchemaConfig() {
    if (!paymentsSchemaConfigPromise) {
        paymentsSchemaConfigPromise = runQuery(
            `
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'payments'
                  AND column_name IN ('user_id', 'retry_count', 'updated_at')
            `
        )
            .then((result) => {
                const rows = result?.rows || [];
                const dataTypeByColumn = new Map(rows.map((row) => [row.column_name, row.data_type]));
                return {
                    userIdDataType: dataTypeByColumn.get('user_id') || 'text',
                    hasRetryCount: dataTypeByColumn.has('retry_count'),
                    hasUpdatedAt: dataTypeByColumn.has('updated_at')
                };
            })
            .catch((error) => {
                logger.warn('[Payment] Schema inspection failed; using compatibility defaults', {
                    message: error.message
                });
                return {
                    userIdDataType: 'text',
                    hasRetryCount: false,
                    hasUpdatedAt: false
                };
            });
    }

    return paymentsSchemaConfigPromise;
}

async function hasUsersLegacyIdColumn() {
    if (!usersLegacyIdColumnPromise) {
        usersLegacyIdColumnPromise = runQuery(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'users'
                      AND column_name = 'id'
                ) AS available
            `
        )
            .then((result) => Boolean(result?.rows?.[0]?.available))
            .catch((error) => {
                logger.warn('[Payment] Failed to inspect users.id availability', { message: error.message });
                return false;
            });
    }

    return usersLegacyIdColumnPromise;
}

async function resolveCanonicalUserId(rawAuthUserId) {
    const authUserId = parseOptionalString(rawAuthUserId);
    if (!authUserId) return null;

    const usersHasLegacyId = await hasUsersLegacyIdColumn();
    const userLookup = await runQuery(
        usersHasLegacyId
            ? `
                SELECT user_id::text AS canonical_user_id
                FROM users
                WHERE user_id::text = $1 OR id::text = $1
                LIMIT 1
            `
            : `
                SELECT user_id::text AS canonical_user_id
                FROM users
                WHERE user_id::text = $1
                LIMIT 1
            `,
        [authUserId]
    );

    return parseOptionalString(userLookup.rows[0]?.canonical_user_id);
}

async function resolvePaymentUserContext(rawAuthUserId) {
    const authUserId = parseOptionalString(rawAuthUserId);
    if (!authUserId) return null;

    const [schemaConfig, usersHasLegacyId] = await Promise.all([
        getPaymentsSchemaConfig(),
        hasUsersLegacyIdColumn()
    ]);

    const userLookup = await runQuery(
        usersHasLegacyId
            ? `
                SELECT user_id::text AS canonical_user_id, id::text AS legacy_user_id
                FROM users
                WHERE user_id::text = $1 OR id::text = $1
                LIMIT 1
            `
            : `
                SELECT user_id::text AS canonical_user_id, NULL::text AS legacy_user_id
                FROM users
                WHERE user_id::text = $1
                LIMIT 1
            `,
        [authUserId]
    );

    if (!userLookup.rows.length) {
        return null;
    }

    const row = userLookup.rows[0];
    const canonicalUserId = parseOptionalString(row.canonical_user_id);
    const legacyUserId = parseOptionalString(row.legacy_user_id);
    const userIdDataType = schemaConfig.userIdDataType;

    if (userIdDataType === 'uuid') {
        if (!isUuidLike(canonicalUserId)) return null;
        return {
            paymentUserId: canonicalUserId,
            canonicalUserId
        };
    }

    if (INTEGER_COLUMN_TYPES.has(userIdDataType)) {
        const numericCandidate = legacyUserId && /^\d+$/.test(legacyUserId)
            ? legacyUserId
            : /^\d+$/.test(authUserId)
                ? authUserId
                : null;
        if (!numericCandidate) return null;
        return {
            paymentUserId: numericCandidate,
            canonicalUserId: canonicalUserId || numericCandidate
        };
    }

    return {
        paymentUserId: canonicalUserId || authUserId,
        canonicalUserId: canonicalUserId || authUserId
    };
}

function invalidatePaymentCaches(userId = null) {
    cacheService.clearPattern('payments:pending:*');
    cacheService.del('payments:stats');
    cacheService.del('payments:upi-details');
    if (userId) {
        cacheService.clearPattern(`payments:${userId}:*`);
    }
}

function normalizeMoney(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Number(numeric.toFixed(2));
}

function amountsEquivalent(expectedAmountInr, webhookAmountRaw) {
    const expected = normalizeMoney(expectedAmountInr);
    if (expected === null) return false;

    const webhookAmount = normalizeMoney(webhookAmountRaw);
    if (webhookAmount === null) return false;

    // Some providers send paise/cents instead of INR units.
    const candidates = [webhookAmount, webhookAmount / 100];
    return candidates.some((candidate) => {
        const normalizedCandidate = normalizeMoney(candidate);
        return normalizedCandidate !== null && Math.abs(normalizedCandidate - expected) < 0.01;
    });
}

function getPlanExpiryDate(planType) {
    if (planType === 'basic') {
        return null;
    }

    const endDate = new Date();
    if (planType === 'premium') {
        endDate.setFullYear(endDate.getFullYear() + 1);
        return endDate;
    }
    if (planType === 'silver') {
        endDate.setMonth(endDate.getMonth() + 6);
        return endDate;
    }

    return null;
}

function resolveExpectedAmountForPlan(planType) {
    const rules = getTierRules(planType);
    const expectedAmount = Number(rules?.priceINR);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
        return null;
    }
    return expectedAmount;
}

function buildWebhookReplayKey(provider, eventId, signature, payload) {
    if (eventId) {
        return `payments:webhook:${provider}:${eventId}`;
    }

    const digest = crypto
        .createHash('sha256')
        .update(`${provider}|${signature}|${payload}`)
        .digest('hex');
    return `payments:webhook:${provider}:hash:${digest}`;
}

function extractWebhookContext(req, payload) {
    const headers = req.headers || {};
    const provider = headers['x-razorpay-signature']
        ? 'razorpay'
        : headers['x-stripe-signature']
            ? 'stripe'
            : 'generic';

    const eventId = parseOptionalString(
        headers['x-razorpay-event-id']
        || headers['x-stripe-event-id']
        || headers['x-webhook-id']
        || payload?.event_id
        || payload?.webhook_id
    );

    const eventType = parseOptionalString(payload?.event || payload?.type);
    const status = parseOptionalString(
        payload?.status
        || payload?.data?.object?.status
        || payload?.payload?.payment?.entity?.status
    );
    const transactionId = parseOptionalString(
        payload?.transaction_id
        || payload?.payment_id
        || payload?.razorpay_payment_id
        || payload?.payload?.payment?.entity?.id
        || payload?.data?.object?.id
        || payload?.id
    );
    const amount = payload?.amount
        ?? payload?.data?.object?.amount
        ?? payload?.payload?.payment?.entity?.amount
        ?? null;

    return {
        provider,
        eventId,
        eventType,
        status: (status || '').toLowerCase(),
        transactionId,
        amount
    };
}

function isWebhookSuccess(context) {
    const status = String(context?.status || '').toLowerCase();
    const eventType = String(context?.eventType || '').toLowerCase();

    const successTokens = ['captured', 'completed', 'verified', 'success', 'succeeded', 'paid'];
    return successTokens.some((token) => status.includes(token) || eventType.includes(token));
}

async function applyVerifiedPayment(client, payment, options = {}) {
    const {
        verifiedBy = null,
        adminNotes = null,
        paymentReference = null
    } = options;
    const schemaConfig = await getPaymentsSchemaConfig();

    const paymentUpdate = await client.query(
        `
            UPDATE payments
            SET status = 'verified',
                verified_by = $1,
                verified_at = NOW(),
                admin_notes = COALESCE($2, admin_notes)${schemaConfig.hasUpdatedAt ? `,
                updated_at = NOW()` : ''}
            WHERE id = $3
              AND status = 'pending'
            RETURNING id
        `,
        [verifiedBy, adminNotes, payment.id]
    );

    if (paymentUpdate.rowCount === 0) {
        return {
            alreadyProcessed: true,
            endDate: null
        };
    }

    const endDate = getPlanExpiryDate(payment.plan_purchased);

    if (payment.plan_purchased === 'basic') {
        await client.query(
            `
                UPDATE users
                SET tier = 'basic',
                    post_credits = COALESCE(post_credits, 0) + 1
                WHERE user_id = $1
            `,
            [payment.user_id]
        );
    } else {
        await client.query(
            `
                UPDATE users
                SET tier = $1,
                    subscription_expiry = $2
                WHERE user_id = $3
            `,
            [payment.plan_purchased, endDate, payment.user_id]
        );

        await client.query(
            `
                INSERT INTO user_subscriptions
                (user_id, plan_type, start_date, end_date, is_active, payment_reference)
                VALUES ($1, $2, NOW(), $3, true, $4)
            `,
            [payment.user_id, payment.plan_purchased, endDate, paymentReference || `payment_${payment.id}`]
        );
    }

    const successMessage = payment.plan_purchased !== 'basic'
        ? `Your ${payment.plan_purchased.toUpperCase()} plan is now active! Valid until ${endDate.toLocaleDateString('en-IN')}`
        : 'Your BASIC plan is now active! You can now create a post.';

    await client.query(
        `
            INSERT INTO notifications (user_id, type, title, message, created_at)
            VALUES ($1, 'payment_verified', 'Payment Verified!', $2, NOW())
        `,
        [payment.user_id, successMessage]
    );

    return {
        alreadyProcessed: false,
        endDate
    };
}

/**
 * Validate a promo code (User)
 * POST /api/payments/validate-promo
 */
exports.validatePromoCode = async (req, res) => {
    try {
        const { code, plan_type } = req.body;
        if (!code || !plan_type) return res.status(400).json({ error: 'code and plan_type required' });

        const result = applyPromoCode(code, plan_type);
        if (!result.valid) return res.status(400).json({ error: result.error });

        res.json({
            valid: true,
            code: code.toUpperCase(),
            ...result
        });
    } catch (err) {
        logger.error('[Payment] Promo validation error:', err);
        res.status(500).json({ error: 'Failed to validate promo code' });
    }
};

/**
 * Retry a rejected/expired payment (User)
 * POST /api/payments/:id/retry
 */
exports.retryPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const authUserId = getAuthenticatedUserId(req);
        const { transaction_id } = req.body;
        const schemaConfig = await getPaymentsSchemaConfig();

        if (!authUserId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const resolvedUserContext = await resolvePaymentUserContext(authUserId);
        if (!resolvedUserContext) {
            return res.status(403).json({ error: 'Unable to map authenticated account to payment records' });
        }

        const paymentResult = await runQuery(
            schemaConfig.hasRetryCount
                ? 'SELECT status, retry_count FROM payments WHERE id = $1 AND user_id::text = $2'
                : 'SELECT status FROM payments WHERE id = $1 AND user_id::text = $2',
            [id, String(resolvedUserContext.paymentUserId)]
        );
        if (paymentResult.rows.length === 0) return res.status(404).json({ error: 'Payment not found' });

        const payment = paymentResult.rows[0];
        if (!['rejected', 'expired'].includes(payment.status)) {
            return res.status(400).json({ error: `Cannot retry a payment with status: ${payment.status}` });
        }

        const retryCount = schemaConfig.hasRetryCount ? (payment.retry_count || 0) + 1 : 1;
        if (schemaConfig.hasRetryCount && retryCount > 3) {
            return res.status(400).json({ error: 'Maximum retry attempts (3) reached. Please contact support.' });
        }

        if (!transaction_id || transaction_id.length < 6) {
            return res.status(400).json({ error: 'New transaction ID required (min 6 chars)' });
        }

        // Check new txn ID is not already used
        const dupeCheck = await runQuery('SELECT id FROM payments WHERE transaction_id = $1', [transaction_id]);
        if (dupeCheck.rows.length > 0) return res.status(400).json({ error: 'Transaction ID already submitted' });

        if (schemaConfig.hasRetryCount) {
            await runQuery(
                `UPDATE payments SET status = 'pending', transaction_id = $1, retry_count = $2${schemaConfig.hasUpdatedAt ? ', updated_at = NOW()' : ''} WHERE id = $3`,
                [transaction_id, retryCount, id]
            );
        } else {
            await runQuery(
                `UPDATE payments SET status = 'pending', transaction_id = $1${schemaConfig.hasUpdatedAt ? ', updated_at = NOW()' : ''} WHERE id = $2`,
                [transaction_id, id]
            );
        }

        invalidatePaymentCaches(authUserId);
        if (resolvedUserContext.canonicalUserId && resolvedUserContext.canonicalUserId !== authUserId) {
            invalidatePaymentCaches(resolvedUserContext.canonicalUserId);
        }

        logger.info(`[Payment] Retry #${retryCount}: Payment ${id} by User ${resolvedUserContext.paymentUserId}`);
        res.json({
            success: true,
            message: schemaConfig.hasRetryCount
                ? `Payment resubmitted (attempt ${retryCount}/3)`
                : 'Payment resubmitted',
            retry_count: schemaConfig.hasRetryCount ? retryCount : null
        });
    } catch (err) {
        logger.error('[Payment] Retry error:', err);
        res.status(500).json({ error: 'Failed to retry payment' });
    }
};

/**
 * Submit a payment for verification (User)
 * POST /api/payments/submit
 *
 * SECURITY FIXES:
 * - Validate payment amount matches expected tier price (prevents INR 1 vs INR 999 fraud)
 * - Use only server-side expectedAmount, ignore user-submitted amount
 */
exports.submitPayment = async (req, res) => {
    try {
        const authUserId = getAuthenticatedUserId(req);
        const {
            plan_type,
            transaction_id,
            upi_id,
            // NOTE: amount is accepted for user clarity but NEVER used for DB insert
            // We always use server-calculated expectedAmount
            payment_method = 'upi'
        } = req.body;

        if (!authUserId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const resolvedUserContext = await resolvePaymentUserContext(authUserId);
        if (!resolvedUserContext) {
            return res.status(403).json({ error: 'Unable to map authenticated account to payment records' });
        }
        const paymentUserId = resolvedUserContext.paymentUserId;
        const notificationUserId = resolvedUserContext.canonicalUserId || paymentUserId;

        if (!plan_type || !SUPPORTED_PLANS.includes(plan_type)) {
            return res.status(400).json({ error: 'Invalid plan type. Must be: basic, silver, or premium' });
        }

        if (!transaction_id || transaction_id.length < 6) {
            return res.status(400).json({ error: 'Valid transaction ID required (min 6 characters)' });
        }

        // CRITICAL SECURITY: Get pricing from server-side tier rules (never trust client amount)
        const rules = getTierRules(plan_type);
        const expectedAmount = rules.priceINR;

        if (!expectedAmount || expectedAmount <= 0) {
            return res.status(500).json({ error: 'Invalid plan configuration. Contact support.' });
        }

        const [existing, pendingCheck] = await Promise.all([
            // Check for duplicate transaction ID
            runQuery(
                'SELECT id FROM payments WHERE transaction_id = $1',
                [transaction_id]
            ),
            // Check for pending payment from same user for same plan
            runQuery(
                `SELECT id FROM payments
                 WHERE user_id::text = $1 AND plan_purchased = $2 AND status = 'pending'`,
                [String(paymentUserId), plan_type]
            )
        ]);

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'This transaction ID has already been submitted' });
        }

        if (pendingCheck.rows.length > 0) {
            return res.status(400).json({
                error: 'You already have a pending payment for this plan. Please wait for verification.',
                pending_id: pendingCheck.rows[0].id
            });
        }

        // Create payment record with SERVER-CALCULATED amount (not user input)
        const result = await runQuery(
            `INSERT INTO payments
             (user_id, amount, payment_method, transaction_id, upi_id, status, plan_purchased, expires_at)
             VALUES ($1, $2, $3, $4, $5, 'pending', $6, NOW() + INTERVAL '48 hours')
             RETURNING id, created_at`,
            [paymentUserId, expectedAmount, payment_method, transaction_id, upi_id || null, plan_type]
        );

        // Create notification for user
        await runQuery(
            `INSERT INTO notifications (user_id, type, title, message, created_at)
             VALUES ($1, 'payment_submitted', 'Payment Submitted', $2, NOW())`,
            [notificationUserId, `Your payment of INR ${expectedAmount} for ${plan_type.toUpperCase()} plan is being verified. This usually takes 2-4 hours.`]
        );

        invalidatePaymentCaches(authUserId);
        if (notificationUserId !== authUserId) {
            invalidatePaymentCaches(notificationUserId);
        }
        logger.info(`[Payment] New submission: User ${paymentUserId}, Plan: ${plan_type}, Amount: INR ${expectedAmount}, TxnID: ${transaction_id}`);

        res.status(201).json({
            success: true,
            message: 'Payment submitted for verification',
            payment_id: result.rows[0].id,
            amount: expectedAmount,
            plan: plan_type,
            expected_verification_time: '2-4 hours',
            status: 'pending'
        });

    } catch (err) {
        logger.error('[Payment] Submit error:', err);
        res.status(500).json({ error: 'Failed to submit payment' });
    }
};

/**
 * Get payment status (User)
 * GET /api/payments/status
 */
exports.getPaymentStatus = async (req, res) => {
    try {
        const authUserId = getAuthenticatedUserId(req);

        if (!authUserId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const resolvedUserContext = await resolvePaymentUserContext(authUserId);
        if (!resolvedUserContext) {
            return res.status(403).json({ error: 'Unable to map authenticated account to payment records' });
        }

        const paymentUserId = String(resolvedUserContext.paymentUserId);
        const cacheKeyIdentity = resolvedUserContext.canonicalUserId || authUserId;
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
                    has_pending: result.rows.some((payment) => payment.status === 'pending')
                };
            },
            PAYMENT_STATUS_CACHE_TTL_SECONDS
        );

        res.json(payload);

    } catch (err) {
        logger.error('[Payment] Status error:', err);
        res.status(500).json({ error: 'Failed to fetch payment status' });
    }
};

/**
 * Get pending payments (Admin)
 * GET /api/payments/pending
 */
exports.getPendingPayments = async (req, res) => {
    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, DEFAULT_PENDING_LIMIT, MAX_PENDING_LIMIT);
        const offset = (page - 1) * limit;
        const cacheKey = `payments:pending:${page}:${limit}`;

        const payload = await cacheService.getOrSetWithStampedeProtection(
            cacheKey,
            async () => {
                const result = await runQuery(
                    `
                        SELECT 
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
                            u.email as user_email,
                            pr.full_name as user_name,
                            pr.phone as user_phone
                        FROM payments p
                        LEFT JOIN users u ON p.user_id::text = u.user_id::text
                        LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
                        WHERE p.status = 'pending'
                        ORDER BY p.created_at ASC
                        LIMIT $1 OFFSET $2
                    `,
                    [limit, offset]
                );

                const pendingCount = result.rows.length ? result.rows[0].total_count : 0;
                const payments = result.rows.map(({ total_count, ...payment }) => payment);
                return {
                    pending_count: pendingCount,
                    payments,
                    page,
                    limit
                };
            },
            PAYMENT_PENDING_CACHE_TTL_SECONDS
        );

        res.json(payload);

    } catch (err) {
        logger.error('[Payment] Pending list error:', err);
        res.status(500).json({ error: 'Failed to fetch pending payments' });
    }
};

/**
 * Verify/Approve a payment (Admin)
 * POST /api/payments/:id/verify
 *
 * SECURITY FIXES:
 * - Validate payment amount matches expected tier price BEFORE approving
 * - Reject if amount mismatch (prevents admin approval fraud)
 */
exports.verifyPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const adminIdRaw = getAuthenticatedUserId(req);
        if (!adminIdRaw) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const adminId = await resolveCanonicalUserId(adminIdRaw);
        if (!adminId) {
            return res.status(403).json({ error: 'Unable to map admin account' });
        }
        const { admin_notes } = req.body;

        const paymentResult = await runQuery(
            `SELECT id, user_id, status, plan_purchased, amount
             FROM payments
             WHERE id = $1`,
            [id]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = paymentResult.rows[0];

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: `Payment already ${payment.status}` });
        }

        const { user_id, plan_purchased } = payment;
        const expectedAmount = resolveExpectedAmountForPlan(plan_purchased);
        if (expectedAmount === null) {
            return res.status(500).json({ error: 'Invalid plan configuration. Contact support.' });
        }

        if (!amountsEquivalent(expectedAmount, payment.amount)) {
            logger.error(`[SECURITY] Payment amount mismatch for ID ${id}:`);
            logger.error(`  Expected: INR ${expectedAmount}, Received: INR ${payment.amount}`);
            logger.error(`  Plan: ${plan_purchased}, User: ${user_id}`);

            return res.status(400).json({
                error: 'Payment amount mismatch. Cannot approve.',
                details: {
                    expected_amount: expectedAmount,
                    received_amount: payment.amount,
                    plan: plan_purchased,
                    mismatch: payment.amount - expectedAmount
                },
                action: 'Please reject this payment and ask user to resubmit with correct amount'
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const applied = await applyVerifiedPayment(client, payment, {
                verifiedBy: adminId || null,
                adminNotes: admin_notes || null,
                paymentReference: `payment_${id}`
            });

            if (applied.alreadyProcessed) {
                await client.query('ROLLBACK');
                return res.status(409).json({ error: 'Payment already processed by another workflow' });
            }

            await client.query('COMMIT');
            invalidatePaymentCaches(user_id);

            logger.info(`[Payment] Verified: ID ${id}, User ${user_id}, Plan: ${plan_purchased}, Amount: INR ${payment.amount}`);

            return res.json({
                success: true,
                message: `Payment verified. User upgraded to ${plan_purchased.toUpperCase()}`,
                user_id,
                plan: plan_purchased,
                amount: payment.amount,
                expires_at: applied.endDate
            });
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

    } catch (err) {
        logger.error('[Payment] Verify error:', err);
        return res.status(500).json({ error: 'Failed to verify payment' });
    }
};

/**
 * Reject a payment (Admin)
 * POST /api/payments/:id/reject
 */
exports.rejectPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const adminIdRaw = getAuthenticatedUserId(req);
        if (!adminIdRaw) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const adminId = await resolveCanonicalUserId(adminIdRaw);
        if (!adminId) {
            return res.status(403).json({ error: 'Unable to map admin account' });
        }
        const { admin_notes, reason } = req.body;

        // Get payment details
        const paymentResult = await runQuery(
            `SELECT id, user_id, status
             FROM payments
             WHERE id = $1`,
            [id]
        );

        if (paymentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        const payment = paymentResult.rows[0];

        if (payment.status !== 'pending') {
            return res.status(400).json({ error: `Payment already ${payment.status}` });
        }

        // Update payment status
        await runQuery(
            `UPDATE payments 
             SET status = 'rejected', verified_by = $1, verified_at = NOW(), admin_notes = $2
             WHERE id = $3`,
            [adminId, admin_notes || reason || 'Transaction could not be verified', id]
        );

        // Notify user
        await runQuery(
            `INSERT INTO notifications (user_id, type, title, message, created_at)
             VALUES ($1, 'payment_rejected', 'Payment Not Verified', $2, NOW())`,
            [payment.user_id, `Your payment could not be verified. Reason: ${reason || 'Transaction ID not found'}. Please contact support if you believe this is an error.`]
        );

        invalidatePaymentCaches(payment.user_id);
        logger.info(`[Payment] Rejected: ID ${id}, User ${payment.user_id}`);

        res.json({
            success: true,
            message: 'Payment rejected',
            payment_id: id
        });

    } catch (err) {
        logger.error('[Payment] Reject error:', err);
        res.status(500).json({ error: 'Failed to reject payment' });
    }
};

/**
 * Get payment statistics (Admin Dashboard)
 * GET /api/payments/stats
 */
exports.getPaymentStats = async (req, res) => {
    try {
        const payload = await cacheService.getOrSetWithStampedeProtection(
            'payments:stats',
            async () => {
                const [stats, planBreakdown] = await Promise.all([
                    runQuery(`
                        SELECT 
                            COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
                            COUNT(*) FILTER (WHERE status = 'verified') as verified_count,
                            COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
                            COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) as total_revenue,
                            COALESCE(SUM(amount) FILTER (WHERE status = 'verified' AND created_at > NOW() - INTERVAL '30 days'), 0) as revenue_30d,
                            COALESCE(SUM(amount) FILTER (WHERE status = 'verified' AND created_at > NOW() - INTERVAL '7 days'), 0) as revenue_7d
                        FROM payments
                    `),
                    runQuery(`
                        SELECT 
                            plan_purchased,
                            COUNT(*) as count,
                            SUM(amount) as total
                        FROM payments
                        WHERE status = 'verified'
                        GROUP BY plan_purchased
                    `)
                ]);

                return {
                    ...stats.rows[0],
                    by_plan: planBreakdown.rows
                };
            },
            PAYMENT_STATS_CACHE_TTL_SECONDS
        );

        res.json(payload);

    } catch (err) {
        logger.error('[Payment] Stats error:', err);
        res.status(500).json({ error: 'Failed to fetch payment stats' });
    }
};

/**
 * Get payment reconciliation report (Admin)
 * GET /api/payments/reconciliation/report
 */
exports.getReconciliationReport = async (req, res) => {
    try {
        if (!hasPaymentAdminAccess(req)) {
            return res.status(403).json({ error: 'Admin access required for reconciliation reports' });
        }

        const lookbackHours = parsePositiveInt(req.query.lookback_hours, Number.parseInt(process.env.PAYMENT_RECON_LOOKBACK_HOURS, 10) || 72, 24 * 90);
        const stalePendingHours = parsePositiveInt(req.query.stale_pending_hours, Number.parseInt(process.env.PAYMENT_RECON_STALE_PENDING_HOURS, 10) || 6, 24 * 30);
        const sampleLimit = parsePositiveInt(req.query.sample_limit, Number.parseInt(process.env.PAYMENT_RECON_SAMPLE_LIMIT, 10) || 25, 200);
        const pendingScanLimit = parsePositiveInt(req.query.pending_scan_limit, Number.parseInt(process.env.PAYMENT_RECON_PENDING_SCAN_LIMIT, 10) || 5000, 20000);
        const useCached = parseBoolean(req.query.cached, false);

        if (useCached) {
            const cachedReport = getLastPaymentReconciliationReport();
            if (cachedReport) {
                return res.json({
                    success: true,
                    cached: true,
                    reconciliation: cachedReport
                });
            }
        }

        const report = await buildPaymentReconciliationReport({
            lookbackHours,
            stalePendingHours,
            sampleLimit,
            pendingScanLimit
        });

        return res.json({
            success: true,
            cached: false,
            reconciliation: report
        });
    } catch (err) {
        logger.error('[Payment] Reconciliation report error:', err);
        return res.status(500).json({ error: 'Failed to generate reconciliation report' });
    }
};

/**
 * Run payment reconciliation workflow (Admin)
 * POST /api/payments/reconciliation/run
 */
exports.runReconciliation = async (req, res) => {
    try {
        if (!hasPaymentAdminAccess(req)) {
            return res.status(403).json({ error: 'Admin access required for reconciliation runs' });
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
        const dryRun = parseBoolean(requestPayload.dry_run ?? req.query.dry_run, false);
        const adminId = req.user?.userId || req.user?.id || 'unknown-admin';

        if (dryRun) {
            const report = await buildPaymentReconciliationReport({
                lookbackHours,
                stalePendingHours,
                sampleLimit,
                pendingScanLimit
            });

            return res.json({
                success: true,
                dry_run: true,
                reconciliation: report
            });
        }

        const reconciliationResult = await executePaymentReconciliation({
            lookbackHours,
            stalePendingHours,
            sampleLimit,
            pendingScanLimit,
            actor: `admin:${adminId}`
        });

        return res.json({
            success: true,
            dry_run: false,
            reconciliation: reconciliationResult
        });
    } catch (err) {
        logger.error('[Payment] Reconciliation run error:', err);
        return res.status(500).json({ error: 'Failed to run reconciliation workflow' });
    }
};

/**
 * Get UPI payment details (for showing QR code)
 * GET /api/payments/upi-details
 */
exports.getUpiDetails = async (req, res) => {
    const upiDetails = await cacheService.getOrSetWithStampedeProtection(
        'payments:upi-details',
        async () => {
            const tiers = SUPPORTED_PLANS.reduce((acc, plan) => {
                const rules = getTierRules(plan);
                acc[plan] = {
                    amount: rules.priceINR,
                    description: rules.features?.[0] || `${rules.name} Plan`
                };
                return acc;
            }, {});

            return {
                upi_id: process.env.UPI_ID || 'merchant@upi',
                merchant_name: process.env.MERCHANT_NAME || 'MHub Premium',
                tiers,
                instructions: [
                    'Open any UPI app (GPay, PhonePe, Paytm)',
                    'Scan the QR code or enter UPI ID',
                    'Pay the exact amount for your chosen plan',
                    'Copy the Transaction ID from payment confirmation',
                    'Paste the Transaction ID in the form',
                    'Wait for verification (usually 2-4 hours)'
                ]
            };
        },
        UPI_DETAILS_CACHE_TTL_SECONDS
    );

    res.json(upiDetails);
};

/**
 * Handle Payment Webhook (Razorpay/Stripe/UPI Gateway)
 * POST /api/payments/webhook
 *
 * SECURITY FIXES:
 * - Verify webhook signature before processing (prevent spoofing)
 * - Validate payload format and transaction data
 * - Only update payments if signature is valid
 */
exports.handleWebhook = async (req, res) => {
    let replayKey = null;
    let replayLockHeld = false;

    try {
        const signature = req.headers['x-razorpay-signature']
            || req.headers['x-stripe-signature']
            || req.headers['x-webhook-signature'];

        if (!signature) {
            logger.warn('[Payment] Webhook rejected: Missing signature header');
            return res.status(403).json({ error: 'Invalid webhook: missing signature' });
        }

        const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
        if (!webhookSecret) {
            logger.error('[Payment] WEBHOOK_SECRET not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const rawPayload = JSON.stringify(req.body || {});
        const expectedSignature = crypto.createHmac('sha256', webhookSecret)
            .update(rawPayload)
            .digest('hex');

        if (expectedSignature !== String(signature)) {
            logger.warn('[Payment] Webhook rejected: Invalid signature', {
                received: String(signature).substring(0, 16) + '...',
                ip: req.ip
            });
            return res.status(403).json({ error: 'Invalid webhook signature' });
        }

        const context = extractWebhookContext(req, req.body || {});
        if (!context.transactionId) {
            logger.warn('[Payment] Webhook rejected: Missing transaction ID');
            return res.status(400).json({ error: 'Invalid webhook payload: missing transaction ID' });
        }

        replayKey = buildWebhookReplayKey(context.provider, context.eventId, String(signature), rawPayload);
        const replayState = cacheService.get(replayKey);
        if (replayState?.state === 'done') {
            return res.json({ status: 'ok', duplicate: true, replayKey });
        }
        if (replayState?.state === 'processing') {
            return res.json({ status: 'ok', in_progress: true, replayKey });
        }

        cacheService.set(replayKey, { state: 'processing', at: new Date().toISOString() }, WEBHOOK_PROCESSING_TTL_SECONDS);
        replayLockHeld = true;

        if (!isWebhookSuccess(context)) {
            cacheService.set(replayKey, { state: 'done', ignored: true, reason: 'non_success_status' }, WEBHOOK_DEDUP_TTL_SECONDS);
            replayLockHeld = false;
            return res.json({ status: 'ok', ignored: true, reason: 'Webhook status is not a success state' });
        }

        const paymentResult = await runQuery(
            `SELECT id, user_id, status, plan_purchased, amount
             FROM payments
             WHERE transaction_id = $1
             LIMIT 1`,
            [context.transactionId]
        );

        if (paymentResult.rows.length === 0) {
            cacheService.set(replayKey, { state: 'done', ignored: true, reason: 'payment_not_found' }, WEBHOOK_DEDUP_TTL_SECONDS);
            replayLockHeld = false;
            logger.warn('[Payment] Webhook payment not found', {
                transaction_id: context.transactionId,
                provider: context.provider,
                event_id: context.eventId || null
            });
            return res.json({ status: 'ok', ignored: true, reason: 'Payment record not found' });
        }

        const payment = paymentResult.rows[0];

        if (payment.status === 'verified') {
            cacheService.set(replayKey, { state: 'done', duplicate: true }, WEBHOOK_DEDUP_TTL_SECONDS);
            replayLockHeld = false;
            return res.json({ status: 'ok', duplicate: true, reason: 'Payment already verified' });
        }

        if (payment.status !== 'pending') {
            cacheService.set(replayKey, { state: 'done', ignored: true, reason: `status_${payment.status}` }, WEBHOOK_DEDUP_TTL_SECONDS);
            replayLockHeld = false;
            return res.json({ status: 'ok', ignored: true, reason: `Payment is ${payment.status}` });
        }

        const expectedAmount = resolveExpectedAmountForPlan(payment.plan_purchased);
        if (expectedAmount === null) {
            throw new Error(`Invalid plan configuration for ${payment.plan_purchased}`);
        }

        if (!amountsEquivalent(expectedAmount, payment.amount)) {
            logger.error('[Payment] Stored amount mismatch vs tier rule', {
                payment_id: payment.id,
                transaction_id: context.transactionId,
                expected: expectedAmount,
                stored: payment.amount,
                plan: payment.plan_purchased
            });
            cacheService.del(replayKey);
            replayLockHeld = false;
            return res.status(400).json({ error: 'Payment amount mismatch with plan rules' });
        }

        if (context.amount !== null && context.amount !== undefined && !amountsEquivalent(expectedAmount, context.amount)) {
            logger.error('[Payment] Webhook amount mismatch', {
                payment_id: payment.id,
                transaction_id: context.transactionId,
                expected_inr: expectedAmount,
                webhook_amount: context.amount,
                plan: payment.plan_purchased
            });
            cacheService.del(replayKey);
            replayLockHeld = false;
            return res.status(400).json({ error: 'Webhook amount mismatch' });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const applied = await applyVerifiedPayment(client, payment, {
                verifiedBy: null,
                adminNotes: `Auto-verified via webhook (${context.provider}${context.eventId ? `:${context.eventId}` : ''})`,
                paymentReference: context.transactionId
            });

            if (applied.alreadyProcessed) {
                await client.query('ROLLBACK');
                cacheService.set(replayKey, { state: 'done', duplicate: true }, WEBHOOK_DEDUP_TTL_SECONDS);
                replayLockHeld = false;
                return res.json({ status: 'ok', duplicate: true, reason: 'Payment processed concurrently' });
            }

            await client.query('COMMIT');
            invalidatePaymentCaches(payment.user_id);

            cacheService.set(
                replayKey,
                {
                    state: 'done',
                    payment_id: payment.id,
                    transaction_id: context.transactionId,
                    provider: context.provider,
                    verified_at: new Date().toISOString()
                },
                WEBHOOK_DEDUP_TTL_SECONDS
            );
            replayLockHeld = false;

            logger.info('[Payment] Webhook processed successfully', {
                payment_id: payment.id,
                transaction_id: context.transactionId,
                user_id: payment.user_id,
                plan: payment.plan_purchased,
                provider: context.provider,
                event_id: context.eventId || null
            });

            return res.json({ status: 'ok', received: true, verified: true, payment_id: payment.id });
        } catch (txErr) {
            await client.query('ROLLBACK');
            throw txErr;
        } finally {
            client.release();
        }

    } catch (err) {
        if (replayLockHeld && replayKey) {
            cacheService.del(replayKey);
        }
        logger.error('[Payment] Webhook error:', err);
        return res.status(500).json({ error: 'Webhook processing failed' });
    }
};
