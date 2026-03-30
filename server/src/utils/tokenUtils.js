const crypto = require('crypto');

/**
 * Generate a random token (hex string)
 * @returns {string} token
 */
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate token expiry date
 * @param {number} hours - Number of hours from now
 * @returns {Date} expiry date
 */
const generateTokenExpiry = (hours = 1) => {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
};

module.exports = {
    generateToken,
    generateTokenExpiry
};
