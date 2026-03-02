/**
 * Reward Controller
 * Manages reward points, redemption, and point history
 */
const pool = require('../config/db');
const logger = require('../utils/logger');
const {
    applyRewardDeltaInTransaction,
    afterCommitRewardMutation,
    InsufficientPointsError,
    InvalidRewardInputError
} = require('../services/rewardsLedgerService');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
let rewardLogIdColumnAvailablePromise = null;
let usersLegacyIdColumnAvailablePromise = null;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

async function hasRewardLogIdColumn() {
    if (!rewardLogIdColumnAvailablePromise) {
        rewardLogIdColumnAvailablePromise = runQuery(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'reward_log'
                      AND column_name = 'id'
                ) AS available
            `
        )
            .then((result) => Boolean(result?.rows?.[0]?.available))
            .catch((err) => {
                logger.warn('[Rewards] Failed to inspect reward_log.id column, using log_id fallback', {
                    message: err.message
                });
                return false;
            });
    }

    return rewardLogIdColumnAvailablePromise;
}

function getRewardLogIdSelectExpression(hasIdColumn, tableAlias = '') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return hasIdColumn ? `${prefix}id` : `${prefix}log_id AS id`;
}

function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
}

function parseOptionalString(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
}

function getAuthenticatedUserId(req) {
    return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

async function hasUsersLegacyIdColumn() {
    if (!usersLegacyIdColumnAvailablePromise) {
        usersLegacyIdColumnAvailablePromise = runQuery(
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
            .catch(() => false);
    }

    return usersLegacyIdColumnAvailablePromise;
}

async function resolveCanonicalUserId(rawUserId) {
    const normalizedRawUserId = String(rawUserId || '').trim();
    if (!normalizedRawUserId) return null;

    try {
        const usersHasLegacyId = await hasUsersLegacyIdColumn();
        const lookup = await runQuery(
            usersHasLegacyId
                ? `
                    SELECT user_id::text AS user_id
                    FROM users
                    WHERE user_id::text = $1 OR id::text = $1
                    LIMIT 1
                `
                : `
                    SELECT user_id::text AS user_id
                    FROM users
                    WHERE user_id::text = $1
                    LIMIT 1
                `,
            [normalizedRawUserId]
        );

        return lookup.rows[0]?.user_id || normalizedRawUserId;
    } catch (err) {
        logger.warn('[Rewards] Failed to resolve canonical user ID, using raw identifier', {
            message: err.message
        });
        return normalizedRawUserId;
    }
}

// GET /api/reward/my — Get my rewards summary
exports.getMyRewards = async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    try {
        const hasRewardLogId = await hasRewardLogIdColumn();
        const normalizedUserId = await resolveCanonicalUserId(userId);
        const [rewardsRes, logRes] = await Promise.all([
            runQuery('SELECT points, tier FROM rewards WHERE user_id::text = $1', [normalizedUserId]),
            runQuery(
                `SELECT ${getRewardLogIdSelectExpression(hasRewardLogId)}, action, points, description, created_at
                 FROM reward_log
                 WHERE user_id::text = $1
                 ORDER BY created_at DESC
                 LIMIT 20`,
                [normalizedUserId]
            )
        ]);

        const rewards = rewardsRes.rows[0] || { points: 0, tier: 'Bronze' };
        const history = logRes.rows;

        res.json({
            points: rewards.points || 0,
            tier: rewards.tier || 'Bronze',
            history
        });
    } catch (err) {
        logger.error('Get rewards error:', err);
        res.status(500).json({ error: 'Failed to fetch rewards' });
    }
};

// POST /api/reward/redeem — Redeem points for credits
exports.redeemRewards = async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const requestedPoints = parsePositiveInt(req.body?.points, 0);
    if (!requestedPoints) {
        return res.status(400).json({ error: 'Valid points amount required' });
    }

    if (requestedPoints % 100 !== 0) {
        return res.status(400).json({ error: 'Redemption points must be in multiples of 100' });
    }

    try {
        const normalizedUserId = await resolveCanonicalUserId(userId);
        const credits = Math.floor(requestedPoints / 100);
        const idempotencyKey = parseOptionalString(
            (typeof req.get === 'function' ? req.get('x-idempotency-key') : null)
            || req.body?.idempotencyKey
            || req.body?.requestId
        );
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const rewardChange = await applyRewardDeltaInTransaction({
                client,
                userId: normalizedUserId,
                pointsDelta: -requestedPoints,
                action: 'redemption',
                description: `Points redeemed for ${credits} post credits`,
                idempotencyKey
            });

            if (rewardChange.applied && credits > 0) {
                await client.query({
                    text: 'UPDATE users SET post_credits = post_credits + $1 WHERE user_id::text = $2',
                    values: [credits, normalizedUserId],
                    query_timeout: DB_QUERY_TIMEOUT_MS
                });
            }

            await client.query('COMMIT');
            if (rewardChange.applied) {
                afterCommitRewardMutation(rewardChange);
            }

            const duplicateMessage = 'Redemption request already processed';
            res.json({
                message: rewardChange.duplicate
                    ? duplicateMessage
                    : `Redeemed ${requestedPoints} points for ${credits} post credits`,
                creditsGranted: credits,
                remainingPoints: rewardChange.pointsAfter,
                duplicate: rewardChange.duplicate
            });
        } catch (txErr) {
            try {
                await client.query('ROLLBACK');
            } catch {
                // noop
            }
            throw txErr;
        } finally {
            client.release();
        }
    } catch (err) {
        if (err instanceof InsufficientPointsError) {
            return res.status(400).json({ error: `Insufficient points. Available: ${err.availablePoints}` });
        }
        if (err instanceof InvalidRewardInputError) {
            return res.status(400).json({ error: err.message });
        }
        logger.error('Redeem error:', err);
        return res.status(500).json({ error: 'Failed to redeem rewards' });
    }
};
