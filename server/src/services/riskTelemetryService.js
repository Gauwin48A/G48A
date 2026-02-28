const logger = require('../utils/logger');

const MAX_EVENTS = Number.parseInt(process.env.RISK_TELEMETRY_MAX_EVENTS || '500', 10);
const events = [];

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

    logger.info(
        `[RISK_TELEMETRY] flow=${event.flow} enabled=${event.enabled} score=${event.score ?? 'n/a'} action=${event.recommendedAction} challenge=${event.shouldChallenge} enforce=${event.shouldEnforce} reason=${event.flagReason || 'n/a'}`
    );

    return event;
}

function getMetrics({ lookbackMinutes = 60 } = {}) {
    const cutoff = Date.now() - (Number.parseInt(lookbackMinutes, 10) || 60) * 60 * 1000;
    const filtered = events.filter((event) => new Date(event.timestamp).getTime() >= cutoff);

    const byAction = {};
    const byReason = {};
    let scoreSum = 0;
    let scored = 0;
    let challengeCount = 0;
    let enforceCount = 0;

    for (const event of filtered) {
        byAction[event.recommendedAction] = (byAction[event.recommendedAction] || 0) + 1;
        if (event.flagReason) {
            byReason[event.flagReason] = (byReason[event.flagReason] || 0) + 1;
        }
        if (Number.isFinite(event.score)) {
            scoreSum += event.score;
            scored += 1;
        }
        if (event.shouldChallenge) challengeCount += 1;
        if (event.shouldEnforce) enforceCount += 1;
    }

    return {
        lookbackMinutes,
        totalEvents: filtered.length,
        byAction,
        byReason,
        challengeCount,
        enforceCount,
        avgScore: scored > 0 ? Number((scoreSum / scored).toFixed(2)) : null,
        generatedAt: new Date().toISOString()
    };
}

function reset() {
    events.splice(0, events.length);
}

module.exports = {
    recordDecision,
    getMetrics,
    reset
};
