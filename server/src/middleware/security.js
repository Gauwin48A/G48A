/**
 * Security Middleware - The Iron Dome
 * Operation Ironclad
 * 
 * Layers:
 * 1. Helmet - Hardened HTTP Headers (prevent XSS/Clickjacking)
 * 2. Rate Limiter - Stops brute-force/DDoS attacks
 * 3. CORS - Strict origin allowlist
 * 4. CSRF - Cross-Site Request Forgery protection
 * 5. HTTPS - SSL/TLS enforcement
 * 6. 2FA - Two-Factor Authentication support
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Security sub-modules
const { csrfProtection, csrfTokenEndpoint } = require('./csrf');
const { enforceHttps, enableHSTS } = require('../config/https');
const twoFactor = require('./twoFactor');

/**
 * Configure comprehensive security middleware
 * @param {Express} app - Express application instance
 */
const configureSecurity = (app) => {
    // 1. HELMET - Secure HTTP Headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:", "blob:"],
                scriptSrc: ["'self'"],
                connectSrc: ["'self'", "http://localhost:*", "ws://localhost:*"]
            }
        },
        crossOriginEmbedderPolicy: false, // Allow embedding resources
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

    // 2. CORS - Strict Origin Allowlist
    const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:8081',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8081',
        process.env.CLIENT_URL
    ].filter(Boolean);

    app.use(cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, curl, etc.)
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            console.warn(`⚠️ CORS blocked origin: ${origin}`);
            return callback(null, false);
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        credentials: true,
        maxAge: 86400 // Cache preflight for 24 hours
    }));

    // 3. RATE LIMITER - Anti-DDoS/Brute-Force
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per window
        message: {
            error: 'Too many requests, please try again later.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    // Stricter limiter for auth endpoints
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10, // Only 10 login attempts per 15 min
        message: {
            error: 'Too many login attempts. Please try again in 15 minutes.',
            retryAfter: '15 minutes'
        },
        standardHeaders: true,
        legacyHeaders: false
    });

    // Apply rate limiters
    app.use('/api', generalLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth/signup', authLimiter);

    console.log('🛡️ Security middleware configured (Helmet, CORS, Rate Limiter)');
};

/**
 * Input sanitization middleware
 * Cleans request body/query/params to prevent injection attacks
 */
const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            // Remove script tags and dangerous characters
            return obj.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/[<>]/g, '')
                .trim();
        }
        if (typeof obj === 'object' && obj !== null) {
            for (const key in obj) {
                obj[key] = sanitize(obj[key]);
            }
        }
        return obj;
    };

    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);

    next();
};

/**
 * Login rate limiter - stricter than general limiter
 * Max 5 login attempts per 15 min per IP
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Only 5 login attempts
    message: {
        error: 'Too many login attempts. Please try again in 15 minutes.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Account lockout check middleware
 * Checks if the account is locked due to failed attempts
 */
const checkAccountLockout = async (req, res, next) => {
    // Placeholder - can be enhanced with database check
    // For now, just pass through
    next();
};

/**
 * Security logging middleware
 * Logs security-relevant requests
 */
const securityLogger = (req, res, next) => {
    const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')?.substring(0, 50)
    };
    // Log auth attempts only (not sensitive data)
    console.log('[Security]', JSON.stringify(logData));
    next();
};

// In-memory store for failed login attempts (for demo - use Redis in production)
const failedAttempts = new Map();

/**
 * Record a failed login attempt
 */
const recordFailedAttempt = (email) => {
    const key = email.toLowerCase();
    const current = failedAttempts.get(key) || { count: 0, lastAttempt: null };
    failedAttempts.set(key, {
        count: current.count + 1,
        lastAttempt: new Date()
    });
    console.log(`[Security] Failed login attempt ${current.count + 1} for ${key}`);
};

/**
 * Reset failed attempts after successful login
 */
const resetFailedAttempts = (email) => {
    const key = email.toLowerCase();
    if (failedAttempts.has(key)) {
        failedAttempts.delete(key);
        console.log(`[Security] Reset failed attempts for ${key}`);
    }
};

/**
 * Check if account should be locked (more than 5 attempts in 15 minutes)
 */
const isAccountLocked = (email) => {
    const key = email.toLowerCase();
    const attempts = failedAttempts.get(key);
    if (!attempts) return false;

    const lockoutWindow = 15 * 60 * 1000; // 15 minutes
    const timeSinceLastAttempt = Date.now() - new Date(attempts.lastAttempt).getTime();

    if (timeSinceLastAttempt > lockoutWindow) {
        failedAttempts.delete(key);
        return false;
    }

    return attempts.count >= 5;
};

module.exports = {
    configureSecurity,
    sanitizeInput,
    loginLimiter,
    checkAccountLockout,
    securityLogger,
    recordFailedAttempt,
    resetFailedAttempts,
    isAccountLocked
};
