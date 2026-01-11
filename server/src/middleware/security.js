const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// A. DDoS Protection: Limit repeated requests
exports.apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // Limit each IP to 300 requests per window (Adjusted for real usage)
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

    if (!token) return res.status(401).json({ error: "Access Denied. No Token." });

    jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key', (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid Token." });
        req.user = user; // Attach user payload to request
        next();
    });
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
exports.checkAccountLockout = async (req, res, next) => {
    const { email } = req.body;
    if (!email) return next();

    try {
        const result = await pool.query('SELECT locked_until FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
        if (result.rows.length > 0 && result.rows[0].locked_until) {
            const lockedUntil = new Date(result.rows[0].locked_until);
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
        console.error("Lockout check error:", err);
        next();
    }
};

// G. Security Logger
exports.securityLogger = (req, res, next) => {
    // Simple logger for now, can be expanded to write to file
    // console.log(`[SEC] ${req.method} ${req.url} from ${req.ip}`);
    next();
};
