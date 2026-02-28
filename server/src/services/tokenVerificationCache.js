const jwt = require('jsonwebtoken');

const TOKEN_CACHE_TTL_MS = (() => {
    const parsed = Number.parseInt(process.env.AUTH_TOKEN_CACHE_TTL_MS, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
    return process.env.NODE_ENV === 'production' ? 0 : 1000;
})();

const TOKEN_CACHE_MAX = (() => {
    const parsed = Number.parseInt(process.env.AUTH_TOKEN_CACHE_MAX, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 10000;
})();
const TOKEN_CACHE_SWEEP_INTERVAL_MS = (() => {
    const parsed = Number.parseInt(process.env.AUTH_TOKEN_CACHE_SWEEP_INTERVAL_MS, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 60000;
})();

const tokenCache = new Map();

function sweepExpiredEntries(now = Date.now()) {
    if (tokenCache.size === 0) return 0;
    let removed = 0;
    for (const [token, entry] of tokenCache.entries()) {
        if (entry.cacheExpiresAtMs <= now || entry.jwtExpiresAtMs <= now) {
            tokenCache.delete(token);
            removed += 1;
        }
    }
    return removed;
}

if (TOKEN_CACHE_TTL_MS > 0) {
    const sweepTimer = setInterval(() => {
        sweepExpiredEntries();
    }, TOKEN_CACHE_SWEEP_INTERVAL_MS);
    if (typeof sweepTimer.unref === 'function') {
        sweepTimer.unref();
    }
}

function getCachedToken(token, secret) {
    if (!token || !secret || TOKEN_CACHE_TTL_MS <= 0) return null;

    const entry = tokenCache.get(token);
    if (!entry) return null;
    if (entry.secret !== secret) return null;

    const now = Date.now();
    if (entry.cacheExpiresAtMs <= now || entry.jwtExpiresAtMs <= now) {
        tokenCache.delete(token);
        return null;
    }

    return entry.payload;
}

function setCachedToken(token, secret, payload) {
    if (!token || !secret || !payload || TOKEN_CACHE_TTL_MS <= 0) return;

    const now = Date.now();
    const jwtExpiresAtMs = Number.isFinite(payload.exp)
        ? Number(payload.exp) * 1000
        : (now + TOKEN_CACHE_TTL_MS);
    const cacheExpiresAtMs = Math.min(now + TOKEN_CACHE_TTL_MS, jwtExpiresAtMs);
    if (cacheExpiresAtMs <= now) return;

    if (tokenCache.size >= TOKEN_CACHE_MAX) {
        const oldestKey = tokenCache.keys().next().value;
        if (oldestKey !== undefined) {
            tokenCache.delete(oldestKey);
        }
    }

    tokenCache.set(token, {
        secret,
        payload,
        jwtExpiresAtMs,
        cacheExpiresAtMs
    });
}

function verifyToken(token, secret) {
    const cached = getCachedToken(token, secret);
    if (cached) return cached;

    const payload = jwt.verify(token, secret);
    setCachedToken(token, secret, payload);
    return payload;
}

function clearTokenVerificationCache() {
    tokenCache.clear();
}

module.exports = {
    verifyToken,
    clearTokenVerificationCache,
    sweepExpiredEntries
};
