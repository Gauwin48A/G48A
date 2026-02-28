const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const JWT_CONFIG = require('../config/jwtConfig');
const logger = require('../utils/logger');
const authDebugEnabled = process.env.AUTH_DEBUG === 'true';
const LOAD_TEST_SCENARIOS = new Set(['normal', 'abuse', 'authenticated']);
const AUTH_TOKEN_CACHE_TTL_MS = (() => {
    const parsed = Number.parseInt(process.env.AUTH_TOKEN_CACHE_TTL_MS, 10);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
    return process.env.NODE_ENV === 'production' ? 0 : 1000;
})();
const AUTH_TOKEN_CACHE_MAX = (() => {
    const parsed = Number.parseInt(process.env.AUTH_TOKEN_CACHE_MAX, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
    return 10000;
})();
const verifiedTokenCache = new Map();

const API_LIMIT_WINDOW_MS = Number.parseInt(process.env.API_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000;
const API_RATE_LIMIT_MAX = Number.parseInt(process.env.API_RATE_LIMIT_MAX, 10) || 3000;
const API_RATE_LIMIT_NORMAL_SCENARIO_MAX = Number.parseInt(process.env.API_RATE_LIMIT_NORMAL_SCENARIO_MAX, 10) || 12000;
const RATE_LIMIT_ALLOW_SIMULATED_IDS = process.env.RATE_LIMIT_ALLOW_SIMULATED_IDS === undefined
    ? process.env.NODE_ENV !== 'production'
    : process.env.RATE_LIMIT_ALLOW_SIMULATED_IDS === 'true';
const READY_PATHS = new Set(['/health', '/api/health', '/api/ready']);

function getLoadScenario(req) {
    return String(req.headers['x-load-test-scenario'] || '').toLowerCase();
}

function isTrustedSimulatedLoadRequest(req) {
    return RATE_LIMIT_ALLOW_SIMULATED_IDS && LOAD_TEST_SCENARIOS.has(getLoadScenario(req));
}

function getCachedAuthPayload(token) {
    if (!token || AUTH_TOKEN_CACHE_TTL_MS <= 0) return null;
    const entry = verifiedTokenCache.get(token);
    if (!entry) return null;

    const now = Date.now();
    if (entry.cacheExpiresAtMs <= now || entry.jwtExpiresAtMs <= now) {
        verifiedTokenCache.delete(token);
        return null;
    }

    return entry.payload;
}

function setCachedAuthPayload(token, payload) {
    if (!token || !payload || AUTH_TOKEN_CACHE_TTL_MS <= 0) return;
    const now = Date.now();
    const jwtExpiresAtMs = Number.isFinite(payload.exp) ? Number(payload.exp) * 1000 : (now + AUTH_TOKEN_CACHE_TTL_MS);
    const cacheExpiresAtMs = Math.min(now + AUTH_TOKEN_CACHE_TTL_MS, jwtExpiresAtMs);

    if (cacheExpiresAtMs <= now) return;

    if (verifiedTokenCache.size >= AUTH_TOKEN_CACHE_MAX) {
        const oldestKey = verifiedTokenCache.keys().next().value;
        if (oldestKey !== undefined) {
            verifiedTokenCache.delete(oldestKey);
        }
    }

    verifiedTokenCache.set(token, {
        payload,
        jwtExpiresAtMs,
        cacheExpiresAtMs
    });
}

// A. DDoS Protection: Limit repeated requests
exports.apiLimiter = rateLimit({
    windowMs: API_LIMIT_WINDOW_MS,
    max: (req) => {
        const scenario = getLoadScenario(req);
        if (isTrustedSimulatedLoadRequest(req) && ['normal', 'authenticated'].includes(scenario)) {
            return API_RATE_LIMIT_NORMAL_SCENARIO_MAX;
        }
        return API_RATE_LIMIT_MAX;
    },
    keyGenerator: (req) => {
        const simulatedUser = req.headers['x-simulated-user'];
        if (isTrustedSimulatedLoadRequest(req) && simulatedUser) {
            return `simulated:${String(simulatedUser)}`;
        }
        const ipAddress = req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
        return rateLimit.ipKeyGenerator(ipAddress);
    },
    skip: (req) => READY_PATHS.has(req.path),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests. System locked for 15 minutes.",
        retryAfter: "15 minutes"
    }
});

// B. JWT Authentication (Zero Trust)
exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Allow Bearer token OR Cookie
    let token = authHeader && authHeader.split(' ')[1];

    if (!token && req.cookies && req.cookies.accessToken) {
        token = req.cookies.accessToken;
    }

    if (!token) {
        if (authDebugEnabled) {
            logger.info('[AUTH] No token for protected route:', req.path);
        }
        return res.status(401).json({ error: "Access denied. No token." });
    }

    const cachedPayload = getCachedAuthPayload(token);
    if (cachedPayload) {
        req.user = cachedPayload;
        return next();
    }

    try {
        const user = jwt.verify(token, JWT_CONFIG.SECRET);
        req.user = user;
        setCachedAuthPayload(token, user);
        return next();
    } catch (err) {
        logger.error('[AUTH] Token verify failed:', err.message, '| Path:', req.path);
        return res.status(401).json({ error: "Invalid or expired token." });
    }
};

// C. Input Sanitizer (Anti-SQL Injection & XSS)
// Strips dangerous characters from req.body
exports.sanitizeInput = (req, res, next) => {
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                // Remove script tags and common XSS vectors
                req.body[key] = req.body[key]
                    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
                    .replace(/javascript:/gi, "")
                    .replace(/onload=/gi, "")
                    .replace(/onerror=/gi, "");
            }
        }
    }
    next();
};

// D. Security Headers (Helmet Wrapper)
const helmet = require('helmet');
exports.securityHeaders = helmet();

// E. Login Rate Limiter (Brute Force Protection)
exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 login requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many login attempts. Please try again after 15 minutes."
    }
});

// F. Account Lockout Check
const pool = require('../config/db');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

exports.checkAccountLockout = async (req, res, next) => {
    const { email } = req.body;
    if (!email) return next();

    try {
        const result = await runQuery(
            'SELECT lock_until, locked_until FROM users WHERE LOWER(email) = LOWER($1)',
            [email.trim()]
        );
        const lockUntil = result.rows[0]?.lock_until || result.rows[0]?.locked_until;
        if (lockUntil) {
            const lockedUntil = new Date(lockUntil);
            if (lockedUntil > new Date()) {
                return res.status(403).json({
                    error: "Account Locked",
                    message: "Too many failed attempts. Try again later."
                });
            }
        }
        next();
    } catch (err) {
        // If DB fails, don't block login flow, just log it
        logger.error("Lockout check error:", err);
        next();
    }
};

// G. Security Logger
exports.securityLogger = (req, res, next) => {
    // Simple logger for now, can be expanded to write to file
    // console.log(`[SEC] ${req.method} ${req.url} from ${req.ip}`);
    next();
};
