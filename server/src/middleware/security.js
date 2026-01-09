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

    // 4. COOKIE PARSER (required for CSRF)
    app.use(cookieParser());

    // 5. HTTPS ENFORCEMENT (production only)
    if (process.env.NODE_ENV === 'production') {
        app.use(enforceHttps);
        app.use(enableHSTS);
        console.log('🔒 HTTPS enforcement enabled');
    }

    // 6. CSRF PROTECTION
    // Skip for API endpoints that need to be accessible externally
    app.use(csrfProtection({
        skipPaths: [
            '/api/webhooks',
            '/api/auth/refresh',
            '/api/posts/for-you',  // Public read endpoint
            '/api/posts/cache-stats',
            '/health'
        ]
    }));

    // CSRF Token endpoint for SPA
    app.get('/api/csrf-token', csrfTokenEndpoint);

    // 7. 2FA Routes
    app.post('/api/auth/2fa/setup', twoFactor.setup2FA);
    app.post('/api/auth/2fa/verify', twoFactor.verify2FA);
    app.post('/api/auth/2fa/challenge', twoFactor.challenge2FA);
    app.post('/api/auth/2fa/disable', twoFactor.disable2FA);

    console.log('🛡️ Security middleware configured:');
    console.log('   ✅ Helmet (HTTP Headers)');
    console.log('   ✅ CORS (Origin Allowlist)');
    console.log('   ✅ Rate Limiting');
    console.log('   ✅ CSRF Protection');
    console.log('   ✅ 2FA Support');
    if (process.env.NODE_ENV === 'production') {
        console.log('   ✅ HTTPS + HSTS');
    }
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

// ============================================
// POSTGRES-BACKED LOCKOUT (Survives Restarts)
// ============================================
const pool = require('../config/db');

const LOCKOUT_LIMIT = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Record a failed login attempt (Postgres-backed)
 */
const recordFailedAttempt = async (identifier) => {
    const key = identifier.toLowerCase();
    const now = new Date();
    const lockTime = new Date(now.getTime() + LOCKOUT_WINDOW_MS);

    try {
        await pool.query(`
            INSERT INTO login_attempts (ip_address, attempt_count, last_attempt_at)
            VALUES ($1, 1, $2)
            ON CONFLICT (ip_address) 
            DO UPDATE SET 
                attempt_count = login_attempts.attempt_count + 1,
                last_attempt_at = $2,
                locked_until = CASE 
                    WHEN login_attempts.attempt_count + 1 >= $3 THEN $4 
                    ELSE login_attempts.locked_until 
                END
        `, [key, now, LOCKOUT_LIMIT, lockTime]);

        console.log(`[Security] Failed login recorded for ${key}`);
    } catch (err) {
        console.error('[Security] Failed to record attempt:', err.message);
    }
};

/**
 * Reset failed attempts after successful login (Postgres-backed)
 */
const resetFailedAttempts = async (identifier) => {
    const key = identifier.toLowerCase();
    try {
        await pool.query(`
            UPDATE login_attempts 
            SET attempt_count = 0, locked_until = NULL 
            WHERE ip_address = $1
        `, [key]);
        console.log(`[Security] Reset attempts for ${key}`);
    } catch (err) {
        console.error('[Security] Failed to reset attempts:', err.message);
    }
};

/**
 * Check if account is locked (Postgres-backed)
 */
const isAccountLocked = async (identifier) => {
    const key = identifier.toLowerCase();
    try {
        const result = await pool.query(`
            SELECT attempt_count, locked_until 
            FROM login_attempts 
            WHERE ip_address = $1
        `, [key]);

        if (result.rows.length === 0) return false;

        const { attempt_count, locked_until } = result.rows[0];

        // Check if currently locked
        if (locked_until && new Date(locked_until) > new Date()) {
            return true;
        }

        // Reset if lock expired
        if (locked_until && new Date(locked_until) < new Date()) {
            await pool.query(`
                UPDATE login_attempts 
                SET attempt_count = 0, locked_until = NULL 
                WHERE ip_address = $1
            `, [key]);
            return false;
        }

        return attempt_count >= LOCKOUT_LIMIT;
    } catch (err) {
        console.error('[Security] Lockout check failed:', err.message);
        return false; // Fail open
    }
};

module.exports = {
    configureSecurity,
    sanitizeInput,
    loginLimiter,
    checkAccountLockout,
    securityLogger,
    recordFailedAttempt,
    resetFailedAttempts,
    isAccountLocked,
    // New security modules
    csrfProtection,
    csrfTokenEndpoint,
    twoFactor,
    enforceHttps,
    enableHSTS
};
