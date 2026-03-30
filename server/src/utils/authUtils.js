/**
 * In-memory store for failed login attempts (reset on server restart).
 * For production, use Redis.
 *
 * Each entry stores { count, firstAttemptAt } with a 15-minute TTL.
 * Map is capped at MAX_ENTRIES to prevent OOM under sustained attack.
 */
const failedAttempts = new Map();
const TTL_MS = 15 * 60 * 1000;       // 15 minutes
const MAX_ENTRIES = 10_000;

/** Remove entries older than TTL */
function evictStale() {
    const cutoff = Date.now() - TTL_MS;
    for (const [key, entry] of failedAttempts) {
        if (entry.firstAttemptAt < cutoff) failedAttempts.delete(key);
    }
}

// Periodic cleanup every 5 minutes
const _evictionTimer = setInterval(evictStale, 5 * 60 * 1000);
if (_evictionTimer.unref) _evictionTimer.unref(); // Don't keep process alive

/**
 * Record a failed login attempt for an email
 * @param {string} email
 */
const recordFailedAttempt = (email) => {
    const existing = failedAttempts.get(email);
    if (existing && (Date.now() - existing.firstAttemptAt) < TTL_MS) {
        existing.count += 1;
    } else {
        // Evict oldest if at capacity
        if (failedAttempts.size >= MAX_ENTRIES) {
            const oldestKey = failedAttempts.keys().next().value;
            failedAttempts.delete(oldestKey);
        }
        failedAttempts.set(email, { count: 1, firstAttemptAt: Date.now() });
    }
};

/**
 * Reset failed attempts for an email (call on successful login)
 * @param {string} email
 */
const resetFailedAttempts = (email) => {
    failedAttempts.delete(email);
};

/**
 * Get failed attempts count (returns 0 if expired)
 * @param {string} email
 */
const getFailedAttempts = (email) => {
    const entry = failedAttempts.get(email);
    if (!entry) return 0;
    if ((Date.now() - entry.firstAttemptAt) >= TTL_MS) {
        failedAttempts.delete(email);
        return 0;
    }
    return entry.count;
};

/**
 * Validate password strength
 * @param {string} password
 * @returns {Object} { isValid, errors: [] }
 */
const validatePasswordStrength = (password) => {
    const errors = [];
    if (password.length < 8) errors.push("Password must be at least 8 characters long.");
    if (!/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter.");
    if (!/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter.");
    if (!/[0-9]/.test(password)) errors.push("Password must contain at least one number.");
    // if (!/[!@#$%^&*]/.test(password)) errors.push("Password must contain at least one special character.");

    return {
        isValid: errors.length === 0,
        errors
    };
};

module.exports = {
    recordFailedAttempt,
    resetFailedAttempts,
    getFailedAttempts,
    validatePasswordStrength
};
