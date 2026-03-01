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
const crypto = require('crypto');
const pool = require('../config/db');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
let twoFactorColumnsAvailabilityPromise = null;
let twoFactorFallbackTableReadyPromise = null;
const TWO_FACTOR_FALLBACK_TABLE = 'user_two_factor_settings';
const MODERN_TWO_FACTOR_COLUMNS = Object.freeze({
    enabled: 'two_fa_enabled',
    secret: 'two_fa_secret',
    backupCodes: 'two_fa_backup_codes'
});
const LEGACY_TWO_FACTOR_COLUMNS = Object.freeze({
    enabled: 'two_factor_enabled',
    secret: 'two_factor_secret',
    backupCodes: 'backup_codes'
});

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

async function getTwoFactorColumnsAvailability() {
    if (!twoFactorColumnsAvailabilityPromise) {
        twoFactorColumnsAvailabilityPromise = runQuery(
            `
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'users'
                  AND column_name IN (
                    'two_fa_enabled',
                    'two_fa_secret',
                    'two_fa_backup_codes',
                    'two_factor_enabled',
                    'two_factor_secret',
                    'backup_codes'
                  )
            `
        )
            .then((result) => {
                const names = new Set((result?.rows || []).map((row) => row.column_name));
                return {
                    modern: {
                        hasEnabled: names.has(MODERN_TWO_FACTOR_COLUMNS.enabled),
                        hasSecret: names.has(MODERN_TWO_FACTOR_COLUMNS.secret),
                        hasBackupCodes: names.has(MODERN_TWO_FACTOR_COLUMNS.backupCodes)
                    },
                    legacy: {
                        hasEnabled: names.has(LEGACY_TWO_FACTOR_COLUMNS.enabled),
                        hasSecret: names.has(LEGACY_TWO_FACTOR_COLUMNS.secret),
                        hasBackupCodes: names.has(LEGACY_TWO_FACTOR_COLUMNS.backupCodes)
                    }
                };
            })
            .catch((error) => {
                logger.warn('[2FA] Failed to inspect schema, assuming unavailable', { message: error.message });
                return {
                    modern: {
                        hasEnabled: false,
                        hasSecret: false,
                        hasBackupCodes: false
                    },
                    legacy: {
                        hasEnabled: false,
                        hasSecret: false,
                        hasBackupCodes: false
                    }
                };
            });
    }

    return twoFactorColumnsAvailabilityPromise;
}

function isUsersColumnsModeModern(availability) {
    return Boolean(
        availability?.modern?.hasEnabled
        && availability?.modern?.hasSecret
        && availability?.modern?.hasBackupCodes
    );
}

function isUsersColumnsModeLegacy(availability) {
    return Boolean(
        availability?.legacy?.hasEnabled
        && availability?.legacy?.hasSecret
        && availability?.legacy?.hasBackupCodes
    );
}

function getUserId(req) {
    return req.user?.user_id || req.user?.id || req.user?.userId || null;
}

function parseBackupCodes(rawValue) {
    if (Array.isArray(rawValue)) {
        return rawValue.map((value) => String(value));
    }
    if (typeof rawValue === 'string') {
        try {
            const parsed = JSON.parse(rawValue);
            return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
        } catch {
            return [];
        }
    }
    return [];
}

function getUsersTwoFactorColumns(storageMode) {
    if (storageMode === 'users_columns_modern') {
        return MODERN_TWO_FACTOR_COLUMNS;
    }

    if (storageMode === 'users_columns_legacy') {
        return LEGACY_TWO_FACTOR_COLUMNS;
    }

    return null;
}

async function ensureTwoFactorFallbackTable() {
    if (!twoFactorFallbackTableReadyPromise) {
        twoFactorFallbackTableReadyPromise = runQuery(
            `
                CREATE TABLE IF NOT EXISTS ${TWO_FACTOR_FALLBACK_TABLE} (
                    user_id text PRIMARY KEY,
                    enabled boolean NOT NULL DEFAULT false,
                    secret text,
                    backup_codes jsonb,
                    created_at timestamptz NOT NULL DEFAULT NOW(),
                    updated_at timestamptz NOT NULL DEFAULT NOW()
                )
            `
        )
            .then(() => true)
            .catch((error) => {
                logger.error('[2FA] Failed to prepare fallback storage table', {
                    message: error.message
                });
                twoFactorFallbackTableReadyPromise = null;
                return false;
            });
    }

    return twoFactorFallbackTableReadyPromise;
}

async function resolveTwoFactorStorageMode() {
    const schema = await getTwoFactorColumnsAvailability();
    if (isUsersColumnsModeModern(schema)) {
        return 'users_columns_modern';
    }

    if (isUsersColumnsModeLegacy(schema)) {
        return 'users_columns_legacy';
    }

    const fallbackReady = await ensureTwoFactorFallbackTable();
    if (fallbackReady) {
        return 'fallback_table';
    }

    return null;
}

async function fetchTwoFactorRecord(userId, storageMode) {
    if (!userId || !storageMode) {
        return null;
    }

    const usersColumns = getUsersTwoFactorColumns(storageMode);
    if (usersColumns) {
        const result = await runQuery(
            `
                SELECT
                    COALESCE(${usersColumns.enabled}, false) AS enabled,
                    ${usersColumns.secret} AS secret,
                    ${usersColumns.backupCodes} AS backup_codes
                FROM users
                WHERE user_id::text = $1
                LIMIT 1
            `,
            [String(userId)]
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
            enabled: Boolean(row.enabled),
            secret: row.secret || null,
            backupCodes: parseBackupCodes(row.backup_codes)
        };
    }

    const result = await runQuery(
        `
            SELECT
                COALESCE(enabled, false) AS enabled,
                secret,
                backup_codes
            FROM ${TWO_FACTOR_FALLBACK_TABLE}
            WHERE user_id = $1
            LIMIT 1
        `,
        [String(userId)]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
        enabled: Boolean(row.enabled),
        secret: row.secret || null,
        backupCodes: parseBackupCodes(row.backup_codes)
    };
}

async function storePendingTwoFactorSecret(userId, secret, storageMode) {
    const usersColumns = getUsersTwoFactorColumns(storageMode);
    if (usersColumns) {
        await runQuery(
            `
                UPDATE users
                SET ${usersColumns.secret} = $1,
                    ${usersColumns.enabled} = false,
                    ${usersColumns.backupCodes} = NULL
                WHERE user_id::text = $2
            `,
            [secret, String(userId)]
        );
        return;
    }

    await runQuery(
        `
            INSERT INTO ${TWO_FACTOR_FALLBACK_TABLE} (user_id, enabled, secret, backup_codes, updated_at)
            VALUES ($1, false, $2, NULL, NOW())
            ON CONFLICT (user_id) DO UPDATE
            SET enabled = false,
                secret = EXCLUDED.secret,
                backup_codes = NULL,
                updated_at = NOW()
        `,
        [String(userId), secret]
    );
}

async function enableTwoFactorForUser(userId, backupCodes, storageMode) {
    const serializedBackupCodes = JSON.stringify(Array.isArray(backupCodes) ? backupCodes : []);
    const usersColumns = getUsersTwoFactorColumns(storageMode);
    if (usersColumns) {
        await runQuery(
            `
                UPDATE users
                SET ${usersColumns.enabled} = true,
                    ${usersColumns.backupCodes} = $1
                WHERE user_id::text = $2
            `,
            [serializedBackupCodes, String(userId)]
        );
        return;
    }

    await runQuery(
        `
            UPDATE ${TWO_FACTOR_FALLBACK_TABLE}
            SET enabled = true,
                backup_codes = $1::jsonb,
                updated_at = NOW()
            WHERE user_id = $2
        `,
        [serializedBackupCodes, String(userId)]
    );
}

async function disableTwoFactorForUser(userId, storageMode) {
    const usersColumns = getUsersTwoFactorColumns(storageMode);
    if (usersColumns) {
        await runQuery(
            `
                UPDATE users
                SET ${usersColumns.enabled} = false,
                    ${usersColumns.secret} = NULL,
                    ${usersColumns.backupCodes} = NULL
                WHERE user_id::text = $1
            `,
            [String(userId)]
        );
        return;
    }

    await runQuery(
        `
            UPDATE ${TWO_FACTOR_FALLBACK_TABLE}
            SET enabled = false,
                secret = NULL,
                backup_codes = NULL,
                updated_at = NOW()
            WHERE user_id = $1
        `,
        [String(userId)]
    );
}

async function updateTwoFactorBackupCodes(userId, backupCodes, storageMode) {
    const serializedBackupCodes = JSON.stringify(Array.isArray(backupCodes) ? backupCodes : []);
    const usersColumns = getUsersTwoFactorColumns(storageMode);
    if (usersColumns) {
        await runQuery(
            `
                UPDATE users
                SET ${usersColumns.backupCodes} = $1
                WHERE user_id::text = $2
            `,
            [serializedBackupCodes, String(userId)]
        );
        return;
    }

    await runQuery(
        `
            UPDATE ${TWO_FACTOR_FALLBACK_TABLE}
            SET backup_codes = $1::jsonb,
                updated_at = NOW()
            WHERE user_id = $2
        `,
        [serializedBackupCodes, String(userId)]
    );
}

/**
 * Generate 2FA secret and QR code for setup
 * POST /api/auth/2fa/setup
 */
exports.setup2FA = async (req, res) => {
    try {
        const storageMode = await resolveTwoFactorStorageMode();
        if (!storageMode) {
            return res.status(503).json({ error: '2FA service unavailable' });
        }

        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Check if user already has 2FA enabled
        const userCheck = await fetchTwoFactorRecord(userId, storageMode);
        if (userCheck?.enabled) {
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
        await storePendingTwoFactorSecret(userId, secret.base32, storageMode);

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.json({
            success: true,
            secret: secret.base32, // For manual entry
            qrCode: qrCodeUrl,     // For scanning
            message: 'Scan the QR code with your authenticator app, then verify with a code.'
        });

    } catch (error) {
        logger.error('2FA Setup error:', error);
        res.status(500).json({ error: 'Failed to setup 2FA' });
    }
};

/**
 * Verify 2FA code and enable
 * POST /api/auth/2fa/verify
 */
exports.verify2FA = async (req, res) => {
    try {
        const storageMode = await resolveTwoFactorStorageMode();
        if (!storageMode) {
            return res.status(503).json({ error: '2FA service unavailable' });
        }

        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const code = String(req.body?.code || req.body?.token || '').trim();

        if (!code) {
            return res.status(400).json({ error: 'Verification code required' });
        }

        // Get user's secret
        const userRecord = await fetchTwoFactorRecord(userId, storageMode);
        const secret = userRecord?.secret;
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
        // Generate backup codes
        const backupCodes = generateBackupCodes();
        await enableTwoFactorForUser(userId, backupCodes, storageMode);

        res.json({
            success: true,
            message: '2FA enabled successfully!',
            backupCodes: backupCodes // Show once, user must save them
        });

    } catch (error) {
        logger.error('2FA Verify error:', error);
        res.status(500).json({ error: 'Failed to verify 2FA' });
    }
};

/**
 * Disable 2FA
 * POST /api/auth/2fa/disable
 */
exports.disable2FA = async (req, res) => {
    try {
        const storageMode = await resolveTwoFactorStorageMode();
        if (!storageMode) {
            return res.status(503).json({ error: '2FA service unavailable' });
        }

        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const code = String(req.body?.code || req.body?.token || '').trim();

        if (!code) {
            return res.status(400).json({ error: 'Verification code required' });
        }

        // Get user's secret
        const userRecord = await fetchTwoFactorRecord(userId, storageMode);
        if (!userRecord?.enabled) {
            return res.status(400).json({ error: '2FA is not enabled' });
        }

        const secret = userRecord.secret;

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
        await disableTwoFactorForUser(userId, storageMode);

        res.json({
            success: true,
            message: '2FA disabled successfully'
        });

    } catch (error) {
        logger.error('2FA Disable error:', error);
        res.status(500).json({ error: 'Failed to disable 2FA' });
    }
};

/**
 * Validate 2FA code (used during login)
 * POST /api/auth/2fa/validate
 */
exports.validate2FA = async (req, res) => {
    try {
        const storageMode = await resolveTwoFactorStorageMode();
        if (!storageMode) {
            return res.status(503).json({ error: '2FA service unavailable' });
        }

        const userId = String(req.body?.userId || '').trim();
        const code = String(req.body?.code || req.body?.token || '').trim();

        if (!userId || !code) {
            return res.status(400).json({ error: 'User ID and code required' });
        }

        // Get user's secret
        const userRecord = await fetchTwoFactorRecord(userId, storageMode);
        if (!userRecord?.enabled) {
            return res.status(400).json({ error: '2FA is not enabled for this user' });
        }

        // First try TOTP code
        let verified = speakeasy.totp.verify({
            secret: userRecord.secret,
            encoding: 'base32',
            token: code,
            window: 2
        });

        // If TOTP fails, check backup codes
        if (!verified && userRecord.backupCodes.length) {
            const backupCodes = [...userRecord.backupCodes];
            const codeIndex = backupCodes.indexOf(code);

            if (codeIndex !== -1) {
                verified = true;
                // Remove used backup code
                backupCodes.splice(codeIndex, 1);
                await updateTwoFactorBackupCodes(userId, backupCodes, storageMode);
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
        logger.error('2FA Validate error:', error);
        res.status(500).json({ error: 'Failed to validate 2FA' });
    }
};

/**
 * Get 2FA status
 * GET /api/auth/2fa/status
 */
exports.get2FAStatus = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const storageMode = await resolveTwoFactorStorageMode();
        if (!storageMode) {
            return res.json({
                enabled: false,
                available: false
            });
        }

        const record = await fetchTwoFactorRecord(userId, storageMode);

        res.json({
            enabled: Boolean(record?.enabled),
            available: true
        });

    } catch (error) {
        logger.error('2FA Status error:', error);
        res.status(500).json({ error: 'Failed to get 2FA status' });
    }
};

/**
 * Generate backup codes
 */
function generateBackupCodes(count = 8) {
    const codes = [];
    for (let i = 0; i < count; i++) {
        const left = crypto.randomInt(0, 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
        const right = crypto.randomInt(0, 36 ** 4).toString(36).toUpperCase().padStart(4, '0');
        const code = `${left}-${right}`;
        codes.push(code);
    }
    return codes;
}

module.exports = exports;
