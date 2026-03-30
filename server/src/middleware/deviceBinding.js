/**
 * Device Binding Middleware — Strict Mode
 * ────────────────────────────────────────
 * Enforces:
 * 1. ONE account per device — permanently. Once bound, a device can NEVER
 *    be used with another account (unless admin unbinds it).
 * 2. ONE device per account by default (configurable).
 * 3. Phone-Device binding — the registered phone number is locked to the device.
 *    Like WhatsApp: the SIM (phone number) that registered must be on the device.
 * 4. Flagging & permanent blocking of multi-account abuse attempts.
 * 5. Login/logout frequency abuse prevention.
 */

const { runQuery, pool } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const crypto = require("crypto");
const redisSession = require("../config/redisSession");

// ── Configuration ────────────────────────────────────────────
const MAX_DEVICES_PER_USER = parseInt(process.env.MAX_DEVICES_PER_USER || "1", 10);
const MAX_LOGINS_PER_HOUR = parseInt(process.env.MAX_LOGINS_PER_HOUR || "5", 10);
const MAX_LOGOUTS_PER_HOUR = parseInt(process.env.MAX_LOGOUTS_PER_HOUR || "3", 10);
const LOGIN_COOLDOWN_AFTER_LOGOUT_SECONDS = parseInt(process.env.LOGIN_COOLDOWN_AFTER_LOGOUT_SECONDS || "60", 10);
const DEVICE_BINDING_ENABLED = String(process.env.DEVICE_BINDING_ENABLED || "true").toLowerCase() === "true";
const DEVICE_BINDING_STRICT = String(process.env.DEVICE_BINDING_STRICT || "false").toLowerCase() === "true";
const MULTI_ACCOUNT_FLAG_THRESHOLD = parseInt(process.env.MULTI_ACCOUNT_FLAG_THRESHOLD || "2", 10);
const FLAGGED_DEVICE_BLOCK_DAYS = parseInt(process.env.FLAGGED_DEVICE_BLOCK_DAYS || "30", 10);
const AUTH_RATE_LIMIT_BYPASS_DEV =
  process.env.NODE_ENV !== "production" &&
  String(process.env.AUTH_RATE_LIMIT_BYPASS_DEV || "").toLowerCase() === "true";

// ── In-memory cache for tables existence check ───────────────
let tablesChecked = false;
let tablesExist = false;

const ensureTablesExist = async () => {
  if (tablesChecked) return tablesExist;
  try {
    const result = await runQuery(
      `SELECT to_regclass('public.device_bindings') AS db_table,
              to_regclass('public.auth_activity_log') AS aal_table,
              to_regclass('public.flagged_devices') AS fd_table,
              to_regclass('public.device_phone_bindings') AS dpb_table`
    );
    const row = result.rows[0];
    tablesExist = Boolean(row?.db_table && row?.aal_table && row?.fd_table && row?.dpb_table);

    if (!tablesExist) {
      // ── device_bindings ───────────────────────────────────
      await runQuery(`
        CREATE TABLE IF NOT EXISTS device_bindings (
          id SERIAL PRIMARY KEY,
          device_fingerprint VARCHAR(512) NOT NULL,
          user_id INTEGER NOT NULL,
          device_info JSONB DEFAULT '{}',
          ip_address VARCHAR(50),
          bound_at TIMESTAMP DEFAULT NOW(),
          last_seen_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE,
          is_permanent BOOLEAN DEFAULT TRUE,
          revoked_at TIMESTAMP,
          revoke_reason VARCHAR(255),
          UNIQUE(device_fingerprint, user_id)
        )
      `);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_device_bindings_fingerprint ON device_bindings(device_fingerprint) WHERE is_active = true`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_device_bindings_user ON device_bindings(user_id) WHERE is_active = true`);

      // ── auth_activity_log ─────────────────────────────────
      await runQuery(`
        CREATE TABLE IF NOT EXISTS auth_activity_log (
          id SERIAL PRIMARY KEY,
          user_id INTEGER,
          device_fingerprint VARCHAR(512),
          action VARCHAR(50) NOT NULL,
          ip_address VARCHAR(50),
          user_agent TEXT,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_auth_activity_user_action ON auth_activity_log(user_id, action, created_at DESC)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_auth_activity_device ON auth_activity_log(device_fingerprint, action, created_at DESC)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_auth_activity_ip ON auth_activity_log(ip_address, action, created_at DESC)`);

      // ── flagged_devices — permanent record of abuse ────────
      await runQuery(`
        CREATE TABLE IF NOT EXISTS flagged_devices (
          id SERIAL PRIMARY KEY,
          device_fingerprint VARCHAR(512) NOT NULL,
          reason VARCHAR(100) NOT NULL,
          attempted_user_id INTEGER,
          bound_user_id INTEGER,
          ip_address VARCHAR(50),
          blocked_until TIMESTAMP,
          is_permanently_blocked BOOLEAN DEFAULT FALSE,
          violation_count INTEGER DEFAULT 1,
          first_flagged_at TIMESTAMP DEFAULT NOW(),
          last_flagged_at TIMESTAMP DEFAULT NOW(),
          metadata JSONB DEFAULT '{}',
          UNIQUE(device_fingerprint, reason)
        )
      `);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_flagged_devices_fp ON flagged_devices(device_fingerprint)`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_flagged_devices_blocked ON flagged_devices(device_fingerprint) WHERE is_permanently_blocked = true`);

      // ── device_phone_bindings — WhatsApp-style lock ────────
      // A device can only be used with ONE phone number, and a phone number
      // can only be used on ONE device at a time.
      await runQuery(`
        CREATE TABLE IF NOT EXISTS device_phone_bindings (
          id SERIAL PRIMARY KEY,
          device_fingerprint VARCHAR(512) NOT NULL,
          phone_number VARCHAR(20) NOT NULL,
          user_id INTEGER NOT NULL,
          verified_at TIMESTAMP DEFAULT NOW(),
          last_verified_at TIMESTAMP DEFAULT NOW(),
          is_active BOOLEAN DEFAULT TRUE,
          deactivated_at TIMESTAMP,
          deactivate_reason VARCHAR(255),
          UNIQUE(device_fingerprint)
        )
      `);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_dpb_phone ON device_phone_bindings(phone_number) WHERE is_active = true`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_dpb_device ON device_phone_bindings(device_fingerprint) WHERE is_active = true`);
      await runQuery(`CREATE INDEX IF NOT EXISTS idx_dpb_user ON device_phone_bindings(user_id) WHERE is_active = true`);

      tablesExist = true;
    }

    // Add missing columns to existing tables (migration-safe)
    try {
      await runQuery(`ALTER TABLE device_bindings ADD COLUMN IF NOT EXISTS is_permanent BOOLEAN DEFAULT TRUE`);
      await runQuery(`ALTER TABLE auth_activity_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'`);
    } catch { /* columns may already exist */ }

    tablesChecked = true;
    return tablesExist;
  } catch (err) {
    logger.warn("[DEVICE_BINDING] Table check/creation failed:", err.message);
    tablesChecked = true;
    tablesExist = false;
    return false;
  }
};

// ── Extract & validate device fingerprint from request ───────
const extractDeviceFingerprint = (req) => {
  const raw =
    req.body?.deviceFingerprint ||
    req.body?.device_fingerprint ||
    req.headers["x-device-fingerprint"] ||
    req.headers["x-device-id"] ||
    null;

  if (!raw || typeof raw !== "string") return null;

  // Validate fingerprint format: must be hash-random (32 hex chars + dash + 16 hex chars)
  // or at least 16 chars long and alphanumeric
  const trimmed = raw.trim();
  if (trimmed.length < 16) return null; // Too short = likely fake
  if (trimmed.length > 512) return null; // Too long = injection attempt
  // Only allow alphanumeric, hyphens, underscores, dots (strict whitelist)
  if (!/^[a-zA-Z0-9\-_.]+$/.test(trimmed)) return null;

  return trimmed;
};

// ── Server-side fingerprint consistency check ────────────────
// Validates that the device info sent with the request is consistent
// with what was stored during first binding (prevents fingerprint spoofing)
const validateFingerprintConsistency = async (fingerprint, req) => {
  if (!fingerprint) return { valid: false, reason: "missing" };

  try {
    const existing = await runQuery(
      `SELECT device_info FROM device_bindings
       WHERE device_fingerprint = $1 AND is_active = true
       LIMIT 1`,
      [fingerprint]
    );

    if (existing.rows.length === 0) return { valid: true, isNew: true };

    const stored = existing.rows[0].device_info || {};
    const current = {
      userAgent: req.headers["user-agent"] || "unknown",
      platform: req.body?.platform || req.headers["x-platform"] || null,
    };

    // Check UA consistency: same browser family expected
    // (User-Agent changes with updates, so compare loosely)
    if (stored.userAgent && current.userAgent) {
      const storedBrowser = extractBrowserFamily(stored.userAgent);
      const currentBrowser = extractBrowserFamily(current.userAgent);
      // Only flag mismatch when BOTH are recognized browser families
      // If either is null (unrecognized), skip this check to avoid false positives
      if (storedBrowser && currentBrowser && storedBrowser !== currentBrowser) {
        return { valid: false, reason: "browser_family_mismatch" };
      }
      // Flag if stored was a known browser but current is completely unrecognizable
      if (storedBrowser && !currentBrowser && current.userAgent !== "unknown") {
        return { valid: false, reason: "browser_family_unrecognized" };
      }
    }

    // Platform must match (mobile/desktop doesn't change)
    if (stored.platform && current.platform &&
        stored.platform !== current.platform &&
        stored.platform !== "null" && current.platform !== "null") {
      return { valid: false, reason: "platform_mismatch" };
    }

    return { valid: true, isNew: false };
  } catch {
    return { valid: true }; // Don't block on errors
  }
};

const extractBrowserFamily = (ua) => {
  if (!ua) return null;
  const lower = ua.toLowerCase();
  if (lower.includes("chrome") && !lower.includes("edg")) return "chrome";
  if (lower.includes("firefox")) return "firefox";
  if (lower.includes("safari") && !lower.includes("chrome")) return "safari";
  if (lower.includes("edg")) return "edge";
  if (lower.includes("opera") || lower.includes("opr")) return "opera";
  return null;
};

const extractClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
};

// ── Normalize phone number ───────────────────────────────────
const normalizePhone = (phone) => {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, "");
  // Indian numbers: strip leading 91 if present
  if (digits.length === 12 && digits.startsWith("91")) {
    const stripped = digits.slice(2);
    if (/^[6-9]\d{9}$/.test(stripped)) return stripped;
  }
  // Must be a valid 10-digit Indian mobile number
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  return null;
};

// --- OTP helpers for step-up verification ---
const hashSha256 = (value) =>
  crypto.createHash("sha256").update(String(value)).digest("hex");

const safeTextEqual = (a, b) => {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const verifyLoginOtp = async (phone, otp) => {
  const normalizedPhone = normalizePhone(phone);
  const phoneKey = normalizedPhone || String(phone || "").trim();
  const otpValue = String(otp || "").trim();

  if (!phoneKey) {
    return { valid: false, reason: "missing_phone" };
  }
  if (!otpValue) {
    return { valid: false, reason: "missing_otp" };
  }

  const verifyAttemptsKey = `OTP_VERIFY_ATTEMPTS:${phoneKey}`;
  const attempts = Number((await redisSession.get(verifyAttemptsKey)) || 0);
  if (attempts >= 5) {
    return { valid: false, reason: "rate_limited", retryAfter: 300 };
  }

  const storedOtpHash = await redisSession.get(`OTP:${phoneKey}`);
  const incomingOtpHash = hashSha256(otpValue);
  if (!storedOtpHash || !safeTextEqual(storedOtpHash, incomingOtpHash)) {
    const nextAttempts = await redisSession.incr(verifyAttemptsKey, 300);
    return {
      valid: false,
      reason: "invalid",
      attemptsRemaining: Math.max(0, 5 - Number(nextAttempts || 0)),
    };
  }

  await Promise.all([
    redisSession.del(`OTP:${phoneKey}`),
    redisSession.del(verifyAttemptsKey),
  ]);
  return { valid: true, phone: phoneKey };
};

// ── Flag a device for multi-account abuse ────────────────────
const flagDevice = async (fingerprint, reason, attemptedUserId, boundUserId, req) => {
  try {
    const ip = extractClientIp(req);
    const metadata = {
      userAgent: req.headers["user-agent"] || "unknown",
      timestamp: new Date().toISOString(),
      attemptedPhone: req.body?.identifier || req.body?.phone || null,
    };

    await runQuery(
      `INSERT INTO flagged_devices
        (device_fingerprint, reason, attempted_user_id, bound_user_id, ip_address,
         blocked_until, is_permanently_blocked, metadata)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '${FLAGGED_DEVICE_BLOCK_DAYS} days', FALSE, $6)
       ON CONFLICT (device_fingerprint, reason)
       DO UPDATE SET
         violation_count = flagged_devices.violation_count + 1,
         last_flagged_at = NOW(),
         attempted_user_id = $3,
         ip_address = $5,
         metadata = flagged_devices.metadata || $6,
         is_permanently_blocked = CASE
           WHEN flagged_devices.violation_count + 1 >= $7 THEN TRUE
           ELSE flagged_devices.is_permanently_blocked
         END,
         blocked_until = CASE
           WHEN flagged_devices.violation_count + 1 >= $7 THEN NULL
           ELSE NOW() + INTERVAL '${FLAGGED_DEVICE_BLOCK_DAYS} days'
         END`,
      [fingerprint, reason, attemptedUserId, boundUserId, ip,
       JSON.stringify(metadata), MULTI_ACCOUNT_FLAG_THRESHOLD]
    );

    logger.warn(`[DEVICE_FLAG] Device ${fingerprint.substring(0, 16)}... flagged: ${reason} (user ${attemptedUserId} tried, bound to ${boundUserId})`);
  } catch (err) {
    logger.error("[DEVICE_FLAG] Failed to flag:", err.message);
  }
};

// ── Check if device is flagged/blocked ───────────────────────
const isDeviceFlagged = async (fingerprint) => {
  try {
    const result = await runQuery(
      `SELECT reason, violation_count, is_permanently_blocked, blocked_until
       FROM flagged_devices
       WHERE device_fingerprint = $1
         AND (is_permanently_blocked = true OR blocked_until > NOW())
       ORDER BY violation_count DESC
       LIMIT 1`,
      [fingerprint]
    );

    if (result.rows.length > 0) {
      const flag = result.rows[0];
      return {
        flagged: true,
        permanent: flag.is_permanently_blocked,
        violations: flag.violation_count,
        reason: flag.reason,
      };
    }
    return { flagged: false };
  } catch (err) {
    logger.warn("[DEVICE_FLAG] Check failed:", err.message);
    return { flagged: false };
  }
};

// ── Log auth activity ────────────────────────────────────────
const logAuthActivity = async (userId, action, req, extraMetadata = {}) => {
  try {
    const ready = await ensureTablesExist();
    if (!ready) return;
    const fingerprint = extractDeviceFingerprint(req);
    const ip = extractClientIp(req);
    const ua = req.headers["user-agent"] || "unknown";
    const metadata = {
      ...extraMetadata,
      phone: req.body?.identifier || req.body?.phone || null,
    };
    await runQuery(
      `INSERT INTO auth_activity_log (user_id, device_fingerprint, action, ip_address, user_agent, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, fingerprint, action, ip, ua, JSON.stringify(metadata)]
    );
  } catch (err) {
    logger.warn("[AUTH_ACTIVITY] Failed to log:", err.message);
  }
};

// ── Check device binding (STRICT: permanent, 1 device = 1 account) ──
// Uses a database transaction with SELECT FOR UPDATE to prevent race conditions
// where two concurrent requests could both pass the check and create duplicate bindings.
const checkDeviceBinding = async (userId, req) => {
  if (!DEVICE_BINDING_ENABLED) return { allowed: true };

  const fingerprint = extractDeviceFingerprint(req);
  if (!fingerprint) {
    logger.warn("[DEVICE_BINDING] No device fingerprint provided for user:", userId);
    return {
      allowed: false,
      error: "Device identification required. Please update your app or enable browser features.",
      code: "DEVICE_FINGERPRINT_REQUIRED",
    };
  }

  let client;
  try {
    const ready = await ensureTablesExist();
    if (!ready) return { allowed: true };

    // ── Step 0: Validate fingerprint consistency (outside txn — read-only) ──
    const fpCheck = await validateFingerprintConsistency(fingerprint, req);
    if (!fpCheck.valid) {
      logger.warn(`[DEVICE_BINDING] Fingerprint consistency failed: ${fpCheck.reason} for user ${userId}`);
      await flagDevice(fingerprint, "fingerprint_inconsistency", userId, null, req);
      if (DEVICE_BINDING_STRICT) {
        return {
          allowed: false,
          error: "Device verification failed. Your device signature doesn't match our records.",
          code: "DEVICE_FINGERPRINT_INVALID",
        };
      }
      return {
        allowed: true,
        isNew: true,
        requireOtp: true,
        violation: fpCheck.reason || "fingerprint_inconsistency",
        bindingMode: "unbound",
      };
    }

    // ── Step 1: Check if device is flagged/blocked (outside txn — read-only) ──
    const flagStatus = await isDeviceFlagged(fingerprint);
    if (flagStatus.flagged) {
      const msg = flagStatus.permanent
        ? "This device has been permanently blocked due to suspicious activity. Contact support for assistance."
        : "This device is temporarily blocked due to suspicious activity. Please try again later or contact support.";
      return {
        allowed: false,
        error: msg,
        code: "DEVICE_BLOCKED",
      };
    }

    // ── Begin transaction for binding check + creation (prevents race conditions) ──
    client = await pool.connect();
    await client.query("BEGIN");

    // ── Step 2: Lock all rows for this fingerprint to prevent concurrent binding ──
    const existingBinding = await client.query(
      `SELECT user_id FROM device_bindings
       WHERE device_fingerprint = $1 AND is_active = true
       FOR UPDATE`,
      [fingerprint]
    );

    // Check if bound to a DIFFERENT user
    const otherUserBinding = existingBinding.rows.find(r => r.user_id !== userId);
    if (otherUserBinding) {
      await client.query("ROLLBACK");
      const boundUserId = otherUserBinding.user_id;
      logger.warn(`[DEVICE_BINDING] VIOLATION: Device ${fingerprint.substring(0, 16)}... bound to user ${boundUserId}, user ${userId} attempted login`);

      await flagDevice(fingerprint, "multi_account_attempt", userId, boundUserId, req);
      await logAuthActivity(userId, "multi_account_violation", req, {
        boundUserId,
        violation: "attempted_login_on_bound_device",
      });

      if (DEVICE_BINDING_STRICT) {
        return {
          allowed: false,
          error: "This device is permanently registered with another account. Each device can only be used with one MHub account. Contact support if you believe this is an error.",
          code: "DEVICE_ALREADY_BOUND",
        };
      }
      return {
        allowed: true,
        isNew: true,
        requireOtp: true,
        violation: "device_already_bound",
        bindingMode: "unbound",
        boundUserId,
      };
    }

    // ── Step 3: Check if already bound to THIS user ─────────
    const selfBinding = existingBinding.rows.find(r => r.user_id === userId);
    if (selfBinding) {
      await client.query(
        `UPDATE device_bindings SET last_seen_at = NOW(), ip_address = $3
         WHERE device_fingerprint = $1 AND user_id = $2 AND is_active = true`,
        [fingerprint, userId, extractClientIp(req)]
      );
      await client.query("COMMIT");
      return { allowed: true, isNew: false, bindingMode: "existing" };
    }

    // ── Step 4: New device — check device limit (within txn) ──
    let limitExceeded = false;
    const userDevices = await client.query(
      `SELECT COUNT(*) as count FROM device_bindings
       WHERE user_id = $1 AND is_active = true
       FOR UPDATE`,
      [userId]
    );

    const deviceCount = parseInt(userDevices.rows[0]?.count || "0", 10);
    if (deviceCount >= MAX_DEVICES_PER_USER) {
      limitExceeded = true;
      logger.warn(
        `[DEVICE_BINDING] User ${userId} exceeded max devices (${deviceCount}/${MAX_DEVICES_PER_USER}) — allowing temporary binding`
      );
    }

    // ── Step 5: Check for past bindings (even inactive) ─────
    const historicalBinding = await client.query(
      `SELECT user_id FROM device_bindings
       WHERE device_fingerprint = $1 AND user_id != $2
       LIMIT 1`,
      [fingerprint, userId]
    );

    if (historicalBinding.rows.length > 0) {
      await client.query("ROLLBACK");
      const historicalUserId = historicalBinding.rows[0].user_id;
      logger.warn(`[DEVICE_BINDING] HISTORICAL VIOLATION: Device ${fingerprint.substring(0, 16)}... was previously used by user ${historicalUserId}`);
      await flagDevice(fingerprint, "historical_multi_account", userId, historicalUserId, req);
      if (DEVICE_BINDING_STRICT) {
        return {
          allowed: false,
          error: "This device was previously used with a different account. Each device is permanently linked to one account. Contact support for assistance.",
          code: "DEVICE_PREVIOUSLY_BOUND",
        };
      }
      return {
        allowed: true,
        isNew: true,
        requireOtp: true,
        violation: "device_previously_bound",
        bindingMode: "unbound",
        historicalUserId,
      };
    }

    // ── Step 6: Bind this device to the user (permanent, within txn) ──
    const ip = extractClientIp(req);
    const deviceInfo = {
      userAgent: req.headers["user-agent"] || "unknown",
      platform: req.body?.platform || req.headers["x-platform"] || null,
      screenResolution: req.body?.screenResolution || null,
    };

    const isPermanent = !limitExceeded;
    await client.query(
      `INSERT INTO device_bindings (device_fingerprint, user_id, device_info, ip_address, is_permanent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (device_fingerprint, user_id) DO UPDATE
       SET is_active = true, last_seen_at = NOW(), ip_address = $4, device_info = $3, is_permanent = $5`,
      [fingerprint, userId, JSON.stringify(deviceInfo), ip, isPermanent]
    );

    await client.query("COMMIT");
    logger.info(
      `[DEVICE_BINDING] ${isPermanent ? "Permanently" : "Temporarily"} bound device ${fingerprint.substring(0, 16)}... to user ${userId}`
    );
    return {
      allowed: true,
      isNew: true,
      limitExceeded,
      bindingMode: limitExceeded ? "temporary" : "permanent",
    };
  } catch (err) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    logger.error("[DEVICE_BINDING] Check failed:", err.message);
    return { allowed: true };
  } finally {
    if (client) {
      try { client.release(); } catch {}
    }
  }
};

// ── Phone-Device Binding (WhatsApp-style) ────────────────────
// Uses transaction with FOR UPDATE to prevent race conditions on phone-device binding.
const checkPhoneDeviceBinding = async (phone, userId, req) => {
  if (!DEVICE_BINDING_ENABLED) return { allowed: true, requireOtp: false };

  const fingerprint = extractDeviceFingerprint(req);
  const normalizedPhone = normalizePhone(phone);
  if (!fingerprint || !normalizedPhone) return { allowed: true, requireOtp: false };

  let client;
  try {
    const ready = await ensureTablesExist();
    if (!ready) return { allowed: true, requireOtp: false };

    client = await pool.connect();
    await client.query("BEGIN");

    // Lock the device's phone binding row to prevent concurrent modification
    const existing = await client.query(
      `SELECT phone_number, user_id FROM device_phone_bindings
       WHERE device_fingerprint = $1 AND is_active = true
       FOR UPDATE
       LIMIT 1`,
      [fingerprint]
    );

    if (existing.rows.length > 0) {
      const boundPhone = existing.rows[0].phone_number;
      const boundUserId = existing.rows[0].user_id;

      if (boundPhone !== normalizedPhone) {
        await client.query("ROLLBACK");
        logger.warn(`[PHONE_DEVICE] Phone mismatch: device bound to ${boundPhone.slice(-4)}, attempted ${normalizedPhone.slice(-4)}`);
        await flagDevice(fingerprint, "phone_device_mismatch", userId, boundUserId, req);
        await logAuthActivity(userId, "phone_device_violation", req, {
          boundPhone: `****${boundPhone.slice(-4)}`,
          attemptedPhone: `****${normalizedPhone.slice(-4)}`,
        });
        if (DEVICE_BINDING_STRICT) {
          return {
            allowed: false,
            error: "This device is registered with a different phone number. Each device can only be used with the phone number that was originally verified on it.",
            code: "PHONE_DEVICE_MISMATCH",
          };
        }
        return {
          allowed: true,
          requireOtp: true,
          violation: "phone_device_mismatch",
          isExisting: true,
        };
      }

      // Same phone on same device — update last_verified_at
      await client.query(
        `UPDATE device_phone_bindings SET last_verified_at = NOW()
         WHERE device_fingerprint = $1 AND is_active = true`,
        [fingerprint]
      );
        await client.query("COMMIT");
        return { allowed: true, requireOtp: false, isExisting: true };
    }

    // No phone-device binding yet — lock phone's bindings on other devices
    const phoneOnOtherDevice = await client.query(
      `SELECT device_fingerprint FROM device_phone_bindings
       WHERE phone_number = $1 AND is_active = true AND device_fingerprint != $2
       FOR UPDATE`,
      [normalizedPhone, fingerprint]
    );

    if (phoneOnOtherDevice.rows.length > 0) {
      // Deactivate old device binding (like WhatsApp — login on new device logs out old)
      await client.query(
        `UPDATE device_phone_bindings
         SET is_active = false, deactivated_at = NOW(), deactivate_reason = 'new_device_login'
         WHERE phone_number = $1 AND is_active = true AND device_fingerprint != $2`,
        [normalizedPhone, fingerprint]
      );
      logger.info(`[PHONE_DEVICE] Phone ****${normalizedPhone.slice(-4)} moved to new device, old device deactivated`);
    }

    await client.query("COMMIT");
    return { allowed: true, requireOtp: true, isNew: true };
  } catch (err) {
    if (client) {
      try { await client.query("ROLLBACK"); } catch {}
    }
    logger.error("[PHONE_DEVICE] Check failed:", err.message);
    return { allowed: true, requireOtp: false };
  } finally {
    if (client) {
      try { client.release(); } catch {}
    }
  }
};

// ── Bind phone to device after OTP verification ──────────────
const bindPhoneToDevice = async (phone, userId, req) => {
  const fingerprint = extractDeviceFingerprint(req);
  const normalizedPhone = normalizePhone(phone);
  if (!fingerprint || !normalizedPhone) return;

  try {
    const ready = await ensureTablesExist();
    if (!ready) return;

    await runQuery(
      `INSERT INTO device_phone_bindings (device_fingerprint, phone_number, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (device_fingerprint)
       DO UPDATE SET phone_number = $2, user_id = $3, is_active = true,
                     verified_at = NOW(), last_verified_at = NOW(),
                     deactivated_at = NULL, deactivate_reason = NULL`,
      [fingerprint, normalizedPhone, userId]
    );

    logger.info(`[PHONE_DEVICE] Bound phone ****${normalizedPhone.slice(-4)} to device ${fingerprint.substring(0, 16)}... for user ${userId}`);
  } catch (err) {
    logger.error("[PHONE_DEVICE] Bind failed:", err.message);
  }
};

// ── Check login/logout abuse ─────────────────────────────────
const checkAuthAbuse = async (action, req) => {
  try {
    if (AUTH_RATE_LIMIT_BYPASS_DEV) {
      return { allowed: true, bypassed: true };
    }
    const ready = await ensureTablesExist();
    if (!ready) return { allowed: true };

    const fingerprint = extractDeviceFingerprint(req);
    const ip = extractClientIp(req);

    if (action === "login") {
      // Check if recently logged out (cooldown period)
      if (fingerprint) {
        const recentLogout = await runQuery(
          `SELECT created_at FROM auth_activity_log
           WHERE device_fingerprint = $1 AND action = 'logout'
           AND created_at > NOW() - INTERVAL '${LOGIN_COOLDOWN_AFTER_LOGOUT_SECONDS} seconds'
           ORDER BY created_at DESC LIMIT 1`,
          [fingerprint]
        );
        if (recentLogout.rows.length > 0) {
          return {
            allowed: false,
            error: `Please wait ${LOGIN_COOLDOWN_AFTER_LOGOUT_SECONDS} seconds after logging out before logging in again.`,
            code: "LOGIN_COOLDOWN",
            retryAfter: LOGIN_COOLDOWN_AFTER_LOGOUT_SECONDS,
          };
        }
      }

      // Check login frequency by IP
      const loginCountByIp = await runQuery(
        `SELECT COUNT(*) as count FROM auth_activity_log
         WHERE ip_address = $1 AND action = 'login'
         AND created_at > NOW() - INTERVAL '1 hour'`,
        [ip]
      );
      if (parseInt(loginCountByIp.rows[0]?.count || "0", 10) >= MAX_LOGINS_PER_HOUR) {
        return {
          allowed: false,
          error: "Too many login attempts from this network. Please try again later.",
          code: "LOGIN_ABUSE_IP",
          retryAfter: 3600,
        };
      }

      // Check login frequency by device
      if (fingerprint) {
        const loginCountByDevice = await runQuery(
          `SELECT COUNT(*) as count FROM auth_activity_log
           WHERE device_fingerprint = $1 AND action = 'login'
           AND created_at > NOW() - INTERVAL '1 hour'`,
          [fingerprint]
        );
        if (parseInt(loginCountByDevice.rows[0]?.count || "0", 10) >= MAX_LOGINS_PER_HOUR) {
          return {
            allowed: false,
            error: "Too many login attempts from this device. Please try again later.",
            code: "LOGIN_ABUSE_DEVICE",
            retryAfter: 3600,
          };
        }
      }

      // Check for multi-account attempts from same device
      if (fingerprint) {
        const distinctUsers = await runQuery(
          `SELECT COUNT(DISTINCT user_id) as count FROM auth_activity_log
           WHERE device_fingerprint = $1 AND action IN ('login', 'multi_account_violation')
           AND created_at > NOW() - INTERVAL '7 days'
           AND user_id IS NOT NULL`,
          [fingerprint]
        );
        if (parseInt(distinctUsers.rows[0]?.count || "0", 10) > 1) {
          return {
            allowed: false,
            error: "Multiple accounts detected on this device. Each device is restricted to one account.",
            code: "MULTI_ACCOUNT_DETECTED",
            retryAfter: 86400 * 7,
          };
        }
      }
    }

    // Check logout frequency
    if (action === "logout") {
      if (fingerprint) {
        const logoutCount = await runQuery(
          `SELECT COUNT(*) as count FROM auth_activity_log
           WHERE device_fingerprint = $1 AND action = 'logout'
           AND created_at > NOW() - INTERVAL '1 hour'`,
          [fingerprint]
        );
        if (parseInt(logoutCount.rows[0]?.count || "0", 10) >= MAX_LOGOUTS_PER_HOUR) {
          return {
            allowed: false,
            error: "Too many logout requests. Please try again later.",
            code: "LOGOUT_ABUSE",
            retryAfter: 3600,
          };
        }
      }
    }

    return { allowed: true };
  } catch (err) {
    logger.warn("[AUTH_ABUSE] Check failed:", err.message);
    return { allowed: true };
  }
};

// ── Check if user is switching accounts on same device ───────
const checkAccountSwitching = async (userId, req) => {
  if (!DEVICE_BINDING_ENABLED) return { allowed: true };

  const fingerprint = extractDeviceFingerprint(req);
  if (!fingerprint) return { allowed: true };

  try {
    const ready = await ensureTablesExist();
    if (!ready) return { allowed: true };

    // Check how many different users have logged in from this device (ALL TIME, not 24h)
    const allTimeUsers = await runQuery(
      `SELECT DISTINCT user_id FROM auth_activity_log
       WHERE device_fingerprint = $1 AND action = 'login'
       AND user_id IS NOT NULL`,
      [fingerprint]
    );

    const uniqueUsers = allTimeUsers.rows.map(r => r.user_id);

    // If more than 1 different user has EVER logged in from this device
    if (uniqueUsers.length > 0 && !uniqueUsers.includes(userId)) {
      const boundUserId = uniqueUsers[0];
      logger.warn(`[ACCOUNT_SWITCHING] Device ${fingerprint.substring(0, 16)}... permanently bound to user ${boundUserId}, user ${userId} attempted switch`);

      // Flag this device
      await flagDevice(fingerprint, "account_switching", userId, boundUserId, req);

      if (DEVICE_BINDING_STRICT) {
        return {
          allowed: false,
          error: "This device is permanently linked to another account. Account switching is not allowed. Contact support if you need to transfer your account.",
          code: "ACCOUNT_SWITCHING_BLOCKED",
        };
      }
      return {
        allowed: true,
        requireOtp: true,
        violation: "account_switching",
        boundUserId,
      };
    }

    return { allowed: true };
  } catch (err) {
    logger.warn("[ACCOUNT_SWITCHING] Check failed:", err.message);
    return { allowed: true };
  }
};

// ── Express Middleware: Pre-login device & phone check ────────
const deviceBindingPreLogin = async (req, res, next) => {
  if (!DEVICE_BINDING_ENABLED) return next();

  try {
    // Step 1: Check login abuse
    const abuseCheck = await checkAuthAbuse("login", req);
    if (!abuseCheck.allowed) {
      return res.status(429).json({
        error: abuseCheck.error,
        code: abuseCheck.code,
        retryAfter: abuseCheck.retryAfter || 60,
      });
    }

    // Step 2: Check if device is flagged/blocked
    const fingerprint = extractDeviceFingerprint(req);
    if (fingerprint) {
      const ready = await ensureTablesExist();
      if (ready) {
        const flagStatus = await isDeviceFlagged(fingerprint);
        if (flagStatus.flagged) {
          const msg = flagStatus.permanent
            ? "This device has been permanently blocked due to security violations. Contact support."
            : "This device is temporarily blocked. Please try again later or contact support.";
          return res.status(403).json({
            error: msg,
            code: "DEVICE_BLOCKED",
            permanent: flagStatus.permanent,
          });
        }
      }
    }

    // Step 3: Check phone-device binding (WhatsApp-style)
    const phone = req.body?.identifier || req.body?.phone || req.body?.mobile;
    if (phone && fingerprint) {
      const phoneCheck = await checkPhoneDeviceBinding(phone, null, req);
      if (!phoneCheck.allowed) {
        return res.status(403).json({
          error: phoneCheck.error,
          code: phoneCheck.code,
        });
      }

      // Mark that OTP is required for this login
      if (phoneCheck.requireOtp) {
        req._requireMandatoryOtp = true;
        req._isNewDeviceBinding = phoneCheck.isNew || false;
      }
      if (phoneCheck.violation) {
        req._bindingViolation = phoneCheck.violation;
      }
    }

    next();
  } catch (err) {
    logger.error("[DEVICE_BINDING_PRE] Error:", err.message);
    next();
  }
};

// ── Express Middleware: Pre-logout abuse check ────────────────
const logoutAbuseCheck = async (req, res, next) => {
  try {
    const abuseCheck = await checkAuthAbuse("logout", req);
    if (!abuseCheck.allowed) {
      return res.status(429).json({
        error: abuseCheck.error,
        code: abuseCheck.code,
        retryAfter: abuseCheck.retryAfter || 60,
      });
    }
    next();
  } catch (err) {
    logger.error("[LOGOUT_ABUSE] Error:", err.message);
    next();
  }
};

module.exports = {
  extractDeviceFingerprint,
  extractClientIp,
  normalizePhone,
  verifyLoginOtp,
  checkDeviceBinding,
  checkPhoneDeviceBinding,
  bindPhoneToDevice,
  checkAuthAbuse,
  checkAccountSwitching,
  logAuthActivity,
  flagDevice,
  isDeviceFlagged,
  deviceBindingPreLogin,
  logoutAbuseCheck,
  ensureTablesExist,
};
