const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { computeTrustScore } = require("./trustScoreService");
const {
  extractDeviceFingerprint,
  extractClientIp,
  ensureTablesExist: ensureDeviceTablesExist,
} = require("../middleware/deviceBinding");

const RISK_TABLE_NAME = "user_risk_states";
const DEFAULT_DEVICE_TRUST = 50;
const DEFAULT_USER_TRUST = 50;

let riskTablesChecked = false;
let riskTablesReady = false;

const RISK_LEVELS = new Set(["normal", "limited", "high", "frozen"]);

const clampScore = (value, min = 0, max = 100) => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
};

const normalizeUserId = (value) => {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const ensureRiskTables = async () => {
  if (riskTablesChecked) return riskTablesReady;
  try {
    const result = await runQuery(
      `SELECT to_regclass('public.${RISK_TABLE_NAME}') AS table_name`
    );
    const tableExists = Boolean(result.rows?.[0]?.table_name);
    if (!tableExists) {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS ${RISK_TABLE_NAME} (
          user_id TEXT PRIMARY KEY,
          status VARCHAR(20) NOT NULL DEFAULT 'normal',
          score INTEGER DEFAULT 0,
          reason TEXT,
          details JSONB DEFAULT '{}'::jsonb,
          last_device_fingerprint VARCHAR(512),
          last_ip_address VARCHAR(50),
          last_verified_at TIMESTAMPTZ,
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    }

    await runQuery(
      `ALTER TABLE ${RISK_TABLE_NAME} ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb`
    );
    await runQuery(
      `ALTER TABLE ${RISK_TABLE_NAME} ADD COLUMN IF NOT EXISTS last_device_fingerprint VARCHAR(512)`
    );
    await runQuery(
      `ALTER TABLE ${RISK_TABLE_NAME} ADD COLUMN IF NOT EXISTS last_ip_address VARCHAR(50)`
    );
    await runQuery(
      `ALTER TABLE ${RISK_TABLE_NAME} ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ`
    );
    await runQuery(
      `ALTER TABLE ${RISK_TABLE_NAME} ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ`
    );

    riskTablesChecked = true;
    riskTablesReady = true;
    return true;
  } catch (err) {
    logger.warn("[RISK_STATE] Table check failed:", err.message);
    riskTablesChecked = true;
    riskTablesReady = false;
    return false;
  }
};

const mapRiskRow = (row) => {
  if (!row) return null;
  return {
    user_id: row.user_id,
    status: String(row.status || "normal").toLowerCase(),
    score: Number(row.score || 0),
    reason: row.reason || "",
    details: row.details || {},
    last_device_fingerprint: row.last_device_fingerprint || null,
    last_ip_address: row.last_ip_address || null,
    last_verified_at: row.last_verified_at || null,
    expires_at: row.expires_at || null,
    updated_at: row.updated_at || null,
    created_at: row.created_at || null,
  };
};

const clearExpiredRiskState = async (userId) => {
  try {
    await runQuery(
      `UPDATE ${RISK_TABLE_NAME}
       SET status = 'normal',
           score = 0,
           reason = NULL,
           details = '{}'::jsonb,
           expires_at = NULL,
           updated_at = NOW()
       WHERE user_id::text = $1`,
      [userId]
    );
  } catch (err) {
    logger.warn("[RISK_STATE] Failed to clear expired risk state:", err.message);
  }
};

const getUserRiskState = async (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;
  const ready = await ensureRiskTables();
  if (!ready) return null;
  const result = await runQuery(
    `SELECT * FROM ${RISK_TABLE_NAME} WHERE user_id::text = $1 LIMIT 1`,
    [normalizedUserId]
  );
  const row = result.rows?.[0];
  if (!row) return null;
  const riskState = mapRiskRow(row);
  if (riskState?.expires_at) {
    const expiresAt = new Date(riskState.expires_at);
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      await clearExpiredRiskState(normalizedUserId);
      return {
        user_id: normalizedUserId,
        status: "normal",
        score: 0,
        reason: "",
        details: {},
      };
    }
  }
  return riskState;
};

const setUserRiskState = async (userId, update = {}) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;
  const ready = await ensureRiskTables();
  if (!ready) return null;

  const status = RISK_LEVELS.has(String(update.status || "normal").toLowerCase())
    ? String(update.status || "normal").toLowerCase()
    : "normal";
  const score = clampScore(update.score ?? 0);
  const reason = update.reason || null;
  const details = update.details || {};
  const lastDeviceFingerprint = update.last_device_fingerprint || null;
  const lastIpAddress = update.last_ip_address || null;
  const lastVerifiedAt = update.last_verified_at || null;
  const expiresAt = update.expires_at || null;

  await runQuery(
    `INSERT INTO ${RISK_TABLE_NAME}
      (user_id, status, score, reason, details, last_device_fingerprint, last_ip_address, last_verified_at, expires_at, created_at, updated_at)
     VALUES
      ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, NOW(), NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
      status = EXCLUDED.status,
      score = EXCLUDED.score,
      reason = EXCLUDED.reason,
      details = EXCLUDED.details,
      last_device_fingerprint = EXCLUDED.last_device_fingerprint,
      last_ip_address = EXCLUDED.last_ip_address,
      last_verified_at = EXCLUDED.last_verified_at,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()`,
    [
      normalizedUserId,
      status,
      score,
      reason,
      JSON.stringify(details),
      lastDeviceFingerprint,
      lastIpAddress,
      lastVerifiedAt,
      expiresAt,
    ]
  );

  return {
    user_id: normalizedUserId,
    status,
    score,
    reason: reason || "",
    details,
    last_device_fingerprint: lastDeviceFingerprint,
    last_ip_address: lastIpAddress,
    last_verified_at: lastVerifiedAt,
    expires_at: expiresAt,
  };
};

const computeDeviceTrustScore = async (userId, fingerprint) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || !fingerprint) return DEFAULT_DEVICE_TRUST;

  try {
    const deviceTablesReady = await ensureDeviceTablesExist();
    if (!deviceTablesReady) return DEFAULT_DEVICE_TRUST;

    const [activityResult, bindingResult] = await Promise.all([
      runQuery(
        `SELECT COUNT(*)::int AS login_count
         FROM auth_activity_log
         WHERE user_id::text = $1
           AND device_fingerprint = $2
           AND action IN ('login', 'login_otp')
           AND created_at >= NOW() - INTERVAL '30 days'`,
        [normalizedUserId, fingerprint]
      ),
      runQuery(
        `SELECT bound_at, last_seen_at
         FROM device_bindings
         WHERE user_id::text = $1
           AND device_fingerprint = $2
           AND is_active = true
         LIMIT 1`,
        [normalizedUserId, fingerprint]
      ),
    ]);

    const loginCount = Number(activityResult.rows?.[0]?.login_count || 0);
    let score = 30;
    if (loginCount >= 8) score = 90;
    else if (loginCount >= 4) score = 75;
    else if (loginCount >= 2) score = 60;
    else if (loginCount === 1) score = 45;

    const binding = bindingResult.rows?.[0];
    if (binding?.bound_at) {
      const boundAt = new Date(binding.bound_at);
      if (!Number.isNaN(boundAt.getTime())) {
        const days = (Date.now() - boundAt.getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 30) score += 10;
      }
    }
    if (binding?.last_seen_at) {
      const lastSeen = new Date(binding.last_seen_at);
      if (!Number.isNaN(lastSeen.getTime())) {
        const days = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24);
        if (days <= 7) score += 5;
      }
    }

    return clampScore(score, 0, 100);
  } catch (err) {
    logger.warn("[RISK_STATE] Device trust computation failed:", err.message);
    return DEFAULT_DEVICE_TRUST;
  }
};

const computeCompositeTrust = (userTrustScore, deviceTrustScore) => {
  const userScore = Number.isFinite(userTrustScore) ? userTrustScore : DEFAULT_USER_TRUST;
  const deviceScore = Number.isFinite(deviceTrustScore)
    ? deviceTrustScore
    : DEFAULT_DEVICE_TRUST;
  return clampScore(userScore * 0.7 + deviceScore * 0.3);
};

const getLastLoginIp = async (userId) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;
  try {
    const result = await runQuery(
      `SELECT last_login_ip FROM users WHERE user_id::text = $1 LIMIT 1`,
      [normalizedUserId]
    );
    const raw = result.rows?.[0]?.last_login_ip || null;
    return raw ? String(raw) : null;
  } catch (err) {
    logger.warn("[RISK_STATE] Failed to read last login IP:", err.message);
    return null;
  }
};

const evaluateLoginRisk = async ({ userId, req, bindingResult } = {}) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;

  const existingRisk = await getUserRiskState(normalizedUserId);
  if (existingRisk?.status === "frozen") {
    return {
      status: "frozen",
      score: existingRisk.score || 100,
      reason: existingRisk.reason || "account_frozen",
      stepUpRequired: false,
      signals: { frozen: true },
      existingRisk,
    };
  }

  const fingerprint = extractDeviceFingerprint(req);
  const ipAddress = extractClientIp(req);
  const lastLoginIp = await getLastLoginIp(normalizedUserId);
  const vpnDetected =
    Boolean(req?._vpnDetected) ||
    String(req?.vpnRisk || "").toLowerCase() === "blocked";

  const isNewDevice = Boolean(bindingResult?.isNew) || Boolean(req?._isNewDeviceBinding);
  const deviceLimitExceeded = Boolean(bindingResult?.limitExceeded);
  const isNewIp = Boolean(lastLoginIp && ipAddress && lastLoginIp !== ipAddress);
  const bindingViolation = bindingResult?.violation || req?._bindingViolation || null;
  const bindingRequiresOtp =
    Boolean(bindingResult?.requireOtp) || Boolean(req?._requireMandatoryOtp);

  const userTrustScore = (await computeTrustScore(normalizedUserId))?.score ?? DEFAULT_USER_TRUST;
  const deviceTrustScore = await computeDeviceTrustScore(normalizedUserId, fingerprint);
  const compositeTrustScore = computeCompositeTrust(userTrustScore, deviceTrustScore);

  let riskScore = 100 - compositeTrustScore;
  const reasons = [];

  if (isNewDevice) {
    riskScore += 15;
    reasons.push("new_device");
  }
  if (isNewIp) {
    riskScore += 10;
    reasons.push("new_ip");
  }
  if (vpnDetected) {
    riskScore += 25;
    reasons.push("vpn_detected");
  }
  if (deviceLimitExceeded) {
    riskScore += 10;
    reasons.push("device_limit_exceeded");
  }
  if (bindingViolation) {
    riskScore += 20;
    reasons.push(`binding_${bindingViolation}`);
  }

  riskScore = clampScore(riskScore);

  let status = "normal";
  if (bindingViolation && (vpnDetected || isNewDevice || isNewIp)) {
    status = "high";
  } else if (vpnDetected && isNewDevice) {
    status = "high";
  } else if (isNewDevice && isNewIp) {
    status = "limited";
  } else if (deviceLimitExceeded) {
    status = "limited";
  } else if (bindingViolation) {
    status = "limited";
  }

  return {
    status,
    score: riskScore,
    reason: reasons.join(","),
    stepUpRequired: bindingRequiresOtp || isNewDevice || isNewIp || vpnDetected,
    signals: {
      new_device: isNewDevice,
      new_ip: isNewIp,
      vpn_detected: vpnDetected,
      device_limit_exceeded: deviceLimitExceeded,
      binding_violation: bindingViolation,
    },
    trust: {
      user: userTrustScore,
      device: deviceTrustScore,
      composite: compositeTrustScore,
    },
    fingerprint,
    ipAddress,
  };
};

const freezeUserForComplaint = async (userId, context = {}) => {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;

  const details = {
    source: "complaint",
    complaint_id: context.complaintId || null,
    post_id: context.postId || null,
    severity: context.severity || null,
    actor_id: context.actorId || null,
  };

  return setUserRiskState(normalizedUserId, {
    status: "frozen",
    score: 100,
    reason: "complaint_freeze",
    details,
    expires_at: null,
  });
};

module.exports = {
  getUserRiskState,
  setUserRiskState,
  evaluateLoginRisk,
  freezeUserForComplaint,
  computeDeviceTrustScore,
  computeCompositeTrust,
};
