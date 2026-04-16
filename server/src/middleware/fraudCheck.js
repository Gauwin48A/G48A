const geoip = require("geoip-lite");
const requestIp = require("request-ip");

const DEFAULT_MAX_DISTANCE_KM = 300;

const parseBooleanEnv = (raw, fallback) => {
  if (raw === undefined || raw === null || raw === "") return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const parseNumberEnv = (raw, fallback) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const CONFIG = {
  checkTimezone: parseBooleanEnv(process.env.FRAUD_CHECK_TIMEZONE, true),
  checkDistance: parseBooleanEnv(process.env.FRAUD_CHECK_DISTANCE, true),
  checkPerfectCoords: parseBooleanEnv(process.env.FRAUD_CHECK_PERFECT_COORDS, true),
  logOnly: parseBooleanEnv(process.env.FRAUD_LOG_ONLY, false),
  bypassLocalhost: parseBooleanEnv(process.env.FRAUD_BYPASS_LOCALHOST, true),
  maxDistanceKm: parseNumberEnv(process.env.FRAUD_MAX_DISTANCE_KM, DEFAULT_MAX_DISTANCE_KM),
  blockUnknownPublicIp: parseBooleanEnv(process.env.FRAUD_BLOCK_UNKNOWN_PUBLIC_IP, true),
  requireGpsForAuth: parseBooleanEnv(process.env.FRAUD_REQUIRE_GPS_FOR_AUTH, false),
  requireTimezoneForAuth: parseBooleanEnv(process.env.FRAUD_REQUIRE_TIMEZONE_FOR_AUTH, false),
};

const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const isPerfectCoordinate = (coord) => {
  if (coord === undefined || coord === null) return false;
  if (!Number.isFinite(Number(coord))) return false;

  const numeric = Number(coord);
  if (numeric % 1 === 0) return true;

  const decimalPart = String(Math.abs(numeric)).split(".")[1] || "";
  if (decimalPart.length < 4) return true;

  const lastFour = decimalPart.slice(-4);
  return lastFour === "0000" || lastFour === "5000";
};

const getTimezoneRegion = (timezone) => {
  if (!timezone) return null;
  const parts = String(timezone).split("/");
  return parts[0] || null;
};

const toFiniteOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
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

const extractTimezone = (req) => {
  return (
    String(req.body?.timezone || "").trim() ||
    String(req.headers["x-timezone"] || "").trim() ||
    null
  );
};

const extractGpsCoordinates = (req) => {
  const latitude =
    req.body?.latitude ?? req.body?.lat ?? req.query?.latitude ?? req.query?.lat;
  const longitude =
    req.body?.longitude ?? req.body?.lng ?? req.query?.longitude ?? req.query?.lng;

  return {
    latitude: toFiniteOrNull(latitude),
    longitude: toFiniteOrNull(longitude),
  };
};

const detectProxyHeaderSignal = (req) => {
  const via = String(req.headers?.via || "").toLowerCase();
  const forwarded = String(req.headers?.forwarded || "").toLowerCase();

  const suspectTokens = ["proxy", "vpn", "tor", "socks", "tunnel", "anonymizer"];
  const combined = `${via} ${forwarded}`;

  return suspectTokens.some((token) => combined.includes(token));
};

const blockResponse = (code, message, extras = {}) => ({
  blocked: true,
  status: 403,
  payload: {
    error: "Security Alert",
    code,
    message,
    ...extras,
  },
});

const buildOutcome = ({
  blocked = false,
  status = 200,
  payload = null,
  risk = null,
  ipLocation = null,
  verified = false,
}) => ({
  blocked,
  status,
  payload,
  risk,
  ipLocation,
  verified,
});

/**
 * Compute a server-side location trust score (0–100).
 * This is entirely server-computed — no client-reported scores are trusted.
 */
const computeLocationTrustScore = ({ latitude, longitude, geo, timezone, spoofSignals, hasGps, hasTimezone, proxyDetected }) => {
  let score = 50; // Baseline

  // GPS present: +20
  if (hasGps) score += 20;
  else score -= 15;

  // Timezone present: +5
  if (hasTimezone) score += 5;

  // GeoIP resolved: +10
  if (geo) score += 10;
  else score -= 10;

  // GPS-IP distance within range: +10 (checked if both available)
  if (hasGps && geo?.ll) {
    const dist = getDistanceKm(latitude, longitude, geo.ll[0], geo.ll[1]);
    if (dist < 50) score += 10;
    else if (dist < 150) score += 5;
    else if (dist > 500) score -= 15;
  }

  // Timezone matches IP: +5
  if (hasTimezone && geo?.timezone && timezone === geo.timezone) {
    score += 5;
  }

  // Spoof signals: -10 each
  score -= (spoofSignals?.length || 0) * 10;

  // Proxy detected: -25
  if (proxyDetected) score -= 25;

  // Clamp 0–100
  return Math.max(0, Math.min(100, score));
};

const detectVpnOrSpoofRisk = (req, options = {}) => {
  const policy = {
    checkTimezone: options.checkTimezone ?? CONFIG.checkTimezone,
    checkDistance: options.checkDistance ?? CONFIG.checkDistance,
    checkPerfectCoords: options.checkPerfectCoords ?? CONFIG.checkPerfectCoords,
    bypassLocalhost: options.bypassLocalhost ?? CONFIG.bypassLocalhost,
    maxDistanceKm: options.maxDistanceKm ?? CONFIG.maxDistanceKm,
    blockUnknownPublicIp: options.blockUnknownPublicIp ?? CONFIG.blockUnknownPublicIp,
    requireGps: options.requireGps ?? false,
    requireTimezone: options.requireTimezone ?? false,
  };

  const { latitude, longitude } = extractGpsCoordinates(req);
  const timezone = extractTimezone(req);

  const rawIp = requestIp.getClientIp(req);
  const clientIp = normalizeIp(rawIp);

  if (policy.bypassLocalhost && isPrivateOrLocalIp(clientIp)) {
    return buildOutcome({
      verified: true,
      risk: { level: "none", reason: "private_or_local_ip" },
      ipLocation: {
        ip: clientIp,
        city: "localhost",
        region: "local",
        country: "local",
        timezone: timezone || null,
        ll: [latitude, longitude],
      },
    });
  }

  const geo = geoip.lookup(clientIp);
  const ipLocation = geo
    ? {
        ip: clientIp,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        timezone: geo.timezone,
        ll: geo.ll,
      }
    : {
        ip: clientIp,
        city: null,
        region: null,
        country: null,
        timezone: null,
        ll: null,
      };

  if (!geo && policy.blockUnknownPublicIp) {
    return {
      ...blockResponse(
        "UNKNOWN_NETWORK",
        "Unable to verify your network location. Please disable VPN/proxy and retry.",
      ),
      risk: { level: "high", reason: "unknown_public_ip" },
      ipLocation,
      verified: false,
    };
  }

  if (policy.requireGps && (latitude === null || longitude === null)) {
    return {
      ...blockResponse(
        "GPS_REQUIRED",
        "GPS location is required for secure access. Enable location and retry.",
      ),
      risk: { level: "high", reason: "gps_missing" },
      ipLocation,
      verified: false,
    };
  }

  if (policy.requireTimezone && !timezone) {
    return {
      ...blockResponse(
        "TIMEZONE_REQUIRED",
        "Timezone is required for secure access. Enable automatic date/time settings.",
      ),
      risk: { level: "medium", reason: "timezone_missing" },
      ipLocation,
      verified: false,
    };
  }

  // ── Server-side GPS quality analysis ─────────────────────
  // NOTE: We do NOT trust any client-reported flags (isMock, trust_score).
  // All spoof detection is computed server-side from raw GPS data.
  if (latitude !== null && longitude !== null) {
    const spoofSignals = [];

    // 1. Accuracy analysis: impossibly precise (<0.5m) = fake GPS app
    // Professional survey GPS achieves ~0.5-1m; consumer GPS ≥3m
    const gpsAccuracy = toFiniteOrNull(req.body?.accuracy ?? req.body?.locationAccuracy);
    if (gpsAccuracy !== null && gpsAccuracy > 0 && gpsAccuracy < 0.5) {
      spoofSignals.push("impossible_accuracy");
    }

    // 2. Altitude analysis: altitude exactly 0 is only suspicious WITH precise accuracy
    // Many legitimate locations are at sea level, so this is a weak signal
    const altitude = toFiniteOrNull(req.body?.altitude);
    if (altitude !== null && altitude === 0 && gpsAccuracy !== null && gpsAccuracy < 3) {
      spoofSignals.push("zero_altitude_precise");
    }

    // 3. Speed analysis: if speed is provided and unrealistic (>300 km/h = 83 m/s)
    const speed = toFiniteOrNull(req.body?.speed);
    if (speed !== null && speed > 83) {
      spoofSignals.push("unrealistic_speed");
    }

    // 4. Coordinate decimal analysis: fewer than 4 decimal places = likely spoofed
    const latStr = String(Math.abs(latitude)).split(".")[1] || "";
    const lngStr = String(Math.abs(longitude)).split(".")[1] || "";
    if (latStr.length < 4 && lngStr.length < 4) {
      spoofSignals.push("low_precision_coords");
    }

    // 5. Repeating decimal pattern detection
    if (latStr.length >= 4) {
      const lastFour = latStr.slice(-4);
      if (lastFour === "0000" || lastFour === "5000" || lastFour === "1111" || lastFour === "9999") {
        spoofSignals.push("suspicious_decimal_pattern");
      }
    }

    // Block if 2+ server-computed signals detected
    if (spoofSignals.length >= 2) {
      return {
        ...blockResponse(
          "LOCATION_SPOOF_DETECTED",
          "Location integrity check failed. Disable fake GPS apps and use real location.",
        ),
        risk: {
          level: "high",
          reason: "server_spoof_analysis",
          signals: spoofSignals,
        },
        ipLocation,
        verified: false,
      };
    }

    // Attach signals to request for downstream use (logging, scoring)
    req._serverSpoofSignals = spoofSignals;
  }

  if (policy.checkTimezone && timezone && geo?.timezone) {
    const browserRegion = getTimezoneRegion(timezone);
    const ipRegion = getTimezoneRegion(geo.timezone);
    // Also check country mismatch (Europe/Berlin vs Europe/Paris = same region but diff country)
    const ipCountry = geo?.country || "";
    const tzCountryMap = {
      "Asia/Kolkata": "IN", "Asia/Calcutta": "IN", "Asia/Colombo": "LK",
      "Asia/Dhaka": "BD", "Asia/Karachi": "PK", "Asia/Kathmandu": "NP",
      "Asia/Thimphu": "BT", "Asia/Yangon": "MM", "Asia/Bangkok": "TH",
      "Asia/Singapore": "SG", "Asia/Kuala_Lumpur": "MY", "Asia/Jakarta": "ID",
      "Asia/Manila": "PH", "Asia/Ho_Chi_Minh": "VN", "Asia/Tokyo": "JP",
      "Asia/Seoul": "KR", "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK",
      "Asia/Taipei": "TW", "Asia/Dubai": "AE", "Asia/Riyadh": "SA",
      "Europe/London": "GB", "Europe/Berlin": "DE", "Europe/Paris": "FR",
      "Europe/Moscow": "RU", "America/New_York": "US", "America/Chicago": "US",
      "America/Los_Angeles": "US", "America/Toronto": "CA",
      "Australia/Sydney": "AU", "Pacific/Auckland": "NZ",
    };
    const browserCountry = tzCountryMap[timezone] || "";
    const countryMismatch = browserCountry && ipCountry && browserCountry !== ipCountry;

    if ((timezone !== geo.timezone && browserRegion !== ipRegion) || countryMismatch) {
      return {
        ...blockResponse(
          "TIMEZONE_MISMATCH",
          "Timezone mismatch detected. Please disable VPN/proxy and use real device timezone.",
          {
            browserTimezone: timezone,
            networkTimezone: geo.timezone,
          },
        ),
        risk: {
          level: "high",
          reason: "timezone_mismatch",
          browserTimezone: timezone,
          networkTimezone: geo.timezone,
        },
        ipLocation,
        verified: false,
      };
    }
  }

  if (policy.checkDistance && latitude !== null && longitude !== null && Array.isArray(geo?.ll) && geo.ll.length >= 2) {
    const [ipLat, ipLng] = geo.ll;
    const distanceKm = getDistanceKm(latitude, longitude, ipLat, ipLng);

    // Guard against NaN from invalid coordinates
    if (!Number.isFinite(distanceKm)) {
      return {
        ...blockResponse(
          "INVALID_GPS",
          "Unable to verify location. Please enable GPS and retry.",
        ),
        risk: { level: "high", reason: "distance_computation_failed" },
        ipLocation,
        verified: false,
      };
    }

    if (distanceKm > policy.maxDistanceKm) {
      return {
        ...blockResponse(
          "LOCATION_SPOOF",
          "GPS and network locations are too far apart. Disable VPN/fake GPS and retry.",
          {
            distanceKm: Math.round(distanceKm),
          },
        ),
        risk: {
          level: "high",
          reason: "location_spoof",
          distanceKm: Math.round(distanceKm),
        },
        ipLocation,
        verified: false,
      };
    }
  }

  if (policy.checkPerfectCoords && latitude !== null && longitude !== null) {
    const suspicious = isPerfectCoordinate(latitude) || isPerfectCoordinate(longitude);

    if (suspicious) {
      const bothInteger = Number(latitude) % 1 === 0 && Number(longitude) % 1 === 0;
      if (bothInteger) {
        return {
          ...blockResponse(
            "INVALID_GPS",
            "Invalid GPS coordinates detected. Disable fake GPS/VPN and retry.",
          ),
          risk: {
            level: "high",
            reason: "invalid_perfect_coordinates",
            latitude,
            longitude,
          },
          ipLocation,
          verified: false,
        };
      }

      return buildOutcome({
        verified: true,
        risk: {
          level: "medium",
          reason: "suspicious_perfect_coordinates",
          latitude,
          longitude,
        },
        ipLocation,
      });
    }
  }

  if (detectProxyHeaderSignal(req)) {
    return {
      ...blockResponse(
        "PROXY_HEADER_DETECTED",
        "Proxy/VPN header signal detected. Please disable VPN/proxy and retry.",
      ),
      risk: {
        level: "high",
        reason: "proxy_header_signal",
      },
      ipLocation,
      verified: false,
    };
  }

  // ── Compute server-side location trust score (0–100) ────────
  // This replaces any client-reported trust_score. Higher = more trustworthy.
  const trustScore = computeLocationTrustScore({
    latitude, longitude, geo, timezone, ipLocation,
    spoofSignals: req._serverSpoofSignals || [],
    hasGps: latitude !== null && longitude !== null,
    hasTimezone: Boolean(timezone),
    proxyDetected: false,
  });
  req._locationTrustScore = trustScore;

  return buildOutcome({
    verified: true,
    risk: { level: trustScore >= 70 ? "low" : trustScore >= 40 ? "medium" : "high", reason: "verified", trustScore },
    ipLocation,
  });
};

const applyDetection = (req, res, next, options = {}) => {
  const logOnly = options.logOnly ?? CONFIG.logOnly;

  const outcome = detectVpnOrSpoofRisk(req, options);

  req.fraudRisk = outcome.risk || null;
  req.ipLocation = outcome.ipLocation || null;
  req.locationVerified = Boolean(outcome.verified);
  req.locationTrustScore = req._locationTrustScore || (outcome.risk?.trustScore ?? null);

  if (outcome.blocked) {
    if (logOnly) {
      req.locationVerified = false;
      return next();
    }

    return res.status(outcome.status || 403).json(
      outcome.payload || {
        error: "Security Alert",
        message: "Location verification failed.",
        code: "LOCATION_VERIFICATION_FAILED",
      },
    );
  }

  return next();
};

const detectVpnOrSpoof = (req, res, next) => applyDetection(req, res, next, { logOnly: false });

const logLocationRisk = (req, res, next) => applyDetection(req, res, next, { logOnly: true });

const enrichWithIpLocation = (req, _res, next) => {
  const clientIp = normalizeIp(requestIp.getClientIp(req));
  if (!clientIp || isPrivateOrLocalIp(clientIp)) {
    return next();
  }

  const geo = geoip.lookup(clientIp);
  if (geo) {
    req.ipLocation = {
      ip: clientIp,
      city: geo.city,
      region: geo.region,
      country: geo.country,
      timezone: geo.timezone,
      ll: geo.ll,
    };
  }

  return next();
};

const enforceNoVpnForAuth = (req, res, next) =>
  applyDetection(req, res, next, {
    logOnly: true,
    requireGps: CONFIG.requireGpsForAuth,
    requireTimezone: CONFIG.requireTimezoneForAuth,
    blockUnknownPublicIp: true,
    checkTimezone: true,
    checkDistance: true,
  });

module.exports = {
  detectVpnOrSpoof,
  detectVpnOrSpoofRisk,
  logLocationRisk,
  enforceNoVpnForAuth,
  enrichWithIpLocation,
  getDistanceKm,
  isPerfectCoordinate,
  CONFIG,
};
