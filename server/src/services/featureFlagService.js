const crypto = require('crypto');

function parseBoolean(value, fallback = false) {
    if (value === undefined || value === null || value === '') {
        return fallback;
    }
    const normalized = String(value).trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function clampPercent(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return fallback;
    if (parsed < 0) return 0;
    if (parsed > 100) return 100;
    return parsed;
}

function hashToBucket(seed) {
    const digest = crypto.createHash('sha256').update(String(seed)).digest();
    const int = digest.readUInt32BE(0);
    return int % 100;
}

function normalizeKey(key) {
    return String(key || '')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_');
}

function parseAllowlist(value) {
    if (!value) return new Set();
    return new Set(
        String(value)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
    );
}

function resolveContextSeed(context = {}) {
    return (
        context.userId ||
        context.user_id ||
        context.accountId ||
        context.deviceId ||
        context.sessionId ||
        context.ipAddress ||
        'anonymous'
    );
}

function evaluateFlag(flagKey, context = {}, env = process.env) {
    const normalized = normalizeKey(flagKey);
    if (!normalized) {
        return {
            enabled: false,
            reason: 'invalid_flag_key',
            bucket: null,
            rolloutPercent: 0,
            normalizedKey: normalized
        };
    }

    const globalSwitch = parseBoolean(env.FEATURE_FLAGS_ENABLED, true);
    if (!globalSwitch) {
        return {
            enabled: false,
            reason: 'feature_flags_disabled',
            bucket: null,
            rolloutPercent: 0,
            normalizedKey: normalized
        };
    }

    const explicitEnabled = env[`FF_${normalized}_ENABLED`];
    const enabledOverride = explicitEnabled === undefined ? null : parseBoolean(explicitEnabled, false);
    if (enabledOverride === false) {
        return {
            enabled: false,
            reason: 'flag_disabled',
            bucket: null,
            rolloutPercent: 0,
            normalizedKey: normalized
        };
    }

    const allowlist = parseAllowlist(env[`FF_${normalized}_ALLOWLIST`]);
    const actor = String(resolveContextSeed(context));
    if (allowlist.has(actor)) {
        return {
            enabled: true,
            reason: 'allowlist',
            bucket: 0,
            rolloutPercent: 100,
            normalizedKey: normalized
        };
    }

    const rolloutPercent = clampPercent(env[`FF_${normalized}_ROLLOUT_PERCENT`], 0);
    const bucket = hashToBucket(`${normalized}:${actor}`);
    const percentageEnabled = rolloutPercent > 0 && bucket < rolloutPercent;

    if (enabledOverride === true && rolloutPercent === 0) {
        return {
            enabled: true,
            reason: 'forced_enabled',
            bucket,
            rolloutPercent: 100,
            normalizedKey: normalized
        };
    }

    return {
        enabled: percentageEnabled,
        reason: percentageEnabled ? 'rollout' : 'outside_rollout',
        bucket,
        rolloutPercent,
        normalizedKey: normalized
    };
}

module.exports = {
    evaluateFlag,
    parseBoolean,
    clampPercent,
    hashToBucket,
    normalizeKey
};
