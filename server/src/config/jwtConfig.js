// =============================================================================
// JWT Configuration
// =============================================================================

const crypto = require("crypto");

// =============================================================================
// Environment & Constants
// =============================================================================

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";
const shouldLogDevWarnings = !isTest;
const MIN_SECRET_LENGTH = 32;

const WEAK_SECRET_PATTERNS = [
  /^changeme$/i,
  /^change_me$/i,
  /^secret$/i,
  /^password$/i,
  /^default$/i,
  /^test$/i,
  /^your[_-]/i,
  /^example/i,
];

// =============================================================================
// Development Secret Helpers
// =============================================================================

/**
 * Generates a temporary random secret for development use.
 * @param {string} label - Descriptive label for the secret (e.g. "access", "refresh").
 * @returns {string} A 64-character hex string.
 */
const generateDevSecret = (label) => {
  const secret = crypto.randomBytes(32).toString("hex");
  if (shouldLogDevWarnings) {
    console.warn(
      `[JWT] Generated temporary ${label} secret - set env vars for persistence.`
    );
  }
  return secret;
};

/** @type {Map<string, string>} Cached dev secrets so they persist across calls within one process. */
const cachedDevSecrets = new Map();

/**
 * Returns a cached development secret, generating one if it does not yet exist.
 * @param {string} label - Descriptive label for the secret.
 * @returns {string} The cached secret.
 */
const getDevSecret = (label) => {
  if (!cachedDevSecrets.has(label)) {
    cachedDevSecrets.set(label, generateDevSecret(label));
  }
  return cachedDevSecrets.get(label);
};

// =============================================================================
// Secret Resolution
// =============================================================================

const refreshSecretFromEnv =
  process.env.REFRESH_SECRET?.trim() ||
  process.env.JWT_REFRESH_SECRET?.trim();

const parseAudienceList = (raw) =>
  String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

/**
 * Resolves the access token secret from environment or generates a dev fallback.
 * @returns {string} The access token secret.
 * @throws {Error} If JWT_SECRET is missing in production.
 */
const resolveAccessSecret = () => {
  const envAccessSecret = process.env.JWT_SECRET?.trim();
  if (envAccessSecret) return envAccessSecret;
  if (isProduction) {
    throw new Error("[JWT] JWT_SECRET is required in production.");
  }
  return getDevSecret("access");
};

/**
 * Resolves the refresh token secret from environment or generates a dev fallback.
 * @returns {string} The refresh token secret.
 * @throws {Error} If REFRESH_SECRET is missing in production.
 */
const resolveRefreshSecret = () => {
  if (refreshSecretFromEnv) {
    return refreshSecretFromEnv;
  }
  if (isProduction) {
    throw new Error(
      "[JWT] REFRESH_SECRET (or JWT_REFRESH_SECRET) is required in production."
    );
  }
  if (process.env.JWT_SECRET?.trim()) {
    if (shouldLogDevWarnings) {
      console.warn(
        "[JWT] REFRESH_SECRET missing in development, deriving from JWT_SECRET."
      );
    }
    return `${process.env.JWT_SECRET.trim()}_refresh`;
  }
  return getDevSecret("refresh");
};

// =============================================================================
// Secret Strength Validation
// =============================================================================

/**
 * Checks whether a secret is considered weak.
 * @param {string} secret - The secret to evaluate.
 * @returns {boolean} True if the secret is weak.
 */
const isWeakSecret = (secret) => {
  if (!secret || secret.length < MIN_SECRET_LENGTH) return true;
  if (WEAK_SECRET_PATTERNS.some((pattern) => pattern.test(secret))) return true;
  const uniqueChars = new Set(secret).size;
  if (uniqueChars < 10) return true;
  return false;
};

/**
 * Validates that a production secret meets minimum strength requirements.
 * @param {string} name - Human-readable name of the secret (for error messages).
 * @param {string} secret - The secret value to validate.
 * @throws {Error} If the secret is weak in a production environment.
 */
const validateProdSecret = (name, secret) => {
  if (!isProduction) return;
  if (isWeakSecret(secret)) {
    throw new Error(
      `[JWT] ${name} is weak. Use a random secret with at least ${MIN_SECRET_LENGTH} characters.`
    );
  }
};

// =============================================================================
// Resolve & Validate Secrets
// =============================================================================

const accessSecret = resolveAccessSecret();
const refreshSecret = resolveRefreshSecret();

validateProdSecret("JWT_SECRET", accessSecret);
validateProdSecret("REFRESH_SECRET", refreshSecret);

if (isProduction && accessSecret === refreshSecret) {
  throw new Error(
    "[JWT] JWT_SECRET and REFRESH_SECRET must be different in production."
  );
}

// =============================================================================
// Exported Configuration Object
// =============================================================================

/**
 * @typedef {Object} JwtConfig
 * @property {string} SECRET - Access token signing secret.
 * @property {string} REFRESH_SECRET - Refresh token signing secret.
 * @property {string} ACCESS_EXPIRY - Access token lifetime (e.g. "15m").
 * @property {string} REFRESH_EXPIRY - Refresh token lifetime (e.g. "30d").
 * @property {string} ISSUER - Token issuer claim.
 * @property {string} AUDIENCE - Token audience claim.
 * @property {Object} COOKIE_OPTIONS - Options for the refresh-token cookie.
 * @property {Object} ACCESS_COOKIE_OPTIONS - Options for the access-token cookie.
 * @property {boolean} RETURN_REFRESH_TOKEN_IN_BODY - Whether to include refresh token in response body (dev only).
 */

/** @type {JwtConfig} */
const JWT_CONFIG = {
  SECRET: accessSecret,
  REFRESH_SECRET: refreshSecret,
  ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || "15m",
  REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || "30d",
  ISSUER: process.env.JWT_ISSUER || "mhub-api",
  AUDIENCE: process.env.JWT_AUDIENCE || "mhub-client",
  ALLOWED_AUDIENCES: [
    process.env.JWT_AUDIENCE || "mhub-client",
    ...parseAudienceList(process.env.JWT_ALLOWED_AUDIENCES),
  ].filter(Boolean),

  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1e3,
    path: "/api/auth",
  },

  ACCESS_COOKIE_OPTIONS: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "strict" : "lax",
    maxAge: 15 * 60 * 1e3,
    path: "/",
  },

  RETURN_REFRESH_TOKEN_IN_BODY:
    !isProduction && process.env.RETURN_REFRESH_TOKEN_IN_BODY === "true",
};

// =============================================================================
// Startup Log
// =============================================================================

if (!isProduction && !isTest) {
  console.log(
    "[JWT] Config loaded. Access token expiry:",
    JWT_CONFIG.ACCESS_EXPIRY
  );
}

module.exports = JWT_CONFIG;
