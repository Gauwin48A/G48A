/**
 * Rate Limiting Middleware
 * Prevents API abuse with configurable limits per endpoint
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Store for tracking request counts (use Redis in production)
const requestCounts = new Map();

// Clean up old entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts) {
        if (now - data.timestamp > 900000) { // 15 minutes
            requestCounts.delete(key);
        }
    }
}, 60000);

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: {
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.',
        retryAfter: 15
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        return req.ip || req.headers['x-forwarded-for'] || 'unknown';
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
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, { count: 1, timestamp: now, flagged: false });
    } else {
        const data = requestCounts.get(ip);
        data.count++;

        // Flag if more than 500 requests in 15 minutes
        if (data.count > 500 && now - data.timestamp < 900000) {
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
