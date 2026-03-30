const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

let twoFactorColumnsAvailabilityPromise = null;
let twoFactorFallbackTableReadyPromise = null;

const TWO_FACTOR_FALLBACK_TABLE = "user_two_factor_settings";

const MODERN_TWO_FACTOR_COLUMNS = Object.freeze({
  enabled: "two_fa_enabled",
  secret: "two_fa_secret",
  backupCodes: "two_fa_backup_codes",
});

const LEGACY_TWO_FACTOR_COLUMNS = Object.freeze({
  enabled: "two_factor_enabled",
  secret: "two_factor_secret",
  backupCodes: "backup_codes",
});

/**
 * Inspect the public.users table to determine which 2FA column naming
 * convention is available (modern vs legacy).
 * The result is cached; on error the cache is cleared so the next call retries.
 * @returns {Promise<{ modern: object, legacy: object }>}
 */
async function getTwoFactorColumnsAvailability() {
  if (!twoFactorColumnsAvailabilityPromise) {
    twoFactorColumnsAvailabilityPromise = runQuery(
      `SELECT column_name
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
         )`
    )
      .then((result) => {
        const names = new Set(
          (result?.rows || []).map((row) => row.column_name)
        );
        return {
          modern: {
            hasEnabled: names.has(MODERN_TWO_FACTOR_COLUMNS.enabled),
            hasSecret: names.has(MODERN_TWO_FACTOR_COLUMNS.secret),
            hasBackupCodes: names.has(MODERN_TWO_FACTOR_COLUMNS.backupCodes),
          },
          legacy: {
            hasEnabled: names.has(LEGACY_TWO_FACTOR_COLUMNS.enabled),
            hasSecret: names.has(LEGACY_TWO_FACTOR_COLUMNS.secret),
            hasBackupCodes: names.has(LEGACY_TWO_FACTOR_COLUMNS.backupCodes),
          },
        };
      })
      .catch((error) => {
        logger.warn(
          "[2FA] Failed to inspect schema, assuming unavailable",
          { message: error.message }
        );
        twoFactorColumnsAvailabilityPromise = null;
        return {
          modern: { hasEnabled: false, hasSecret: false, hasBackupCodes: false },
          legacy: { hasEnabled: false, hasSecret: false, hasBackupCodes: false },
        };
      });
  }
  return twoFactorColumnsAvailabilityPromise;
}

/**
 * Check whether the modern 2FA column set is fully present on the users table.
 * @param {{ modern: object, legacy: object }} availability
 * @returns {boolean}
 */
function isUsersColumnsModeModern(availability) {
  return Boolean(
    availability?.modern?.hasEnabled &&
      availability?.modern?.hasSecret &&
      availability?.modern?.hasBackupCodes
  );
}

/**
 * Check whether the legacy 2FA column set is fully present on the users table.
 * @param {{ modern: object, legacy: object }} availability
 * @returns {boolean}
 */
function isUsersColumnsModeLegacy(availability) {
  return Boolean(
    availability?.legacy?.hasEnabled &&
      availability?.legacy?.hasSecret &&
      availability?.legacy?.hasBackupCodes
  );
}

/**
 * Extract the authenticated user ID from the request object.
 * @param {import("express").Request} req
 * @returns {string|null}
 */
function getUserId(req) {
  return req.user?.user_id || req.user?.id || req.user?.userId || null;
}

/**
 * Normalize a raw backup-codes value (JSON string or array) into a string array.
 * @param {*} rawValue
 * @returns {string[]}
 */
function parseBackupCodes(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => String(value));
  }
  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      return Array.isArray(parsed) ? parsed.map((value) => String(value)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Return the column-name mapping for a given users-table storage mode,
 * or null when the fallback table is in use.
 * @param {string} storageMode
 * @returns {{ enabled: string, secret: string, backupCodes: string }|null}
 */
function getUsersTwoFactorColumns(storageMode) {
  if (storageMode === "users_columns_modern") {
    return MODERN_TWO_FACTOR_COLUMNS;
  }
  if (storageMode === "users_columns_legacy") {
    return LEGACY_TWO_FACTOR_COLUMNS;
  }
  return null;
}

/**
 * Ensure the standalone fallback table for 2FA settings exists.
 * The DDL is idempotent (CREATE TABLE IF NOT EXISTS).
 * The result is cached; on error the cache is cleared so the next call retries.
 * @returns {Promise<boolean>}
 */
async function ensureTwoFactorFallbackTable() {
  if (!twoFactorFallbackTableReadyPromise) {
    twoFactorFallbackTableReadyPromise = runQuery(
      `CREATE TABLE IF NOT EXISTS ${TWO_FACTOR_FALLBACK_TABLE} (
        user_id text PRIMARY KEY,
        enabled boolean NOT NULL DEFAULT false,
        secret text,
        backup_codes jsonb,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )`
    )
      .then(() => true)
      .catch((error) => {
        logger.error("[2FA] Failed to prepare fallback storage table", {
          message: error.message,
        });
        twoFactorFallbackTableReadyPromise = null;
        return false;
      });
  }
  return twoFactorFallbackTableReadyPromise;
}

/**
 * Determine the best available storage strategy for 2FA data:
 *   - "users_columns_modern"  (two_fa_* columns on users table)
 *   - "users_columns_legacy"  (two_factor_* / backup_codes columns)
 *   - "fallback_table"        (dedicated user_two_factor_settings table)
 *   - null                    (no storage available)
 * @returns {Promise<string|null>}
 */
async function resolveTwoFactorStorageMode() {
  const schema = await getTwoFactorColumnsAvailability();
  if (isUsersColumnsModeModern(schema)) {
    return "users_columns_modern";
  }
  if (isUsersColumnsModeLegacy(schema)) {
    return "users_columns_legacy";
  }
  const fallbackReady = await ensureTwoFactorFallbackTable();
  if (fallbackReady) {
    return "fallback_table";
  }
  return null;
}

/**
 * Fetch the current 2FA record for a user from whichever storage layer is active.
 * @param {string} userId
 * @param {string} storageMode
 * @returns {Promise<{ enabled: boolean, secret: string|null, backupCodes: string[] }|null>}
 */
async function fetchTwoFactorRecord(userId, storageMode) {
  if (!userId || !storageMode) {
    return null;
  }

  const usersColumns = getUsersTwoFactorColumns(storageMode);
  if (usersColumns) {
    const result = await runQuery(
      `SELECT
        COALESCE(${usersColumns.enabled}, false) AS enabled,
        ${usersColumns.secret} AS secret,
        ${usersColumns.backupCodes} AS backup_codes
       FROM users
       WHERE user_id::text = $1
       LIMIT 1`,
      [String(userId)]
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      enabled: Boolean(row.enabled),
      secret: row.secret || null,
      backupCodes: parseBackupCodes(row.backup_codes),
    };
  }

  const result = await runQuery(
    `SELECT
      COALESCE(enabled, false) AS enabled,
      secret,
      backup_codes
     FROM ${TWO_FACTOR_FALLBACK_TABLE}
     WHERE user_id = $1
     LIMIT 1`,
    [String(userId)]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    enabled: Boolean(row.enabled),
    secret: row.secret || null,
    backupCodes: parseBackupCodes(row.backup_codes),
  };
}

/**
 * Store a pending (not yet verified) TOTP secret for the user.
 * @param {string} userId
 * @param {string} secret - Base32-encoded TOTP secret
 * @param {string} storageMode
 * @returns {Promise<void>}
 */
async function storePendingTwoFactorSecret(userId, secret, storageMode) {
  const usersColumns = getUsersTwoFactorColumns(storageMode);
  if (usersColumns) {
    await runQuery(
      `UPDATE users
       SET ${usersColumns.secret} = $1,
           ${usersColumns.enabled} = false,
           ${usersColumns.backupCodes} = NULL
       WHERE user_id::text = $2`,
      [secret, String(userId)]
    );
    return;
  }

  await runQuery(
    `INSERT INTO ${TWO_FACTOR_FALLBACK_TABLE}
       (user_id, enabled, secret, backup_codes, updated_at)
     VALUES ($1, false, $2, NULL, NOW())
     ON CONFLICT (user_id) DO UPDATE
     SET enabled = false,
         secret = EXCLUDED.secret,
         backup_codes = NULL,
         updated_at = NOW()`,
    [String(userId), secret]
  );
}

/**
 * Mark 2FA as enabled for a user and persist the generated backup codes.
 * @param {string} userId
 * @param {string[]} backupCodes
 * @param {string} storageMode
 * @returns {Promise<void>}
 */
async function enableTwoFactorForUser(userId, backupCodes, storageMode) {
  const serializedBackupCodes = JSON.stringify(
    Array.isArray(backupCodes) ? backupCodes : []
  );
  const usersColumns = getUsersTwoFactorColumns(storageMode);

  if (usersColumns) {
    await runQuery(
      `UPDATE users
       SET ${usersColumns.enabled} = true,
           ${usersColumns.backupCodes} = $1
       WHERE user_id::text = $2`,
      [serializedBackupCodes, String(userId)]
    );
    return;
  }

  await runQuery(
    `UPDATE ${TWO_FACTOR_FALLBACK_TABLE}
     SET enabled = true,
         backup_codes = $1::jsonb,
         updated_at = NOW()
     WHERE user_id = $2`,
    [serializedBackupCodes, String(userId)]
  );
}

/**
 * Disable 2FA for a user, clearing the secret and backup codes.
 * @param {string} userId
 * @param {string} storageMode
 * @returns {Promise<void>}
 */
async function disableTwoFactorForUser(userId, storageMode) {
  const usersColumns = getUsersTwoFactorColumns(storageMode);
  if (usersColumns) {
    await runQuery(
      `UPDATE users
       SET ${usersColumns.enabled} = false,
           ${usersColumns.secret} = NULL,
           ${usersColumns.backupCodes} = NULL
       WHERE user_id::text = $1`,
      [String(userId)]
    );
    return;
  }

  await runQuery(
    `UPDATE ${TWO_FACTOR_FALLBACK_TABLE}
     SET enabled = false,
         secret = NULL,
         backup_codes = NULL,
         updated_at = NOW()
     WHERE user_id = $1`,
    [String(userId)]
  );
}

/**
 * Overwrite the stored backup codes for a user (e.g. after one is consumed).
 * @param {string} userId
 * @param {string[]} backupCodes
 * @param {string} storageMode
 * @returns {Promise<void>}
 */
async function updateTwoFactorBackupCodes(userId, backupCodes, storageMode) {
  const serializedBackupCodes = JSON.stringify(
    Array.isArray(backupCodes) ? backupCodes : []
  );
  const usersColumns = getUsersTwoFactorColumns(storageMode);

  if (usersColumns) {
    await runQuery(
      `UPDATE users
       SET ${usersColumns.backupCodes} = $1
       WHERE user_id::text = $2`,
      [serializedBackupCodes, String(userId)]
    );
    return;
  }

  await runQuery(
    `UPDATE ${TWO_FACTOR_FALLBACK_TABLE}
     SET backup_codes = $1::jsonb,
         updated_at = NOW()
     WHERE user_id = $2`,
    [serializedBackupCodes, String(userId)]
  );
}

/**
 * Generate a set of single-use backup codes for 2FA recovery.
 * Each code is in the format XXXX-XXXX (base-36 uppercase).
 * @param {number} [count=8] - Number of codes to generate
 * @returns {string[]}
 */
function generateBackupCodes(count = 8) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const left = crypto
      .randomInt(0, 36 ** 4)
      .toString(36)
      .toUpperCase()
      .padStart(4, "0");
    const right = crypto
      .randomInt(0, 36 ** 4)
      .toString(36)
      .toUpperCase()
      .padStart(4, "0");
    codes.push(`${left}-${right}`);
  }
  return codes;
}

/**
 * POST /api/2fa/setup
 * Generate a new TOTP secret and QR code for the authenticated user.
 * If 2FA is already enabled the request is rejected.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.setup2FA = async (req, res) => {
  try {
    const storageMode = await resolveTwoFactorStorageMode();
    if (!storageMode) {
      return res.status(503).json({ error: "2FA service unavailable" });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userCheck = await fetchTwoFactorRecord(userId, storageMode);
    if (userCheck?.enabled) {
      return res
        .status(400)
        .json({ error: "2FA is already enabled. Disable it first to reset." });
    }

    const secret = speakeasy.generateSecret({
      name: `MHub:${req.user.email || req.user.username || "User"}`,
      issuer: "MHub",
      length: 32,
    });

    await storePendingTwoFactorSecret(userId, secret.base32, storageMode);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message:
        "Scan the QR code with your authenticator app, then verify with a code.",
    });
  } catch (error) {
    logger.error("2FA Setup error:", error);
    res.status(500).json({ error: "Failed to setup 2FA" });
  }
};

/**
 * POST /api/2fa/verify
 * Verify a TOTP code to confirm 2FA setup, then enable 2FA and return backup codes.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.verify2FA = async (req, res) => {
  try {
    const storageMode = await resolveTwoFactorStorageMode();
    if (!storageMode) {
      return res.status(503).json({ error: "2FA service unavailable" });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const code = String(req.body?.code || req.body?.token || "").trim();
    if (!code) {
      return res.status(400).json({ error: "Verification code required" });
    }

    const userRecord = await fetchTwoFactorRecord(userId, storageMode);
    const secret = userRecord?.secret;
    if (!secret) {
      return res.status(400).json({ error: "Please setup 2FA first" });
    }

    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const backupCodes = generateBackupCodes();
    await enableTwoFactorForUser(userId, backupCodes, storageMode);

    res.json({
      success: true,
      message: "2FA enabled successfully!",
      backupCodes: backupCodes,
    });
  } catch (error) {
    logger.error("2FA Verify error:", error);
    res.status(500).json({ error: "Failed to verify 2FA" });
  }
};

/**
 * POST /api/2fa/disable
 * Disable 2FA for the authenticated user after verifying a current TOTP code.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.disable2FA = async (req, res) => {
  try {
    const storageMode = await resolveTwoFactorStorageMode();
    if (!storageMode) {
      return res.status(503).json({ error: "2FA service unavailable" });
    }

    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const code = String(req.body?.code || req.body?.token || "").trim();
    if (!code) {
      return res.status(400).json({ error: "Verification code required" });
    }

    const userRecord = await fetchTwoFactorRecord(userId, storageMode);
    if (!userRecord?.enabled) {
      return res.status(400).json({ error: "2FA is not enabled" });
    }

    const secret = userRecord.secret;
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    await disableTwoFactorForUser(userId, storageMode);
    res.json({ success: true, message: "2FA disabled successfully" });
  } catch (error) {
    logger.error("2FA Disable error:", error);
    res.status(500).json({ error: "Failed to disable 2FA" });
  }
};

/**
 * POST /api/2fa/validate
 * Validate a TOTP code (or backup code) for a given user during login.
 * If a backup code is consumed it is removed from the stored set.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.validate2FA = async (req, res) => {
  try {
    const storageMode = await resolveTwoFactorStorageMode();
    if (!storageMode) {
      return res.status(503).json({ error: "2FA service unavailable" });
    }

    const userId = String(req.body?.userId || "").trim();
    const code = String(req.body?.code || req.body?.token || "").trim();
    if (!userId || !code) {
      return res.status(400).json({ error: "User ID and code required" });
    }

    const userRecord = await fetchTwoFactorRecord(userId, storageMode);
    if (!userRecord?.enabled) {
      return res
        .status(400)
        .json({ error: "2FA is not enabled for this user" });
    }

    let verified = speakeasy.totp.verify({
      secret: userRecord.secret,
      encoding: "base32",
      token: code,
      window: 2,
    });

    if (!verified && userRecord.backupCodes.length) {
      const backupCodes = [...userRecord.backupCodes];
      const codeIndex = backupCodes.indexOf(code);
      if (codeIndex !== -1) {
        verified = true;
        backupCodes.splice(codeIndex, 1);
        await updateTwoFactorBackupCodes(userId, backupCodes, storageMode);
      }
    }

    if (!verified) {
      return res.status(400).json({ error: "Invalid verification code" });
    }

    res.json({ success: true, message: "2FA validated" });
  } catch (error) {
    logger.error("2FA Validate error:", error);
    res.status(500).json({ error: "Failed to validate 2FA" });
  }
};

/**
 * GET /api/2fa/status
 * Return whether 2FA is enabled for the authenticated user and whether the
 * 2FA service is available at all.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 */
exports.get2FAStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const storageMode = await resolveTwoFactorStorageMode();
    if (!storageMode) {
      return res.json({ enabled: false, available: false });
    }

    const record = await fetchTwoFactorRecord(userId, storageMode);
    res.json({ enabled: Boolean(record?.enabled), available: true });
  } catch (error) {
    logger.error("2FA Status error:", error);
    res.status(500).json({ error: "Failed to get 2FA status" });
  }
};

module.exports = exports;
