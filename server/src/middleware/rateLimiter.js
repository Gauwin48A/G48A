/**
 * Rate Limiting Middleware
 * Prevents API abuse with configurable limits per endpoint
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

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

// Upload limiter
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
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

module.exports = {
    apiLimiter,
    authLimiter,
    signupLimiter,
    postLimiter,
    searchSlowDown,
    uploadLimiter,
    suspiciousActivityTracker
};
