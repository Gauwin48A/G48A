import { Geolocation } from "@capacitor/geolocation";
import { Capacitor } from "@capacitor/core";
import { buildApiPath } from "@/lib/networkConfig";
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
  timeout: 10e3,
  maximumAge: 12e4,
};
const WEB_WATCH_GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 20e3,
  maximumAge: 0,
};
const WEB_ACCURACY_RETRY_THRESHOLD_METERS = 250;
const WEB_TARGET_ACCURACY_METERS = 80;
const WEB_WATCH_MAX_DURATION_MS = 20e3;
const WEB_WATCH_MIN_IMPROVEMENT_METERS = 12;
const WEB_EXTRA_SAMPLE_ATTEMPTS = 2;
const WEB_EXTRA_SAMPLE_DELAY_MS = 1100;
const WEB_STALE_FIX_MAX_AGE_MS = 2 * 60 * 1e3;
const NATIVE_ACCURACY_RETRY_THRESHOLD_METERS = 120;
const NATIVE_SECOND_FIX_DELAY_MS = 1200;
const STRICT_REQUIRED_ACCURACY_METERS = 100;
const DEFAULT_REQUIRED_ACCURACY_METERS = STRICT_REQUIRED_ACCURACY_METERS;
const DEFAULT_COARSE_REQUIRED_ACCURACY_METERS = 1500;
const DEFAULT_CACHE_MAX_AGE_MS = 15 * 60 * 1e3;
const RUNTIME_CACHE_MAX_AGE_MS = 45e3;
const RUNTIME_CACHE_RELAXED_FACTOR = 1.35;
const LIVE_CAPTURE_ATTEMPTS = 3;
const IP_FALLBACK_TIMEOUT_MS = 5e3;
const LOCATION_CACHE_KEYS = ["mhub_location", "user_location", "last_location"];
const MIN_MOVEMENT_THRESHOLD = 0;
const NETWORK_TIMEOUT_MS = 6e3;
const LOCATION_SYNC_MAX_ATTEMPTS_PER_ENDPOINT = 2;
const LOCATION_SYNC_RETRY_DELAY_MS = 1e3;
const REVERSE_GEOCODE_CACHE_TTL_MS = 30 * 60 * 1e3;
const REVERSE_GEOCODE_TIMEOUT_MS = 3500;
const REVERSE_GEOCODE_ROUNDING_DIGITS = 4;
const COORD_PRECISION_DIGITS = 7;
const POI_CACHE_TTL_MS = 30 * 60 * 1e3;
const POI_LOOKUP_TIMEOUT_MS = 3500;
const GOOGLE_PLACES_API_KEY = String(
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
).trim();
const GOOGLE_PLACES_RADIUS_METERS = 60;
const LOCATION_POI_PROVIDER = String(
  import.meta.env.VITE_LOCATION_POI_PROVIDER || "auto",
)
  .trim()
  .toLowerCase();
const LOCAL_DEV_BACKEND_ORIGINS = [
  "http://localhost:5001",
  "http://localhost:5000",
];
const DEBUG = import.meta.env.DEV;
let runtimeBestLocation = null;
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
const refineBrowserPositionWithWatch = async (initialFix) => {
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
  if (
    Number.isFinite(initialAccuracy) &&
    initialAccuracy <= WEB_TARGET_ACCURACY_METERS
  ) {
    return initialFix;
  }
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
      resolve(bestFix);
    };
    finishTimer = setTimeout(finish, WEB_WATCH_MAX_DURATION_MS);
    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (!isPositionUsable(position)) return;

          const currentBest = getPositionAccuracy(bestFix);
          const nextAccuracy = getPositionAccuracy(position);
          if (
            !Number.isFinite(currentBest) ||
            (Number.isFinite(nextAccuracy) &&
              nextAccuracy + WEB_WATCH_MIN_IMPROVEMENT_METERS < currentBest)
          ) {
            bestFix = position;
          }
          const bestAccuracy = getPositionAccuracy(bestFix);
          if (
            Number.isFinite(bestAccuracy) &&
            bestAccuracy <= WEB_TARGET_ACCURACY_METERS
          ) {
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
const getBrowserPosition = async () => {
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
  if (
    Number.isFinite(initialAccuracy) &&
    initialAccuracy > WEB_ACCURACY_RETRY_THRESHOLD_METERS
  ) {
    const refinedFix = await refineBrowserPositionWithWatch(best);
    addCandidate(refinedFix);
    best = pickBestPosition(rawCandidates) || best;
  }

  if (getPositionAccuracy(best) > WEB_ACCURACY_RETRY_THRESHOLD_METERS) {
    for (let attempt = 0; attempt < WEB_EXTRA_SAMPLE_ATTEMPTS; attempt += 1) {
      await sleep(WEB_EXTRA_SAMPLE_DELAY_MS);
      try {
        const extraFix = await getBrowserPositionOnce(WEB_GEO_OPTIONS);
        addCandidate(extraFix);
      } catch {
        // Keep best candidate captured so far.
      }
    }
    best = pickBestPosition(rawCandidates) || best;
  }

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
    if (typeof localStorage === "undefined") return false;
    return Boolean(
      localStorage.getItem("authToken") || localStorage.getItem("token"),
    );
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
        const normalized = normalizeLocationShape(parsed, {
          provider: "cached_location",
        });
        if (!normalized) return null;
        return { ...normalized, originalProvider: parsed?.provider || null };
      } catch {
        return null;
      }
    })
      .filter(Boolean)
      .filter((entry) => now - entry.timestamp <= maxAgeMs);
    if (!candidates.length) return null;
    candidates.sort((a, b) => {
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
      ...candidates[0],
      provider: "cached_location",
      originalProvider:
        candidates[0].originalProvider || candidates[0].provider || null,
    };
  } catch {
    return null;
  }
};
const getIPBasedFallbackLocation = async () => {
  try {
    const response = await fetchWithTimeout(
      "https://ipapi.co/json/",
      {},
      IP_FALLBACK_TIMEOUT_MS,
    );
    if (!response.ok) return null;
    const data = await response.json();
    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    if (!isValidCoordinates(latitude, longitude)) return null;
    const roundedLat = roundCoordinate(latitude);
    const roundedLng = roundCoordinate(longitude);
    return {
      latitude: roundedLat,
      longitude: roundedLng,
      lat: roundedLat,
      lng: roundedLng,
      accuracy: 5e3,
      speed: 0,
      city: data.city || "",
      state: data.region || "",
      country: data.country_name || "",
      displayName: [data.city, data.region, data.country_name]
        .filter(Boolean)
        .join(", "),
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
  return payload;
};
const getAccuracyScore = (location) => {
  const accuracy = Number(location?.accuracy);
  return Number.isFinite(accuracy) ? accuracy : Number.MAX_SAFE_INTEGER;
};
const isAccuracyAcceptable = (location, requiredAccuracy) => {
  const accuracy = Number(location?.accuracy);
  if (!Number.isFinite(accuracy)) return true;
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

  const score = getAccuracyScore(runtimeBestLocation);
  const threshold = Number(requiredAccuracy) * RUNTIME_CACHE_RELAXED_FACTOR;
  if (!Number.isFinite(score) || score <= threshold) {
    return { ...runtimeBestLocation };
  }

  return null;
};
const setRuntimeCachedLocation = (location) => {
  const normalized = normalizeLocationShape(location, {
    provider: location?.provider || "runtime_cache",
  });
  if (!normalized) return;
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

  const area = firstNonEmptyText(
    address.neighbourhood,
    address.suburb,
    address.residential,
    address.quarter,
    address.city_block,
    address.allotments,
    address.hamlet,
    address.locality,
  );

  const locality = firstNonEmptyText(
    address.city_district,
    address.borough,
    address.municipality,
    address.township,
    address.county,
  );

  const city = firstNonEmptyText(
    address.city,
    address.town,
    address.village,
    address.municipality,
    address.locality,
    address.suburb,
  );

  const district = firstNonEmptyText(
    address.state_district,
    address.county,
    address.city_district,
  );
  const state = firstNonEmptyText(address.state, address.region);
  const country = firstNonEmptyText(address.country);
  const pincode = firstNonEmptyText(address.postcode);

  const displayParts = [];
  pushUniquePart(displayParts, street);
  pushUniquePart(displayParts, area);
  pushUniquePart(displayParts, city || locality);
  pushUniquePart(displayParts, state);

  const compactDisplay = displayParts.join(", ");
  const fallbackDisplay = firstNonEmptyText(data?.display_name);

  return {
    source: "nominatim",
    formatted: compactDisplay || fallbackDisplay || "Unknown Location",
    city: city || locality || district || "Unknown",
    state: state || "",
    country: country || "",
    pincode: pincode || "",
    district: district || "",
    area: area || "",
    street: street || "",
    locality: locality || "",
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
  const area = firstNonEmptyText(data?.locality, data?.principalSubdivision);
  const city = firstNonEmptyText(data?.city, data?.locality, data?.principalSubdivision);
  const state = firstNonEmptyText(data?.principalSubdivision, data?.region);
  const country = firstNonEmptyText(data?.countryName, data?.countryCode);
  const pincode = firstNonEmptyText(data?.postcode);

  const displayParts = [];
  pushUniquePart(displayParts, street);
  pushUniquePart(displayParts, area);
  pushUniquePart(displayParts, city);
  pushUniquePart(displayParts, state);

  return {
    source: "bigdatacloud",
    formatted: displayParts.join(", ") || city || "Unknown Location",
    city: city || "Unknown",
    state: state || "",
    country: country || "",
    pincode: pincode || "",
    district: firstNonEmptyText(data?.localityInfo?.administrative?.[2]?.name),
    area: area || "",
    street: street || "",
    locality: firstNonEmptyText(data?.locality),
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
    area: firstNonEmptyText(primary.area, secondary.area),
    locality: firstNonEmptyText(primary.locality, secondary.locality),
    city: firstNonEmptyText(primary.city, secondary.city, "Unknown"),
    district: firstNonEmptyText(primary.district, secondary.district),
    state: firstNonEmptyText(primary.state, secondary.state),
    country: firstNonEmptyText(primary.country, secondary.country),
    pincode: firstNonEmptyText(primary.pincode, secondary.pincode),
    rawDisplayName: firstNonEmptyText(
      primary.rawDisplayName,
      secondary.rawDisplayName,
    ),
  };

  const displayParts = [];
  pushUniquePart(displayParts, merged.poiName);
  pushUniquePart(displayParts, merged.street);
  pushUniquePart(displayParts, merged.area);
  pushUniquePart(displayParts, merged.city || merged.locality);
  pushUniquePart(displayParts, merged.state);

  merged.displayName =
    displayParts.join(", ") || merged.rawDisplayName || "Unknown Location";
  merged.formatted = merged.displayName;
  return merged;
};
const fetchNominatimAddress = async (lat, lng) => {
  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&zoom=18&addressdetails=1&namedetails=1&extratags=1`,
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
  if (!GOOGLE_PLACES_API_KEY) return false;
  if (LOCATION_POI_PROVIDER === "google") return true;
  if (LOCATION_POI_PROVIDER === "auto") return true;
  return false;
};
const fetchGooglePlacesNearest = async (lat, lng) => {
  if (!shouldUseGooglePlaces()) return null;
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${GOOGLE_PLACES_RADIUS_METERS}&key=${GOOGLE_PLACES_API_KEY}`;
  const response = await fetchWithTimeout(url, {}, POI_LOOKUP_TIMEOUT_MS);
  if (!response.ok) {
    throw new Error(`Google Places failed (${response.status})`);
  }
  const data = await response.json();
  if (data?.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
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
const getNativePositionWithSampling = async () => {
  const samples = [];
  const firstFix = await Geolocation.getCurrentPosition(GEO_OPTIONS);
  samples.push(firstFix);

  if (getPositionAccuracy(firstFix) > NATIVE_ACCURACY_RETRY_THRESHOLD_METERS) {
    await sleep(NATIVE_SECOND_FIX_DELAY_MS);
    try {
      const secondFix = await Geolocation.getCurrentPosition({
        ...GEO_OPTIONS,
        timeout: 25e3,
      });
      samples.push(secondFix);
    } catch (error) {
      debugLog("Second native GPS sample failed:", error?.message || error);
    }
  }

  return pickBestPosition(samples) || firstFix;
};
export const getCurrentLocation = async () => {
  const hotCached = getRuntimeCachedLocation(WEB_TARGET_ACCURACY_METERS, 2e4);
  if (hotCached) {
    return hotCached;
  }

  try {
    const isNativePlatform = Capacitor.isNativePlatform();
    let coordinates;
    let provider = "browser_gps";
    if (!isNativePlatform) {
      coordinates = await getBrowserPosition();
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
        coordinates = await getBrowserPosition();
        provider = "browser_gps_fallback";
      } else {
        try {
          coordinates = await getNativePositionWithSampling();
          provider = "native_gps";
        } catch (geoError) {
          debugLog(
            "Capacitor geolocation failed, trying browser fallback:",
            geoError?.message || geoError,
          );
          coordinates = await getBrowserPosition();
          provider = "browser_gps_fallback";
        }
      }
    }
    const {
      latitude: latitude,
      longitude: longitude,
      speed: speed,
      accuracy: accuracy,
    } = coordinates.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error("Invalid GPS coordinates");
    }
    const normalizedLat = roundCoordinate(latitude);
    const normalizedLng = roundCoordinate(longitude);
    const addressData = await resolveAddress(normalizedLat, normalizedLng);
    const placeName = await resolvePoiName(normalizedLat, normalizedLng, addressData);
    const displayName = composeDisplayName(placeName, addressData);
    const enrichedAddress = {
      ...addressData,
      placeName: placeName || addressData?.poiName || "",
      displayName: displayName,
    };
    const location = {
      latitude: normalizedLat,
      longitude: normalizedLng,
      lat: normalizedLat,
      lng: normalizedLng,
      accuracy: accuracy,
      speed: speed || 0,
      address: enrichedAddress,
      city: enrichedAddress.city,
      state: enrichedAddress.state,
      country: enrichedAddress.country,
      area: enrichedAddress.area || enrichedAddress.locality || "",
      locality: enrichedAddress.locality || "",
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

  const allowRuntimeOrDiskCache = allowCache;
  const allowIpFallbackForSession = allowIpFallback;

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
        return runtimeCached;
      }
    }
  }

  for (let attempt = 0; attempt < LIVE_CAPTURE_ATTEMPTS; attempt += 1) {
    try {
      if (attempt > 0) {
        await sleep(600 + attempt * 400);
      }

      const capturedLocation = await getCurrentLocation();
      const normalized = normalizeLocationShape(capturedLocation, {
        provider: capturedLocation.provider || "gps",
      });
      if (normalized) {
        bestCandidate = pickMorePreciseCandidate(bestCandidate, normalized);
        setRuntimeCachedLocation(normalized);
        if (isAccuracyAcceptable(normalized, effectiveRequiredAccuracy)) {
          return normalized;
        }

        const accuracy = normalized.accuracy;
        errors.push(
          new Error(`Coarse location accuracy (${Math.round(accuracy)}m)`),
        );
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
        return cached;
      }
    }
  }

  const shouldTryIpFallback =
    allowIpFallbackForSession && getAccuracyScore(bestCandidate) > 5e3;
  if (shouldTryIpFallback) {
    const ipLocation = await getIPBasedFallbackLocation();
    if (ipLocation) {
      bestCandidate = pickMorePreciseCandidate(bestCandidate, ipLocation);
      if (isAccuracyAcceptable(ipLocation, effectiveRequiredAccuracy)) {
        setRuntimeCachedLocation(ipLocation);
        return ipLocation;
      }
    }
  }

  const bestAccuracy = Number(bestCandidate?.accuracy);
  const accuracyKnown = Number.isFinite(bestAccuracy);
  const meetsStrictTarget =
    bestCandidate && accuracyKnown && bestAccuracy <= effectiveRequiredAccuracy;

  if (meetsStrictTarget) {
    setRuntimeCachedLocation(bestCandidate);
    return bestCandidate;
  }

  if (bestCandidate) {
    const roundedAccuracy = accuracyKnown
      ? Math.round(bestAccuracy)
      : "unknown";
    throw new Error(
      `Unable to achieve required GPS accuracy (<=${effectiveRequiredAccuracy}m). Best captured accuracy: ${roundedAccuracy}m.`,
    );
  }

  if (errors.length) {
    throw errors[0];
  }

  throw new Error("Unable to determine location");
};
export async function sendLocation(locationData) {
  const payload = buildLocationPayload(locationData);
  debugLog("Sending location to backend:", payload);
  const endpointCandidates = getLocationEndpointCandidates();
  let lastError = null;
  const token =
    typeof localStorage !== "undefined"
      ? localStorage.getItem("authToken")
      : null;
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
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
          const errText = await response.text();
          lastError = `Server returned ${response.status}: ${errText}`;
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
        return result;
      } catch (error) {
        lastError = error.message;
        debugLog(
          `sendLocation error (${endpoint}, attempt ${attempt + 1}):`,
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
  throw new Error(lastError || "Location sync failed");
}
export async function captureLocation(userId = null) {
  try {
    const authenticatedSession = hasAuthenticatedSession() || Boolean(userId);
    const cacheMaxAgeMs = authenticatedSession ? 60 * 1000 : DEFAULT_CACHE_MAX_AGE_MS;
    const loc = await getBestAvailableLocation({
      allowCache: true,
      allowIpFallback: !authenticatedSession,
      cacheMaxAgeMs,
      requiredAccuracy: STRICT_REQUIRED_ACCURACY_METERS,
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
    localStorage.setItem("user_location", JSON.stringify(loc));
    localStorage.setItem(
      "mhub_user_city",
      loc.area || loc.locality || loc.city || "",
    );
    return { ...loc, backend: response };
  } catch (error) {
    console.warn("[LocationService] captureLocation failed:", error.message);
    throw error;
  }
}
export function clearCachedLocation() {
  console.log("[LocationService] Clearing cached location");
  LOCATION_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem("mhub_user_city");
  runtimeBestLocation = null;
}
export function getCachedLocation() {
  try {
    const cached = localStorage.getItem("user_location");
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error("[LocationService] Failed to parse cached location:", e);
  }
  return null;
}
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
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
export async function checkAndSyncLocation(userId = null) {
  try {
    const authenticatedSession = hasAuthenticatedSession() || Boolean(userId);
    const cacheMaxAgeMs = authenticatedSession ? 60 * 1000 : DEFAULT_CACHE_MAX_AGE_MS;
    const loc = await getBestAvailableLocation({
      allowCache: true,
      allowIpFallback: !authenticatedSession,
      cacheMaxAgeMs,
      requiredAccuracy: STRICT_REQUIRED_ACCURACY_METERS,
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
        allowIpFallback: !authenticatedSession,
        cacheMaxAgeMs,
        requiredAccuracy: STRICT_REQUIRED_ACCURACY_METERS,
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
    localStorage.setItem(
      "mhub_user_city",
      loc.address?.area ||
        loc.address?.locality ||
        loc.address?.city ||
        loc.area ||
        loc.locality ||
        loc.city ||
        "",
    );
    localStorage.setItem("user_location", JSON.stringify(loc));
    debugLog("Location synced:", loc.address?.city || loc.city || "Unknown");
    return loc;
  } catch (err) {
    console.error("[LocationService] Sync failed:", err);
    return null;
  }
}
