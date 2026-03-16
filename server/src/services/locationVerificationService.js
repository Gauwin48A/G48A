const crypto = require("crypto");
const axios = require("axios");
const geoip = require("geoip-lite");
const requestIp = require("request-ip");
const pool = require("../config/db");
const logger = require("../utils/logger");
const redisSession = require("../config/redisSession");

const DB_QUERY_TIMEOUT_MS =
  Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

const runQuery = (text, values = []) =>
  pool.query({ text, values, query_timeout: DB_QUERY_TIMEOUT_MS });

const parseBooleanEnv = (rawValue, fallback) => {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    return fallback;
  }
  const normalized = String(rawValue).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseNumberEnv = (rawValue, fallback) => {
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const CONFIG = {
  maxAccuracyMetres: parseNumberEnv(process.env.MAX_ACCURACY_METRES, 100),
  maxAgeMs: parseNumberEnv(process.env.LOCATION_MAX_AGE_MS, 10_000),
  targetRadiusMetres: parseNumberEnv(process.env.TARGET_RADIUS_METRES, 10),
  radiusToleranceMetres: parseNumberEnv(process.env.RADIUS_TOLERANCE_METRES, 5),
  ipMismatchKm: parseNumberEnv(process.env.IP_MISMATCH_KM, 300),
  wifiMismatchM: parseNumberEnv(process.env.WIFI_MISMATCH_M, 200),
  cellMismatchM: parseNumberEnv(process.env.CELL_MISMATCH_M, 500),
  maxRealisticSpeedMs: parseNumberEnv(
    process.env.MAX_REALISTIC_SPEED_MS,
    139,
  ),
  allowThreshold: parseNumberEnv(process.env.FRAUD_ALLOW_THRESHOLD, 80),
  reviewThreshold: parseNumberEnv(process.env.FRAUD_REVIEW_THRESHOLD, 60),
  blockThreshold: parseNumberEnv(process.env.FRAUD_BLOCK_THRESHOLD, 40),
  requireSignature: parseBooleanEnv(
    process.env.LOCATION_REQUIRE_SIGNATURE,
    Boolean(
      process.env.LOCATION_HMAC_SECRET || process.env.LOCATION_SIGNATURE_SECRET,
    ),
  ),
  signatureSecret:
    process.env.LOCATION_HMAC_SECRET ||
    process.env.LOCATION_SIGNATURE_SECRET ||
    "",
  googleGeoApiKey: process.env.GOOGLE_GEOLOCATION_API_KEY || "",
  openCellIdApiKey: process.env.OPENCELLID_API_KEY || "",
  wifiLookupTimeoutMs: parseNumberEnv(
    process.env.WIFI_LOOKUP_TIMEOUT_MS,
    3500,
  ),
  cellLookupTimeoutMs: parseNumberEnv(
    process.env.CELL_LOOKUP_TIMEOUT_MS,
    3500,
  ),
};

class LocationVerificationError extends Error {
  constructor(message, status = 400, code = "LOCATION_VERIFICATION_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let schemaReadyPromise = null;

const ensureLocationVerificationSchema = async () => {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    try {
      await runQuery("CREATE EXTENSION IF NOT EXISTS postgis");
      await runQuery("CREATE EXTENSION IF NOT EXISTS postgis_topology");
      await runQuery("CREATE EXTENSION IF NOT EXISTS pgcrypto");

      await runQuery(`
        CREATE TABLE IF NOT EXISTS seller_locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(64) NOT NULL,
          location GEOGRAPHY(POINT, 4326) NOT NULL,
          accuracy FLOAT,
          trust_score INTEGER DEFAULT 0,
          fraud_score INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await runQuery(`
        CREATE TABLE IF NOT EXISTS user_location_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(64) NOT NULL,
          latitude DOUBLE PRECISION NOT NULL,
          longitude DOUBLE PRECISION NOT NULL,
          accuracy FLOAT,
          device_id VARCHAR(128),
          ip_address INET,
          trust_score INTEGER,
          fraud_score INTEGER,
          fraud_flags TEXT[],
          timestamp TIMESTAMPTZ NOT NULL
        )
      `);

      await runQuery(`
        CREATE TABLE IF NOT EXISTS fraud_events (
          event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR(64) NOT NULL,
          fraud_type VARCHAR(64),
          fraud_score INTEGER,
          details JSONB,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_seller_location_gist ON seller_locations USING GIST (location)",
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_user_location_events_user_id ON user_location_events (user_id)",
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_user_location_events_device_id ON user_location_events (device_id)",
      );
      await runQuery(
        "CREATE INDEX IF NOT EXISTS idx_fraud_events_user_id ON fraud_events (user_id)",
      );
    } catch (error) {
      logger.warn("[LocationVerification] Schema provisioning skipped", {
        message: error.message,
      });
      return false;
    }
  })();

  return schemaReadyPromise;
};

const stableStringify = (value) => {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys
    .filter((key) => value[key] !== undefined)
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(",")}}`;
};

const buildSignaturePayload = (payload) => {
  if (!payload || typeof payload !== "object") return {};
  const { signature, ...rest } = payload;
  return rest;
};

const computeSignature = (payload, secret) => {
  if (!secret) return "";
  const canonical = stableStringify(buildSignaturePayload(payload));
  return crypto.createHmac("sha256", secret).update(canonical).digest("hex");
};

const SIGNATURE_MAX_AGE_MS = 60 * 1000;
// In-memory fallback for when Redis is unavailable
const localNonces = new Map();
const NONCE_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const NONCE_REDIS_PREFIX = "loc:nonce:";
const NONCE_TTL_SECONDS = Math.ceil((SIGNATURE_MAX_AGE_MS * 2) / 1000);

// Clean up local fallback nonces periodically
setInterval(() => {
  const cutoff = Date.now() - SIGNATURE_MAX_AGE_MS * 2;
  for (const [nonce, timestamp] of localNonces) {
    if (timestamp < cutoff) localNonces.delete(nonce);
  }
}, NONCE_CLEANUP_INTERVAL_MS).unref();

const hasNonce = async (nonce) => {
  if (redisSession.isRedisAvailable()) {
    const val = await redisSession.get(`${NONCE_REDIS_PREFIX}${nonce}`);
    return val !== null && val !== undefined;
  }
  return localNonces.has(nonce);
};

const storeNonce = async (nonce, signedAt) => {
  if (redisSession.isRedisAvailable()) {
    await redisSession.set(`${NONCE_REDIS_PREFIX}${nonce}`, String(signedAt), NONCE_TTL_SECONDS);
  } else {
    localNonces.set(nonce, signedAt);
  }
};

const verifySignature = async (payload, signature, secret) => {
  if (!secret) return true;
  if (!signature) return false;

  // Check nonce freshness to prevent replay attacks
  const signedAt = Number(payload?._signed_at);
  const nonce = String(payload?._nonce || "");
  if (nonce && Number.isFinite(signedAt)) {
    const ageMs = Date.now() - signedAt;
    if (ageMs > SIGNATURE_MAX_AGE_MS || ageMs < -30000) {
      logger.warn("[LocationVerification] Signature timestamp too old or in future", { ageMs });
      return false;
    }
    if (await hasNonce(nonce)) {
      logger.warn("[LocationVerification] Replay detected — nonce already used");
      return false;
    }
    await storeNonce(nonce, signedAt);
  }

  const expected = computeSignature(payload, secret);
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(String(signature || ""));
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
};

const toFiniteNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const isValidCoordinate = (latitude, longitude) =>
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const parseTimestamp = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const EARTH_RADIUS_M = 6371000;
const haversineDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const normalizeIp = (rawIp) => {
  const value = String(rawIp || "").split(",")[0].trim();
  if (!value) return "";
  if (value.startsWith("::ffff:")) {
    return value.replace("::ffff:", "");
  }
  return value;
};

const isPrivateOrLocalIp = (ip) => {
  const normalized = normalizeIp(ip);
  if (!normalized) return true;
  if (
    normalized === "::1" ||
    normalized === "127.0.0.1" ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    normalized.startsWith("169.254.") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  ) {
    return true;
  }
  const octets = normalized.split(".").map((part) => Number(part));
  if (octets.length === 4 && octets.every((part) => Number.isFinite(part))) {
    const [a, b] = octets;
    if (a === 172 && b >= 16 && b <= 31) return true;
  }
  return false;
};

const resolveIpLocation = (req, payload) => {
  const explicitIp = payload?.ip_address || payload?.ipAddress || "";
  const rawIp = explicitIp || requestIp.getClientIp(req);
  const ip = normalizeIp(rawIp);
  if (!ip || isPrivateOrLocalIp(ip)) {
    return null;
  }
  const geo = geoip.lookup(ip);
  if (!geo || !Array.isArray(geo.ll)) {
    return null;
  }
  return {
    ip,
    latitude: geo.ll[0],
    longitude: geo.ll[1],
    city: geo.city || null,
    region: geo.region || null,
    country: geo.country || null,
    timezone: geo.timezone || null,
  };
};

const fetchWifiLocation = async (bssids = []) => {
  const rawList = Array.isArray(bssids) ? bssids : [bssids];
  if (!CONFIG.googleGeoApiKey || !rawList.length) {
    return null;
  }
  const wifiAccessPoints = rawList
    .map((bssid) => String(bssid || "").trim())
    .filter(Boolean)
    .map((bssid) => ({ macAddress: bssid }));
  if (!wifiAccessPoints.length) return null;

  const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${CONFIG.googleGeoApiKey}`;
  const response = await axios.post(
    url,
    { wifiAccessPoints },
    { timeout: CONFIG.wifiLookupTimeoutMs },
  );
  const location = response?.data?.location || null;
  if (!location) return null;
  return {
    latitude: Number(location.lat),
    longitude: Number(location.lng),
    accuracy: Number(response?.data?.accuracy) || null,
  };
};

const fetchCellLocation = async (cellInfo = {}) => {
  if (!CONFIG.openCellIdApiKey || !cellInfo) return null;
  const mcc = String(cellInfo.mcc || "").trim();
  const mnc = String(cellInfo.mnc || "").trim();
  const lac = String(cellInfo.lac || "").trim();
  const cid = String(cellInfo.cid || cellInfo.cell_id || "").trim();
  if (!mcc || !mnc || !lac || !cid) return null;

  const url = `https://opencellid.org/cell/get?key=${CONFIG.openCellIdApiKey}&mcc=${mcc}&mnc=${mnc}&lac=${lac}&cellid=${cid}&format=json`;
  const response = await axios.get(url, {
    timeout: CONFIG.cellLookupTimeoutMs,
  });
  const data = response?.data || null;
  if (!data || data.lat === undefined || data.lon === undefined) return null;
  return {
    latitude: Number(data.lat),
    longitude: Number(data.lon),
    accuracy: Number(data.range) || null,
  };
};

const loadPreviousLocationEvent = async ({ userId, deviceId }) => {
  if (!userId) return null;
  try {
    const result = await runQuery(
      `
        SELECT latitude, longitude, timestamp, device_id
        FROM user_location_events
        WHERE user_id = $1
        ORDER BY timestamp DESC
        LIMIT 1
      `,
      [userId],
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    if (deviceId && row.device_id && row.device_id !== deviceId) {
      return row;
    }
    return row;
  } catch (error) {
    logger.warn("[LocationVerification] Failed to load previous location", {
      message: error.message,
    });
    return null;
  }
};

const recordLocationEvent = async ({
  userId,
  latitude,
  longitude,
  accuracy,
  deviceId,
  ipAddress,
  trustScore,
  fraudScore,
  fraudFlags,
  timestamp,
}) => {
  try {
    await runQuery(
      `
        INSERT INTO user_location_events
          (user_id, latitude, longitude, accuracy, device_id, ip_address, trust_score, fraud_score, fraud_flags, timestamp)
        VALUES
          ($1, $2, $3, $4, $5, $6::inet, $7, $8, $9, $10)
      `,
      [
        userId,
        latitude,
        longitude,
        accuracy,
        deviceId || null,
        ipAddress || null,
        trustScore,
        fraudScore,
        fraudFlags && fraudFlags.length ? fraudFlags : null,
        new Date(timestamp),
      ],
    );
  } catch (error) {
    logger.warn("[LocationVerification] Failed to persist location event", {
      message: error.message,
    });
  }
};

const recordFraudEvent = async ({
  userId,
  fraudScore,
  fraudFlags,
  details,
}) => {
  if (!userId || !fraudFlags?.length) return;
  try {
    const fraudType = fraudFlags.length === 1 ? fraudFlags[0] : "MULTI_FLAG";
    await runQuery(
      `
        INSERT INTO fraud_events (user_id, fraud_type, fraud_score, details, timestamp)
        VALUES ($1, $2, $3, $4::jsonb, NOW())
      `,
      [userId, fraudType, fraudScore, JSON.stringify(details || {})],
    );
  } catch (error) {
    logger.warn("[LocationVerification] Failed to persist fraud event", {
      message: error.message,
    });
  }
};

const upsertSellerLocation = async ({
  userId,
  latitude,
  longitude,
  accuracy,
  trustScore,
  fraudScore,
}) => {
  if (!userId) return null;
  try {
    await runQuery(
      `
        UPDATE seller_locations
        SET is_active = false, updated_at = NOW()
        WHERE user_id = $1 AND is_active = true
      `,
      [userId],
    );
    const result = await runQuery(
      `
        INSERT INTO seller_locations
          (user_id, location, accuracy, trust_score, fraud_score, is_active, created_at, updated_at)
        VALUES
          ($1, ST_SetSRID(ST_MakePoint($3, $2), 4326)::geography, $4, $5, $6, true, NOW(), NOW())
        RETURNING id
      `,
      [userId, latitude, longitude, accuracy, trustScore, fraudScore],
    );
    return result.rows[0]?.id || null;
  } catch (error) {
    logger.warn("[LocationVerification] Failed to upsert seller location", {
      message: error.message,
    });
    return null;
  }
};

const resolveRadiusTarget = async ({
  latitude,
  longitude,
  targetUserId,
  targetLat,
  targetLng,
  effectiveRadius,
}) => {
  if (
    Number.isFinite(targetLat) &&
    Number.isFinite(targetLng) &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  ) {
    const distance = haversineDistanceMeters(
      latitude,
      longitude,
      targetLat,
      targetLng,
    );
    return {
      distanceMetres: distance,
      radiusVerified: distance <= effectiveRadius,
      targetUserId: targetUserId || null,
    };
  }

  if (!targetUserId) {
    return null;
  }

  try {
    const result = await runQuery(
      `
        SELECT
          id,
          user_id,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
          ) AS distance_metres,
          ST_DWithin(
            location,
            ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
            $3
          ) AS within_radius
        FROM seller_locations
        WHERE user_id = $4 AND is_active = true
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [latitude, longitude, effectiveRadius, targetUserId],
    );
    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
      distanceMetres: Number(row.distance_metres),
      radiusVerified: Boolean(row.within_radius),
      targetUserId: row.user_id,
      sellerLocationId: row.id,
    };
  } catch (error) {
    logger.warn("[LocationVerification] Radius lookup failed", {
      message: error.message,
    });
    return null;
  }
};

const resolveIntegrityVerdict = (payload) => {
  const integrity = payload?.play_integrity || payload?.integrity || null;
  if (!integrity) return null;
  if (typeof integrity === "boolean") return integrity;
  if (typeof integrity?.meets_device_integrity === "boolean") {
    return integrity.meets_device_integrity;
  }
  if (typeof integrity?.meets_basic_integrity === "boolean") {
    return integrity.meets_basic_integrity;
  }
  if (typeof integrity?.passed === "boolean") return integrity.passed;
  const verdict = String(integrity?.verdict || "").toUpperCase();
  if (!verdict) return null;
  if (verdict.includes("MEETS_DEVICE_INTEGRITY")) return true;
  if (verdict.includes("MEETS_BASIC_INTEGRITY")) return true;
  if (verdict.includes("NO_BASIC_INTEGRITY")) return false;
  return null;
};

const evaluateTrustDecision = (trustScore) => {
  if (trustScore >= CONFIG.allowThreshold) {
    return { decision: "ALLOW", classification: "TRUSTED", review: false };
  }
  if (trustScore >= CONFIG.reviewThreshold) {
    return { decision: "ALLOW", classification: "MODERATE", review: true };
  }
  if (trustScore >= CONFIG.blockThreshold) {
    return { decision: "REVIEW", classification: "SUSPICIOUS", review: true };
  }
  return { decision: "BLOCK", classification: "BLOCKED", review: true };
};

const verifyLocationPayload = async ({ payload, req, userId }) => {
  await ensureLocationVerificationSchema();

  const rawLatitude = toFiniteNumber(payload.latitude ?? payload.lat);
  const rawLongitude = toFiniteNumber(payload.longitude ?? payload.lng);
  const accuracy = toFiniteNumber(payload.accuracy);
  const timestampMs = parseTimestamp(payload.timestamp);

  if (!isValidCoordinate(rawLatitude, rawLongitude)) {
    throw new LocationVerificationError(
      "Invalid latitude or longitude",
      400,
      "GPS_INVALID",
    );
  }

  // Enforce 7-digit coordinate precision to prevent false precision claims
  const latitude = Number(rawLatitude.toFixed(7));
  const longitude = Number(rawLongitude.toFixed(7));
  if (!Number.isFinite(accuracy)) {
    throw new LocationVerificationError("Missing GPS accuracy", 400, "ACCURACY_MISSING");
  }
  if (accuracy > CONFIG.maxAccuracyMetres) {
    throw new LocationVerificationError("Accuracy too low", 400, "LOW_ACCURACY");
  }
  if (!Number.isFinite(timestampMs)) {
    throw new LocationVerificationError("Missing timestamp", 400, "TIMESTAMP_MISSING");
  }
  const ageMs = Date.now() - timestampMs;
  if (ageMs > CONFIG.maxAgeMs) {
    throw new LocationVerificationError("Stale timestamp", 400, "STALE_TIMESTAMP");
  }

  const resolvedUserId = String(userId || payload.user_id || payload.userId || "")
    .trim();
  if (!resolvedUserId) {
    throw new LocationVerificationError("User authentication required", 401, "AUTH_REQUIRED");
  }

  const deviceId = String(payload.device_id || payload.deviceId || "").trim() || null;
  const fraudFlags = [];
  let fraudScore = 0;

  if (payload.is_mock || payload.isMock || payload.mocked) {
    fraudScore += 50;
    fraudFlags.push("MOCK_GPS_DETECTED");
  }

  const ipLocation = resolveIpLocation(req, payload);
  if (ipLocation?.latitude && ipLocation?.longitude) {
    const ipDistance = haversineDistanceMeters(
      latitude,
      longitude,
      ipLocation.latitude,
      ipLocation.longitude,
    );
    if (ipDistance / 1000 > CONFIG.ipMismatchKm) {
      fraudScore += 40;
      fraudFlags.push("IP_GPS_MISMATCH");
    }
  }

  let wifiLocation = null;
  try {
    wifiLocation = await fetchWifiLocation(payload.wifi_bssids || payload.wifiBssids);
  } catch (error) {
    logger.warn("[LocationVerification] WiFi lookup failed", {
      message: error.message,
    });
  }
  if (wifiLocation?.latitude && wifiLocation?.longitude) {
    const wifiDistance = haversineDistanceMeters(
      latitude,
      longitude,
      wifiLocation.latitude,
      wifiLocation.longitude,
    );
    if (wifiDistance > CONFIG.wifiMismatchM) {
      fraudScore += 30;
      fraudFlags.push("WIFI_MISMATCH");
    }
  }

  let cellLocation = null;
  try {
    cellLocation = await fetchCellLocation(payload.cell_info || payload.cellInfo);
  } catch (error) {
    logger.warn("[LocationVerification] Cell lookup failed", {
      message: error.message,
    });
  }
  if (cellLocation?.latitude && cellLocation?.longitude) {
    const cellDistance = haversineDistanceMeters(
      latitude,
      longitude,
      cellLocation.latitude,
      cellLocation.longitude,
    );
    if (cellDistance > CONFIG.cellMismatchM) {
      fraudScore += 25;
      fraudFlags.push("CELL_TOWER_MISMATCH");
    }
  }

  const integrityVerdict = resolveIntegrityVerdict(payload);
  if (integrityVerdict === false) {
    fraudScore += 30;
    fraudFlags.push("ROOT_DETECTED");
  }

  const previous = await loadPreviousLocationEvent({
    userId: resolvedUserId,
    deviceId,
  });
  if (previous?.latitude && previous?.longitude && previous?.timestamp) {
    const prevTimestamp = new Date(previous.timestamp).getTime();
    const timeDiffSeconds = (timestampMs - prevTimestamp) / 1000;
    if (timeDiffSeconds <= 0) {
      fraudScore += 50;
      fraudFlags.push("TELEPORT");
    } else {
      const distance = haversineDistanceMeters(
        latitude,
        longitude,
        Number(previous.latitude),
        Number(previous.longitude),
      );
      const speed = distance / timeDiffSeconds;
      if (speed > CONFIG.maxRealisticSpeedMs) {
        fraudScore += 50;
        fraudFlags.push("TELEPORT");
      }
    }
  }

  const trustScore = Math.max(0, 100 - fraudScore);
  const decisionInfo = evaluateTrustDecision(trustScore);

  const effectiveRadius =
    accuracy <= CONFIG.targetRadiusMetres
      ? CONFIG.targetRadiusMetres
      : CONFIG.targetRadiusMetres + CONFIG.radiusToleranceMetres;

  const targetUserId = String(
    payload.target_user_id || payload.targetUserId || payload.seller_id || "",
  ).trim();
  const targetLat = toFiniteNumber(
    payload.target_latitude ?? payload.target_lat ?? payload.targetLat,
  );
  const targetLng = toFiniteNumber(
    payload.target_longitude ?? payload.target_lng ?? payload.targetLng,
  );
  const radiusResult = await resolveRadiusTarget({
    latitude,
    longitude,
    targetUserId: targetUserId || null,
    targetLat,
    targetLng,
    effectiveRadius,
  });

  const shouldStoreSellerLocation =
    payload.store_seller_location === true ||
    payload.store_seller_location === "true" ||
    payload.update_seller_location === true ||
    payload.update_seller_location === "true" ||
    String(payload.role || "").toLowerCase() === "seller";
  let sellerLocationId = null;
  if (shouldStoreSellerLocation && trustScore >= CONFIG.allowThreshold) {
    sellerLocationId = await upsertSellerLocation({
      userId: resolvedUserId,
      latitude,
      longitude,
      accuracy,
      trustScore,
      fraudScore,
    });
  }

  await recordLocationEvent({
    userId: resolvedUserId,
    latitude,
    longitude,
    accuracy,
    deviceId,
    ipAddress: ipLocation?.ip || null,
    trustScore,
    fraudScore,
    fraudFlags,
    timestamp: timestampMs,
  });

  await recordFraudEvent({
    userId: resolvedUserId,
    fraudScore,
    fraudFlags,
    details: {
      ipLocation,
      wifiLocation,
      cellLocation,
      accuracy,
      decision: decisionInfo.decision,
      trustScore,
    },
  });

  return {
    location_valid: true,
    trust_score: trustScore,
    fraud_score: fraudScore,
    fraud_flags: fraudFlags,
    decision: decisionInfo.decision,
    classification: decisionInfo.classification,
    requires_review: decisionInfo.review,
    radius_verified: radiusResult?.radiusVerified ?? null,
    distance_metres: radiusResult?.distanceMetres ?? null,
    target_user_id: (radiusResult?.targetUserId ?? targetUserId) || null,
    seller_location_id: sellerLocationId || radiusResult?.sellerLocationId || null,
  };
};

module.exports = {
  verifyLocationPayload,
  ensureLocationVerificationSchema,
  verifySignature,
  LocationVerificationError,
  CONFIG,
};
