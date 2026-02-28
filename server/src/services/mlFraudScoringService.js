const { evaluateFlag, parseBoolean } = require('./featureFlagService');

const DEFAULT_MODEL_VERSION = process.env.FRAUD_ML_MODEL_VERSION || 'ml-spike-v0';

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value) {
    if (!Number.isFinite(value)) return 0;
    if (value < 0) return 0;
    if (value > 100) return 100;
    return Math.round(value * 100) / 100;
}

function evaluateSignals(signals = {}) {
    const weights = [];
    let score = 0;

    const impossibleTravel = Boolean(signals.impossibleTravel);
    if (impossibleTravel) {
        score += 70;
        weights.push({ feature: 'impossible_travel', impact: 70, value: true });
    }

    const gpsIpMismatchKm = toNumber(signals.gpsIpMismatchKm, 0);
    if (gpsIpMismatchKm > 0) {
        const impact = Math.min(40, Math.round(gpsIpMismatchKm / 10));
        score += impact;
        weights.push({ feature: 'gps_ip_mismatch_km', impact, value: gpsIpMismatchKm });
    }

    const velocityKmh = toNumber(signals.velocityKmh, 0);
    if (velocityKmh > 120) {
        const impact = Math.min(30, Math.round((velocityKmh - 120) / 25));
        score += impact;
        weights.push({ feature: 'velocity_kmh', impact, value: velocityKmh });
    }

    if (Boolean(signals.newDevice)) {
        score += 20;
        weights.push({ feature: 'new_device', impact: 20, value: true });
    }

    const recentFailedLogins = toNumber(signals.recentFailedLogins, 0);
    if (recentFailedLogins > 0) {
        const impact = Math.min(25, recentFailedLogins * 5);
        score += impact;
        weights.push({ feature: 'recent_failed_logins', impact, value: recentFailedLogins });
    }

    return {
        score: clampScore(score),
        explainability: weights
    };
}

function toDecision(score) {
    if (score >= 80) return 'BLOCK';
    if (score >= 50) return 'CHALLENGE';
    return 'ALLOW';
}

async function scoreLoginAttempt(input = {}, env = process.env) {
    const flag = evaluateFlag('ml_fraud_scoring', { userId: input.userId, deviceId: input.deviceId }, env);
    const challengeFlag = evaluateFlag(
        'ml_fraud_scoring_challenge',
        { userId: input.userId, deviceId: input.deviceId },
        env
    );
    const enforceFlag = evaluateFlag(
        'ml_fraud_scoring_enforce',
        { userId: input.userId, deviceId: input.deviceId },
        env
    );
    const shadowMode = parseBoolean(env.FRAUD_ML_SHADOW_MODE, true);
    const killSwitch = parseBoolean(env.FRAUD_ML_KILL_SWITCH, false);

    const baseline = {
        evaluatedAt: new Date().toISOString(),
        modelVersion: DEFAULT_MODEL_VERSION,
        flag,
        challengeFlag,
        enforceFlag,
        shadowMode,
        killSwitch
    };

    if (!flag.enabled || killSwitch) {
        return {
            ...baseline,
            enabled: false,
            score: null,
            recommendedAction: 'SKIP',
            shouldEnforce: false,
            shouldChallenge: false,
            explainability: [
                { feature: 'feature_flag', impact: 0, value: killSwitch ? 'kill_switch' : 'disabled' }
            ]
        };
    }

    const signalResult = evaluateSignals(input.signals || {});
    const recommendedAction = toDecision(signalResult.score);
    const shouldChallenge = challengeFlag.enabled && recommendedAction !== 'ALLOW';
    const shouldEnforce = enforceFlag.enabled && !shadowMode && recommendedAction === 'BLOCK';

    return {
        ...baseline,
        enabled: true,
        score: signalResult.score,
        recommendedAction,
        shouldChallenge,
        shouldEnforce,
        explainability: signalResult.explainability
    };
}

module.exports = {
    scoreLoginAttempt,
    evaluateSignals,
    toDecision
};
