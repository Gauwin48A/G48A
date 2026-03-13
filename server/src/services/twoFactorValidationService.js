const speakeasy = require("speakeasy");
const pool = require("../config/db");
const logger = require("../utils/logger");

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
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

let twoFactorAvailabilityPromise = null;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS,
  });
}

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

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

async function getTwoFactorAvailability() {
  if (!twoFactorAvailabilityPromise) {
    twoFactorAvailabilityPromise = Promise.all([
      runQuery(
        "SELECT column_name\n" +
          "FROM information_schema.columns\n" +
          "WHERE table_schema = 'public'\n" +
          "  AND table_name = 'users'\n" +
          "  AND column_name IN (\n" +
          "    'two_fa_enabled',\n" +
          "    'two_fa_secret',\n" +
          "    'two_fa_backup_codes',\n" +
          "    'two_factor_enabled',\n" +
          "    'two_factor_secret',\n" +
          "    'backup_codes'\n" +
          "  )",
      ),
      runQuery(
        `SELECT to_regclass('public.${TWO_FACTOR_FALLBACK_TABLE}') AS fallback_table`,
      ),
    ])
      .then(([columnsResult, fallbackResult]) => {
        const names = new Set(
          (columnsResult?.rows || []).map((row) => row.column_name),
        );
        const fallbackExists = Boolean(fallbackResult?.rows?.[0]?.fallback_table);
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
          fallbackExists,
        };
      })
      .catch((error) => {
        logger.warn("[2FA] Failed to inspect 2FA schema", {
          message: error.message,
        });
        return {
          modern: { hasEnabled: false, hasSecret: false, hasBackupCodes: false },
          legacy: { hasEnabled: false, hasSecret: false, hasBackupCodes: false },
          fallbackExists: false,
        };
      });
  }

  return twoFactorAvailabilityPromise;
}

function resolveStorageMode(availability) {
  if (
    availability?.modern?.hasEnabled &&
    availability?.modern?.hasSecret &&
    availability?.modern?.hasBackupCodes
  ) {
    return "users_columns_modern";
  }
  if (
    availability?.legacy?.hasEnabled &&
    availability?.legacy?.hasSecret &&
    availability?.legacy?.hasBackupCodes
  ) {
    return "users_columns_legacy";
  }
  if (availability?.fallbackExists) {
    return "fallback_table";
  }
  return null;
}

function getUsersTwoFactorColumns(storageMode) {
  if (storageMode === "users_columns_modern") return MODERN_TWO_FACTOR_COLUMNS;
  if (storageMode === "users_columns_legacy") return LEGACY_TWO_FACTOR_COLUMNS;
  return null;
}

async function fetchTwoFactorRecord(userId, storageMode) {
  if (!userId || !storageMode) return null;
  const usersColumns = getUsersTwoFactorColumns(storageMode);
  if (usersColumns) {
    const result = await runQuery(
      "SELECT\n" +
        `  COALESCE(${usersColumns.enabled}, false) AS enabled,\n` +
        `  ${usersColumns.secret} AS secret,\n` +
        `  ${usersColumns.backupCodes} AS backup_codes\n` +
        "FROM users\n" +
        "WHERE user_id::text = $1\n" +
        "LIMIT 1",
      [String(userId)],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      enabled: Boolean(row.enabled),
      secret: row.secret || null,
      backupCodes: parseBackupCodes(row.backup_codes),
    };
  }

  const fallbackResult = await runQuery(
    "SELECT\n" +
      "  COALESCE(enabled, false) AS enabled,\n" +
      "  secret,\n" +
      "  backup_codes\n" +
      `FROM ${TWO_FACTOR_FALLBACK_TABLE}\n` +
      "WHERE user_id = $1\n" +
      "LIMIT 1",
    [String(userId)],
  );
  const fallbackRow = fallbackResult.rows[0];
  if (!fallbackRow) return null;
  return {
    enabled: Boolean(fallbackRow.enabled),
    secret: fallbackRow.secret || null,
    backupCodes: parseBackupCodes(fallbackRow.backup_codes),
  };
}

async function updateBackupCodes(userId, backupCodes, storageMode) {
  const serializedBackupCodes = JSON.stringify(
    Array.isArray(backupCodes) ? backupCodes : [],
  );
  const usersColumns = getUsersTwoFactorColumns(storageMode);
  if (usersColumns) {
    await runQuery(
      "UPDATE users\n" +
        `SET ${usersColumns.backupCodes} = $1\n` +
        "WHERE user_id::text = $2",
      [serializedBackupCodes, String(userId)],
    );
    return;
  }

  await runQuery(
    "UPDATE " + TWO_FACTOR_FALLBACK_TABLE + "\n" +
      "SET backup_codes = $1::jsonb,\n" +
      "    updated_at = NOW()\n" +
      "WHERE user_id = $2",
    [serializedBackupCodes, String(userId)],
  );
}

async function validateTwoFactorCode({ userId, code }) {
  const normalizedUserId = parseOptionalString(userId);
  const normalizedCode = parseOptionalString(code);

  if (!normalizedUserId || !normalizedCode) {
    return {
      valid: false,
      reason: "missing",
      message: "Authenticator code is required.",
    };
  }

  const availability = await getTwoFactorAvailability();
  const storageMode = resolveStorageMode(availability);

  if (!storageMode) {
    return {
      valid: false,
      reason: "unavailable",
      message: "Two-factor authentication is currently unavailable.",
    };
  }

  const record = await fetchTwoFactorRecord(normalizedUserId, storageMode);
  if (!record?.enabled || !record?.secret) {
    return {
      valid: false,
      reason: "disabled",
      message: "Two-factor authentication is not enabled for this account.",
    };
  }

  const verified = speakeasy.totp.verify({
    secret: record.secret,
    encoding: "base32",
    token: normalizedCode,
    window: 2,
  });

  if (verified) {
    return { valid: true, usedBackupCode: false };
  }

  const backupCodes = Array.isArray(record.backupCodes)
    ? [...record.backupCodes]
    : [];
  const backupIndex = backupCodes.indexOf(normalizedCode);
  if (backupIndex !== -1) {
    backupCodes.splice(backupIndex, 1);
    try {
      await updateBackupCodes(normalizedUserId, backupCodes, storageMode);
    } catch (error) {
      logger.warn("[2FA] Failed to update backup codes", {
        message: error.message,
      });
    }
    return { valid: true, usedBackupCode: true };
  }

  return {
    valid: false,
    reason: "invalid",
    message: "Invalid authenticator code.",
  };
}

module.exports = {
  validateTwoFactorCode,
};
