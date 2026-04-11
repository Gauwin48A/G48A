/**
 * Rate Limiting Middleware
 * Prevents API abuse with configurable limits per endpoint
 * Uses Redis store when available, falls back to in-memory
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const redisSession = require('../config/redisSession');

// ── Redis-backed store for express-rate-limit v8 ──
// When Redis is available, rate limits survive restarts and work across cluster workers.
class RedisRateLimitStore {
    constructor(prefix = 'rl:') {
        this.prefix = prefix;
    }

    _key(key) {
        return `${this.prefix}${key}`;
    }

    async increment(key) {
        const k = this._key(key);
        const total = await redisSession.incr(k);
        // Set TTL on first increment (15 min window)
        if (total === 1) {
            await redisSession.expire(k, 900);
        }
        return { totalHits: total, resetTime: undefined };
    }

    async decrement(key) {
        // Not all stores support decrement; best-effort
        const k = this._key(key);
        const current = await redisSession.get(k);
        if (current && Number(current) > 0) {
            await redisSession.set(k, Number(current) - 1, 900);
        }
    }

    async resetKey(key) {
        await redisSession.del(this._key(key));
    }
}

function buildStore(prefix) {
    if (redisSession.isRedisAvailable()) {
        return new RedisRateLimitStore(prefix);
    }
    return undefined; // falls back to express-rate-limit default MemoryStore
}

const SUSPICIOUS_WINDOW_MS = 15 * 60 * 1000;
const SUSPICIOUS_CLEANUP_INTERVAL_MS = 60 * 1000;
const SUSPICIOUS_REQUEST_THRESHOLD = 500;

function resolveClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.trim().length > 0) {
        const first = forwarded.split(',')[0].trim();
        if (first) return first;
    }

    return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
}

// Store for tracking request counts (use Redis in production)
const requestCounts = new Map();

// Clean up old entries periodically
const suspiciousCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts) {
        const lastSeenAt = Number.isFinite(data?.lastSeenAt) ? data.lastSeenAt : data?.timestamp;
        if (!Number.isFinite(lastSeenAt) || (now - lastSeenAt) > SUSPICIOUS_WINDOW_MS) {
            requestCounts.delete(key);
        }
    }
}, SUSPICIOUS_CLEANUP_INTERVAL_MS);

if (typeof suspiciousCleanupTimer.unref === 'function') {
    suspiciousCleanupTimer.unref();
}

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // Increased to support view tracking bursts
    store: buildStore('rl:api:'),
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return rateLimit.ipKeyGenerator(resolveClientIp(req));
    },
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === '/health' || req.path === '/api/health';
    }
});

// Strict limiter for authentication endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    store: buildStore('rl:auth:'),
    message: {
        error: 'Too many login attempts',
        message: 'Account temporarily locked. Please try again in an hour.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Stricter limiter for signup to prevent spam
const signupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 signups per hour per IP
    store: buildStore('rl:signup:'),
    message: {
        error: 'Too many signups',
        message: 'Too many accounts created from this IP. Please try again later.',
        retryAfter: 60
    }
});

// Post creation limiter
const postLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 posts per hour
    store: buildStore('rl:post:'),
    message: {
        error: 'Post limit reached',
        message: 'You can only create 20 posts per hour.',
        retryAfter: 60
    }
});

// Slow down for search to prevent scraping
const searchSlowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 30, // Start slowing after 30 requests
    delayMs: (hits) => hits * 100, // Add 100ms delay per request
    maxDelayMs: 2000 // Max 2 second delay
});

// Lightweight throttle for public read endpoints (list/search)
const publicReadSlowDown = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 80,
    delayMs: (hits) => Math.max(0, hits - 80) * 50,
    maxDelayMs: 2000
});

// S-05: Progressive delay for login failures — 1s→2s→4s→8s per IP
// Kicks in after 3 failed attempts in a 15-minute window.
// Complements loginLimiter (hard block) by adding friction before the hard cap.
const loginSlowDown = slowDown({
    windowMs: 15 * 60 * 1000,
    delayAfter: 3,               // First 3 attempts pass through immediately
    delayMs: (hits) => Math.min((hits - 3) * 1000, 8000), // 1s, 2s, 3s ... capped at 8s
    maxDelayMs: 8000,
    skipSuccessfulRequests: true // Don't penalize successful logins
});

// Upload limiter
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    store: buildStore('rl:upload:'),
    message: {
        error: 'Upload limit reached',
        message: 'You can only upload 50 files per hour.',
        retryAfter: 60
    }
});

// Custom middleware for tracking suspicious activity
const suspiciousActivityTracker = (req, res, next) => {
    const ip = resolveClientIp(req);
    const now = Date.now();

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, {
            count: 1,
            timestamp: now, // Backward compatibility for existing diagnostics.
            windowStartAt: now,
            lastSeenAt: now,
            flagged: false
        });
    } else {
        const data = requestCounts.get(ip);

        const windowStartAt = Number.isFinite(data.windowStartAt)
            ? data.windowStartAt
            : (Number.isFinite(data.timestamp) ? data.timestamp : now);

        if ((now - windowStartAt) >= SUSPICIOUS_WINDOW_MS) {
            data.count = 0;
            data.windowStartAt = now;
            data.flagged = false;
        }

        data.count += 1;
        data.lastSeenAt = now;

        // Flag if more than threshold requests within the active window.
        if (data.count > SUSPICIOUS_REQUEST_THRESHOLD && !data.flagged) {
            data.flagged = true;
            console.warn(`[SECURITY] Suspicious activity detected from IP: ${ip}`);
        }
    }

    next();
};

// Rate limiter for financial/transactional endpoints (sale, payments)
const transactionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 transactions per 15 minutes
    store: buildStore('rl:txn:'),
    message: {
        error: 'Transaction rate limit reached',
        message: 'Too many transaction attempts. Please try again later.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Per-user if authenticated, otherwise per-IP
        const userId = req.user?.user_id || req.user?.userId || req.user?.id;
        return userId ? `user_${userId}` : resolveClientIp(req);
    }
});

// Rate limiter for offer operations
const offerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 40, // 40 offer actions per 15 minutes
    store: buildStore('rl:offer:'),
    message: {
        error: 'Offer rate limit reached',
        message: 'Too many offer requests. Please try again later.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req.user?.user_id || req.user?.userId || req.user?.id;
        return userId ? `user_${userId}` : resolveClientIp(req);
    }
});

// Rate limiter for reward/coin redemption (stricter to prevent abuse)
const rewardRedeemLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 redemptions per hour
    store: buildStore('rl:reward:'),
    message: {
        error: 'Reward redemption limit reached',
        message: 'Too many reward actions. Please try again later.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req.user?.user_id || req.user?.userId || req.user?.id;
        return userId ? `user_${userId}` : resolveClientIp(req);
    }
});

// Rate limiter for admin operations (generous but bounded)
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // 200 admin actions per 15 minutes
    store: buildStore('rl:admin:'),
    message: {
        error: 'Admin rate limit reached',
        message: 'Too many admin requests. Please slow down.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        const userId = req.user?.user_id || req.user?.userId || req.user?.id;
        return userId ? `admin_${userId}` : resolveClientIp(req);
    }
});

// Rate limiter for payment webhook (prevents replay floods)
const webhookLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 webhook calls per minute per IP
    store: buildStore('rl:webhook:'),
    message: { error: 'Webhook rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    apiLimiter,
    authLimiter,
    signupLimiter,
    postLimiter,
    searchSlowDown,
    publicReadSlowDown,
    loginSlowDown,
    uploadLimiter,
    suspiciousActivityTracker,
    transactionLimiter,
    offerLimiter,
    rewardRedeemLimiter,
    adminLimiter,
    webhookLimiter
};
