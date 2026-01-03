/**
 * CSRF Protection Middleware
 * Prevents Cross-Site Request Forgery attacks
 * 
 * Uses Double Submit Cookie pattern (more compatible than csurf)
 */

const crypto = require('crypto');

// CSRF Token Configuration
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'X-XSRF-TOKEN';
const CSRF_SECRET_LENGTH = 32;
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a secure CSRF token
 */
function generateToken() {
    return crypto.randomBytes(CSRF_SECRET_LENGTH).toString('hex');
}

/**
 * CSRF Protection Middleware
 * 
 * - Sets CSRF token in cookie on GET requests
 * - Validates token on state-changing requests (POST, PUT, DELETE, PATCH)
 * - Skips validation for whitelisted paths (e.g., webhooks)
 */
const csrfProtection = (options = {}) => {
    const {
        skipPaths = ['/api/webhooks', '/api/auth/refresh'],
        cookieOptions = {
            httpOnly: false, // Frontend needs to read this
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: CSRF_TOKEN_EXPIRY
        }
    } = options;

    return (req, res, next) => {
        // Skip CSRF for whitelisted paths
        if (skipPaths.some(path => req.path.startsWith(path))) {
            return next();
        }

        // For GET/HEAD/OPTIONS - set token in cookie
        if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
            // Generate new token if not present or expired
            if (!req.cookies[CSRF_COOKIE_NAME]) {
                const token = generateToken();
                res.cookie(CSRF_COOKIE_NAME, token, cookieOptions);
            }
            return next();
        }

        // For state-changing requests - validate token
        const cookieToken = req.cookies[CSRF_COOKIE_NAME];
        const headerToken = req.headers[CSRF_HEADER_NAME.toLowerCase()] ||
            req.headers['x-csrf-token'] ||
            req.body?._csrf;

        if (!cookieToken || !headerToken) {
            console.warn(`[CSRF] Missing token - Path: ${req.path}, IP: ${req.ip}`);
            return res.status(403).json({
                error: 'CSRF token missing',
                message: 'Please refresh the page and try again'
            });
        }

        // Constant-time comparison to prevent timing attacks
        if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
            console.warn(`[CSRF] Token mismatch - Path: ${req.path}, IP: ${req.ip}`);
            return res.status(403).json({
                error: 'CSRF token invalid',
                message: 'Security token expired. Please refresh the page.'
            });
        }

        // Token valid - generate new one for next request (token rotation)
        const newToken = generateToken();
        res.cookie(CSRF_COOKIE_NAME, newToken, cookieOptions);

        next();
    };
};

/**
 * CSRF Token Endpoint
 * Call this to get a fresh token for SPA applications
 */
const csrfTokenEndpoint = (req, res) => {
    const token = generateToken();
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: CSRF_TOKEN_EXPIRY
    });
    res.json({ csrfToken: token });
};

module.exports = {
    csrfProtection,
    csrfTokenEndpoint,
    CSRF_COOKIE_NAME,
    CSRF_HEADER_NAME
};
