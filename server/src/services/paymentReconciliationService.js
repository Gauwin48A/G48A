const pool = require('../config/db');
const { getTierRules } = require('../config/tierRules');
const cacheService = require('./cacheService');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_LOOKBACK_HOURS = Number.parseInt(process.env.PAYMENT_RECON_LOOKBACK_HOURS, 10) || 72;
const DEFAULT_STALE_PENDING_HOURS = Number.parseInt(process.env.PAYMENT_RECON_STALE_PENDING_HOURS, 10) || 6;
const DEFAULT_SAMPLE_LIMIT = Number.parseInt(process.env.PAYMENT_RECON_SAMPLE_LIMIT, 10) || 25;
const DEFAULT_PENDING_SCAN_LIMIT = Number.parseInt(process.env.PAYMENT_RECON_PENDING_SCAN_LIMIT, 10) || 5000;
const MAX_LOOKBACK_HOURS = 24 * 90;
const MAX_STALE_HOURS = 24 * 30;
const MAX_SAMPLE_LIMIT = 200;
const MAX_SCAN_LIMIT = 20000;
const LAST_RECON_REPORT_CACHE_KEY = 'payments:reconciliation:last-report';
const LAST_RECON_REPORT_CACHE_TTL_SECONDS = Number.parseInt(process.env.PAYMENT_RECON_REPORT_CACHE_TTL_SECONDS, 10) || (6 * 60 * 60);

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback;
    }
    return Math.min(parsed, max);
}

function normalizeMoney(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    return Number(numeric.toFixed(2));
}

function amountsEquivalent(expectedAmountInr, valueFromSource) {
    const expected = normalizeMoney(expectedAmountInr);
    const actual = normalizeMoney(valueFromSource);

    if (expected === null || actual === null) {
        return false;
    }

    // Some gateways send the amount in paise/cents instead of INR.
    const candidates = [actual, actual / 100];
    return candidates.some((candidate) => {
        const normalizedCandidate = normalizeMoney(candidate);
        return normalizedCandidate !== null && Math.abs(normalizedCandidate - expected) < 0.01;
    });
}

function resolveExpectedAmountForPlan(planType) {
    const rules = getTierRules(planType);
    const expectedAmount = Number(rules?.priceINR);
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
        return null;
    }
    return expectedAmount;
}

function uniqueStrings(values) {
    return [...new Set(values.filter(Boolean).map((value) => String(value)))];
}

function invalidatePaymentCaches(userIds = []) {
    cacheService.clearPattern('payments:pending:*');
    cacheService.del('payments:stats');
    cacheService.del('payments:upi-details');

    const uniqueUserIds = uniqueStrings(userIds);
    uniqueUserIds.forEach((userId) => {
        cacheService.clearPattern(`payments:${userId}:*`);
    });
}

function parseReconciliationOptions(options = {}) {
    const lookbackHours = parsePositiveInt(options.lookbackHours, DEFAULT_LOOKBACK_HOURS, MAX_LOOKBACK_HOURS);
    const stalePendingHours = parsePositiveInt(options.stalePendingHours, DEFAULT_STALE_PENDING_HOURS, MAX_STALE_HOURS);
    const sampleLimit = parsePositiveInt(options.sampleLimit, DEFAULT_SAMPLE_LIMIT, MAX_SAMPLE_LIMIT);
    const pendingScanLimit = parsePositiveInt(options.pendingScanLimit, DEFAULT_PENDING_SCAN_LIMIT, MAX_SCAN_LIMIT);

    return {
        lookbackHours,
        stalePendingHours,
        sampleLimit,
        pendingScanLimit
    };
}

async function fetchStatusBreakdown(lookbackHours) {
    const statusResult = await runQuery(
        `
            SELECT status, COUNT(*)::int AS count
            FROM payments
            WHERE created_at >= NOW() - ($1::text || ' hours')::interval
            GROUP BY status
        `,
        [lookbackHours]
    );

    return statusResult.rows.reduce((acc, row) => {
        acc[row.status] = Number(row.count) || 0;
        return acc;
    }, {});
}

async function fetchPendingRows(lookbackHours, pendingScanLimit) {
    const result = await runQuery(
        `
            SELECT
                id::text AS id,
                user_id::text AS user_id,
                amount,
                plan_purchased,
                transaction_id,
                status,
                retry_count,
                created_at,
                expires_at,
                admin_notes
            FROM payments
            WHERE status = 'pending'
              AND created_at >= NOW() - ($1::text || ' hours')::interval
            ORDER BY created_at ASC
            LIMIT $2
        `,
        [lookbackHours, pendingScanLimit]
    );

    return result.rows;
}

async function fetchDuplicateTransactionGroups(lookbackHours, sampleLimit) {
    const result = await runQuery(
        `
            SELECT
                p.transaction_id,
                COUNT(*)::int AS occurrence_count,
                ARRAY_AGG(p.id::text ORDER BY p.created_at DESC) AS payment_ids,
                ARRAY_AGG(p.user_id::text ORDER BY p.created_at DESC) AS user_ids,
                ARRAY_AGG(p.status ORDER BY p.created_at DESC) AS statuses,
                MAX(p.created_at) AS latest_created_at
            FROM payments p
            WHERE p.transaction_id IS NOT NULL
              AND p.transaction_id <> ''
              AND p.created_at >= NOW() - ($1::text || ' hours')::interval
            GROUP BY p.transaction_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC, MAX(p.created_at) DESC
            LIMIT $2
        `,
        [lookbackHours, sampleLimit]
    );

    return result.rows.map((row) => ({
        transaction_id: row.transaction_id,
        occurrence_count: Number(row.occurrence_count) || 0,
        payment_ids: Array.isArray(row.payment_ids) ? row.payment_ids : [],
        user_ids: Array.isArray(row.user_ids) ? row.user_ids : [],
        statuses: Array.isArray(row.statuses) ? row.statuses : [],
        latest_created_at: row.latest_created_at
    }));
}

async function fetchRetryLimitRows(lookbackHours, sampleLimit) {
    const result = await runQuery(
        `
            SELECT
                id::text AS id,
                user_id::text AS user_id,
                amount,
                plan_purchased,
                transaction_id,
                retry_count,
                created_at,
                expires_at
            FROM payments
            WHERE status = 'pending'
              AND COALESCE(retry_count, 0) >= 3
              AND created_at >= NOW() - ($1::text || ' hours')::interval
            ORDER BY retry_count DESC, created_at ASC
            LIMIT $2
        `,
        [lookbackHours, sampleLimit]
    );

    return result.rows;
}

async function fetchTierDriftRows(lookbackHours, sampleLimit) {
    const result = await runQuery(
        `
            SELECT
                p.id::text AS payment_id,
                p.user_id::text AS user_id,
                p.plan_purchased,
                p.amount,
                p.verified_at,
                u.tier AS current_tier,
                u.subscription_expiry
            FROM payments p
            JOIN users u ON u.user_id = p.user_id
            WHERE p.status = 'verified'
              AND p.plan_purchased IN ('silver', 'premium')
              AND p.verified_at >= NOW() - ($1::text || ' hours')::interval
              AND (
                    u.tier IS DISTINCT FROM p.plan_purchased
                    OR u.subscription_expiry IS NULL
                )
            ORDER BY p.verified_at DESC
            LIMIT $2
        `,
        [lookbackHours, sampleLimit]
    ).catch((err) => {
        logger.warn('[PaymentReconciliation] Tier drift query skipped', { message: err.message });
        return { rows: [] };
    });

    return result.rows;
}

function buildPendingAnomalySets(pendingRows, stalePendingHours) {
    const staleThreshold = Date.now() - (stalePendingHours * 60 * 60 * 1000);
    const now = Date.now();

    const stalePending = [];
    const expiredPending = [];
    const amountMismatches = [];

    pendingRows.forEach((row) => {
        const createdAtMs = row.created_at ? new Date(row.created_at).getTime() : null;
        const expiresAtMs = row.expires_at ? new Date(row.expires_at).getTime() : null;
        const expectedAmount = resolveExpectedAmountForPlan(row.plan_purchased);

        if (createdAtMs !== null && Number.isFinite(createdAtMs) && createdAtMs <= staleThreshold) {
            stalePending.push(row);
        }

        if (expiresAtMs !== null && Number.isFinite(expiresAtMs) && expiresAtMs < now) {
            expiredPending.push(row);
        }

        if (expectedAmount !== null && !amountsEquivalent(expectedAmount, row.amount)) {
            amountMismatches.push({
                ...row,
                expected_amount: expectedAmount,
                mismatch_amount: normalizeMoney(Number(row.amount) - expectedAmount)
            });
        }
    });

    return {
        stalePending,
        expiredPending,
        amountMismatches
    };
}

async function buildPaymentReconciliationReport(options = {}) {
    const {
        lookbackHours,
        stalePendingHours,
        sampleLimit,
        pendingScanLimit
    } = parseReconciliationOptions(options);

    const [statusBreakdown, pendingRows, duplicateTransactionGroups, retryLimitRows, tierDriftRows] = await Promise.all([
        fetchStatusBreakdown(lookbackHours),
        fetchPendingRows(lookbackHours, pendingScanLimit),
        fetchDuplicateTransactionGroups(lookbackHours, sampleLimit),
        fetchRetryLimitRows(lookbackHours, sampleLimit),
        fetchTierDriftRows(lookbackHours, sampleLimit)
    ]);

    const {
        stalePending,
        expiredPending,
        amountMismatches
    } = buildPendingAnomalySets(pendingRows, stalePendingHours);

    const duplicatePaymentIds = uniqueStrings(
        duplicateTransactionGroups.flatMap((group) => group.payment_ids || [])
    );

    const manualReviewQueue = uniqueStrings([
        ...stalePending.map((row) => row.id),
        ...amountMismatches.map((row) => row.id),
        ...duplicatePaymentIds
    ]);

    const duplicatePaymentCount = duplicateTransactionGroups.reduce(
        (sum, group) => sum + (Number(group.occurrence_count) || 0),
        0
    );

    return {
        generated_at: new Date().toISOString(),
        lookback_hours: lookbackHours,
        stale_pending_hours: stalePendingHours,
        pending_scan_limit: pendingScanLimit,
        summary: {
            statuses: statusBreakdown,
            pending_scanned_count: pendingRows.length,
            stale_pending_count: stalePending.length,
            expired_pending_count: expiredPending.length,
            amount_mismatch_count: amountMismatches.length,
            duplicate_transaction_group_count: duplicateTransactionGroups.length,
            duplicate_payment_count: duplicatePaymentCount,
            retry_limit_reached_count: retryLimitRows.length,
            verified_tier_drift_count: tierDriftRows.length,
            manual_review_queue_count: manualReviewQueue.length
        },
        samples: {
            stale_pending: stalePending.slice(0, sampleLimit),
            expired_pending: expiredPending.slice(0, sampleLimit),
            amount_mismatches: amountMismatches.slice(0, sampleLimit),
            duplicate_transactions: duplicateTransactionGroups.slice(0, sampleLimit),
            retry_limit_reached: retryLimitRows.slice(0, sampleLimit),
            verified_tier_drift: tierDriftRows.slice(0, sampleLimit)
        }
    };
}

async function markExpiredPendingPayments(actorTag) {
    const note = `[RECON_AUTO_EXPIRE] Auto-expired by reconciliation (${actorTag}) at ${new Date().toISOString()}`;
    const result = await runQuery(
        `
            UPDATE payments
            SET status = 'expired',
                admin_notes = CASE
                    WHEN admin_notes IS NULL OR BTRIM(admin_notes) = '' THEN $1
                    ELSE admin_notes || E'\\n' || $1
                END,
                updated_at = NOW()
            WHERE status = 'pending'
              AND expires_at IS NOT NULL
              AND expires_at < NOW()
            RETURNING id::text AS id, user_id::text AS user_id, transaction_id
        `,
        [note]
    );

    if (result.rows.length > 0) {
        await Promise.all(
            result.rows.map((row) => runQuery(
                `
                    INSERT INTO notifications (user_id, type, title, message, created_at)
                    VALUES ($1, 'payment_expired', 'Payment Expired', $2, NOW())
                `,
                [
                    row.user_id,
                    `Your payment${row.transaction_id ? ` (${row.transaction_id})` : ''} expired before verification. You can retry from your payments page.`
                ]
            ).catch((notificationErr) => {
                logger.warn('[PaymentReconciliation] Failed to create payment expiry notification', {
                    payment_id: row.id,
                    user_id: row.user_id,
                    message: notificationErr.message
                });
            }))
        );
    }

    return result.rows;
}

async function appendPendingAdminNote(paymentIds, tag, detail) {
    const normalizedIds = uniqueStrings(paymentIds);
    if (normalizedIds.length === 0) {
        return [];
    }

    const note = `${tag} ${detail}`;
    const result = await runQuery(
        `
            UPDATE payments
            SET admin_notes = CASE
                    WHEN admin_notes IS NULL OR BTRIM(admin_notes) = '' THEN $1
                    ELSE admin_notes || E'\\n' || $1
                END,
                updated_at = NOW()
            WHERE id::text = ANY($2::text[])
              AND status = 'pending'
              AND (admin_notes IS NULL OR admin_notes NOT LIKE '%' || $3 || '%')
            RETURNING id::text AS id, user_id::text AS user_id
        `,
        [note, normalizedIds, tag]
    );

    return result.rows;
}

async function fetchDuplicatePendingPaymentIds(lookbackHours, pendingScanLimit) {
    const result = await runQuery(
        `
            WITH duplicate_tx AS (
                SELECT transaction_id
                FROM payments
                WHERE transaction_id IS NOT NULL
                  AND transaction_id <> ''
                  AND created_at >= NOW() - ($1::text || ' hours')::interval
                GROUP BY transaction_id
                HAVING COUNT(*) > 1
            )
            SELECT p.id::text AS id, p.user_id::text AS user_id
            FROM payments p
            INNER JOIN duplicate_tx d ON d.transaction_id = p.transaction_id
            WHERE p.status = 'pending'
              AND p.created_at >= NOW() - ($1::text || ' hours')::interval
            ORDER BY p.created_at ASC
            LIMIT $2
        `,
        [lookbackHours, pendingScanLimit]
    );

    return result.rows;
}

async function executePaymentReconciliation(options = {}) {
    const {
        lookbackHours,
        stalePendingHours,
        sampleLimit,
        pendingScanLimit
    } = parseReconciliationOptions(options);
    const actor = String(options.actor || 'system');

    const report = await buildPaymentReconciliationReport({
        lookbackHours,
        stalePendingHours,
        sampleLimit,
        pendingScanLimit
    });

    const [expiredRows, duplicatePendingRows, pendingRowsForFlags] = await Promise.all([
        markExpiredPendingPayments(actor),
        fetchDuplicatePendingPaymentIds(lookbackHours, pendingScanLimit),
        fetchPendingRows(lookbackHours, pendingScanLimit)
    ]);

    const mismatchAnomalies = buildPendingAnomalySets(pendingRowsForFlags, stalePendingHours);
    const mismatchIds = mismatchAnomalies.amountMismatches.map((row) => row.id);
    const duplicateIds = duplicatePendingRows.map((row) => row.id);

    const [mismatchFlagRows, duplicateFlagRows] = await Promise.all([
        appendPendingAdminNote(
            mismatchIds,
            '[RECON_FLAG:AMOUNT_MISMATCH]',
            `Payment amount does not match the expected plan price (${actor})`
        ),
        appendPendingAdminNote(
            duplicateIds,
            '[RECON_FLAG:DUPLICATE_TXN]',
            `Duplicate transaction identifier detected in lookback window (${actor})`
        )
    ]);

    const touchedUserIds = uniqueStrings([
        ...expiredRows.map((row) => row.user_id),
        ...mismatchFlagRows.map((row) => row.user_id),
        ...duplicateFlagRows.map((row) => row.user_id)
    ]);

    if (touchedUserIds.length > 0) {
        invalidatePaymentCaches(touchedUserIds);
    }

    const execution = {
        run_at: new Date().toISOString(),
        actor,
        lookback_hours: lookbackHours,
        stale_pending_hours: stalePendingHours,
        actions: {
            auto_expired_count: expiredRows.length,
            amount_mismatch_flagged_count: mismatchFlagRows.length,
            duplicate_flagged_count: duplicateFlagRows.length,
            touched_user_count: touchedUserIds.length
        },
        report
    };

    cacheService.set(LAST_RECON_REPORT_CACHE_KEY, execution, LAST_RECON_REPORT_CACHE_TTL_SECONDS);

    logger.info('[PaymentReconciliation] Reconciliation run completed', {
        actor,
        expired: execution.actions.auto_expired_count,
        mismatches: execution.actions.amount_mismatch_flagged_count,
        duplicates: execution.actions.duplicate_flagged_count
    });

    return execution;
}

function getLastPaymentReconciliationReport() {
    return cacheService.get(LAST_RECON_REPORT_CACHE_KEY) || null;
}

module.exports = {
    buildPaymentReconciliationReport,
    executePaymentReconciliation,
    getLastPaymentReconciliationReport,
    parseReconciliationOptions
};
