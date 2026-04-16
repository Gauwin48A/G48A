import { getUserId } from "@/utils/authStorage";

const USER_CITY_KEY = "mhub_user_city";
const USER_CITY_TS_PREFIX = "mhub_user_city_ts";
const GPS_LOCATION_KEY = "mhub_location";
const IP_LOCATION_KEY = "mhub_location_ip";

// Keep in sync with LocationContext stale display threshold (10 min).
const GPS_CACHE_TTL_MS = 10 * 60 * 1000;
const IP_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const normalizeOwnerKey = (value) => {
  const text = String(value || "").trim();
  return text.length ? text : "";
};

export const getActiveOwnerKey = () => {
  if (typeof window === "undefined") return "anon";
  const userId = getUserId();
  return userId ? `user:${userId}` : "anon";
};

const isAuthenticatedOwner = (ownerKey) => ownerKey.startsWith("user:");

export const isOwnerMatch = (cachedOwnerKey) => {
  const ownerKey = getActiveOwnerKey();
  const normalizedCached = normalizeOwnerKey(cachedOwnerKey);

  if (isAuthenticatedOwner(ownerKey)) {
    return normalizedCached === ownerKey;
  }

  if (!normalizedCached) return true;
  return normalizedCached === "anon";
};

const readJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readLocationCache = () => {
  const gps = readJson(GPS_LOCATION_KEY);
  if (gps) return gps;
  return readJson(IP_LOCATION_KEY);
};

export const readUserCity = (options = {}) => {
  if (typeof window === "undefined") return null;

  const ownerKey = getActiveOwnerKey();
  const scopedKey = `${USER_CITY_KEY}:${ownerKey}`;
  const scopedValue = localStorage.getItem(scopedKey);
  const legacyValue = ownerKey === "anon" ? localStorage.getItem(USER_CITY_KEY) : null;
  const value = scopedValue || legacyValue;
  if (!value) return null;

  const cachedLocation = readLocationCache();
  if (cachedLocation && !isOwnerMatch(cachedLocation.ownerKey)) {
    return null;
  }

  const maxAgeMs =
    options.maxAgeMs ??
    (String(cachedLocation?.provider || "").toLowerCase() === "ip_fallback"
      ? IP_CACHE_TTL_MS
      : GPS_CACHE_TTL_MS);
  const cachedTs = Number(cachedLocation?.timestamp);
  if (Number.isFinite(cachedTs) && Date.now() - cachedTs > maxAgeMs) {
    return null;
  }
  if (!Number.isFinite(cachedTs)) {
    const tsKey = `${USER_CITY_TS_PREFIX}:${ownerKey}`;
    const cityTs = Number(localStorage.getItem(tsKey));
    if (Number.isFinite(cityTs) && Date.now() - cityTs > maxAgeMs) {
      return null;
    }
    if (!Number.isFinite(cityTs)) {
      return null;
    }
  }

  return value;
};

export const writeUserCity = (value, options = {}) => {
  if (typeof window === "undefined") return;
  const text = String(value || "").trim();
  if (!text) return;

  const ownerKey = getActiveOwnerKey();
  const scopedKey = `${USER_CITY_KEY}:${ownerKey}`;
  const tsKey = `${USER_CITY_TS_PREFIX}:${ownerKey}`;

  try {
    localStorage.setItem(scopedKey, text);
    localStorage.setItem(tsKey, String(Date.now()));
    if (options.writeLegacy || ownerKey === "anon") {
      localStorage.setItem(USER_CITY_KEY, text);
    }
  } catch {
    // ignore storage failures
  }
};

export const clearUserCity = (ownerKeyOverride = null) => {
  if (typeof window === "undefined") return;
  const ownerKey = ownerKeyOverride ? normalizeOwnerKey(ownerKeyOverride) : getActiveOwnerKey();
  if (!ownerKey) return;
  try {
    localStorage.removeItem(`${USER_CITY_KEY}:${ownerKey}`);
    localStorage.removeItem(`${USER_CITY_TS_PREFIX}:${ownerKey}`);
    if (ownerKey === "anon") {
      localStorage.removeItem(USER_CITY_KEY);
    }
  } catch {
    // ignore storage failures
  }
};

export const attachOwner = (payload) => {
  if (!payload || typeof payload !== "object") return payload;
  return { ...payload, ownerKey: getActiveOwnerKey() };
};
