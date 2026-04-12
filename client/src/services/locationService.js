import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { buildApiPath } from "@/lib/networkConfig";
import { getDeviceId } from "@/utils/device";
import { analyzeLocationForSpoofing, recordLocationReading, getLocationTrustScore } from "@/utils/locationGuard";
import { hasAuthSession } from "@/utils/authStorage";
import {
  attachOwner,
  clearUserCity,
  isOwnerMatch,
  writeUserCity,
} from "@/utils/locationCache";
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20e3,
  maximumAge: 0,
};
const WEB_GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 18e3,
  maximumAge: 0,
};
const WEB_RELAXED_GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 12e3,
  maximumAge: 15e3,
};
const WEB_WATCH_GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20e3,
  maximumAge: 0,
};
const WEB_TARGET_ACCURACY_METERS = 20;
const WEB_WATCH_MAX_DURATION_MS = 55e3;
const WEB_WATCH_MIN_IMPROVEMENT_METERS = 1;
const WEB_WATCH_STALL_LIMIT = 6;
const WEB_EXTRA_SAMPLE_ATTEMPTS = 6;
const WEB_EXTRA_SAMPLE_DELAY_MS = 1200;
const WEB_STALE_FIX_MAX_AGE_MS = 60 * 1e3;
const NATIVE_SECOND_FIX_DELAY_MS = 2000;
const NATIVE_MAX_SAMPLES = 4;
const NATIVE_WATCH_MAX_DURATION_MS = 35e3;
const STRICT_REQUIRED_ACCURACY_METERS = 30;
const VERIFY_REQUIRED_ACCURACY_METERS = Number(
  import.meta.env.VITE_LOCATION_TARGET_ACCURACY_METERS || 30,
);
const VERIFY_MAX_ACCURACY_METERS = Number(
  import.meta.env.VITE_LOCATION_MAX_ACCURACY_METERS || 30,
);
const VERIFY_MAX_AGE_MS = Number(
  import.meta.env.VITE_LOCATION_MAX_AGE_MS || 10000,
);
const VERIFY_TARGET_RADIUS_METERS = Number(
  import.meta.env.VITE_LOCATION_TARGET_RADIUS_METERS || 10,
);
const DEFAULT_REQUIRED_ACCURACY_METERS = 30;
const DEFAULT_COARSE_REQUIRED_ACCURACY_METERS = 1500;
const DEFAULT_CACHE_MAX_AGE_MS = 15 * 60 * 1e3;
const RUNTIME_CACHE_MAX_AGE_MS = 45e3;
const RUNTIME_CACHE_RELAXED_FACTOR = 1.0;
const LIVE_CAPTURE_ATTEMPTS = 2;
const IP_FALLBACK_TIMEOUT_MS = 5e3;
const LOCATION_CACHE_KEYS = ["mhub_location", "user_location", "last_location"];
const MIN_MOVEMENT_THRESHOLD = 8;
/** Accuracy beyond which watch-refinement / extra samples are pointless */
const HOPELESS_ACCURACY_METERS = 10000;
/** Accuracy tiers for quality classification */
const ACCURACY_TIER_PRECISE = 30;
const ACCURACY_TIER_GOOD = 100;
const ACCURACY_TIER_MODERATE = 500;
const ACCURACY_TIER_COARSE = 5000;
const KALMAN_PROCESS_NOISE = 3;
const KALMAN_MEASUREMENT_NOISE_BASE = 10;
const STATIONARY_SPEED_THRESHOLD_MS = 0.5;
const FIRST_FIX_OUTLIER_FACTOR = 2.5;
const NETWORK_TIMEOUT_MS = 6e3;
const LOCATION_SYNC_MAX_ATTEMPTS_PER_ENDPOINT = 2;
const LOCATION_SYNC_RETRY_DELAY_MS = 1e3;
const LOCATION_SYNC_MIN_INTERVAL_MS = Number(
  import.meta.env.VITE_LOCATION_SYNC_MIN_INTERVAL_MS || 60 * 1000,
);
const LOCATION_SYNC_MIN_DISTANCE_METERS = Number(
  import.meta.env.VITE_LOCATION_SYNC_MIN_DISTANCE_METERS || 25,
);
const LOCATION_SYNC_COOLDOWN_FALLBACK_MS = Number(
  import.meta.env.VITE_LOCATION_SYNC_COOLDOWN_FALLBACK_MS || 60 * 1000,
);
const LOCATION_SYNC_COOLDOWN_MAX_MS = Number(
  import.meta.env.VITE_LOCATION_SYNC_COOLDOWN_MAX_MS || 10 * 60 * 1000,
);
const LOCATION_SYNC_COOLDOWN_KEY = "mhub_location_sync_cooldown_until";
const LOCATION_SYNC_LAST_KEY = "mhub_location_sync_last";
const REVERSE_GEOCODE_CACHE_TTL_MS = 30 * 60 * 1e3;
const REVERSE_GEOCODE_TIMEOUT_MS = 3500;
const REVERSE_GEOCODE_ROUNDING_DIGITS = 5;
const COORD_PRECISION_DIGITS = 7;
const POI_CACHE_TTL_MS = 30 * 60 * 1e3;
const POI_LOOKUP_TIMEOUT_MS = 3500;
const PLACES_ENDPOINT_COOLDOWN_MS = 5 * 60 * 1000;
const PLACES_RATE_LIMIT_FALLBACK_MS = 30 * 1000;
const GOOGLE_PLACES_RADIUS_METERS = 60;
const LOCATION_POI_PROVIDER = String(
  import.meta.env.VITE_LOCATION_POI_PROVIDER || "auto",
)
  .trim()
  .toLowerCase();
const LOCAL_DEV_BACKEND_ORIGINS = [
  "http://localhost:5001",
];
const DEBUG = import.meta.env.DEV;
let runtimeBestLocation = null;
let placesEndpointUnavailableUntil = 0;
let placesRateLimitUntil = 0;
let locationSyncCooldownUntil = 0;
let locationSyncInFlight = false;
const reverseGeocodeCache = new Map();
const reverseGeocodeInFlight = new Map();
const poiLookupCache = new Map();
const poiLookupInFlight = new Map();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const debugLog = (...args) => {
  if (DEBUG) {
    console.log("[LocationService]", ...args);
  }
};
const resolveRetryAfterMs = (headerValue, fallbackMs = PLACES_RATE_LIMIT_FALLBACK_MS) => {
  if (!headerValue) return fallbackMs;
  const trimmed = String(headerValue).trim();
  if (!trimmed) return fallbackMs;
  const seconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(seconds)) {
    return Math.max(1000, seconds * 1000);
  }
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now();
    return diff > 0 ? diff : fallbackMs;
  }
  return fallbackMs;
};
const readLocationSyncCooldown = () => {
  if (locationSyncCooldownUntil > Date.now()) {
    return locationSyncCooldownUntil;
  }
  if (typeof localStorage === "undefined") return 0;
  const raw = localStorage.getItem(LOCATION_SYNC_COOLDOWN_KEY);
  const parsed = Number(raw);
  if (Number.isFinite(parsed)) {
    locationSyncCooldownUntil = parsed;
    return parsed;
  }
  return 0;
};
const setLocationSyncCooldown = (cooldownMs) => {
  const capped = Math.min(
    Math.max(Number(cooldownMs) || 0, 0),
    LOCATION_SYNC_COOLDOWN_MAX_MS,
  );
  if (!Number.isFinite(capped) || capped <= 0) return 0;
  const until = Date.now() + capped;
  locationSyncCooldownUntil = Math.max(locationSyncCooldownUntil, until);
  try {
    localStorage.setItem(LOCATION_SYNC_COOLDOWN_KEY, String(locationSyncCooldownUntil));
  } catch {
    // ignore storage failures
  }
  return locationSyncCooldownUntil;
};
const readLastLocationSync = () => {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCATION_SYNC_LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts);
    const lat = Number(parsed?.lat);
    const lng = Number(parsed?.lng);
    if (!Number.isFinite(ts) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return {
      ts,
      lat,
      lng,
      accuracy: Number(parsed?.accuracy),
    };
  } catch {
    return null;
  }
};
const writeLastLocationSync = (payload) => {
  const lat = Number(payload?.latitude);
  const lng = Number(payload?.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
  const record = {
    ts: Date.now(),
    lat,
    lng,
    accuracy: Number(payload?.accuracy),
  };
  try {
    localStorage.setItem(LOCATION_SYNC_LAST_KEY, JSON.stringify(record));
  } catch {
    // ignore storage failures
  }
};
const shouldSkipLocationSync = (payload) => {
  const now = Date.now();
  const cooldownUntil = readLocationSyncCooldown();
  if (cooldownUntil && cooldownUntil > now) {
    return {
      skip: true,
      reason: "cooldown",
      waitMs: cooldownUntil - now,
    };
  }
  const lastSync = readLastLocationSync();
  if (!lastSync) return { skip: false };
  const ageMs = now - lastSync.ts;
  if (ageMs < LOCATION_SYNC_MIN_INTERVAL_MS) {
    const lat = Number(payload?.latitude);
    const lng = Number(payload?.longitude);
    let movedEnough = true;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const distance = getDistanceFromCoords(lastSync.lat, lastSync.lng, lat, lng);
      movedEnough = Number.isFinite(distance)
        ? distance >= LOCATION_SYNC_MIN_DISTANCE_METERS
        : true;
    }
    const nextAcc = Number(payload?.accuracy);
    const prevAcc = Number(lastSync.accuracy);
    const accuracyImproved =
      Number.isFinite(nextAcc) && Number.isFinite(prevAcc)
        ? nextAcc < prevAcc * 0.7
        : false;
    if (!movedEnough && !accuracyImproved) {
      return {
        skip: true,
        reason: "throttled",
        waitMs: LOCATION_SYNC_MIN_INTERVAL_MS - ageMs,
      };
    }
  }
  return { skip: false };
};
const isPlacesEndpointAvailable = () =>
  Date.now() >= placesEndpointUnavailableUntil &&
  Date.now() >= placesRateLimitUntil;
/**
 * Simple 1-D Kalman filter for smoothing GPS coordinates.
 * Maintains separate state for latitude and longitude.
 * Reduces GPS noise by ~2-3x compared to raw readings.
 */
class KalmanFilter1D {
  constructor(processNoise = KALMAN_PROCESS_NOISE, measurementNoiseBase = KALMAN_MEASUREMENT_NOISE_BASE) {
    this.processNoise = processNoise;
    this.measurementNoiseBase = measurementNoiseBase;
    this.estimate = null;
    this.errorCovariance = null;
    this.lastTimestamp = null;
  }
  update(measurement, accuracy, timestamp) {
    const measurementNoise = Math.max(this.measurementNoiseBase, accuracy || this.measurementNoiseBase);
    if (this.estimate === null) {
      this.estimate = measurement;
      this.errorCovariance = measurementNoise;
      this.lastTimestamp = timestamp || Date.now();
      return this.estimate;
    }
    const dt = timestamp ? Math.max(0.001, (timestamp - this.lastTimestamp) / 1000) : 1;
    this.lastTimestamp = timestamp;
    const predictedCovariance = this.errorCovariance + this.processNoise * dt;
    const kalmanGain = predictedCovariance / (predictedCovariance + measurementNoise);
    this.estimate = this.estimate + kalmanGain * (measurement - this.estimate);
    this.errorCovariance = (1 - kalmanGain) * predictedCovariance;
    return this.estimate;
  }
  reset() {
    this.estimate = null;
    this.errorCovariance = null;
    this.lastTimestamp = null;
  }
}

/**
 * Weighted position averaging using inverse-accuracy-squared weighting.
 * More accurate fixes contribute proportionally more to the result.
 */
const weightedAveragePosition = (samples, bestFix) => {
  const usable = samples.filter(isPositionUsable);
  if (usable.length < 2) return bestFix;
  let totalWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;
  let bestAccuracy = Number.MAX_SAFE_INTEGER;
  for (const sample of usable) {
    const acc = getPositionAccuracy(sample);
    if (!Number.isFinite(acc) || acc <= 0) continue;
    const weight = 1 / (acc * acc);
    weightedLat += sample.coords.latitude * weight;
    weightedLng += sample.coords.longitude * weight;
    totalWeight += weight;
    if (acc < bestAccuracy) bestAccuracy = acc;
  }
  if (totalWeight === 0) return bestFix;
  const avgLat = weightedLat / totalWeight;
  const avgLng = weightedLng / totalWeight;
  const distFromBest = getDistanceFromCoords(avgLat, avgLng, bestFix.coords.latitude, bestFix.coords.longitude);
  if (distFromBest > bestAccuracy * 2) return bestFix;
  return {
    coords: {
      latitude: avgLat,
      longitude: avgLng,
      accuracy: Math.min(bestAccuracy, getPositionAccuracy(bestFix)),
      altitude: bestFix.coords.altitude,
      altitudeAccuracy: bestFix.coords.altitudeAccuracy,
      heading: bestFix.coords.heading,
      speed: bestFix.coords.speed,
    },
    timestamp: bestFix.timestamp,
  };
};

/**
 * Discard first GPS fix if it's a significant outlier compared to later fixes.
 * Returns filtered sample array with the first fix removed if it's an outlier.
 */
const discardFirstFixIfOutlier = (samples) => {
  if (samples.length < 3) return samples;
  const first = samples[0];
  const rest = samples.slice(1);
  const firstAcc = getPositionAccuracy(first);
  const restAccuracies = rest.map(getPositionAccuracy).filter(Number.isFinite);
  if (!restAccuracies.length) return samples;
  const avgRestAccuracy = restAccuracies.reduce((sum, a) => sum + a, 0) / restAccuracies.length;
  if (firstAcc > avgRestAccuracy * FIRST_FIX_OUTLIER_FACTOR) {
    debugLog(`Discarding first fix (${Math.round(firstAcc)}m) as outlier vs avg ${Math.round(avgRestAccuracy)}m`);
    return rest;
  }
  return samples;
};

/**
 * Apply Kalman filtering to a sequence of GPS samples.
 * Returns a synthetic position with smoothed coordinates and the best accuracy.
 */
const kalmanFilteredPosition = (samples, bestFix) => {
  const usable = samples.filter(isPositionUsable);
  if (usable.length < 2) return bestFix;
  const sorted = [...usable].sort((a, b) => getPositionTimestamp(a) - getPositionTimestamp(b));
  const latFilter = new KalmanFilter1D();
  const lngFilter = new KalmanFilter1D();
  for (const sample of sorted) {
    const acc = getPositionAccuracy(sample);
    const ts = getPositionTimestamp(sample);
    latFilter.update(sample.coords.latitude, acc / 111320, ts);
    lngFilter.update(sample.coords.longitude, acc / (111320 * Math.cos(sample.coords.latitude * Math.PI / 180)), ts);
  }
  const smoothedLat = latFilter.estimate;
  const smoothedLng = lngFilter.estimate;
  const distFromBest = getDistanceFromCoords(smoothedLat, smoothedLng, bestFix.coords.latitude, bestFix.coords.longitude);
  const bestAcc = getPositionAccuracy(bestFix);
  if (distFromBest > bestAcc * 2) return bestFix;
  return {
    coords: {
      latitude: smoothedLat,
      longitude: smoothedLng,
      accuracy: Math.min(bestAcc, latFilter.errorCovariance * 111320),
      altitude: bestFix.coords.altitude,
      altitudeAccuracy: bestFix.coords.altitudeAccuracy,
      heading: bestFix.coords.heading,
      speed: bestFix.coords.speed,
    },
    timestamp: bestFix.timestamp,
  };
};
const createLocationSignature = async (payload) => {
  // Server-side HMAC signing — secret never leaves the server
  try {
    const { getApiOriginBase } = await import("@/lib/networkConfig");
    const base = getApiOriginBase();
    const csrfToken = getCsrfToken();
    const res = await fetch(`${base}/api/location/sign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-XSRF-TOKEN": decodeURIComponent(csrfToken) } : {}),
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data._nonce) payload._nonce = data._nonce;
    if (data._signed_at) payload._signed_at = data._signed_at;
    return data.signature || null;
  } catch (error) {
    debugLog("Server-side HMAC signature failed:", error?.message || error);
    return null;
  }
};
const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = NETWORK_TIMEOUT_MS,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};
const getCsrfToken = () => {
  if (typeof document === "undefined") return "";
  return (document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/) || [])[1] || "";
};
const normalizeEndpointUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");
const getLocationEndpointCandidates = () => {
  const candidates = [buildApiPath("/location")];
  if (import.meta.env.DEV && typeof window !== "undefined") {
    candidates.push(`${window.location.origin}/api/location`);
    LOCAL_DEV_BACKEND_ORIGINS.forEach((origin) => {
      candidates.push(`${origin}/api/location`);
    });
  }
  const deduped = [];
  const seen = new Set();
  candidates.forEach((candidate) => {
    const normalized = normalizeEndpointUrl(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    deduped.push(normalized);
  });
  return deduped;
};
const getLocationVerificationEndpointCandidates = () => {
  const candidates = [
    buildApiPath("/v1/location/verify"),
    buildApiPath("/location/verify"),
  ];
  if (import.meta.env.DEV && typeof window !== "undefined") {
    candidates.push(`${window.location.origin}/api/v1/location/verify`);
    candidates.push(`${window.location.origin}/api/location/verify`);
    LOCAL_DEV_BACKEND_ORIGINS.forEach((origin) => {
      candidates.push(`${origin}/api/v1/location/verify`);
      candidates.push(`${origin}/api/location/verify`);
    });
  }
  const deduped = [];
  const seen = new Set();
  candidates.forEach((candidate) => {
    const normalized = normalizeEndpointUrl(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    deduped.push(normalized);
  });
  return deduped;
};
const isRouteNotFoundPayload = (status, bodyText) =>
  status === 404 && /route not found/i.test(String(bodyText || ""));
const getBrowserPositionOnce = (options) =>
  new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Browser geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
const isSecureGeoContext = () => {
  if (typeof window === "undefined") return true;
  if (window.isSecureContext) return true;
  const hostname = window.location?.hostname || "";
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1"
  );
};
const normalizeBrowserGeoError = (error) => {
  const code = error?.code;
  const message = error?.message || "";
  if (code === 1 || /denied/i.test(message)) {
    const deniedError = new Error(
      "Location permission denied in browser settings.",
    );
    deniedError.name = "PermissionDeniedError";
    return deniedError;
  }
  if (code === 2) {
    return new Error(
      "Location unavailable. Please enable device location services.",
    );
  }
  if (code === 3 || /timeout/i.test(message)) {
    return new Error(
      "Location request timed out. Move near a window and try again.",
    );
  }
  return error instanceof Error
    ? error
    : new Error("Unable to determine browser location.");
};
const getBrowserPermissionState = async () => {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status?.state || "unknown";
  } catch {
    return "unknown";
  }
};
/**
 * Multi-stage GPS sample filtering pipeline:
 * 1. Discard first-fix outlier
 * 2. Median-filter to reject spatial outliers
 * 3. Apply Kalman filter for temporal smoothing
 * 4. Apply weighted averaging as final refinement
 * Returns the most precise synthetic position available.
 */
const medianFilteredPosition = (samples, bestFix) => {
  const usable = samples.filter(isPositionUsable);
  if (usable.length < 3) return bestFix;

  // Stage 1: Discard first-fix outlier if applicable
  const cleaned = discardFirstFixIfOutlier(usable);

  // Sort by accuracy (best first) and take the better half
  const sorted = [...cleaned].sort(
    (a, b) => getPositionAccuracy(a) - getPositionAccuracy(b),
  );
  const topHalf = sorted.slice(0, Math.max(3, Math.ceil(sorted.length / 2)));

  // Stage 2: Median filter for outlier rejection
  const lats = topHalf.map((p) => p.coords.latitude).sort((a, b) => a - b);
  const lngs = topHalf.map((p) => p.coords.longitude).sort((a, b) => a - b);
  const mid = Math.floor(lats.length / 2);
  const medianLat = lats.length % 2 === 1 ? lats[mid] : (lats[mid - 1] + lats[mid]) / 2;
  const medianLng = lngs.length % 2 === 1 ? lngs[mid] : (lngs[mid - 1] + lngs[mid]) / 2;

  const bestAcc = getPositionAccuracy(bestFix);
  const distFromBest = getDistanceFromCoords(
    medianLat, medianLng,
    bestFix.coords.latitude, bestFix.coords.longitude,
  );

  if (distFromBest > bestAcc * 2) {
    return bestFix;
  }

  const medianResult = {
    coords: {
      latitude: medianLat,
      longitude: medianLng,
      accuracy: Math.min(bestAcc, getPositionAccuracy(sorted[0])),
      altitude: bestFix.coords.altitude,
      altitudeAccuracy: bestFix.coords.altitudeAccuracy,
      heading: bestFix.coords.heading,
      speed: bestFix.coords.speed,
    },
    timestamp: bestFix.timestamp,
  };

  // Stage 3: Apply Kalman filter for temporal smoothing if enough samples
  if (cleaned.length >= 4) {
    const kalmanResult = kalmanFilteredPosition(cleaned, medianResult);
    if (getPositionAccuracy(kalmanResult) < getPositionAccuracy(medianResult)) {
      return kalmanResult;
    }
  }

  // Stage 4: Weighted average as fallback refinement
  if (cleaned.length >= 3) {
    const weightedResult = weightedAveragePosition(cleaned, medianResult);
    if (getPositionAccuracy(weightedResult) < getPositionAccuracy(medianResult)) {
      return weightedResult;
    }
  }

  return medianResult;
};
const getDistanceFromCoords = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const refineBrowserPositionWithWatch = async (
  initialFix,
  targetAccuracy = WEB_TARGET_ACCURACY_METERS,
) => {
  if (
    typeof navigator === "undefined" ||
    !navigator.geolocation?.watchPosition
  ) {
    return initialFix;
  }

  if (!initialFix || !isPositionUsable(initialFix)) {
    return initialFix;
  }

  let bestFix = initialFix;
  const initialAccuracy = getPositionAccuracy(initialFix);
  debugLog(`Watch refinement starting. Initial accuracy: ${Number.isFinite(initialAccuracy) ? Math.round(initialAccuracy) + 'm' : 'unknown'}, target: ${targetAccuracy}m`);
  if (
    Number.isFinite(initialAccuracy) &&
    initialAccuracy <= targetAccuracy
  ) {
    debugLog("Initial fix already meets target accuracy, skipping watch.");
    return initialFix;
  }
  const allSamples = [initialFix];
  let stallCount = 0;
  return new Promise((resolve) => {
    let resolved = false;
    let watchId = null;
    let finishTimer = null;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (watchId !== null && navigator.geolocation?.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (finishTimer) {
        clearTimeout(finishTimer);
      }
      // Multi-stage filtering: Kalman → median → weighted for best precision
      let finalFix = bestFix;
      if (allSamples.length >= 3) {
        finalFix = kalmanFilteredPosition(allSamples, bestFix);
        const medianCandidate = medianFilteredPosition(allSamples, bestFix);
        if (getPositionAccuracy(medianCandidate) < getPositionAccuracy(finalFix)) {
          finalFix = medianCandidate;
        }
      }
      debugLog(`Watch refinement done. Samples: ${allSamples.length}, final accuracy: ${Math.round(getPositionAccuracy(finalFix))}m`);
      resolve(finalFix);
    };
    finishTimer = setTimeout(finish, WEB_WATCH_MAX_DURATION_MS);
    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!isPositionUsable(position)) return;
          allSamples.push(position);

          const currentBest = getPositionAccuracy(bestFix);
          const nextAccuracy = getPositionAccuracy(position);
          const speed = Number(position.coords?.speed);
          const isStationary = Number.isFinite(speed) && speed < STATIONARY_SPEED_THRESHOLD_MS;
          debugLog(`Watch sample #${allSamples.length}: ${Math.round(nextAccuracy)}m (best: ${Math.round(currentBest)}m)${isStationary ? ' [stationary]' : ''}`);

          // For stationary devices, require larger improvement to reduce jitter
          const improvementThreshold = isStationary
            ? WEB_WATCH_MIN_IMPROVEMENT_METERS * 2
            : WEB_WATCH_MIN_IMPROVEMENT_METERS;
          if (
            !Number.isFinite(currentBest) ||
            (Number.isFinite(nextAccuracy) &&
              nextAccuracy + improvementThreshold < currentBest)
          ) {
            bestFix = position;
            stallCount = 0;
          } else {
            stallCount += 1;
          }
          const bestAccuracy = getPositionAccuracy(bestFix);
          if (
            Number.isFinite(bestAccuracy) &&
            bestAccuracy <= targetAccuracy
          ) {
            finish();
          } else if (stallCount >= WEB_WATCH_STALL_LIMIT) {
            debugLog(`Watch stalled after ${stallCount} samples with no improvement, finishing.`);
            finish();
          }
        },
        () => {
          finish();
        },
        WEB_WATCH_GEO_OPTIONS,
      );
    } catch {
      finish();
    }
  });
};
const getBrowserPosition = async (options = {}) => {
  const targetAccuracy = Number.isFinite(options.targetAccuracy)
    ? Number(options.targetAccuracy)
    : WEB_TARGET_ACCURACY_METERS;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Browser geolocation not supported");
  }
  if (!isSecureGeoContext()) {
    throw new Error(
      "Browser geolocation requires HTTPS (or localhost in development).",
    );
  }
  const permissionState = await getBrowserPermissionState();
  if (permissionState === "denied") {
    const deniedError = new Error(
      "Location permission denied in browser settings.",
    );
    deniedError.name = "PermissionDeniedError";
    throw deniedError;
  }

  const rawCandidates = [];
  let primaryError = null;

  const addCandidate = (position) => {
    if (isPositionUsable(position)) {
      rawCandidates.push(position);
    }
  };

  try {
    const firstFix = await getBrowserPositionOnce(WEB_GEO_OPTIONS);
    addCandidate(firstFix);
  } catch (firstError) {
    const normalized = normalizeBrowserGeoError(firstError);
    if (normalized.name === "PermissionDeniedError") {
      throw normalized;
    }
    primaryError = normalized;
    debugLog(
      "High-accuracy browser geolocation failed, retrying relaxed mode:",
      normalized.message,
    );
  }

  if (!rawCandidates.length) {
    try {
      const relaxedFix = await getBrowserPositionOnce(WEB_RELAXED_GEO_OPTIONS);
      addCandidate(relaxedFix);
    } catch (secondError) {
      const normalized = normalizeBrowserGeoError(secondError);
      if (normalized.name === "PermissionDeniedError") {
        throw normalized;
      }
      if (!primaryError) {
        primaryError = normalized;
      }
    }
  }

  let best = pickBestPosition(rawCandidates);
  if (!best) {
    throw primaryError || new Error("Unable to determine browser location.");
  }

  const initialAccuracy = getPositionAccuracy(best);
  debugLog(`Initial browser fix: ${best.coords.latitude.toFixed(7)}, ${best.coords.longitude.toFixed(7)} ±${Number.isFinite(initialAccuracy) ? Math.round(initialAccuracy) + 'm' : '?'}`);

  // When accuracy is hopeless (>10km, e.g. cell-tower/WiFi estimate on desktop),
  // skip all refinement — watch and extra samples will never improve it and
  // just waste 60+ seconds of CPU time.
  if (Number.isFinite(initialAccuracy) && initialAccuracy > HOPELESS_ACCURACY_METERS) {
    debugLog(`Skipping all refinement — accuracy ${Math.round(initialAccuracy)}m is beyond recovery (>${HOPELESS_ACCURACY_METERS}m).`);
    return best;
  }

  const allowRefinement =
    !Number.isFinite(initialAccuracy) || initialAccuracy <= ACCURACY_TIER_COARSE;

  // Try watch refinement if not yet at target accuracy
  if (
    allowRefinement &&
    (!Number.isFinite(initialAccuracy) || initialAccuracy > targetAccuracy)
  ) {
    const refinedFix = await refineBrowserPositionWithWatch(
      best,
      targetAccuracy,
    );
    addCandidate(refinedFix);
    best = pickBestPosition(rawCandidates) || best;
  } else if (!allowRefinement && Number.isFinite(initialAccuracy)) {
    debugLog(
      `Skipping watch refinement due to coarse accuracy (${Math.round(initialAccuracy)}m).`,
    );
  }

  const bestAccuracy = getPositionAccuracy(best);
  const allowExtraSamples =
    !Number.isFinite(bestAccuracy) || bestAccuracy <= ACCURACY_TIER_COARSE;

  // Take extra samples if still above target accuracy
  if (allowExtraSamples && bestAccuracy > targetAccuracy) {
    for (let attempt = 0; attempt < WEB_EXTRA_SAMPLE_ATTEMPTS; attempt += 1) {
      await sleep(WEB_EXTRA_SAMPLE_DELAY_MS + attempt * 500);
      try {
        const extraFix = await getBrowserPositionOnce(WEB_GEO_OPTIONS);
        addCandidate(extraFix);
        debugLog(`Extra sample #${attempt + 1}: ±${Math.round(getPositionAccuracy(extraFix))}m`);
        if (getPositionAccuracy(extraFix) <= targetAccuracy) break;
      } catch {
        // Keep best candidate captured so far.
      }
    }
    best = pickBestPosition(rawCandidates) || best;
  } else if (!allowExtraSamples && bestAccuracy > targetAccuracy) {
    debugLog(
      `Skipping extra samples due to coarse accuracy (${Math.round(bestAccuracy)}m).`,
    );
  }

  debugLog(`Final browser position: ±${Math.round(getPositionAccuracy(best))}m from ${rawCandidates.length} candidates`);
  return best;
};
const isValidCoordinates = (latitude, longitude) =>
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
  return Date.now();
};
const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const roundCoordinate = (value, digits = COORD_PRECISION_DIGITS) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return numeric;
  return Number(numeric.toFixed(digits));
};
const getPositionAccuracy = (position) => {
  const accuracy = Number(position?.coords?.accuracy);
  return Number.isFinite(accuracy) ? accuracy : Number.MAX_SAFE_INTEGER;
};
const getPositionTimestamp = (position) => parseTimestamp(position?.timestamp);
const isPositionUsable = (position) => {
  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);
  if (!isValidCoordinates(latitude, longitude)) return false;

  const ageMs = Date.now() - getPositionTimestamp(position);
  return ageMs <= WEB_STALE_FIX_MAX_AGE_MS;
};
const pickBestPosition = (positions = []) => {
  const valid = positions.filter(Boolean).filter(isPositionUsable);
  if (!valid.length) return null;

  valid.sort((a, b) => {
    const accuracyDelta = getPositionAccuracy(a) - getPositionAccuracy(b);
    if (accuracyDelta !== 0) return accuracyDelta;
    return getPositionTimestamp(b) - getPositionTimestamp(a);
  });

  return valid[0];
};
const getStoredUserId = () => {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem("userId") || null;
  } catch {
    return null;
  }
};
const hasAuthenticatedSession = () => {
  try {
    return hasAuthSession();
  } catch {
    return false;
  }
};
const normalizeLocationShape = (loc, defaults = {}) => {
  if (!loc || typeof loc !== "object") return null;
  const latitude = Number(loc.latitude ?? loc.lat);
  const longitude = Number(loc.longitude ?? loc.lng);
  if (!isValidCoordinates(latitude, longitude)) return null;
  const accuracy = Number(loc.accuracy);
  const timestamp = parseTimestamp(loc.timestamp);
  const isMock = Boolean(loc.isMock ?? loc.is_mock ?? loc.mocked ?? false);
  return {
    latitude: roundCoordinate(latitude),
    longitude: roundCoordinate(longitude),
    lat: roundCoordinate(latitude),
    lng: roundCoordinate(longitude),
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    speed: Number.isFinite(Number(loc.speed)) ? Number(loc.speed) : 0,
    city: loc.city || loc.address?.city || "",
    state: loc.state || loc.address?.state || "",
    country: loc.country || loc.address?.country || "",
    area:
      loc.area ||
      loc.address?.area ||
      loc.locality ||
      loc.address?.locality ||
      "",
    village: loc.village || loc.address?.village || "",
    colony: loc.colony || loc.address?.colony || "",
    locality: loc.locality || loc.address?.locality || "",
    placeName:
      loc.placeName ||
      loc.poiName ||
      loc.address?.placeName ||
      loc.address?.poiName ||
      "",
    district: loc.district || loc.address?.district || "",
    pincode: loc.pincode || loc.address?.pincode || "",
    displayName: loc.displayName || loc.address?.displayName || "",
    provider: loc.provider || defaults.provider || "unknown",
    address: loc.address || defaults.address || null,
    timestamp: timestamp,
    isMock,
  };
};
const getRecentCachedLocation = (maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) => {
  try {
    if (typeof localStorage === "undefined") return null;
    const now = Date.now();
    const candidates = LOCATION_CACHE_KEYS.map((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (!isOwnerMatch(parsed?.ownerKey)) return null;
        const normalized = normalizeLocationShape(parsed, {
          provider: "cached_location",
        });
        if (!normalized) return null;
        return {
          ...normalized,
          ownerKey: parsed?.ownerKey || "",
          originalProvider: parsed?.provider || null,
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
    const freshCandidates = candidates.filter((entry) => {
      const ageMs = now - entry.timestamp;
      if (ageMs > maxAgeMs) return false;
      // Skip IP-fallback cached locations — they are coarse (~5km) and
      // produce the same result for every user on the same ISP/network.
      // Only return cached GPS-sourced locations.
      const orig = String(entry.originalProvider || entry.provider || "").toLowerCase();
      if (orig === "ip_fallback") return false;
      return true;
    });
    if (!freshCandidates.length) return null;
    freshCandidates.sort((a, b) => {
      if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
      const aAccuracy = Number.isFinite(a.accuracy)
        ? a.accuracy
        : Number.MAX_SAFE_INTEGER;
      const bAccuracy = Number.isFinite(b.accuracy)
        ? b.accuracy
        : Number.MAX_SAFE_INTEGER;
      return aAccuracy - bAccuracy;
    });
    return {
      ...freshCandidates[0],
      provider: "cached_location",
      originalProvider:
        freshCandidates[0].originalProvider || freshCandidates[0].provider || null,
    };
  } catch {
    return null;
  }
};
const getIPBasedFallbackLocation = async () => {
  try {
    const response = await fetchWithTimeout(
      buildApiPath("/location/ip-info"),
      { mode: "cors", credentials: "include" },
      IP_FALLBACK_TIMEOUT_MS,
    ).catch(() => null);
    if (!response || !response.ok) return null;
    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    if (!isValidCoordinates(latitude, longitude)) return null;
    const roundedLat = roundCoordinate(latitude);
    const roundedLng = roundCoordinate(longitude);

    // Reverse-geocode IP coordinates to get sub-city precision (area, street, neighbourhood)
    let addressData = null;
    try {
      addressData = await resolveAddress(roundedLat, roundedLng);
    } catch {
      debugLog("IP fallback reverse geocode failed, using city-level data");
    }
    if (addressData) {
      addressData = trimAddressForCoarseAccuracy(addressData);
    }

    const area = addressData?.area || "";
    const locality = addressData?.locality || "";
    const street = addressData?.street || "";
    const district = addressData?.district || "";
    const pincode = addressData?.pincode || data.postal || "";
    const city = addressData?.city || data.city || "";
    const state = addressData?.state || data.region || "";
    const country = addressData?.country || data.country_name || "";
    const placeName = addressData?.poiName || "";

    const displayParts = [];
    if (placeName) displayParts.push(placeName);
    if (area && area.toLowerCase() !== city.toLowerCase()) displayParts.push(area);
    if (city) displayParts.push(city);
    if (state && state.toLowerCase() !== city.toLowerCase()) displayParts.push(state);
    const displayName = displayParts.length ? displayParts.join(", ") : [data.city, data.region].filter(Boolean).join(", ") || "Unknown Location";

    const village = addressData?.village || "";
    const colony = addressData?.colony || "";

    return {
      latitude: roundedLat,
      longitude: roundedLng,
      lat: roundedLat,
      lng: roundedLng,
      accuracy: 75e3,
      speed: 0,
      city,
      state,
      country,
      area,
      village,
      colony,
      locality,
      street,
      district,
      pincode,
      placeName,
      displayName,
      address: addressData || null,
      provider: "ip_fallback",
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
};
const getPermissionStatusFromProvider = (provider) => {
  if (!provider) return "granted";
  const normalizedProvider = String(provider);
  if (normalizedProvider === "ip_fallback") return "granted_via_ip";
  if (
    normalizedProvider === "cached_location" ||
    normalizedProvider.includes("cached")
  )
    return "granted_cached";
  return "granted";
};
const buildLocationPayload = (locationData = {}) => {
  const payload = { ...locationData };
  const latitude = toFiniteNumberOrNull(
    locationData.latitude ?? locationData.lat,
  );
  const longitude = toFiniteNumberOrNull(
    locationData.longitude ?? locationData.lng,
  );
  const userId = locationData.user_id || getStoredUserId();
  if (latitude !== null) payload.latitude = latitude;
  if (longitude !== null) payload.longitude = longitude;
  delete payload.lat;
  delete payload.lng;
  if (userId) {
    payload.user_id = userId;
  }
  if (!payload.city) {
    payload.city =
      locationData?.address?.city ||
      locationData?.locality ||
      locationData?.area ||
      "";
  }
  if (!payload.state) {
    payload.state = locationData?.address?.state || "";
  }
  if (!payload.country) {
    payload.country = locationData?.address?.country || "";
  }
  if (!payload.area) {
    payload.area = locationData?.area || locationData?.address?.area || "";
  }
  if (!payload.locality) {
    payload.locality =
      locationData?.locality || locationData?.address?.locality || "";
  }
  if (!payload.village) {
    payload.village =
      locationData?.village || locationData?.address?.village || "";
  }
  if (!payload.colony) {
    payload.colony =
      locationData?.colony || locationData?.address?.colony || "";
  }
  if (!payload.suburb) {
    payload.suburb =
      locationData?.suburb || locationData?.address?.suburb || "";
  }
  if (!payload.district) {
    payload.district =
      locationData?.district || locationData?.address?.district || "";
  }
  if (!payload.pincode) {
    payload.pincode =
      locationData?.pincode || locationData?.address?.pincode || "";
  }
  if (!payload.display_name) {
    payload.display_name =
      locationData?.displayName || locationData?.address?.displayName || "";
  }
  if (!payload.provider) {
    payload.provider = "browser_gps";
  }
  if (!payload.permission_status) {
    payload.permission_status = getPermissionStatusFromProvider(
      payload.provider,
    );
  }
  if (!payload.timezone) {
    payload.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  if (!payload.last_active_at) {
    payload.last_active_at = new Date().toISOString();
  }
  // Include location trust score for server-side validation
  try {
    payload.location_trust_score = getLocationTrustScore();
  } catch { /* ignore */ }
  return payload;
};
const buildLocationVerificationPayload = (locationData = {}, options = {}) => {
  const latitude = toFiniteNumberOrNull(
    locationData.latitude ?? locationData.lat,
  );
  const longitude = toFiniteNumberOrNull(
    locationData.longitude ?? locationData.lng,
  );
  const accuracy = toFiniteNumberOrNull(locationData.accuracy);
  const timestamp = parseTimestamp(locationData.timestamp ?? Date.now());
  const deviceId = options.deviceId || getDeviceId();
  const userId = options.userId || getStoredUserId();

  const payload = {
    user_id: userId || null,
    latitude,
    longitude,
    accuracy,
    speed: toFiniteNumberOrNull(locationData.speed) || 0,
    altitude: toFiniteNumberOrNull(locationData.altitude),
    bearing: toFiniteNumberOrNull(locationData.heading ?? locationData.bearing),
    device_id: deviceId || null,
    timestamp,
    provider: locationData.provider || "browser_gps",
    is_mock: Boolean(locationData.isMock ?? locationData.mocked ?? false),
  };

  if (options.targetLat !== undefined || options.targetLatitude !== undefined) {
    payload.target_latitude = toFiniteNumberOrNull(
      options.targetLatitude ?? options.targetLat,
    );
  }
  if (options.targetLng !== undefined || options.targetLongitude !== undefined) {
    payload.target_longitude = toFiniteNumberOrNull(
      options.targetLongitude ?? options.targetLng,
    );
  }
  if (options.targetUserId) {
    payload.target_user_id = options.targetUserId;
  }
  if (Number.isFinite(Number(options.targetRadiusMetres))) {
    payload.target_radius_metres = Number(options.targetRadiusMetres);
  }
  if (Array.isArray(options.wifiBssids)) {
    payload.wifi_bssids = options.wifiBssids;
  }
  if (options.cellInfo) {
    payload.cell_info = options.cellInfo;
  }
  if (options.sensorHash) {
    payload.sensor_hash = options.sensorHash;
  }
  if (options.integrity) {
    payload.play_integrity = options.integrity;
  }
  if (options.storeSellerLocation) {
    payload.store_seller_location = true;
  }
  if (options.ipAddress) {
    payload.ip_address = options.ipAddress;
  }

  return payload;
};
const getAccuracyScore = (location) => {
  const accuracy = Number(location?.accuracy);
  return Number.isFinite(accuracy) ? accuracy : Number.MAX_SAFE_INTEGER;
};
const isAccuracyAcceptable = (location, requiredAccuracy) => {
  const accuracy = Number(location?.accuracy);
  // Unknown accuracy must NOT be treated as acceptable — require a real reading
  if (!Number.isFinite(accuracy)) return false;
  return accuracy <= requiredAccuracy;
};
const pickMorePreciseCandidate = (current, next) => {
  if (!next) return current;
  if (!current) return next;
  const currentAccuracy = getAccuracyScore(current);
  const nextAccuracy = getAccuracyScore(next);
  if (nextAccuracy < currentAccuracy) return next;
  if (nextAccuracy > currentAccuracy) return current;
  const currentTimestamp = parseTimestamp(current.timestamp);
  const nextTimestamp = parseTimestamp(next.timestamp);
  return nextTimestamp > currentTimestamp ? next : current;
};
const isFreshLocation = (location, maxAgeMs) => {
  if (!location) return false;
  const ageMs = Date.now() - parseTimestamp(location.timestamp);
  return ageMs <= maxAgeMs;
};
const getRuntimeCachedLocation = (
  requiredAccuracy = DEFAULT_REQUIRED_ACCURACY_METERS,
  maxAgeMs = RUNTIME_CACHE_MAX_AGE_MS,
) => {
  if (!isFreshLocation(runtimeBestLocation, maxAgeMs)) return null;

  // Never return IP-fallback data from runtime cache — it's the same for
  // every user on the same network and masks real per-user location.
  const prov = String(runtimeBestLocation?.provider || "").toLowerCase();
  if (prov === "ip_fallback") return null;

  const score = getAccuracyScore(runtimeBestLocation);
  const threshold = Number(requiredAccuracy) * RUNTIME_CACHE_RELAXED_FACTOR;
  // Only return cache if accuracy is known AND meets threshold
  if (Number.isFinite(score) && score <= threshold) {
    return { ...runtimeBestLocation };
  }

  return null;
};
const setRuntimeCachedLocation = (location) => {
  const normalized = normalizeLocationShape(location, {
    provider: location?.provider || "runtime_cache",
  });
  if (!normalized) return;
  // Never let an IP-fallback location overwrite a real GPS fix
  const incomingProvider = String(normalized.provider || "").toLowerCase();
  const existingProvider = String(runtimeBestLocation?.provider || "").toLowerCase();
  if (incomingProvider === "ip_fallback" && existingProvider !== "ip_fallback" && runtimeBestLocation) {
    return;
  }
  runtimeBestLocation = pickMorePreciseCandidate(
    runtimeBestLocation,
    normalized,
  );
};
const toCleanText = (value) => {
  if (value === undefined || value === null) return "";
  const normalized = String(value).trim();
  return normalized.length ? normalized : "";
};
const firstNonEmptyText = (...values) => {
  for (const value of values) {
    const normalized = toCleanText(value);
    if (normalized) return normalized;
  }
  return "";
};
const normalizePlaceName = (value) => {
  const text = toCleanText(value);
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim();
};
const buildPoiCacheKey = (lat, lng) =>
  `${Number(lat).toFixed(REVERSE_GEOCODE_ROUNDING_DIGITS)}:${Number(lng).toFixed(
    REVERSE_GEOCODE_ROUNDING_DIGITS,
  )}`;
const pickInformativeName = (items = [], matcher) => {
  if (!Array.isArray(items)) return "";
  const match = items.find((item) => matcher(String(item?.type || "")));
  return normalizePlaceName(match?.name);
};
const pushUniquePart = (parts, value) => {
  const normalized = toCleanText(value);
  if (!normalized) return;
  const exists = parts.some(
    (part) => part.toLowerCase() === normalized.toLowerCase(),
  );
  if (!exists) {
    parts.push(normalized);
  }
};
/** Strip administrative suffixes common in Indian addresses */
const stripAdminSuffix = (text) => {
  if (!text) return text;
  return text
    .replace(/\s+(mandal|district|municipality|tehsil|taluk|block|division|circle|zone)$/i, "")
    .trim();
};
const parseNominatimAddress = (data = {}) => {
  const address = data?.address || {};
  const poiName = firstNonEmptyText(
    data?.namedetails?.name,
    data?.namedetails?.short_name,
    data?.namedetails?.official_name,
    data?.extratags?.name,
    data?.name,
    address.amenity,
    address.building,
    address.shop,
    address.tourism,
    address.leisure,
  );

  const houseNumber = toCleanText(address.house_number);
  const road = firstNonEmptyText(
    address.road,
    address.pedestrian,
    address.footway,
    address.path,
  );
  const street = [houseNumber, road].filter(Boolean).join(" ").trim();

  const village = firstNonEmptyText(
    address.village,
    address.hamlet,
    address.isolated_dwelling,
    address.farm,
    address.croft,
  );

  const colony = firstNonEmptyText(
    address.neighbourhood,
    address.residential,
    address.quarter,
    address.city_block,
    address.allotments,
  );

  // suburb is the neighbourhood/area name (e.g. "Bachupally", "Madhapur")
  const suburb = firstNonEmptyText(address.suburb);

  // area: prefer colony (most specific), then suburb, then village, then locality
  const area = firstNonEmptyText(
    colony,
    suburb,
    village,
    address.locality,
  );

  const locality = firstNonEmptyText(
    suburb,
    address.city_district,
    address.borough,
    address.municipality,
    address.township,
    address.county,
  );

  // city: prefer actual city/town; avoid village/suburb which are area-level
  const rawCity = firstNonEmptyText(
    address.city,
    address.town,
  );
  // If no real city, fall back but strip mandal/admin suffixes
  const city = rawCity
    || stripAdminSuffix(firstNonEmptyText(address.municipality))
    || firstNonEmptyText(village, address.locality, suburb)
    || "Unknown";

  const district = firstNonEmptyText(
    address.state_district,
    address.county,
    address.city_district,
  );
  const state = firstNonEmptyText(address.state, address.region);
  const country = firstNonEmptyText(address.country);
  const pincode = firstNonEmptyText(address.postcode);

  // Build display: prefer granular area, then city (skip if same as area)
  const displayParts = [];
  if (poiName) pushUniquePart(displayParts, poiName);
  pushUniquePart(displayParts, street);
  pushUniquePart(displayParts, area);
  // Only add city if it's different from area (avoid "Bachupally, Bachupally")
  const areaNorm = stripAdminSuffix(area)?.toLowerCase();
  const cityNorm = stripAdminSuffix(city)?.toLowerCase();
  if (cityNorm && cityNorm !== areaNorm) {
    pushUniquePart(displayParts, stripAdminSuffix(city));
  }
  if (district && district.toLowerCase() !== cityNorm && district.toLowerCase() !== areaNorm) {
    pushUniquePart(displayParts, district);
  }

  const compactDisplay = displayParts.join(", ");
  const fallbackDisplay = firstNonEmptyText(data?.display_name);

  return {
    source: "nominatim",
    formatted: compactDisplay || fallbackDisplay || "Unknown Location",
    village: village || "",
    colony: colony || "",
    suburb: suburb || "",
    city: stripAdminSuffix(city) || locality || district || "Unknown",
    state: state || "",
    country: country || "",
    pincode: pincode || "",
    district: district || "",
    area: area || "",
    street: street || "",
    locality: locality || suburb || "",
    poiName: poiName,
    displayName: compactDisplay || fallbackDisplay || "Unknown Location",
    rawDisplayName: fallbackDisplay || "",
  };
};
const parseBigDataCloudAddress = (data = {}) => {
  const informative = Array.isArray(data?.localityInfo?.informative)
    ? data.localityInfo.informative
    : [];
  const poiName = firstNonEmptyText(
    pickInformativeName(informative, (type) =>
      /point|poi|landmark|building|campus|school|college|university|hospital/i.test(
        type,
      ),
    ),
    pickInformativeName(informative, (type) =>
      /mall|market|stadium|station|office|park/i.test(type),
    ),
  );
  const street = firstNonEmptyText(
    data?.localityInfo?.informative?.find(
      (item) => String(item?.type || "").toLowerCase() === "street",
    )?.name,
    data?.localityInfo?.informative?.find(
      (item) => String(item?.type || "").toLowerCase() === "road",
    )?.name,
  );
  const village = firstNonEmptyText(
    data?.localityInfo?.informative?.find(
      (item) => /village|hamlet/i.test(String(item?.type || "")),
    )?.name,
  );
  const colony = firstNonEmptyText(
    data?.localityInfo?.informative?.find(
      (item) => /neighbourhood|neighborhood|residential|colony/i.test(String(item?.type || "")),
    )?.name,
  );
  const suburb = firstNonEmptyText(
    data?.localityInfo?.informative?.find(
      (item) => /suburb/i.test(String(item?.type || "")),
    )?.name,
  );
  const area = firstNonEmptyText(
    colony,
    suburb,
    data?.locality,
    village,
    data?.localityInfo?.informative?.find(
      (item) => /district/i.test(String(item?.type || "")),
    )?.name,
  );
  // Prefer actual city; avoid locality which is area-level
  const rawCity = firstNonEmptyText(data?.city);
  const city = stripAdminSuffix(rawCity) || firstNonEmptyText(village, data?.locality) || "Unknown";
  const state = firstNonEmptyText(data?.principalSubdivision, data?.region);
  const country = firstNonEmptyText(data?.countryName, data?.countryCode);
  const pincode = firstNonEmptyText(data?.postcode);
  const district = firstNonEmptyText(data?.localityInfo?.administrative?.[2]?.name);

  const displayParts = [];
  pushUniquePart(displayParts, street);
  pushUniquePart(displayParts, area);
  const areaNorm = stripAdminSuffix(area)?.toLowerCase();
  const cityNorm = stripAdminSuffix(city)?.toLowerCase();
  if (cityNorm && cityNorm !== areaNorm) {
    pushUniquePart(displayParts, stripAdminSuffix(city));
  }
  if (district && district.toLowerCase() !== cityNorm && district.toLowerCase() !== areaNorm) {
    pushUniquePart(displayParts, district);
  }

  return {
    source: "bigdatacloud",
    formatted: displayParts.join(", ") || city || "Unknown Location",
    city: city || "Unknown",
    state: state || "",
    country: country || "",
    pincode: pincode || "",
    district: district || "",
    area: area || "",
    street: street || "",
    village: village || "",
    colony: colony || "",
    suburb: suburb || "",
    locality: firstNonEmptyText(suburb, data?.locality),
    poiName: poiName,
    displayName: displayParts.join(", ") || city || "Unknown Location",
    rawDisplayName: firstNonEmptyText(data?.locality, data?.city),
  };
};
const mergeAddressResults = (primary = null, secondary = null) => {
  if (!primary && !secondary) {
    return {
      formatted: "Unknown Location",
      city: "Unknown",
      state: "",
      country: "",
      pincode: "",
      district: "",
      area: "",
      street: "",
      locality: "",
      displayName: "Unknown Location",
      rawDisplayName: "",
      source: "unknown",
    };
  }
  if (!primary) return secondary;
  if (!secondary) return primary;

  const merged = {
    source: [primary.source, secondary.source].filter(Boolean).join("+"),
    poiName: firstNonEmptyText(primary.poiName, secondary.poiName),
    street: firstNonEmptyText(primary.street, secondary.street),
    village: firstNonEmptyText(primary.village, secondary.village),
    colony: firstNonEmptyText(primary.colony, secondary.colony),
    suburb: firstNonEmptyText(primary.suburb, secondary.suburb),
    area: firstNonEmptyText(primary.area, secondary.area),
    locality: firstNonEmptyText(primary.suburb, secondary.suburb, primary.locality, secondary.locality),
    city: (() => {
      const a = primary?.city || "";
      const b = secondary?.city || "";
      // Prefer the source whose city doesn't end with mandal/district/tehsil etc.
      const adminPattern = /\s+(mandal|district|municipality|tehsil|taluk|block|division)$/i;
      if (a && !adminPattern.test(a)) return a;
      if (b && !adminPattern.test(b)) return b;
      // Both have admin suffix — strip it from the one that's an actual city
      return stripAdminSuffix(a) || stripAdminSuffix(b) || "Unknown";
    })(),
    district: firstNonEmptyText(primary.district, secondary.district),
    state: firstNonEmptyText(primary.state, secondary.state),
    country: firstNonEmptyText(primary.country, secondary.country),
    pincode: firstNonEmptyText(primary.pincode, secondary.pincode),
    rawDisplayName: firstNonEmptyText(
      primary.rawDisplayName,
      secondary.rawDisplayName,
    ),
  };

  // Build display with deduplication — most specific → least specific
  // Strip admin suffixes for comparison (mandal, district, tehsil, etc.)
  const norm = (v) => stripAdminSuffix(v)?.toLowerCase() || "";
  const cityN = norm(merged.city);
  const areaN = norm(merged.area);
  const distN = norm(merged.district);

  const displayParts = [];
  if (merged.poiName) pushUniquePart(displayParts, merged.poiName);
  if (merged.colony && norm(merged.colony) !== areaN && norm(merged.colony) !== cityN) {
    pushUniquePart(displayParts, merged.colony);
  }
  if (merged.village && norm(merged.village) !== cityN && norm(merged.village) !== areaN) {
    pushUniquePart(displayParts, merged.village);
  }
  // Area (suburb/locality level)
  if (merged.area) {
    pushUniquePart(displayParts, stripAdminSuffix(merged.area) || merged.area);
  }
  // City — only if different from area
  if (cityN && cityN !== areaN) {
    pushUniquePart(displayParts, stripAdminSuffix(merged.city) || merged.city);
  }
  // District — only if different from city and area
  if (distN && distN !== cityN && distN !== areaN) {
    pushUniquePart(displayParts, merged.district);
  }

  merged.displayName =
    displayParts.join(", ") || merged.rawDisplayName || "Unknown Location";
  merged.formatted = merged.displayName;
  return merged;
};
const fetchNominatimAddress = async (lat, lng) => {
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=en&zoom=18&addressdetails=1&namedetails=1&extratags=1`,
    {
      headers: {
        Accept: "application/json",
      },
    },
    REVERSE_GEOCODE_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error(`Nominatim failed (${response.status})`);
  }
  const data = await response.json();
  placesEndpointUnavailableUntil = 0;
  placesRateLimitUntil = 0;
  return parseNominatimAddress(data);
};
const fetchBigDataCloudAddress = async (lat, lng) => {
  const response = await fetchWithTimeout(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
    {
      headers: {
        Accept: "application/json",
      },
    },
    REVERSE_GEOCODE_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error(`BigDataCloud failed (${response.status})`);
  }
  const data = await response.json();
  return parseBigDataCloudAddress(data);
};
const resolveAddress = async (lat, lng) => {
  try {
    const cacheKey = `${Number(lat).toFixed(REVERSE_GEOCODE_ROUNDING_DIGITS)}:${Number(lng).toFixed(REVERSE_GEOCODE_ROUNDING_DIGITS)}`;
    const cached = reverseGeocodeCache.get(cacheKey);
    if (
      cached &&
      Date.now() - cached.timestamp <= REVERSE_GEOCODE_CACHE_TTL_MS
    ) {
      return cached.value;
    }

    const existingRequest = reverseGeocodeInFlight.get(cacheKey);
    if (existingRequest) {
      return existingRequest;
    }

    const lookupRequest = (async () => {
      const [nominatimResult, bigDataCloudResult] = await Promise.allSettled([
        fetchNominatimAddress(lat, lng),
        fetchBigDataCloudAddress(lat, lng),
      ]);

      const nominatimAddress =
        nominatimResult.status === "fulfilled" ? nominatimResult.value : null;
      const bigDataCloudAddress =
        bigDataCloudResult.status === "fulfilled" ? bigDataCloudResult.value : null;

      if (nominatimResult.status === "rejected") {
        debugLog(
          "Nominatim reverse geocode failed:",
          nominatimResult.reason?.message || nominatimResult.reason,
        );
      }
      if (bigDataCloudResult.status === "rejected") {
        debugLog(
          "BigDataCloud reverse geocode failed:",
          bigDataCloudResult.reason?.message || bigDataCloudResult.reason,
        );
      }

      const normalized = mergeAddressResults(nominatimAddress, bigDataCloudAddress);

      reverseGeocodeCache.set(cacheKey, {
        timestamp: Date.now(),
        value: normalized,
      });
      return normalized;
    })().finally(() => {
        reverseGeocodeInFlight.delete(cacheKey);
      });

    reverseGeocodeInFlight.set(cacheKey, lookupRequest);
    const normalized = await lookupRequest;

    return normalized;
  } catch (err) {
    console.warn("[LocationService] Address resolution failed:", err);
    return {
      formatted: "Unknown Location",
      city: "Unknown",
      state: "",
      country: "",
      pincode: "",
      district: "",
      area: "",
      street: "",
      locality: "",
      displayName: "Unknown Location",
      rawDisplayName: "",
      source: "unknown",
    };
  }
};
const shouldUseGooglePlaces = () => {
  if (LOCATION_POI_PROVIDER === "google") return true;
  if (LOCATION_POI_PROVIDER === "auto") return true;
  return false;
};
const fetchGooglePlacesNearest = async (lat, lng) => {
  if (!shouldUseGooglePlaces()) return null;
  if (!isPlacesEndpointAvailable()) return null;
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(GOOGLE_PLACES_RADIUS_METERS),
  });
  const language =
    typeof window !== "undefined"
      ? window.localStorage?.getItem("mhub_language") ||
        window.localStorage?.getItem("lang")
      : "";
  if (language) {
    params.set("language", language);
  }
  const url = `${buildApiPath("/location/places/nearby")}?${params.toString()}`;
  const response = await fetchWithTimeout(url, {}, POI_LOOKUP_TIMEOUT_MS);
  if (!response.ok) {
    if (response.status === 404) {
      placesEndpointUnavailableUntil = Date.now() + PLACES_ENDPOINT_COOLDOWN_MS;
      debugLog("Places endpoint not found, pausing lookups.");
      return null;
    }
    if (response.status === 429) {
      const retryAfterMs = resolveRetryAfterMs(
        response.headers?.get?.("retry-after") ||
          response.headers?.get?.("Retry-After"),
      );
      placesRateLimitUntil = Date.now() + retryAfterMs;
      debugLog("Places endpoint rate limited, backing off.");
      return null;
    }
    throw new Error(`Google Places failed (${response.status})`);
  }
  const data = await response.json();
  if (data?.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
      // Suppress noise — cooldown for 10 minutes on auth/quota errors
      placesEndpointUnavailableUntil = Date.now() + 10 * 60 * 1000;
      debugLog(`Google Places ${data.status}, pausing lookups for 10 min.`);
      return null;
    }
    throw new Error(`Google Places error: ${data.status}`);
  }
  const results = Array.isArray(data?.results) ? data.results : [];
  if (!results.length) return null;
  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  results.forEach((item) => {
    const location = item?.geometry?.location;
    const placeLat = Number(location?.lat);
    const placeLng = Number(location?.lng);
    if (!isValidCoordinates(placeLat, placeLng)) return;
    const distance = getDistanceInMeters(lat, lng, placeLat, placeLng);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  });
  if (!best) return null;
  return {
    name: normalizePlaceName(best?.name),
    vicinity: normalizePlaceName(best?.vicinity),
    distanceMeters: bestDistance,
  };
};
const resolvePoiName = async (lat, lng, addressData = null) => {
  const cacheKey = buildPoiCacheKey(lat, lng);
  const cached = poiLookupCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp <= POI_CACHE_TTL_MS) {
    return cached.value || "";
  }

  const inFlight = poiLookupInFlight.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const lookupRequest = (async () => {
    let poiName = normalizePlaceName(addressData?.poiName);
    try {
      const googleResult = await fetchGooglePlacesNearest(lat, lng);
      const googleName = normalizePlaceName(googleResult?.name);
      if (googleName) {
        poiName = googleName;
      }
    } catch (error) {
      debugLog(
        "POI lookup failed, falling back to reverse geocode:",
        error?.message || error,
      );
    }

    poiLookupCache.set(cacheKey, { timestamp: Date.now(), value: poiName });
    return poiName;
  })().finally(() => {
    poiLookupInFlight.delete(cacheKey);
  });

  poiLookupInFlight.set(cacheKey, lookupRequest);
  return lookupRequest;
};
const composeDisplayName = (placeName, addressData = null) => {
  const baseName = normalizePlaceName(
    addressData?.displayName || addressData?.formatted || "",
  );
  const safePlaceName = normalizePlaceName(placeName);
  if (!safePlaceName) return baseName || "Unknown Location";
  if (baseName && baseName.toLowerCase().includes(safePlaceName.toLowerCase())) {
    return baseName;
  }
  return [safePlaceName, baseName].filter(Boolean).join(", ");
};
const trimAddressForCoarseAccuracy = (addressData) => {
  if (!addressData || typeof addressData !== "object") return addressData;
  const city =
    addressData.city ||
    addressData.locality ||
    addressData.district ||
    "";
  const state = addressData.state || "";
  const country = addressData.country || "";
  const displayName =
    [city, state, country].filter(Boolean).join(", ") ||
    addressData.displayName ||
    addressData.formatted ||
    "Unknown Location";
  return {
    ...addressData,
    street: "",
    area: "",
    locality: "",
    suburb: "",
    colony: "",
    village: "",
    placeName: "",
    poiName: "",
    displayName,
  };
};
// Also store the location object's suburb field for richer data

const getNativePositionWithSampling = async (options = {}) => {
  const targetAccuracy = Number.isFinite(options.targetAccuracy)
    ? Number(options.targetAccuracy)
    : WEB_TARGET_ACCURACY_METERS;
  const samples = [];
  const firstFix = await Geolocation.getCurrentPosition(GEO_OPTIONS);
  samples.push(firstFix);
  debugLog("Native fix #1 accuracy:", getPositionAccuracy(firstFix), "m");

  const needsRefinement = getPositionAccuracy(firstFix) > targetAccuracy;

  if (needsRefinement) {
    // Progressive sampling: take multiple fixes with increasing delays
    for (let i = 1; i < NATIVE_MAX_SAMPLES; i++) {
      await sleep(NATIVE_SECOND_FIX_DELAY_MS + i * 500);
      try {
        const fix = await Geolocation.getCurrentPosition({
          ...GEO_OPTIONS,
          timeout: 25e3,
        });
        samples.push(fix);
        debugLog(`Native fix #${i + 1} accuracy:`, getPositionAccuracy(fix), "m");
        if (getPositionAccuracy(fix) <= targetAccuracy) break;
      } catch (error) {
        debugLog(`Native GPS sample #${i + 1} failed:`, error?.message || error);
      }
    }
  }

  // Try native watchPosition refinement if still not precise enough
  const bestSoFar = pickBestPosition(samples) || firstFix;
  if (getPositionAccuracy(bestSoFar) > targetAccuracy) {
    const refined = await refineNativePositionWithWatch(bestSoFar, targetAccuracy);
    samples.push(refined);
  }

  // Extra sampling loop for native (parity with browser extra sampling)
  const bestAfterWatch = pickBestPosition(samples) || firstFix;
  if (getPositionAccuracy(bestAfterWatch) > targetAccuracy) {
    for (let extra = 0; extra < WEB_EXTRA_SAMPLE_ATTEMPTS; extra++) {
      await sleep(WEB_EXTRA_SAMPLE_DELAY_MS + extra * 500);
      try {
        const extraFix = await Geolocation.getCurrentPosition({
          ...GEO_OPTIONS,
          timeout: 15e3,
        });
        samples.push(extraFix);
        debugLog(`Native extra sample #${extra + 1} accuracy:`, getPositionAccuracy(extraFix), "m");
        if (getPositionAccuracy(extraFix) <= targetAccuracy) break;
      } catch (err) {
        debugLog(`Native extra sample #${extra + 1} failed:`, err?.message || err);
      }
    }
  }

  // Apply multi-stage filtering pipeline to all collected samples
  const bestRaw = pickBestPosition(samples) || firstFix;
  const cleanedSamples = discardFirstFixIfOutlier(samples);
  if (cleanedSamples.length >= 3) {
    const kalmanResult = kalmanFilteredPosition(cleanedSamples, bestRaw);
    if (getPositionAccuracy(kalmanResult) <= getPositionAccuracy(bestRaw)) {
      return kalmanResult;
    }
    const filtered = medianFilteredPosition(cleanedSamples, bestRaw);
    if (getPositionAccuracy(filtered) <= getPositionAccuracy(bestRaw)) {
      return filtered;
    }
  }
  return bestRaw;
};
const refineNativePositionWithWatch = async (initialFix, targetAccuracy) => {
  let bestFix = initialFix;
  const watchSamples = [initialFix];
  return new Promise((resolve) => {
    let resolved = false;
    let watchId = null;
    let timer = null;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      if (watchId !== null) {
        Geolocation.clearWatch({ id: watchId }).catch(() => {});
      }
      if (timer) clearTimeout(timer);
      // Apply Kalman filtering to watch samples
      let finalFix = bestFix;
      if (watchSamples.length >= 3) {
        const kalmanCandidate = kalmanFilteredPosition(watchSamples, bestFix);
        const medianCandidate = medianFilteredPosition(watchSamples, bestFix);
        finalFix = getPositionAccuracy(kalmanCandidate) <= getPositionAccuracy(medianCandidate)
          ? kalmanCandidate
          : medianCandidate;
      }
      resolve(finalFix);
    };
    timer = setTimeout(finish, NATIVE_WATCH_MAX_DURATION_MS);
    Geolocation.watchPosition(
      { ...GEO_OPTIONS, timeout: NATIVE_WATCH_MAX_DURATION_MS },
      (position, err) => {
        if (err || !position) return;
        if (!isPositionUsable(position)) return;
        watchSamples.push(position);
        const nextAcc = getPositionAccuracy(position);
        const bestAcc = getPositionAccuracy(bestFix);
        if (nextAcc + WEB_WATCH_MIN_IMPROVEMENT_METERS < bestAcc) {
          bestFix = position;
          debugLog("Native watch improved to:", nextAcc, "m");
        }
        if (getPositionAccuracy(bestFix) <= targetAccuracy) finish();
      },
    ).then((id) => { watchId = id; }).catch(() => finish());
  });
};
export const getCurrentLocation = async (options = {}) => {
  const targetAccuracy = Number.isFinite(options.targetAccuracy)
    ? Number(options.targetAccuracy)
    : WEB_TARGET_ACCURACY_METERS;
  const hotCached = getRuntimeCachedLocation(targetAccuracy, 2e4);
  if (hotCached) {
    return hotCached;
  }

  try {
    const isNativePlatform = Capacitor.isNativePlatform();
    let coordinates;
    let provider = "browser_gps";
    if (!isNativePlatform) {
      coordinates = await getBrowserPosition({ targetAccuracy });
      provider = "browser_gps";
    } else {
      let useBrowserPermissionFlow = false;
      try {
        const permissionStatus = await Geolocation.checkPermissions();
        if (permissionStatus.location !== "granted") {
          const requestStatus = await Geolocation.requestPermissions();
          if (requestStatus.location !== "granted") {
            const deniedError = new Error(
              "Location permission denied. Cannot capture high-accuracy logs.",
            );
            deniedError.name = "PermissionDeniedError";
            throw deniedError;
          }
        }
      } catch (permissionError) {
        if (permissionError?.name === "PermissionDeniedError") {
          throw permissionError;
        }
        console.warn(
          "[LocationService] Capacitor permission check unavailable, using browser geolocation flow:",
          permissionError?.message || permissionError,
        );
        useBrowserPermissionFlow = true;
      }
      if (useBrowserPermissionFlow) {
        coordinates = await getBrowserPosition({ targetAccuracy });
        provider = "browser_gps_fallback";
      } else {
        try {
          coordinates = await getNativePositionWithSampling({ targetAccuracy });
          provider = "native_gps";
        } catch (geoError) {
          debugLog(
            "Capacitor geolocation failed, trying browser fallback:",
            geoError?.message || geoError,
          );
          coordinates = await getBrowserPosition({ targetAccuracy });
          provider = "browser_gps_fallback";
        }
      }
    }
    const {
      latitude: latitude,
      longitude: longitude,
      speed: speed,
      accuracy: accuracy,
      altitude: altitude,
      altitudeAccuracy: altitudeAccuracy,
      heading: heading,
    } = coordinates.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Invalid GPS coordinates");
    }
    debugLog(`GPS fix: ${latitude.toFixed(7)}, ${longitude.toFixed(7)} ±${accuracy ? Math.round(accuracy) : '?'}m`);
    const normalizedLat = roundCoordinate(latitude);
    const normalizedLng = roundCoordinate(longitude);
    const isVeryCoarseAccuracy =
      Number.isFinite(accuracy) && accuracy > ACCURACY_TIER_COARSE;
    let addressData = await resolveAddress(normalizedLat, normalizedLng);
    if (isVeryCoarseAccuracy) {
      addressData = trimAddressForCoarseAccuracy(addressData);
    }
    debugLog("Reverse geocode result:", {
      source: addressData?.source,
      colony: addressData?.colony,
      suburb: addressData?.suburb,
      village: addressData?.village,
      locality: addressData?.locality,
      area: addressData?.area,
      city: addressData?.city,
      district: addressData?.district,
      street: addressData?.street,
      displayName: addressData?.displayName,
    });
    const placeName = isVeryCoarseAccuracy
      ? ""
      : await resolvePoiName(normalizedLat, normalizedLng, addressData);
    const displayName = composeDisplayName(placeName, addressData);
    debugLog("Composed displayName:", displayName, "| placeName:", placeName);
    const enrichedAddress = {
      ...addressData,
      placeName: placeName || addressData?.poiName || "",
      displayName: displayName,
    };
    const isMock = Boolean(
      coordinates?.mocked ??
        coordinates?.coords?.mocked ??
        coordinates?.coords?.isMocked ??
        coordinates?.coords?.isMock,
    );
    const location = {
      latitude: normalizedLat,
      longitude: normalizedLng,
      lat: normalizedLat,
      lng: normalizedLng,
      accuracy: accuracy,
      altitude: Number.isFinite(altitude) ? altitude : null,
      altitudeAccuracy: Number.isFinite(altitudeAccuracy) ? altitudeAccuracy : null,
      heading: Number.isFinite(heading) ? heading : null,
      isMock,
      speed: speed || 0,
      address: enrichedAddress,
      city: enrichedAddress.city,
      state: enrichedAddress.state,
      country: enrichedAddress.country,
      area: enrichedAddress.area || enrichedAddress.locality || "",
      village: enrichedAddress.village || "",
      colony: enrichedAddress.colony || "",
      suburb: enrichedAddress.suburb || "",
      locality: enrichedAddress.locality || enrichedAddress.suburb || "",
      district: enrichedAddress.district || "",
      pincode: enrichedAddress.pincode || "",
      street: enrichedAddress.street || "",
      placeName: enrichedAddress.placeName || "",
      displayName: enrichedAddress.displayName,
      provider: provider,
      timestamp: Date.now(),
    };

    setRuntimeCachedLocation(location);
    return location;
  } catch (error) {
    if (error?.name === "PermissionDeniedError") {
      console.warn(
        "[LocationService] Location permission denied by user/browser settings.",
      );
      throw error;
    }
    console.error("[LocationService] Critical Location Error:", error);
    throw error;
  }
};
export const getBestAvailableLocation = async (options = {}) => {
  const {
    requiredAccuracy: requiredAccuracy = DEFAULT_REQUIRED_ACCURACY_METERS,
    allowCache: allowCache = true,
    allowIpFallback: allowIpFallback = true,
    cacheMaxAgeMs: cacheMaxAgeMs = DEFAULT_CACHE_MAX_AGE_MS,
    strictAccuracy: strictAccuracy = true,
    targetAccuracy: targetAccuracy = null,
  } = options;

  const parsedRequiredAccuracy = Number(requiredAccuracy);
  const accuracyCeiling = strictAccuracy
    ? STRICT_REQUIRED_ACCURACY_METERS
    : Number.POSITIVE_INFINITY;
  const fallbackAccuracy = strictAccuracy
    ? STRICT_REQUIRED_ACCURACY_METERS
    : DEFAULT_COARSE_REQUIRED_ACCURACY_METERS;
  const effectiveRequiredAccuracy =
    Number.isFinite(parsedRequiredAccuracy) && parsedRequiredAccuracy > 0
      ? Math.min(parsedRequiredAccuracy, accuracyCeiling)
      : fallbackAccuracy;
  const effectiveTargetAccuracy =
    Number.isFinite(targetAccuracy) && Number(targetAccuracy) > 0
      ? Number(targetAccuracy)
      : effectiveRequiredAccuracy;

  const allowRuntimeOrDiskCache = allowCache;
  const allowIpFallbackForSession = allowIpFallback;

  const classifyAccuracy = (acc) => {
    if (!Number.isFinite(acc)) return "unknown";
    if (acc <= ACCURACY_TIER_PRECISE) return "precise";
    if (acc <= ACCURACY_TIER_GOOD) return "good";
    if (acc <= ACCURACY_TIER_MODERATE) return "moderate";
    if (acc <= ACCURACY_TIER_COARSE) return "coarse";
    return "very_coarse";
  };
  const tagMeetsTarget = (location) => {
    if (!location) return location;
    location.meetsTargetAccuracy = true;
    location.targetAccuracyMeters = effectiveRequiredAccuracy;
    location.accuracyTier = classifyAccuracy(Number(location.accuracy));
    return location;
  };

  const errors = [];
  let bestCandidate = null;

  if (allowRuntimeOrDiskCache) {
    const runtimeCached = getRuntimeCachedLocation(
      effectiveRequiredAccuracy,
      Math.min(cacheMaxAgeMs, RUNTIME_CACHE_MAX_AGE_MS),
    );
    if (runtimeCached) {
      bestCandidate = pickMorePreciseCandidate(bestCandidate, runtimeCached);
      if (isAccuracyAcceptable(runtimeCached, effectiveRequiredAccuracy)) {
        return tagMeetsTarget(runtimeCached);
      }
    }
  }

  for (let attempt = 0; attempt < LIVE_CAPTURE_ATTEMPTS; attempt += 1) {
    try {
      if (attempt > 0) {
        await sleep(600 + attempt * 400);
      }

      const capturedLocation = await getCurrentLocation({
        targetAccuracy: effectiveTargetAccuracy,
      });
      const normalized = normalizeLocationShape(capturedLocation, {
        provider: capturedLocation.provider || "gps",
      });
      if (normalized) {
        // ── Fake/Mock location detection ──────────────────
        try {
          const spoofCheck = analyzeLocationForSpoofing(capturedLocation, bestCandidate);
          recordLocationReading(capturedLocation);
          if (spoofCheck.isSpoofed) {
            debugLog(`[SPOOF] Location spoofing detected (score: ${spoofCheck.score}, signals: ${spoofCheck.signals.join(", ")})`);
            normalized._spoofDetected = true;
            normalized._spoofScore = spoofCheck.score;
            normalized._spoofSignals = spoofCheck.signals;
            normalized._locationTrustScore = getLocationTrustScore();
            // Don't use spoofed location — skip and retry
            errors.push(new Error(`Location spoofing detected: ${spoofCheck.signals.join(", ")}`));
            continue;
          }
          normalized._locationTrustScore = getLocationTrustScore();
        } catch (spoofErr) {
          debugLog(`[SPOOF] Detection check failed: ${spoofErr.message}`);
        }
        // ── End spoof detection ───────────────────────────
        bestCandidate = pickMorePreciseCandidate(bestCandidate, normalized);
        setRuntimeCachedLocation(normalized);
        if (isAccuracyAcceptable(normalized, effectiveRequiredAccuracy)) {
          return tagMeetsTarget(normalized);
        }

        const accuracy = normalized.accuracy;
        errors.push(
          new Error(`Coarse location accuracy (${Math.round(accuracy)}m)`),
        );

        // If accuracy is hopeless (>10km), retrying won't help — skip remaining attempts
        if (Number.isFinite(accuracy) && accuracy > HOPELESS_ACCURACY_METERS) {
          debugLog(`GPS accuracy ${Math.round(accuracy)}m is beyond recovery, skipping retry.`);
          break;
        }
      }
    } catch (err) {
      errors.push(err);
    }

    if (getAccuracyScore(bestCandidate) <= effectiveRequiredAccuracy) {
      break;
    }
  }

  if (allowRuntimeOrDiskCache) {
    const cached = getRecentCachedLocation(cacheMaxAgeMs);
    if (cached) {
      bestCandidate = pickMorePreciseCandidate(bestCandidate, cached);
      if (isAccuracyAcceptable(cached, effectiveRequiredAccuracy)) {
        setRuntimeCachedLocation(cached);
        return tagMeetsTarget(cached);
      }
    }
  }

  const shouldTryIpFallback =
    allowIpFallbackForSession && (!bestCandidate || getAccuracyScore(bestCandidate) > ACCURACY_TIER_COARSE);
  if (shouldTryIpFallback) {
    const ipLocation = await getIPBasedFallbackLocation();
    if (ipLocation) {
      bestCandidate = pickMorePreciseCandidate(bestCandidate, ipLocation);
      if (isAccuracyAcceptable(ipLocation, effectiveRequiredAccuracy)) {
        setRuntimeCachedLocation(ipLocation);
        return tagMeetsTarget(ipLocation);
      }
    }
  }

  const bestAccuracy = Number(bestCandidate?.accuracy);
  const accuracyKnown = Number.isFinite(bestAccuracy);
  const meetsStrictTarget =
    bestCandidate && accuracyKnown && bestAccuracy <= effectiveRequiredAccuracy;

  if (meetsStrictTarget) {
    setRuntimeCachedLocation(bestCandidate);
    return tagMeetsTarget(bestCandidate);
  }

  // Graceful degradation: return best available location with quality metadata
  // instead of throwing. Callers can check .accuracyTier to decide what to show.
  if (bestCandidate) {
    const acc = accuracyKnown ? bestAccuracy : null;
    let accuracyTier = "unknown";
    if (acc !== null) {
      if (acc <= ACCURACY_TIER_PRECISE) accuracyTier = "precise";
      else if (acc <= ACCURACY_TIER_GOOD) accuracyTier = "good";
      else if (acc <= ACCURACY_TIER_MODERATE) accuracyTier = "moderate";
      else if (acc <= ACCURACY_TIER_COARSE) accuracyTier = "coarse";
      else accuracyTier = "very_coarse";
    }
    bestCandidate.accuracyTier = accuracyTier;
    bestCandidate.meetsTargetAccuracy = false;
    bestCandidate.targetAccuracyMeters = effectiveRequiredAccuracy;
    debugLog(`Returning best-effort location: ${acc !== null ? Math.round(acc) + 'm' : 'unknown'} (${accuracyTier}), target was ${effectiveRequiredAccuracy}m`);
    setRuntimeCachedLocation(bestCandidate);
    return bestCandidate;
  }

  if (errors.length) {
    throw errors[0];
  }

  throw new Error("Unable to determine location");
};

export const getHighPrecisionLocation = async (options = {}) => {
  const requiredAccuracy =
    Number(options.requiredAccuracy) || VERIFY_REQUIRED_ACCURACY_METERS;
  const cacheMaxAgeMs =
    Number(options.cacheMaxAgeMs) || Math.min(VERIFY_MAX_AGE_MS, 15 * 1000);
  const allowCache = options.allowCache === true;
  const location = await getBestAvailableLocation({
    allowCache,
    allowIpFallback: false,
    cacheMaxAgeMs,
    requiredAccuracy,
    strictAccuracy: true,
    targetAccuracy: requiredAccuracy,
  });
  // For high-precision verification, we cannot accept degraded locations
  if (location.meetsTargetAccuracy === false) {
    const acc = Number(location.accuracy);
    throw new Error(
      `Unable to achieve required GPS accuracy (<=${requiredAccuracy}m). Best captured accuracy: ${Number.isFinite(acc) ? Math.round(acc) + 'm' : 'unknown'}.`,
    );
  }
  const ageMs = Date.now() - parseTimestamp(location.timestamp);
  if (ageMs > VERIFY_MAX_AGE_MS) {
    throw new Error("Location fix too old for verification.");
  }
  const accuracy = Number(location.accuracy);
  if (!Number.isFinite(accuracy)) {
    throw new Error("Location accuracy unavailable for verification.");
  }
  if (location.isMock) {
    throw new Error("Mock location detected.");
  }
  if (Number.isFinite(accuracy) && accuracy > VERIFY_MAX_ACCURACY_METERS) {
    throw new Error("Location accuracy too low for verification.");
  }
  return location;
};
export async function sendLocation(locationData) {
  if (locationSyncInFlight) {
    debugLog("Skipping location sync: in_flight");
    return { skipped: true, reason: "in_flight" };
  }
  locationSyncInFlight = true;
  try {
    const payload = buildLocationPayload(locationData);
    const skipDecision = shouldSkipLocationSync(payload);
    if (skipDecision?.skip) {
      debugLog("Skipping location sync:", skipDecision.reason);
      return {
        skipped: true,
        reason: skipDecision.reason,
        retryAfterMs: skipDecision.waitMs || null,
      };
    }
    debugLog("Sending location to backend:", payload);
    const endpointCandidates = getLocationEndpointCandidates();
    let lastError = null;
    const headers = {
      "Content-Type": "application/json",
      "X-MHub-Timestamp": String(Date.now()),
      "X-MHub-Nonce": crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["X-XSRF-TOKEN"] = decodeURIComponent(csrfToken);
    }
    for (
      let endpointIndex = 0;
      endpointIndex < endpointCandidates.length;
      endpointIndex += 1
    ) {
      const endpoint = endpointCandidates[endpointIndex];
      for (
        let attempt = 0;
        attempt < LOCATION_SYNC_MAX_ATTEMPTS_PER_ENDPOINT;
        attempt += 1
      ) {
        try {
          const response = await fetchWithTimeout(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload),
            credentials: "include",
          });
          if (!response.ok) {
            const contentType = response.headers?.get?.("content-type") || "";
            let errText = "";
            let errPayload = null;
            if (contentType.includes("application/json")) {
              errPayload = await response.json().catch(() => null);
              errText = errPayload ? JSON.stringify(errPayload) : "";
            } else {
              errText = await response.text();
            }
            lastError = `Server returned ${response.status}: ${errText}`;
            if (response.status === 429) {
              const retryAfterHeader =
                response.headers?.get?.("retry-after") ||
                response.headers?.get?.("Retry-After");
              let retryAfterMs = resolveRetryAfterMs(
                retryAfterHeader,
                LOCATION_SYNC_COOLDOWN_FALLBACK_MS,
              );
              const retryAfterBody = Number(
                errPayload?.retryAfter ?? errPayload?.retry_after,
              );
              if (Number.isFinite(retryAfterBody)) {
                const bodyMs =
                  retryAfterBody > 1000 ? retryAfterBody : retryAfterBody * 1000;
                retryAfterMs = Math.max(retryAfterMs, bodyMs);
              }
              setLocationSyncCooldown(retryAfterMs);
              debugLog("Location sync rate limited, backing off.", {
                retryAfterMs,
              });
              return {
                skipped: true,
                reason: "rate_limited",
                retryAfterMs,
              };
            }
            if (isRouteNotFoundPayload(response.status, errText)) {
              debugLog(
                `Endpoint not found at ${endpoint}, trying fallback target.`,
              );
              break;
            }
            throw new Error(lastError);
          }
          const result = await response.json();
          if (endpointIndex > 0) {
            debugLog(`Location sync fallback succeeded via ${endpoint}`);
          }
          debugLog("Backend response:", result);
          writeLastLocationSync(payload);
          return result;
        } catch (error) {
          lastError = error.message;
          debugLog(
            `sendLocation error (${endpoint}, attempt ${attempt + 1}):`,
            lastError,
          );
          const canRetrySameEndpoint =
            attempt < LOCATION_SYNC_MAX_ATTEMPTS_PER_ENDPOINT - 1 &&
            !/Server returned 404/i.test(lastError) &&
            !/Server returned 429/i.test(lastError);
          if (!canRetrySameEndpoint) {
            break;
          }
          await new Promise((resolve) =>
            setTimeout(resolve, LOCATION_SYNC_RETRY_DELAY_MS),
          );
        }
      }
    }
    throw new Error(lastError || "Location sync failed");
  } finally {
    locationSyncInFlight = false;
  }
}

export async function verifyLocation(options = {}) {
  const {
    locationData = null,
    targetLat = null,
    targetLng = null,
    targetUserId = null,
    targetRadiusMetres = VERIFY_TARGET_RADIUS_METERS,
    wifiBssids = null,
    cellInfo = null,
    sensorHash = null,
    integrity = null,
    storeSellerLocation = false,
    deviceId = null,
    userId = null,
    ipAddress = null,
  } = options;

  const normalizedCandidate = normalizeLocationShape(locationData, {
    provider: locationData?.provider || "gps",
  });
  let location = normalizedCandidate;
  if (location) {
    const ageMs = Date.now() - parseTimestamp(location.timestamp);
    const accuracy = Number(location.accuracy);
    if (ageMs > VERIFY_MAX_AGE_MS || !Number.isFinite(accuracy)) {
      location = null;
    } else if (Number.isFinite(accuracy) && accuracy > VERIFY_MAX_ACCURACY_METERS) {
      location = null;
    }
  }
  if (!location) {
    location = await getHighPrecisionLocation(options);
  }
  if (location.isMock) {
    throw new Error("Mock location detected.");
  }

  const payload = buildLocationVerificationPayload(location, {
    targetLat,
    targetLng,
    targetUserId,
    targetRadiusMetres,
    wifiBssids,
    cellInfo,
    sensorHash,
    integrity,
    storeSellerLocation,
    deviceId,
    userId,
    ipAddress,
  });

  if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
    throw new Error("Unable to capture precise GPS coordinates.");
  }

  const signature = await createLocationSignature(payload);
  if (signature) {
    payload.signature = signature;
  }

  const endpointCandidates = getLocationVerificationEndpointCandidates();
  let lastError = null;
  const headers = {
    "Content-Type": "application/json",
    "X-Device-Id": payload.device_id || getDeviceId(),
    "X-Timezone": Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["X-XSRF-TOKEN"] = decodeURIComponent(csrfToken);
  }
  if (signature) {
    headers["X-Location-Signature"] = signature;
  }

  for (let endpointIndex = 0; endpointIndex < endpointCandidates.length; endpointIndex += 1) {
    const endpoint = endpointCandidates[endpointIndex];
    for (let attempt = 0; attempt < LOCATION_SYNC_MAX_ATTEMPTS_PER_ENDPOINT; attempt += 1) {
      try {
        const response = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          credentials: "include",
        });
        if (!response.ok) {
          const errText = await response.text();
          lastError = `Server returned ${response.status}: ${errText}`;
          if (isRouteNotFoundPayload(response.status, errText)) {
            break;
          }
          throw new Error(lastError);
        }
        const result = await response.json();
        debugLog("Location verification response:", result);
        return { location, verification: result };
      } catch (error) {
        lastError = error.message;
        debugLog(
          `verifyLocation error (${endpoint}, attempt ${attempt + 1}):`,
          lastError,
        );
        const canRetrySameEndpoint =
          attempt < LOCATION_SYNC_MAX_ATTEMPTS_PER_ENDPOINT - 1 &&
          !/Server returned 404/i.test(lastError);
        if (!canRetrySameEndpoint) {
          break;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, LOCATION_SYNC_RETRY_DELAY_MS),
        );
      }
    }
  }

  throw new Error(lastError || "Location verification failed");
}
export async function captureLocation(userId = null) {
  try {
    const authenticatedSession = hasAuthenticatedSession() || Boolean(userId);
    const cacheMaxAgeMs = authenticatedSession ? 60 * 1000 : DEFAULT_CACHE_MAX_AGE_MS;
    const loc = await getBestAvailableLocation({
      allowCache: true,
      allowIpFallback: true,
      cacheMaxAgeMs,
      requiredAccuracy: STRICT_REQUIRED_ACCURACY_METERS,
      strictAccuracy: false,
    });
    const permissionStatus = getPermissionStatusFromProvider(loc.provider);
    const response = await sendLocation({
      user_id: userId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      speed: loc.speed,
      city: loc.city,
      area: loc.area || loc.address?.area || "",
      locality: loc.locality || loc.address?.locality || "",
      district: loc.district || loc.address?.district || "",
      state: loc.state,
      country: loc.country || "",
      pincode: loc.pincode || loc.address?.pincode || "",
      display_name: loc.displayName || loc.address?.displayName || "",
      provider: loc.provider || "browser_gps",
      permission_status: permissionStatus,
    });
    localStorage.setItem("user_location", JSON.stringify(attachOwner(loc)));
    writeUserCity(loc.area || loc.locality || loc.city || "");
    return { ...loc, backend: response };
  } catch (error) {
    console.warn("[LocationService] captureLocation failed:", error.message);
    throw error;
  }
}
export function clearCachedLocation() {
  console.log("[LocationService] Clearing cached location");
  LOCATION_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  clearUserCity();
  runtimeBestLocation = null;
}
export function getCachedLocation() {
  try {
    const cached = localStorage.getItem("user_location");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (!isOwnerMatch(parsed?.ownerKey)) {
        return null;
      }
      return parsed;
    }
  } catch (e) {
    console.error("[LocationService] Failed to parse cached location:", e);
  }
  return null;
}
const getDistanceInMeters = getDistanceFromCoords;
export async function checkAndSyncLocation(userId = null) {
  try {
    const authenticatedSession = hasAuthenticatedSession() || Boolean(userId);
    const cacheMaxAgeMs = authenticatedSession ? 60 * 1000 : DEFAULT_CACHE_MAX_AGE_MS;
    const loc = await getBestAvailableLocation({
      allowCache: true,
      allowIpFallback: true,
      cacheMaxAgeMs,
      requiredAccuracy: STRICT_REQUIRED_ACCURACY_METERS,
      strictAccuracy: false,
    });
    const lastSaved = getCachedLocation();
    if (lastSaved?.lat && lastSaved?.lng) {
      const distance = getDistanceInMeters(
        lastSaved.lat,
        lastSaved.lng,
        loc.lat,
        loc.lng,
      );
      if (distance < MIN_MOVEMENT_THRESHOLD) {
        debugLog(
          `Movement ${Math.round(distance)}m < threshold. Skipping sync.`,
        );
        return loc;
      }
    }
    return await syncLocationToBackend(
      userId || localStorage.getItem("userId"),
      loc,
    );
  } catch (error) {
    console.warn("[LocationService] Smart sync failed:", error.message);
  }
}
export async function syncLocationToBackend(userId, locationData = null) {
  if (!userId) return null;
  try {
    const authenticatedSession = hasAuthenticatedSession() || Boolean(userId);
    const cacheMaxAgeMs = authenticatedSession ? 60 * 1000 : DEFAULT_CACHE_MAX_AGE_MS;
    const loc =
      locationData ||
      (await getBestAvailableLocation({
        allowCache: true,
        allowIpFallback: true,
        cacheMaxAgeMs,
        requiredAccuracy: STRICT_REQUIRED_ACCURACY_METERS,
        strictAccuracy: false,
      }));
    const permissionStatus = getPermissionStatusFromProvider(loc.provider);
    await sendLocation({
      user_id: userId,
      latitude: loc.latitude || loc.lat,
      longitude: loc.longitude || loc.lng,
      city: loc.address?.city || loc.city || "",
      area: loc.address?.area || loc.area || "",
      locality: loc.address?.locality || loc.locality || "",
      district: loc.address?.district || loc.district || "",
      state: loc.address?.state || loc.state || "",
      country: loc.address?.country || loc.country || "",
      pincode: loc.address?.pincode || "",
      display_name: loc.address?.displayName || loc.displayName || "",
      accuracy: loc.accuracy ?? null,
      device_speed: loc.speed,
      provider: loc.provider || "browser_gps",
      permission_status: permissionStatus,
      last_active_at: new Date().toISOString(),
    });
    writeUserCity(
      loc.address?.area ||
        loc.address?.locality ||
        loc.address?.city ||
        loc.area ||
        loc.locality ||
        loc.city ||
        "",
    );
    localStorage.setItem("user_location", JSON.stringify(attachOwner(loc)));
    debugLog("Location synced:", loc.address?.city || loc.city || "Unknown");
    return loc;
  } catch (err) {
    console.error("[LocationService] Sync failed:", err);
    return null;
  }
}
