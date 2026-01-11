/**
 * Two-Factor Authentication (2FA) Controller
 * Uses TOTP (Time-based One-Time Password)
 * 
 * Flow:
 * 1. User enables 2FA -> Generate secret + QR code
 * 2. User scans QR in authenticator app
 * 3. User verifies with code -> 2FA enabled
 * 4. On login, if 2FA enabled, require code
 */

const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const pool = require('../config/db');

/**
 * Generate 2FA secret and QR code for setup
 * POST /api/auth/2fa/setup
 */
exports.setup2FA = async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        // Check if user already has 2FA enabled
        const userCheck = await pool.query(
            'SELECT two_fa_enabled FROM users WHERE user_id = $1',
            [userId]
        );

        if (userCheck.rows[0]?.two_fa_enabled) {
            return res.status(400).json({
                error: '2FA is already enabled. Disable it first to reset.'
            });
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `MHub:${req.user.email || req.user.username || 'User'}`,
            issuer: 'MHub',
            length: 32
        });

        // Store secret temporarily (not enabled yet until verified)
        await pool.query(
            `UPDATE users 
       SET two_fa_secret = $1, two_fa_enabled = false 
       WHERE user_id = $2`,
            [secret.base32, userId]
        );

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            secret: secret.base32, // For manual entry
            qrCode: qrCodeUrl,     // For scanning
            message: 'Scan the QR code with your authenticator app, then verify with a code.'
        });

    } catch (error) {
        console.error('2FA Setup error:', error);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
};

/**
 * Verify 2FA code and enable
 * POST /api/auth/2fa/verify
 */
exports.verify2FA = async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Verification code required' });
        }

        // Get user's secret
        const userResult = await pool.query(
            'SELECT two_fa_secret FROM users WHERE user_id = $1',
            [userId]
        );

        const secret = userResult.rows[0]?.two_fa_secret;
        if (!secret) {
            return res.status(400).json({ error: 'Please setup 2FA first' });
        }

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code,
            window: 2 // Allow 2 time steps tolerance (60 seconds)
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Enable 2FA
        await pool.query(
            'UPDATE users SET two_fa_enabled = true WHERE user_id = $1',
            [userId]
        );

        // Generate backup codes
        const backupCodes = generateBackupCodes();
        await pool.query(
            'UPDATE users SET two_fa_backup_codes = $1 WHERE user_id = $2',
            [JSON.stringify(backupCodes), userId]
        );

        res.json({
            success: true,
            message: '2FA enabled successfully!',
            backupCodes: backupCodes // Show once, user must save them
        });

    } catch (error) {
        console.error('2FA Verify error:', error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
};

/**
 * Disable 2FA
 * POST /api/auth/2fa/disable
 */
exports.disable2FA = async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;
        const { code, password } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'Verification code required' });
        }

        // Get user's secret
        const userResult = await pool.query(
            'SELECT two_fa_secret, two_fa_enabled FROM users WHERE user_id = $1',
            [userId]
        );

        if (!userResult.rows[0]?.two_fa_enabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        const secret = userResult.rows[0].two_fa_secret;

        // Verify the code
        const verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Disable 2FA
        await pool.query(
            `UPDATE users 
       SET two_fa_enabled = false, two_fa_secret = NULL, two_fa_backup_codes = NULL 
       WHERE user_id = $1`,
            [userId]
        );

        res.json({
            success: true,
            message: '2FA disabled successfully'
        });

    } catch (error) {
        console.error('2FA Disable error:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
};

/**
 * Validate 2FA code (used during login)
 * POST /api/auth/2fa/validate
 */
exports.validate2FA = async (req, res) => {
    try {
        const { userId, code } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ error: 'User ID and code required' });
        }

        // Get user's secret
        const userResult = await pool.query(
            'SELECT two_fa_secret, two_fa_enabled, two_fa_backup_codes FROM users WHERE user_id = $1',
            [userId]
        );

        const user = userResult.rows[0];
        if (!user?.two_fa_enabled) {
            return res.status(400).json({ error: '2FA is not enabled for this user' });
        }

        // First try TOTP code
        let verified = speakeasy.totp.verify({
            secret: user.two_fa_secret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        // If TOTP fails, check backup codes
        if (!verified && user.two_fa_backup_codes) {
            const backupCodes = JSON.parse(user.two_fa_backup_codes);
            const codeIndex = backupCodes.indexOf(code);

            if (codeIndex !== -1) {
                verified = true;
                // Remove used backup code
                backupCodes.splice(codeIndex, 1);
                await pool.query(
                    'UPDATE users SET two_fa_backup_codes = $1 WHERE user_id = $2',
                    [JSON.stringify(backupCodes), userId]
                );
            }
        }

        if (!verified) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }

        res.json({
            success: true,
            message: '2FA validated'
        });

    } catch (error) {
        console.error('2FA Validate error:', error);
        res.status(500).json({ error: 'Failed to validate 2FA' });
    }
};

/**
 * Get 2FA status
 * GET /api/auth/2fa/status
 */
exports.get2FAStatus = async (req, res) => {
    try {
        const userId = req.user.user_id || req.user.id;

        const result = await pool.query(
            'SELECT two_fa_enabled FROM users WHERE user_id = $1',
            [userId]
        );

        res.json({
            enabled: result.rows[0]?.two_fa_enabled || false
        });

    } catch (error) {
        console.error('2FA Status error:', error);
        res.status(500).json({ error: 'Failed to get 2FA status' });
    }
};

/**
 * Generate backup codes
 */
function generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        // Generate random 8-character alphanumeric code
        const code = Math.random().toString(36).substring(2, 6).toUpperCase() +
            '-' +
            Math.random().toString(36).substring(2, 6).toUpperCase();
        codes.push(code);
    }
    return codes;
}

module.exports = exports;
