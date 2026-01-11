/**
 * In-memory store for failed login attempts (reset on server restart)
 * For production, use Redis.
 */
const failedAttempts = new Map();

/**
 * Record a failed login attempt for an email
 * @param {string} email
 */
const recordFailedAttempt = (email) => {
    const attempts = failedAttempts.get(email) || 0;
    failedAttempts.set(email, attempts + 1);
};

/**
 * Reset failed attempts for an email
 * @param {string} email
 */
const resetFailedAttempts = (email) => {
    failedAttempts.delete(email);
};

/**
 * Get failed attempts count
 * @param {string} email
 */
const getFailedAttempts = (email) => {
    return failedAttempts.get(email) || 0;
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
