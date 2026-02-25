/**
 * Centralized JWT Configuration
 * =============================================================================
 * All auth middleware and controllers MUST import from here.
 * This ensures consistent secret usage across the entire application.
 */

const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const MIN_SECRET_LENGTH = 32;

const WEAK_SECRET_PATTERNS = [
    /^changeme$/i,
    /^change_me$/i,
    /^secret$/i,
    /^password$/i,
    /^default$/i,
    /^test$/i,
    /^your[_-]/i,
    /^example/i
];

// Generate random fallbacks for development only.
const generateDevSecret = (label) => {
    const secret = crypto.randomBytes(32).toString('hex');
    console.warn(`[JWT] Generated temporary ${label} secret - set env vars for persistence.`);
    return secret;
};

// Cache generated secrets so they do not rotate during runtime.
const cachedDevSecrets = new Map();
const getDevSecret = (label) => {
    if (!cachedDevSecrets.has(label)) {
        cachedDevSecrets.set(label, generateDevSecret(label));
    }
    return cachedDevSecrets.get(label);
};

const refreshSecretFromEnv =
    process.env.REFRESH_SECRET?.trim() ||
    process.env.JWT_REFRESH_SECRET?.trim();

const resolveAccessSecret = () => {
    const envAccessSecret = process.env.JWT_SECRET?.trim();
    if (envAccessSecret) return envAccessSecret;

    if (isProduction) {
        throw new Error('[JWT] JWT_SECRET is required in production.');
    }

    return getDevSecret('access');
};

const resolveRefreshSecret = () => {
    if (refreshSecretFromEnv) {
        return refreshSecretFromEnv;
    }

    if (isProduction) {
        throw new Error('[JWT] REFRESH_SECRET (or JWT_REFRESH_SECRET) is required in production.');
    }

    if (process.env.JWT_SECRET?.trim()) {
        console.warn('[JWT] REFRESH_SECRET missing in development, deriving from JWT_SECRET.');
        return `${process.env.JWT_SECRET.trim()}_refresh`;
    }

    return getDevSecret('refresh');
};

const isWeakSecret = (secret) => {
    if (!secret || secret.length < MIN_SECRET_LENGTH) return true;
    if (WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(secret))) return true;
    const uniqueChars = new Set(secret).size;
    if (uniqueChars < 10) return true;
    return false;
};

const validateProdSecret = (name, secret) => {
    if (!isProduction) return;
    if (isWeakSecret(secret)) {
        throw new Error(`[JWT] ${name} is weak. Use a random secret with at least ${MIN_SECRET_LENGTH} characters.`);
    }
};

const accessSecret = resolveAccessSecret();
const refreshSecret = resolveRefreshSecret();

validateProdSecret('JWT_SECRET', accessSecret);
validateProdSecret('REFRESH_SECRET', refreshSecret);
if (isProduction && accessSecret === refreshSecret) {
    throw new Error('[JWT] JWT_SECRET and REFRESH_SECRET must be different in production.');
}

const JWT_CONFIG = {
    // Primary secret for access tokens
    SECRET: accessSecret,

    // Separate secret for refresh tokens
    REFRESH_SECRET: refreshSecret,

    // Token lifetimes
    ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
    REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '30d',

    // Refresh cookie settings
    COOKIE_OPTIONS: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/api/auth'
    },

    // Access cookie settings (optional; header auth remains supported)
    ACCESS_COOKIE_OPTIONS: {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'strict' : 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/'
    },

    // Whether to return refresh tokens in JSON response body.
    RETURN_REFRESH_TOKEN_IN_BODY: process.env.RETURN_REFRESH_TOKEN_IN_BODY === 'true'
};

if (!isProduction) {
    console.log('[JWT] Config loaded. Access token expiry:', JWT_CONFIG.ACCESS_EXPIRY);
}

module.exports = JWT_CONFIG;
