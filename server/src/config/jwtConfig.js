/**
 * Centralized JWT Configuration
 * =============================================================================
 * All auth middleware and controllers MUST import from here.
 * This ensures consistent secret usage across the entire application.
 * 
 * CRITICAL: Never hardcode secrets elsewhere - always use this module.
 */

const crypto = require('crypto');

// Generate a random fallback for development only (changes per restart)
const generateDevSecret = () => {
    const secret = crypto.randomBytes(32).toString('hex');
    console.warn('[JWT] ⚠️ Generated temporary secret - set JWT_SECRET in .env for persistence!');
    return secret;
};

// Cache the generated secret so it doesn't change during runtime
let cachedDevSecret = null;
const getDevSecret = () => {
    if (!cachedDevSecret) {
        cachedDevSecret = generateDevSecret();
    }
    return cachedDevSecret;
};

const JWT_CONFIG = {
    // Primary secret for access tokens
    SECRET: process.env.JWT_SECRET?.trim() || getDevSecret(),

    // Separate secret for refresh tokens (added security)
    REFRESH_SECRET: process.env.REFRESH_SECRET?.trim() || (process.env.JWT_SECRET?.trim() + '_refresh') || getDevSecret(),

    // Token lifetimes
    ACCESS_EXPIRY: '1h',        // Extended from 15m for better UX
    REFRESH_EXPIRY: '30d',      // Long-lived refresh token

    // Cookie settings
    COOKIE_OPTIONS: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
    }
};

// Production warning
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.error('[JWT] 🚨 CRITICAL: JWT_SECRET not set in production! This is a security risk!');
}

// Development info
if (process.env.NODE_ENV !== 'production') {
    console.log('[JWT] ✅ Config loaded. Access token expiry:', JWT_CONFIG.ACCESS_EXPIRY);
}

module.exports = JWT_CONFIG;
