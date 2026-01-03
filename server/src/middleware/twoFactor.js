/**
 * Two-Factor Authentication (2FA) Module
 * Implements TOTP (Time-based One-Time Password)
 * 
 * Uses: speakeasy for TOTP, qrcode for QR generation
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

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
        const userId = req.user?.id;
        const userEmail = req.user?.email;

        if (!userId || !userEmail) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Generate secret and QR code
        const { secret, qrCode, otpauthUrl } = await generate2FASecret(userEmail);

        // Generate backup codes
        const backupCodes = generateBackupCodes(10);

        // TODO: Store secret and backup codes in database
        // await db.query('UPDATE users SET two_factor_secret = $1, backup_codes = $2 WHERE user_id = $3',
        //   [secret, JSON.stringify(backupCodes.map(c => bcrypt.hashSync(c, 10))), userId]);

        res.json({
            message: '2FA setup initiated',
            qrCode,
            otpauthUrl,
            backupCodes, // Show once, user must save these
            instructions: 'Scan the QR code with Google Authenticator, Authy, or similar app'
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
        const { token, secret } = req.body;

        if (!token || !secret) {
            return res.status(400).json({ error: 'Token and secret required' });
        }

        const isValid = verify2FAToken(token, secret);

        if (isValid) {
            // TODO: Mark 2FA as enabled in database
            // await db.query('UPDATE users SET two_factor_enabled = true WHERE user_id = $1', [req.user.id]);

            res.json({
                success: true,
                message: '2FA enabled successfully'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Invalid verification code'
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
        const { userId, token } = req.body;

        if (!userId || !token) {
            return res.status(400).json({ error: 'User ID and token required' });
        }

        // TODO: Get secret from database
        // const result = await db.query('SELECT two_factor_secret FROM users WHERE user_id = $1', [userId]);
        // const secret = result.rows[0]?.two_factor_secret;

        // For now, return error as secret retrieval needs DB implementation
        res.status(501).json({
            error: '2FA verification requires database integration',
            note: 'Store two_factor_secret in users table'
        });

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
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // TODO: Verify current 2FA token and disable
        // const result = await db.query('SELECT two_factor_secret FROM users WHERE user_id = $1', [userId]);
        // if (verify2FAToken(token, result.rows[0].two_factor_secret)) {
        //     await db.query('UPDATE users SET two_factor_enabled = false, two_factor_secret = null WHERE user_id = $1', [userId]);
        // }

        res.json({
            message: '2FA disabled (requires DB integration)'
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
    // Skip if 2FA not enabled for user
    // TODO: Check from database
    // const result = await db.query('SELECT two_factor_enabled FROM users WHERE user_id = $1', [req.user.id]);
    // if (!result.rows[0]?.two_factor_enabled) return next();

    // For now, just pass through (enable after DB integration)
    next();
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
