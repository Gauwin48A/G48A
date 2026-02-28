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

function getFlagEnvVarNames(normalizedKey) {
    return {
        enabled: `FF_${normalizedKey}_ENABLED`,
        rolloutPercent: `FF_${normalizedKey}_ROLLOUT_PERCENT`,
        allowlist: `FF_${normalizedKey}_ALLOWLIST`,
        killSwitch: `FF_${normalizedKey}_KILL_SWITCH`,
        owner: `FF_${normalizedKey}_OWNER`,
        expiresOn: `FF_${normalizedKey}_EXPIRES_ON`,
        rollbackOwner: `FF_${normalizedKey}_ROLLBACK_OWNER`,
        changeTicket: `FF_${normalizedKey}_CHANGE_TICKET`
    };
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
    const envKeys = getFlagEnvVarNames(normalized);
    if (!normalized) {
        return {
            enabled: false,
            reason: 'invalid_flag_key',
            bucket: null,
            rolloutPercent: 0,
            normalizedKey: normalized
        };
    }

    const killSwitch = parseBoolean(env.FEATURE_FLAGS_KILL_SWITCH, false) || parseBoolean(env[envKeys.killSwitch], false);
    if (killSwitch) {
        return {
            enabled: false,
            reason: 'kill_switch',
            bucket: null,
            rolloutPercent: 0,
            normalizedKey: normalized,
            killSwitch: true
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

    const explicitEnabled = env[envKeys.enabled];
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

    const allowlist = parseAllowlist(env[envKeys.allowlist]);
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

    const rolloutPercent = clampPercent(env[envKeys.rolloutPercent], 0);
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

function getFlagMetadata(flagKey, env = process.env) {
    const normalized = normalizeKey(flagKey);
    const envKeys = getFlagEnvVarNames(normalized);
    const expiresRaw = env[envKeys.expiresOn];
    const expiresOn = expiresRaw ? new Date(expiresRaw) : null;
    const expiryValid = !expiresOn || !Number.isNaN(expiresOn.getTime());

    return {
        normalizedKey: normalized,
        owner: env[envKeys.owner] ? String(env[envKeys.owner]).trim() : '',
        rollbackOwner: env[envKeys.rollbackOwner] ? String(env[envKeys.rollbackOwner]).trim() : '',
        changeTicket: env[envKeys.changeTicket] ? String(env[envKeys.changeTicket]).trim() : '',
        expiresOnRaw: expiresRaw || '',
        expiresOn: expiryValid && expiresOn ? expiresOn.toISOString() : null,
        expiryValid
    };
}

function validateFlagLifecycle(flagKey, env = process.env, now = new Date()) {
    const metadata = getFlagMetadata(flagKey, env);
    const issues = [];
    if (!metadata.owner) issues.push('missing_owner');
    if (!metadata.rollbackOwner) issues.push('missing_rollback_owner');
    if (!metadata.changeTicket) issues.push('missing_change_ticket');
    if (!metadata.expiresOnRaw) {
        issues.push('missing_expires_on');
    } else if (!metadata.expiryValid) {
        issues.push('invalid_expires_on');
    } else if (metadata.expiresOn && new Date(metadata.expiresOn) < now) {
        issues.push('expired_flag');
    }

    return {
        status: issues.length === 0 ? 'pass' : 'fail',
        issues,
        metadata
    };
}

module.exports = {
    evaluateFlag,
    parseBoolean,
    clampPercent,
    hashToBucket,
    normalizeKey,
    getFlagMetadata,
    validateFlagLifecycle,
    getFlagEnvVarNames
};
