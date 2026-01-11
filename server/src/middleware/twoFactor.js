/**
 * Two-Factor Authentication (2FA) Module
 * Implements TOTP (Time-based One-Time Password)
 * 
 * Uses: speakeasy for TOTP, qrcode for QR generation
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcrypt');
const pool = require('../config/db');

const APP_NAME = 'MHub';

/**
 * Generate a new 2FA secret for a user
 * Returns secret and QR code URL
 */
async function generate2FASecret(userEmail) {
    const secret = speakeasy.generateSecret({
        name: `${APP_NAME} (${userEmail})`,
        issuer: APP_NAME,
        length: 20
    });

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
        secret: secret.base32,           // Store this in database
        otpauthUrl: secret.otpauth_url,  // For manual entry
        qrCode: qrCodeDataUrl            // For scanning
    };
}

/**
 * Verify a TOTP code against a secret
 * @param {string} token - 6-digit code from authenticator app
 * @param {string} secret - User's stored secret (base32)
 * @returns {boolean} - Whether the token is valid
 */
function verify2FAToken(token, secret) {
    return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: token,
        window: 1 // Allow 1 step tolerance (30 seconds)
    });
}

/**
 * Generate backup codes for recovery
 * @param {number} count - Number of backup codes to generate
 * @returns {string[]} - Array of backup codes
 */
function generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        // Generate 8-character alphanumeric codes
        const code = speakeasy.generateSecret({ length: 8 }).base32.substring(0, 8);
        codes.push(code);
    }
    return codes;
}

/**
 * 2FA Setup Endpoint Handler
 * POST /api/auth/2fa/setup
 */
const setup2FA = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const userEmail = req.user?.email;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if already enabled
        const existingCheck = await pool.query(
            'SELECT two_factor_enabled FROM users WHERE user_id = $1',
            [userId]
        );
        if (existingCheck.rows[0]?.two_factor_enabled) {
            return res.status(400).json({ error: '2FA is already enabled' });
        }

        // Generate secret and QR code
        const email = userEmail || `user${userId}@mhub.app`;
        const { secret, qrCode, otpauthUrl } = await generate2FASecret(email);

        // Generate backup codes
        const backupCodes = generateBackupCodes(10);

        // Hash backup codes for storage
        const hashedBackupCodes = await Promise.all(
            backupCodes.map(code => bcrypt.hash(code, 10))
        );

        // Store secret temporarily (pending verification)
        await pool.query(
            `UPDATE users SET two_factor_secret = $1, backup_codes = $2 WHERE user_id = $3`,
            [secret, hashedBackupCodes, userId]
        );

        res.json({
            message: '2FA setup initiated',
            qrCode,
            otpauthUrl,
            backupCodes, // Show once, user must save these
            instructions: 'Scan the QR code with Google Authenticator, Authy, or similar app. Then verify with a code.'
        });

    } catch (error) {
        console.error('[2FA] Setup error:', error);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
};

/**
 * 2FA Verification Endpoint Handler
 * POST /api/auth/2fa/verify
 */
const verify2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user?.id || req.user?.userId || req.body.userId;

        if (!token || !userId) {
            return res.status(400).json({ error: 'Token and user ID required' });
        }

        // Get secret from database
        const result = await pool.query(
            'SELECT two_factor_secret FROM users WHERE user_id = $1',
            [userId]
        );
        const secret = result.rows[0]?.two_factor_secret;

        if (!secret) {
            return res.status(400).json({ error: '2FA not set up. Call /api/auth/2fa/setup first.' });
        }

        const isValid = verify2FAToken(token, secret);

        if (isValid) {
            // Mark 2FA as enabled in database
            await pool.query(
                'UPDATE users SET two_factor_enabled = true WHERE user_id = $1',
                [userId]
            );

            // Log the security event
            console.log(`[2FA] Enabled for user ${userId}`);

            res.json({
                success: true,
                message: '2FA enabled successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid verification code. Please try again.'
            });
        }

    } catch (error) {
        console.error('[2FA] Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
};

/**
 * 2FA Login Challenge Handler
 * POST /api/auth/2fa/challenge
 * Called after password verification if 2FA is enabled
 */
const challenge2FA = async (req, res) => {
    try {
        const { userId, token, backupCode } = req.body;

        if (!userId || (!token && !backupCode)) {
            return res.status(400).json({ error: 'User ID and token (or backup code) required' });
        }

        // Get secret and backup codes from database
        const result = await pool.query(
            'SELECT two_factor_secret, two_factor_enabled, backup_codes FROM users WHERE user_id = $1',
            [userId]
        );

        const user = result.rows[0];
        if (!user || !user.two_factor_enabled) {
            return res.status(400).json({ error: '2FA not enabled for this user' });
        }

        let isValid = false;

        if (token) {
            // Verify TOTP token
            isValid = verify2FAToken(token, user.two_factor_secret);
        } else if (backupCode && user.backup_codes) {
            // Verify backup code
            for (let i = 0; i < user.backup_codes.length; i++) {
                if (await bcrypt.compare(backupCode, user.backup_codes[i])) {
                    isValid = true;
                    // Remove used backup code
                    const updatedCodes = [...user.backup_codes];
                    updatedCodes.splice(i, 1);
                    await pool.query(
                        'UPDATE users SET backup_codes = $1 WHERE user_id = $2',
                        [updatedCodes, userId]
                    );
                    break;
                }
            }
        }

        if (isValid) {
            res.json({ success: true, message: '2FA verification successful' });
        } else {
            res.status(400).json({ success: false, error: 'Invalid code' });
        }

    } catch (error) {
        console.error('[2FA] Challenge error:', error);
        res.status(500).json({ error: '2FA challenge failed' });
    }
};

/**
 * Disable 2FA Handler
 * POST /api/auth/2fa/disable
 */
const disable2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user?.id || req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get and verify current 2FA secret
        const result = await pool.query(
            'SELECT two_factor_secret, two_factor_enabled FROM users WHERE user_id = $1',
            [userId]
        );

        if (!result.rows[0]?.two_factor_enabled) {
            return res.status(400).json({ error: '2FA is not currently enabled' });
        }

        // Verify current token before disabling
        if (!verify2FAToken(token, result.rows[0].two_factor_secret)) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Disable 2FA
        await pool.query(
            'UPDATE users SET two_factor_enabled = false, two_factor_secret = null, backup_codes = null WHERE user_id = $1',
            [userId]
        );

        console.log(`[2FA] Disabled for user ${userId}`);

        res.json({
            success: true,
            message: '2FA has been disabled'
        });

    } catch (error) {
        console.error('[2FA] Disable error:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
};

/**
 * Middleware to require 2FA on protected routes
 */
const require2FA = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        if (!userId) return next();

        // Check if 2FA is enabled for this user
        const result = await pool.query(
            'SELECT two_factor_enabled FROM users WHERE user_id = $1',
            [userId]
        );

        if (!result.rows[0]?.two_factor_enabled) {
            return next(); // 2FA not enabled, continue
        }

        // Check if 2FA was already verified in this session
        if (req.session?.twoFactorVerified) {
            return next();
        }

        return res.status(403).json({
            error: '2FA verification required',
            requiresTwoFactor: true
        });
    } catch (error) {
        console.error('[2FA] Middleware error:', error);
        next(); // Fail open
    }
};

module.exports = {
    generate2FASecret,
    verify2FAToken,
    generateBackupCodes,
    setup2FA,
    verify2FA,
    challenge2FA,
    disable2FA,
    require2FA
};
