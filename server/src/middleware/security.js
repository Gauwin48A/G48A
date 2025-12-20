/**
 * SECURITY MIDDLEWARE - 7 Pillars of Protection
 * Comprehensive security for the MHub application
 */

const rateLimit = require('express-rate-limit');

// ============================================================
// PILLAR 1: RATE LIMITING - Prevent brute force attacks
// ============================================================

// Strict rate limiter for authentication endpoints
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        error: 'Too many login attempts. Please try again in 15 minutes.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true,
    // Key generator - use IP + email combo for more granular limiting
    keyGenerator: (req) => {
        return `${req.ip}-${req.body?.email || 'unknown'}`;
    }
});

// Rate limiter for password reset
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 attempts per hour
    message: {
        error: 'Too many password reset attempts. Please try again in 1 hour.'
    }
});

// API rate limiter for general endpoints
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: {
        error: 'Too many requests. Please slow down.'
    }
});

// ============================================================
// PILLAR 2: ACCOUNT LOCKOUT - Prevent password guessing
// ============================================================

// In-memory store for failed attempts (production: use Redis)
const failedAttempts = new Map();
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

const checkAccountLockout = (req, res, next) => {
    const email = req.body?.email?.toLowerCase();
    if (!email) return next();

    const attempts = failedAttempts.get(email);
    if (attempts && attempts.count >= LOCKOUT_THRESHOLD) {
        const lockoutEnd = attempts.lockedUntil;
        if (lockoutEnd && Date.now() < lockoutEnd) {
            const remainingMs = lockoutEnd - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60000);
            return res.status(423).json({
                error: `Account temporarily locked. Try again in ${remainingMin} minutes.`,
                locked: true,
                retryAfter: remainingMin
            });
        } else {
            // Lockout expired, reset
            failedAttempts.delete(email);
        }
    }
    next();
};

const recordFailedAttempt = (email) => {
    email = email?.toLowerCase();
    if (!email) return;

    const attempts = failedAttempts.get(email) || { count: 0 };
    attempts.count += 1;

    if (attempts.count >= LOCKOUT_THRESHOLD) {
        attempts.lockedUntil = Date.now() + LOCKOUT_DURATION;
        console.log(`[SECURITY] Account locked for ${email} after ${LOCKOUT_THRESHOLD} failed attempts`);
    }

    failedAttempts.set(email, attempts);
};

const resetFailedAttempts = (email) => {
    email = email?.toLowerCase();
    if (email) failedAttempts.delete(email);
};

// ============================================================
// PILLAR 3: SECURITY HEADERS - Prevent XSS, clickjacking
// (Already implemented via helmet in index.js)
// ============================================================

// ============================================================
// PILLAR 4: INPUT SANITIZATION - Prevent injection attacks
// ============================================================

const sanitizeInput = (req, res, next) => {
    // Sanitize common injection patterns
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            // Remove/encode dangerous characters
            return obj
                .replace(/<script[^>]*>.*?<\/script>/gi, '') // Remove script tags
                .replace(/javascript:/gi, '') // Remove javascript: links
                .replace(/on\w+\s*=/gi, '') // Remove event handlers
                .trim();
        }
        if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => {
                obj[key] = sanitize(obj[key]);
            });
        }
        return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);

    next();
};

// ============================================================
// PILLAR 5: SECURE SESSION - JWT validation enhancement
// ============================================================

const validateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Token format validation
    if (token.length < 50 || !token.includes('.')) {
        return res.status(401).json({ error: 'Invalid token format' });
    }

    next();
};

// ============================================================
// PILLAR 6: CORS HARDENING - Already in index.js
// ============================================================

// ============================================================
// PILLAR 7: SECURITY LOGGING - Monitor attacks
// ============================================================

const securityLogger = (req, res, next) => {
    const startTime = Date.now();

    // Log security-relevant events
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const statusCode = res.statusCode;

        // Log failed auth attempts
        if (req.path.includes('/auth/login') && statusCode >= 400) {
            console.log(`[SECURITY] Failed login: ${req.body?.email || 'unknown'} | IP: ${req.ip} | Status: ${statusCode} | ${duration}ms`);
        }

        // Log rate limiting hits
        if (statusCode === 429) {
            console.log(`[SECURITY] Rate limited: ${req.path} | IP: ${req.ip}`);
        }

        // Log suspicious patterns
        if (req.body?.email?.includes("'") || req.body?.email?.includes("--")) {
            console.log(`[SECURITY] SQL injection attempt: ${req.ip} | Payload: ${req.body.email}`);
        }
    });

    next();
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    // Pillar 1: Rate Limiting
    loginLimiter,
    passwordResetLimiter,
    apiLimiter,

    // Pillar 2: Account Lockout
    checkAccountLockout,
    recordFailedAttempt,
    resetFailedAttempts,

    // Pillar 4: Input Sanitization
    sanitizeInput,

    // Pillar 5: Secure Session
    validateToken,

    // Pillar 7: Security Logging
    securityLogger
};
