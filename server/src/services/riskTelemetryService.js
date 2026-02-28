const logger = require('../utils/logger');
const pool = require('../config/db');

const MAX_EVENTS = Number.parseInt(process.env.RISK_TELEMETRY_MAX_EVENTS || '500', 10);
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS || '10000', 10);
const events = [];

let persistenceEnabled = process.env.RISK_TELEMETRY_PERSIST !== 'false';
let persistenceWarningLogged = false;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function toLookbackMinutes(value, fallback = 60) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, 24 * 60);
}

async function persistEvent(event) {
    if (!persistenceEnabled) return;

    try {
        await runQuery(
            `INSERT INTO risk_decision_events (
                event_timestamp,
                user_id,
                flow,
                enabled,
                score,
                recommended_action,
                should_challenge,
                should_enforce,
                shadow_mode,
                flag_reason,
                model_version,
                explainability_count
            ) VALUES (NOW(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
                event.userId,
                event.flow,
                event.enabled,
                event.score,
                event.recommendedAction,
                event.shouldChallenge,
                event.shouldEnforce,
                event.shadowMode,
                event.flagReason,
                event.modelVersion,
                event.explainabilityCount
            ]
        );
    } catch (err) {
        if (!persistenceWarningLogged) {
            logger.warn(`[RISK_TELEMETRY] DB persistence disabled (fallback to memory): ${err.message}`);
            persistenceWarningLogged = true;
        }
        if (err.code === '42P01') {
            // Relation does not exist; avoid repeated errors until migration is applied.
            persistenceEnabled = false;
        }
    }
}

function recordDecision(payload = {}) {
    const event = {
        timestamp: new Date().toISOString(),
        userId: payload.userId || null,
        flow: payload.flow || 'auth_login',
        enabled: Boolean(payload.enabled),
        score: Number.isFinite(Number(payload.score)) ? Number(payload.score) : null,
        recommendedAction: payload.recommendedAction || 'SKIP',
        shouldChallenge: Boolean(payload.shouldChallenge),
        shouldEnforce: Boolean(payload.shouldEnforce),
        shadowMode: Boolean(payload.shadowMode),
        flagReason: payload.flagReason || null,
        modelVersion: payload.modelVersion || null,
        explainabilityCount: Array.isArray(payload.explainability) ? payload.explainability.length : 0
    };

    events.push(event);
    if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS);
    }

    void persistEvent(event);

    logger.info(
        `[RISK_TELEMETRY] flow=${event.flow} enabled=${event.enabled} score=${event.score ?? 'n/a'} action=${event.recommendedAction} challenge=${event.shouldChallenge} enforce=${event.shouldEnforce} reason=${event.flagReason || 'n/a'}`
    );

    return event;
}

function aggregateMetrics(rows, lookbackMinutes, source) {
    const byAction = {};
    const byReason = {};
    let scoreSum = 0;
    let scored = 0;
    let challengeCount = 0;
    let enforceCount = 0;

    for (const row of rows) {
        const action = row.recommendedAction || row.recommended_action || 'SKIP';
        byAction[action] = (byAction[action] || 0) + 1;

        const reason = row.flagReason || row.flag_reason || null;
        if (reason) {
            byReason[reason] = (byReason[reason] || 0) + 1;
        }

        const score = Number(row.score);
        if (Number.isFinite(score)) {
            scoreSum += score;
            scored += 1;
        }

        if (row.shouldChallenge || row.should_challenge) challengeCount += 1;
        if (row.shouldEnforce || row.should_enforce) enforceCount += 1;
    }

    return {
        lookbackMinutes,
        source,
        totalEvents: rows.length,
        byAction,
        byReason,
        challengeCount,
        enforceCount,
        avgScore: scored > 0 ? Number((scoreSum / scored).toFixed(2)) : null,
        generatedAt: new Date().toISOString()
    };
}

async function getMetrics({ lookbackMinutes = 60, source = 'auto' } = {}) {
    const lookback = toLookbackMinutes(lookbackMinutes, 60);

    if (source !== 'memory' && persistenceEnabled) {
        try {
            const result = await runQuery(
                `SELECT
                    score,
                    recommended_action,
                    should_challenge,
                    should_enforce,
                    flag_reason
                 FROM risk_decision_events
                 WHERE event_timestamp >= NOW() - ($1::text || ' minutes')::interval`,
                [String(lookback)]
            );
            return aggregateMetrics(result.rows, lookback, 'database');
        } catch (err) {
            logger.warn(`[RISK_TELEMETRY] Failed reading DB metrics, falling back to memory: ${err.message}`);
        }
    }

    const cutoff = Date.now() - lookback * 60 * 1000;
    const filtered = events.filter((event) => new Date(event.timestamp).getTime() >= cutoff);
    return aggregateMetrics(filtered, lookback, 'memory');
}

function reset() {
    events.splice(0, events.length);
}

function setPersistenceEnabled(enabled) {
    persistenceEnabled = Boolean(enabled);
}

module.exports = {
    recordDecision,
    getMetrics,
    reset,
    setPersistenceEnabled
};
