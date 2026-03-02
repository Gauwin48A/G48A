const pool = require('../config/db');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const { publishRewardUpdate } = require('./rewardsRealtimeService');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const IDEMPOTENCY_KEY_MAX_LENGTH = 120;
const CACHE_PROFILE_KEY = (userId) => `rewards:${userId}:profile`;
const CACHE_LOG_KEY_PATTERN = (userId) => `rewards:${userId}:log:*`;

class RewardsLedgerError extends Error {
    constructor(message, code = 'REWARDS_LEDGER_ERROR') {
        super(message);
        this.name = 'RewardsLedgerError';
        this.code = code;
    }
}

class InvalidRewardInputError extends RewardsLedgerError {
    constructor(message) {
        super(message, 'INVALID_REWARD_INPUT');
        this.name = 'InvalidRewardInputError';
    }
}

class InsufficientPointsError extends RewardsLedgerError {
    constructor(availablePoints) {
        super('Insufficient reward points', 'INSUFFICIENT_POINTS');
        this.name = 'InsufficientPointsError';
        this.availablePoints = Number(availablePoints) || 0;
    }
}

function parseOptionalString(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
}

function parseIntegerDelta(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed === 0) {
        throw new InvalidRewardInputError('Points delta must be a non-zero integer');
    }
    return parsed;
}

function sanitizeIdempotencyKey(value) {
    const normalized = parseOptionalString(value);
    if (!normalized) return null;
    return normalized.slice(0, IDEMPOTENCY_KEY_MAX_LENGTH);
}

function computeTier(points) {
    const normalizedPoints = Number(points) || 0;
    if (normalizedPoints >= 5000) return 'Platinum';
    if (normalizedPoints >= 2000) return 'Gold';
    if (normalizedPoints >= 500) return 'Silver';
    return 'Bronze';
}

async function runClientQuery(client, text, values = []) {
    return client.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

let idempotencyTableReadyPromise = null;

async function ensureIdempotencyTable() {
    if (idempotencyTableReadyPromise) {
        return idempotencyTableReadyPromise;
    }

    idempotencyTableReadyPromise = (async () => {
        try {
            await pool.query({
                text: `
                    CREATE TABLE IF NOT EXISTS reward_idempotency (
                        id SERIAL PRIMARY KEY,
                        user_id TEXT NOT NULL,
                        idempotency_key TEXT NOT NULL,
                        action TEXT NOT NULL,
                        points_delta INTEGER NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        UNIQUE (user_id, idempotency_key)
                    )
                `,
                values: [],
                query_timeout: DB_QUERY_TIMEOUT_MS
            });
            return true;
        } catch (err) {
            logger.warn('[RewardsLedger] reward_idempotency table unavailable. Idempotency disabled.', {
                message: err.message
            });
            return false;
        }
    })();

    const ready = await idempotencyTableReadyPromise;
    if (!ready) {
        idempotencyTableReadyPromise = null;
    }
    return ready;
}

async function ensureRewardsRow(client, userId) {
    await runClientQuery(
        client,
        `
            INSERT INTO rewards (user_id, points, tier)
            VALUES ($1, 0, 'Bronze')
            ON CONFLICT (user_id) DO NOTHING
        `,
        [userId]
    );
}

async function selectPoints(client, userId, { forUpdate = false } = {}) {
    const result = await runClientQuery(
        client,
        `
            SELECT points
            FROM rewards
            WHERE user_id::text = $1
            ${forUpdate ? 'FOR UPDATE' : ''}
            LIMIT 1
        `,
        [userId]
    );
    return Number(result.rows[0]?.points || 0);
}

function toRewardEventPayload(change) {
    return {
        type: 'rewards_balance_changed',
        action: change.action,
        pointsDelta: change.pointsDelta,
        pointsBefore: change.pointsBefore,
        pointsAfter: change.pointsAfter,
        tier: change.tier,
        idempotencyKey: change.idempotencyKey || null
    };
}

function afterCommitRewardMutation(change) {
    const normalizedUserId = String(change.userId);
    cacheService.invalidateRelated([
        CACHE_PROFILE_KEY(normalizedUserId),
        CACHE_LOG_KEY_PATTERN(normalizedUserId)
    ]);
    publishRewardUpdate(normalizedUserId, toRewardEventPayload(change));
}

async function applyRewardDeltaInTransaction({
    client,
    userId,
    pointsDelta,
    action,
    description,
    idempotencyKey = null
}) {
    if (!client || typeof client.query !== 'function') {
        throw new InvalidRewardInputError('A transactional database client is required');
    }

    const normalizedUserId = parseOptionalString(userId);
    if (!normalizedUserId) {
        throw new InvalidRewardInputError('userId is required');
    }

    const normalizedAction = parseOptionalString(action) || 'adjustment';
    const normalizedDescription = parseOptionalString(description) || 'Rewards balance adjusted';
    const normalizedDelta = parseIntegerDelta(pointsDelta);
    const normalizedIdempotencyKey = sanitizeIdempotencyKey(idempotencyKey);

    await ensureRewardsRow(client, normalizedUserId);

    let idempotencyTableReady = false;
    if (normalizedIdempotencyKey) {
        idempotencyTableReady = await ensureIdempotencyTable();
        if (idempotencyTableReady) {
            await runClientQuery(
                client,
                'SELECT pg_advisory_xact_lock(hashtext($1))',
                [`rewards:${normalizedUserId}:${normalizedIdempotencyKey}`]
            );

            const existingIdempotencyResult = await runClientQuery(
                client,
                `
                    SELECT id
                    FROM reward_idempotency
                    WHERE user_id = $1
                      AND idempotency_key = $2
                    LIMIT 1
                `,
                [normalizedUserId, normalizedIdempotencyKey]
            );

            if (existingIdempotencyResult.rowCount > 0) {
                const currentPoints = await selectPoints(client, normalizedUserId, { forUpdate: false });
                return {
                    applied: false,
                    duplicate: true,
                    userId: normalizedUserId,
                    action: normalizedAction,
                    pointsDelta: normalizedDelta,
                    pointsBefore: currentPoints,
                    pointsAfter: currentPoints,
                    tier: computeTier(currentPoints),
                    idempotencyKey: normalizedIdempotencyKey
                };
            }
        }
    }

    const pointsBefore = await selectPoints(client, normalizedUserId, { forUpdate: true });
    const pointsAfter = pointsBefore + normalizedDelta;
    if (pointsAfter < 0) {
        throw new InsufficientPointsError(pointsBefore);
    }

    const nextTier = computeTier(pointsAfter);
    await runClientQuery(
        client,
        `
            UPDATE rewards
            SET points = $1,
                tier = $2
            WHERE user_id::text = $3
        `,
        [pointsAfter, nextTier, normalizedUserId]
    );

    await runClientQuery(
        client,
        `
            INSERT INTO reward_log (user_id, action, points, description, created_at)
            VALUES ($1, $2, $3, $4, NOW())
        `,
        [normalizedUserId, normalizedAction, normalizedDelta, normalizedDescription]
    );

    if (normalizedIdempotencyKey && idempotencyTableReady) {
        await runClientQuery(
            client,
            `
                INSERT INTO reward_idempotency (user_id, idempotency_key, action, points_delta, created_at)
                VALUES ($1, $2, $3, $4, NOW())
            `,
            [normalizedUserId, normalizedIdempotencyKey, normalizedAction, normalizedDelta]
        );
    }

    return {
        applied: true,
        duplicate: false,
        userId: normalizedUserId,
        action: normalizedAction,
        pointsDelta: normalizedDelta,
        pointsBefore,
        pointsAfter,
        tier: nextTier,
        idempotencyKey: normalizedIdempotencyKey
    };
}

async function applyRewardDelta(options) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const change = await applyRewardDeltaInTransaction({
            ...options,
            client
        });
        await client.query('COMMIT');
        if (change.applied) {
            afterCommitRewardMutation(change);
        }
        return change;
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch {
            // noop
        }
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    RewardsLedgerError,
    InvalidRewardInputError,
    InsufficientPointsError,
    applyRewardDelta,
    applyRewardDeltaInTransaction,
    afterCommitRewardMutation,
    computeTier
};
