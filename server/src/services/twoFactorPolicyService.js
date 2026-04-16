const speakeasy = require("speakeasy");

const { runQuery, parseOptionalString } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const MODERN_COLUMNS = Object.freeze({
  enabled: "two_fa_enabled",
  secret: "two_fa_secret",
  backupCodes: "two_fa_backup_codes",
});

const LEGACY_COLUMNS = Object.freeze({
  enabled: "two_factor_enabled",
  secret: "two_factor_secret",
  backupCodes: "backup_codes",
});

const FALLBACK_TABLE = "user_two_factor_settings";

let schemaModePromise = null;

function parseBackupCodes(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((code) => String(code));
  }

  if (typeof rawValue === "string") {
    try {
      const parsed = JSON.parse(rawValue);
      if (Array.isArray(parsed)) {
        return parsed.map((code) => String(code));
      }
    } catch {
      return [];
    }
  }

  return [];
}

async function getSchemaMode() {
  if (!schemaModePromise) {
    schemaModePromise = (async () => {
      try {
        const columnResult = await runQuery(
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
          `,
        );

        const columns = new Set(columnResult.rows.map((row) => row.column_name));
        const modernAvailable =
          columns.has(MODERN_COLUMNS.enabled) &&
          columns.has(MODERN_COLUMNS.secret) &&
          columns.has(MODERN_COLUMNS.backupCodes);

        if (modernAvailable) {
          return "users_modern";
        }

        const legacyAvailable =
          columns.has(LEGACY_COLUMNS.enabled) &&
          columns.has(LEGACY_COLUMNS.secret) &&
          columns.has(LEGACY_COLUMNS.backupCodes);

        if (legacyAvailable) {
          return "users_legacy";
        }

        const fallbackResult = await runQuery(
          `
            SELECT to_regclass('public.${FALLBACK_TABLE}') AS table_name
          `,
        );

        if (fallbackResult.rows[0]?.table_name) {
          return "fallback_table";
        }

        return "unavailable";
      } catch (error) {
        logger.warn("[2FA POLICY] Schema inspection failed", { message: error?.message });
        return "unavailable";
      }
    })();
  }

  return schemaModePromise;
}

function getUsersColumns(schemaMode) {
  if (schemaMode === "users_modern") {
    return MODERN_COLUMNS;
  }
  if (schemaMode === "users_legacy") {
    return LEGACY_COLUMNS;
  }
  return null;
}

async function getTwoFactorSettingsByUserId(userId) {
  const normalizedUserId = parseOptionalString(userId);
  if (!normalizedUserId) {
    return null;
  }

  const schemaMode = await getSchemaMode();
  if (schemaMode === "unavailable") {
    return null;
  }

  const usersColumns = getUsersColumns(schemaMode);
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
      [normalizedUserId],
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      enabled: Boolean(row.enabled),
      secret: row.secret || null,
      backupCodes: parseBackupCodes(row.backup_codes),
      schemaMode,
    };
  }

  const fallbackResult = await runQuery(
    `
      SELECT
        COALESCE(enabled, false) AS enabled,
        secret,
        backup_codes
      FROM ${FALLBACK_TABLE}
      WHERE user_id::text = $1
      LIMIT 1
    `,
    [normalizedUserId],
  );

  const fallbackRow = fallbackResult.rows[0];
  if (!fallbackRow) {
    return null;
  }

  return {
    enabled: Boolean(fallbackRow.enabled),
    secret: fallbackRow.secret || null,
    backupCodes: parseBackupCodes(fallbackRow.backup_codes),
    schemaMode,
  };
}

async function getTwoFactorSettingsByIdentifier(identifier) {
  const normalizedIdentifier = parseOptionalString(identifier);
  if (!normalizedIdentifier) {
    return null;
  }

  const normalizedDigits = normalizedIdentifier.replace(/\D/g, "");
  const normalizedPhone = /^[6-9]\d{9}$/.test(normalizedDigits)
    ? normalizedDigits
    : /^91[6-9]\d{9}$/.test(normalizedDigits)
      ? normalizedDigits.slice(2)
      : null;
  const prefixedPhone = normalizedPhone ? `+91${normalizedPhone}` : null;

  const userLookupResult = await runQuery(
    `
      SELECT user_id::text AS user_id
      FROM users
      WHERE LOWER(email) = LOWER($1)
         OR LOWER(COALESCE(username, '')) = LOWER($1)
         OR phone_number = $1
         OR ($2::text IS NOT NULL AND phone_number = $2::text)
         OR ($3::text IS NOT NULL AND phone_number = $3::text)
      LIMIT 1
    `,
    [normalizedIdentifier, normalizedPhone, prefixedPhone],
  );

  const userId = userLookupResult.rows[0]?.user_id || null;
  if (!userId) {
    return null;
  }

  const settings = await getTwoFactorSettingsByUserId(userId);
  if (!settings) {
    return null;
  }

  return {
    userId,
    ...settings,
  };
}

async function consumeBackupCode(userId, backupCode, schemaMode, currentCodes) {
  const normalizedUserId = parseOptionalString(userId);
  if (!normalizedUserId) {
    return false;
  }
  const normalizedBackupCode = parseOptionalString(backupCode)?.toUpperCase();
  if (!normalizedBackupCode) {
    return false;
  }

  const codeList = Array.isArray(currentCodes) ? [...currentCodes].map((code) => String(code).toUpperCase()) : [];
  const codeIndex = codeList.indexOf(normalizedBackupCode);
  if (codeIndex === -1) {
    return false;
  }
  codeList.splice(codeIndex, 1);

  const serialized = JSON.stringify(codeList);
  const usersColumns = getUsersColumns(schemaMode);
  if (usersColumns) {
    await runQuery(
      `
        UPDATE users
        SET ${usersColumns.backupCodes} = $1
        WHERE user_id::text = $2
      `,
      [serialized, normalizedUserId],
    );
    return true;
  }

  await runQuery(
    `
      UPDATE ${FALLBACK_TABLE}
      SET backup_codes = $1::jsonb,
          updated_at = NOW()
      WHERE user_id::text = $2
    `,
    [serialized, normalizedUserId],
  );
  return true;
}

async function verifyTwoFactorCodeOrBackup({
  userId,
  code,
  secret,
  backupCodes,
  schemaMode,
}) {
  const normalizedCode = parseOptionalString(code);
  if (!normalizedCode) {
    return {
      valid: false,
      reason: "missing_code",
    };
  }

  if (secret) {
    const totpValid = speakeasy.totp.verify({
      secret,
      encoding: "base32",
      token: normalizedCode,
      window: 2,
    });

    if (totpValid) {
      return {
        valid: true,
        method: "totp",
      };
    }
  }

  if (Array.isArray(backupCodes) && backupCodes.length > 0) {
    const consumed = await consumeBackupCode(
      userId,
      normalizedCode,
      schemaMode,
      backupCodes,
    );
    if (consumed) {
      return {
        valid: true,
        method: "backup_code",
      };
    }
  }

  return {
    valid: false,
    reason: "invalid_code",
  };
}

module.exports = {
  getTwoFactorSettingsByIdentifier,
  getTwoFactorSettingsByUserId,
  verifyTwoFactorCodeOrBackup,
};
