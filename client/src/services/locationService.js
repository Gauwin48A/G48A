import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

// 1. BANKING-GRADE CONFIGURATION
const GEO_OPTIONS = {
  enableHighAccuracy: true, // Forces GPS/WiFi hardware usage
  timeout: 15000,           // Wait max 15s for satellite lock
  maximumAge: 300000        // Accept cached location if < 5 mins old (Saves Battery)
};
const WEB_GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 12000,
  maximumAge: 0
};
const WEB_RELAXED_GEO_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 120000
};
const WEB_WATCH_GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0
};
const WEB_ACCURACY_RETRY_THRESHOLD_METERS = 300;
const WEB_TARGET_ACCURACY_METERS = 120;
const WEB_WATCH_MAX_DURATION_MS = 15000;
const WEB_WATCH_MIN_IMPROVEMENT_METERS = 15;
const DEFAULT_REQUIRED_ACCURACY_METERS = 500;
const DEFAULT_CACHE_MAX_AGE_MS = 15 * 60 * 1000;
const IP_FALLBACK_TIMEOUT_MS = 5000;
const LOCATION_CACHE_KEYS = ['mhub_location', 'user_location', 'last_location'];

const MIN_MOVEMENT_THRESHOLD = 500; // meters
const NETWORK_TIMEOUT_MS = 6000;

/**
 * Wrapper to add timeout support to fetch
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = NETWORK_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
};

const getBrowserPositionOnce = (options) => {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Browser geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
};

const isSecureGeoContext = () => {
  if (typeof window === 'undefined') return true;
  if (window.isSecureContext) return true;

  const hostname = window.location?.hostname || '';
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

const normalizeBrowserGeoError = (error) => {
  const code = error?.code;
  const message = error?.message || '';

  if (code === 1 || /denied/i.test(message)) {
    const deniedError = new Error('Location permission denied in browser settings.');
    deniedError.name = 'PermissionDeniedError';
    return deniedError;
  }
  if (code === 2) {
    return new Error('Location unavailable. Please enable device location services.');
  }
  if (code === 3 || /timeout/i.test(message)) {
    return new Error('Location request timed out. Move near a window and try again.');
  }

  return error instanceof Error ? error : new Error('Unable to determine browser location.');
};

const getBrowserPermissionState = async () => {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
    return 'unknown';
  }

  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status?.state || 'unknown';
  } catch {
    return 'unknown';
  }
};

const refineBrowserPositionWithWatch = async (initialFix) => {
  if (typeof navigator === 'undefined' || !navigator.geolocation?.watchPosition) {
    return initialFix;
  }

  let bestFix = initialFix;
  const initialAccuracy = Number(initialFix?.coords?.accuracy);
  if (Number.isFinite(initialAccuracy) && initialAccuracy <= WEB_TARGET_ACCURACY_METERS) {
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
          const currentBest = Number(bestFix?.coords?.accuracy);
          const nextAccuracy = Number(position?.coords?.accuracy);
          if (
            !Number.isFinite(currentBest) ||
            (Number.isFinite(nextAccuracy) && nextAccuracy + WEB_WATCH_MIN_IMPROVEMENT_METERS < currentBest)
          ) {
            bestFix = position;
          }

          const bestAccuracy = Number(bestFix?.coords?.accuracy);
          if (Number.isFinite(bestAccuracy) && bestAccuracy <= WEB_TARGET_ACCURACY_METERS) {
            finish();
          }
        },
        () => {
          // Keep best known fix and finish early on watch errors.
          finish();
        },
        WEB_WATCH_GEO_OPTIONS
      );
    } catch {
      finish();
    }
  });
};

/**
 * Browser-first geolocation for web, with retries to improve precision.
 */
const getBrowserPosition = async () => {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Browser geolocation not supported');
  }

  if (!isSecureGeoContext()) {
    throw new Error('Browser geolocation requires HTTPS (or localhost in development).');
  }

  const permissionState = await getBrowserPermissionState();
  if (permissionState === 'denied') {
    const deniedError = new Error('Location permission denied in browser settings.');
    deniedError.name = 'PermissionDeniedError';
    throw deniedError;
  }

  let firstFix;
  try {
    firstFix = await getBrowserPositionOnce(WEB_GEO_OPTIONS);
  } catch (firstError) {
    const normalized = normalizeBrowserGeoError(firstError);
    if (normalized.name === 'PermissionDeniedError') {
      throw normalized;
    }

    console.warn('[LocationService] High-accuracy browser geolocation failed, retrying with relaxed options:', normalized.message);
    try {
      firstFix = await getBrowserPositionOnce(WEB_RELAXED_GEO_OPTIONS);
    } catch (secondError) {
      throw normalizeBrowserGeoError(secondError);
    }
  }

  const initialAccuracy = Number(firstFix?.coords?.accuracy);
  if (Number.isFinite(initialAccuracy) && initialAccuracy > WEB_ACCURACY_RETRY_THRESHOLD_METERS) {
    const refinedFix = await refineBrowserPositionWithWatch(firstFix);
    const refinedAccuracy = Number(refinedFix?.coords?.accuracy);
    if (Number.isFinite(refinedAccuracy) && refinedAccuracy < initialAccuracy) {
      return refinedFix;
    }
  }

  return firstFix;
};

const isValidCoordinates = (latitude, longitude) => {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
};

const parseTimestamp = (value) => {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

const toFiniteNumberOrNull = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const getStoredUserId = () => {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem('userId') || null;
  } catch {
    return null;
  }
};

const normalizeLocationShape = (loc, defaults = {}) => {
  if (!loc || typeof loc !== 'object') return null;

  const latitude = Number(loc.latitude ?? loc.lat);
  const longitude = Number(loc.longitude ?? loc.lng);
  if (!isValidCoordinates(latitude, longitude)) return null;

  const accuracy = Number(loc.accuracy);
  const timestamp = parseTimestamp(loc.timestamp);

  return {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    speed: Number.isFinite(Number(loc.speed)) ? Number(loc.speed) : 0,
    city: loc.city || loc.address?.city || '',
    state: loc.state || loc.address?.state || '',
    country: loc.country || loc.address?.country || '',
    displayName: loc.displayName || loc.address?.displayName || '',
    provider: loc.provider || defaults.provider || 'unknown',
    address: loc.address || defaults.address || null,
    timestamp,
  };
};

const getRecentCachedLocation = (maxAgeMs = DEFAULT_CACHE_MAX_AGE_MS) => {
  try {
    if (typeof localStorage === 'undefined') return null;

    const now = Date.now();
    const candidates = LOCATION_CACHE_KEYS
      .map((key) => {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          const normalized = normalizeLocationShape(parsed, { provider: 'cached_location' });
          if (!normalized) return null;
          return {
            ...normalized,
            originalProvider: parsed?.provider || null,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .filter((entry) => now - entry.timestamp <= maxAgeMs);

    if (!candidates.length) return null;

    // Prefer newest; if same timestamp, prefer better (smaller) accuracy.
    candidates.sort((a, b) => {
      if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
      const aAccuracy = Number.isFinite(a.accuracy) ? a.accuracy : Number.MAX_SAFE_INTEGER;
      const bAccuracy = Number.isFinite(b.accuracy) ? b.accuracy : Number.MAX_SAFE_INTEGER;
      return aAccuracy - bAccuracy;
    });

    return {
      ...candidates[0],
      provider: 'cached_location',
      originalProvider: candidates[0].originalProvider || candidates[0].provider || null,
    };
  } catch {
    return null;
  }
};

const getIPBasedFallbackLocation = async () => {
  try {
    const response = await fetchWithTimeout('https://ipapi.co/json/', {}, IP_FALLBACK_TIMEOUT_MS);
    if (!response.ok) return null;
    const data = await response.json();

    const latitude = Number(data.latitude);
    const longitude = Number(data.longitude);
    if (!isValidCoordinates(latitude, longitude)) return null;

    return {
      latitude,
      longitude,
      lat: latitude,
      lng: longitude,
      accuracy: 5000,
      speed: 0,
      city: data.city || '',
      state: data.region || '',
      country: data.country_name || '',
      displayName: [data.city, data.region, data.country_name].filter(Boolean).join(', '),
      provider: 'ip_fallback',
      timestamp: Date.now(),
    };
  } catch {
    return null;
  }
};

const getPermissionStatusFromProvider = (provider) => {
  if (!provider) return 'granted';
  const normalizedProvider = String(provider);
  if (normalizedProvider === 'ip_fallback') return 'granted_via_ip';
  if (normalizedProvider === 'cached_location' || normalizedProvider.includes('cached')) return 'granted_cached';
  return 'granted';
};

const buildLocationPayload = (locationData = {}) => {
  const payload = { ...locationData };
  const latitude = toFiniteNumberOrNull(locationData.latitude ?? locationData.lat);
  const longitude = toFiniteNumberOrNull(locationData.longitude ?? locationData.lng);
  const userId = locationData.user_id || getStoredUserId();

  if (latitude !== null) payload.latitude = latitude;
  if (longitude !== null) payload.longitude = longitude;
  delete payload.lat;
  delete payload.lng;

  if (userId) {
    payload.user_id = userId;
  }
  if (!payload.provider) {
    payload.provider = 'browser_gps';
  }
  if (!payload.permission_status) {
    payload.permission_status = getPermissionStatusFromProvider(payload.provider);
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

/**
 * Helper: Convert Lat/Lng to Human Address (Reverse Geocoding)
 * Uses OpenStreetMap (Free, No API Key required for moderate usage)
 */
const resolveAddress = async (lat, lng) => {
  try {
    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'MHub/1.0 (Banking-Grade Location Engine)' } }
    );
    const data = await response.json();

    // Extract meaningful parts like "Whitefield, Bangalore"
    const address = data.address || {};
    const city = address.city || address.town || address.village || address.suburb || address.locality || 'Unknown';
    const state = address.state || '';
    const country = address.country || '';
    const pincode = address.postcode || '';
    const district = address.state_district || address.county || '';

    return {
      formatted: `${city}${state ? ', ' + state : ''}`,
      city,
      state,
      country,
      pincode,
      district,
      displayName: data.display_name || `${city}${state ? ', ' + state : ''}`
    };
  } catch (err) {
    console.warn("[LocationService] Address resolution failed:", err);
    return { formatted: "Unknown Location", city: "Unknown", state: "", country: "", pincode: "", district: "", displayName: "Unknown Location" };
  }
};

/**
 * THE CORE LOCATION FUNCTION (Banking-Grade)
 */
export const getCurrentLocation = async () => {
  try {
    const isNativePlatform = Capacitor.isNativePlatform();
    let coordinates;
    let provider = 'browser_gps';

    if (!isNativePlatform) {
      // Web browsers should use browser geolocation APIs directly.
      coordinates = await getBrowserPosition();
      provider = 'browser_gps';
    } else {
      // A. Check and Request Permissions
      let useBrowserPermissionFlow = false;
      try {
        const permissionStatus = await Geolocation.checkPermissions();
        if (permissionStatus.location !== 'granted') {
          const requestStatus = await Geolocation.requestPermissions();
          if (requestStatus.location !== 'granted') {
            const deniedError = new Error("Location permission denied. Cannot capture high-accuracy logs.");
            deniedError.name = 'PermissionDeniedError';
            throw deniedError;
          }
        }
      } catch (permissionError) {
        if (permissionError?.name === 'PermissionDeniedError') {
          throw permissionError;
        }

        console.warn(
          '[LocationService] Capacitor permission check unavailable, using browser geolocation flow:',
          permissionError?.message || permissionError
        );
        useBrowserPermissionFlow = true;
      }

      // B. Get Precise Coordinates (Hardware Lock)
      if (useBrowserPermissionFlow) {
        coordinates = await getBrowserPosition();
        provider = 'browser_gps_fallback';
      } else {
        try {
          coordinates = await Geolocation.getCurrentPosition(GEO_OPTIONS);
          provider = 'native_gps';
        } catch (geoError) {
          console.warn('[LocationService] Capacitor geolocation failed, trying browser fallback:', geoError?.message || geoError);
          coordinates = await getBrowserPosition();
          provider = 'browser_gps_fallback';
        }
      }
    }

    const { latitude, longitude, speed, accuracy } = coordinates.coords;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      throw new Error('Invalid GPS coordinates');
    }

    // C. Get Human Address (The "Smart" Touch)
    const addressData = await resolveAddress(latitude, longitude);

    return {
      latitude,
      longitude,
      lat: latitude, // Support both naming conventions for compatibility
      lng: longitude,
      accuracy,
      speed: speed || 0,
      address: addressData,
      city: addressData.city,
      state: addressData.state,
      country: addressData.country,
      displayName: addressData.displayName,
      provider,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error("[LocationService] Critical Location Error:", error);
    throw error;
  }
};

/**
 * Best effort location for production UX:
 * 1) precise GPS/browser reading
 * 2) recent cached location
 * 3) IP-based fallback
 */
export const getBestAvailableLocation = async (options = {}) => {
  const {
    requiredAccuracy = DEFAULT_REQUIRED_ACCURACY_METERS,
    allowCache = true,
    allowIpFallback = true,
    cacheMaxAgeMs = DEFAULT_CACHE_MAX_AGE_MS,
  } = options;

  const errors = [];
  let bestCandidate = null;

  try {
    const precise = await getCurrentLocation();
    const normalized = normalizeLocationShape(precise, { provider: precise.provider || 'gps' });
    if (normalized) {
      bestCandidate = pickMorePreciseCandidate(bestCandidate, normalized);
      const accuracy = normalized.accuracy;
      if (!Number.isFinite(accuracy) || accuracy <= requiredAccuracy) {
        return normalized;
      }

      errors.push(new Error(`Coarse location accuracy (${Math.round(accuracy)}m)`));
    }
  } catch (err) {
    errors.push(err);
  }

  if (allowCache) {
    const cached = getRecentCachedLocation(cacheMaxAgeMs);
    if (cached) {
      bestCandidate = pickMorePreciseCandidate(bestCandidate, cached);
      const accuracy = cached.accuracy;
      if (!Number.isFinite(accuracy) || accuracy <= requiredAccuracy) {
        return cached;
      }
    }
  }

  const shouldTryIpFallback = allowIpFallback && getAccuracyScore(bestCandidate) > 5000;
  if (shouldTryIpFallback) {
    const ipLocation = await getIPBasedFallbackLocation();
    if (ipLocation) {
      bestCandidate = pickMorePreciseCandidate(bestCandidate, ipLocation);
      const accuracy = ipLocation.accuracy;
      if (!Number.isFinite(accuracy) || accuracy <= requiredAccuracy) {
        return ipLocation;
      }
    }
  }

  if (bestCandidate) {
    return bestCandidate;
  }

  if (errors.length) {
    throw errors[0];
  }
  throw new Error('Unable to determine location');
};

/**
 * Send location data to the backend
 * @param {Object} locationData - Location data to send
 * @returns {Promise<Object>} - Server response
 */
export async function sendLocation(locationData) {
  const payload = buildLocationPayload(locationData);
  console.log("[LocationService] Sending location to backend:", payload);

  let attempts = 0;
  let lastError = null;
  const API_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + "/api/location";
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null;
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  while (attempts < 3) {
    try {
      const response = await fetchWithTimeout(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!response.ok) {
        const errText = await response.text();
        lastError = `Server returned ${response.status}: ${errText}`;
        throw new Error(lastError);
      }

      const result = await response.json();
      console.log("[LocationService] Backend response:", result);
      return result;
    } catch (error) {
      lastError = error.message;
      console.error("[LocationService] sendLocation error (attempt " + (attempts + 1) + "):", lastError);
      attempts++;
      if (attempts >= 3) throw new Error(lastError);
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * Capture and Sync Location (Phase 3: Fraud Fingerprint)
 */
export async function captureLocation(userId = null) {
  try {
    const loc = await getBestAvailableLocation({
      allowCache: true,
      allowIpFallback: true,
    });
    const permissionStatus = getPermissionStatusFromProvider(loc.provider);

    // Send to backend (log history)
    const response = await sendLocation({
      user_id: userId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      speed: loc.speed,
      city: loc.city,
      state: loc.state,
      country: loc.country || '',
      provider: loc.provider || "browser_gps",
      permission_status: permissionStatus
    });

    // Cache the rich data
    localStorage.setItem("user_location", JSON.stringify(loc));
    localStorage.setItem("mhub_user_city", loc.city);

    return { ...loc, backend: response };
  } catch (error) {
    console.warn("[LocationService] captureLocation failed:", error.message);
    throw error;
  }
}

/**
 * Clear cached location (use when logging out)
 */
export function clearCachedLocation() {
  console.log("[LocationService] Clearing cached location");
  localStorage.removeItem("user_location");
  localStorage.removeItem("mhub_user_city");
}

/**
 * Get cached location from localStorage
 * @returns {Object|null} - Cached location or null
 */
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

/**
 * BACKWARD COMPATIBILITY: Haversine distance
 */
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Smart Sync: Check if user moved significantly before syncing (Zero Maintenance)
 */
export async function checkAndSyncLocation(userId = null) {
  try {
    const loc = await getBestAvailableLocation({
      allowCache: true,
      allowIpFallback: true,
    });
    const lastSaved = getCachedLocation();

    if (lastSaved?.lat && lastSaved?.lng) {
      const distance = getDistanceInMeters(lastSaved.lat, lastSaved.lng, loc.lat, loc.lng);
      if (distance < MIN_MOVEMENT_THRESHOLD) {
        console.log(`[LocationService] Movement ${Math.round(distance)}m < threshold. Skipping sync.`);
        return loc;
      }
    }

    return await syncLocationToBackend(userId || localStorage.getItem('userId'), loc);
  } catch (error) {
    console.warn("[LocationService] Smart sync failed:", error.message);
  }
}

/**
 * SYNC TO BACKEND (The "Paper Trail")
 */
export async function syncLocationToBackend(userId, locationData = null) {
  if (!userId) return null;

  try {
    const loc = locationData || await getBestAvailableLocation({
      allowCache: true,
      allowIpFallback: true,
    });
    const permissionStatus = getPermissionStatusFromProvider(loc.provider);
    await sendLocation({
      user_id: userId,
      latitude: loc.latitude || loc.lat,
      longitude: loc.longitude || loc.lng,
      city: loc.address?.city || loc.city || '',
      state: loc.address?.state || loc.state || '',
      country: loc.address?.country || loc.country || '',
      pincode: loc.address?.pincode || '',
      accuracy: loc.accuracy ?? null,
      device_speed: loc.speed,
      provider: loc.provider || 'browser_gps',
      permission_status: permissionStatus,
      last_active_at: new Date().toISOString()
    });
    localStorage.setItem('mhub_user_city', loc.address?.city || loc.city || '');
    localStorage.setItem('user_location', JSON.stringify(loc));
    console.log("[LocationService] Location synced:", loc.address?.city || loc.city || 'Unknown');

    return loc;
  } catch (err) {
    console.error("[LocationService] Sync failed:", err);
    return null;
  }
}

