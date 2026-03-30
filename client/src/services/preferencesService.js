import api from "@/lib/api";

const PREF_CACHE_TTL_MS = 15 * 60 * 1000;
const PREF_RATE_LIMIT_FALLBACK_MS = 60 * 1000;
const PREF_RATE_LIMIT_KEY = "mhub_preferences_rate_limit_until";
const PREF_CACHE_KEY_PREFIX = "mhub_preferences_cache_";
const PREF_CACHE_TS_PREFIX = "mhub_preferences_cache_ts_";

let rateLimitUntil = 0;
const inflightByUser = new Map();
const cacheByUser = new Map();
const cacheAtByUser = new Map();

const resolveRetryAfterMs = (error, fallbackMs = PREF_RATE_LIMIT_FALLBACK_MS) => {
  const header =
    error?.response?.headers?.["retry-after"] ||
    error?.response?.headers?.["Retry-After"] ||
    null;
  const bodyRetryAfter = Number(
    error?.response?.data?.retryAfter ??
      error?.response?.data?.retry_after ??
      error?.response?.data?.retryAfterMs,
  );
  if (!header && !Number.isFinite(bodyRetryAfter)) return fallbackMs;
  const trimmed = String(header).trim();
  if (!trimmed) {
    if (Number.isFinite(bodyRetryAfter)) {
      return Math.max(1000, bodyRetryAfter > 1000 ? bodyRetryAfter : bodyRetryAfter * 1000);
    }
    return fallbackMs;
  }
  const seconds = Number.parseInt(trimmed, 10);
  if (Number.isFinite(seconds)) {
    return Math.max(1000, seconds * 1000);
  }
  const asDate = Date.parse(trimmed);
  if (Number.isFinite(asDate)) {
    const diff = asDate - Date.now();
    return diff > 0 ? diff : fallbackMs;
  }
  if (Number.isFinite(bodyRetryAfter)) {
    return Math.max(1000, bodyRetryAfter > 1000 ? bodyRetryAfter : bodyRetryAfter * 1000);
  }
  return fallbackMs;
};

const readStoredNumber = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
};

const readStoredJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const writeStoredJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const writeStoredNumber = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore storage failures
  }
};

const readRateLimitUntil = () => {
  if (rateLimitUntil > Date.now()) return rateLimitUntil;
  const stored = readStoredNumber(PREF_RATE_LIMIT_KEY);
  if (stored && stored > Date.now()) {
    rateLimitUntil = stored;
  }
  return rateLimitUntil;
};

const setRateLimitUntil = (untilMs) => {
  rateLimitUntil = Math.max(rateLimitUntil, untilMs);
  writeStoredNumber(PREF_RATE_LIMIT_KEY, rateLimitUntil);
};

const getCacheKey = (userId) => `${PREF_CACHE_KEY_PREFIX}${userId}`;
const getCacheTsKey = (userId) => `${PREF_CACHE_TS_PREFIX}${userId}`;

const readCachedPreferences = (userId, ttlMs) => {
  const cached = cacheByUser.get(userId);
  const cachedAt = cacheAtByUser.get(userId);
  if (cached && cachedAt && Date.now() - cachedAt < ttlMs) {
    return cached;
  }
  const stored = readStoredJson(getCacheKey(userId));
  const storedAt = readStoredNumber(getCacheTsKey(userId));
  if (stored && storedAt && Date.now() - storedAt < ttlMs) {
    cacheByUser.set(userId, stored);
    cacheAtByUser.set(userId, storedAt);
    return stored;
  }
  return null;
};

const writeCachedPreferences = (userId, data) => {
  cacheByUser.set(userId, data);
  const ts = Date.now();
  cacheAtByUser.set(userId, ts);
  writeStoredJson(getCacheKey(userId), data);
  writeStoredNumber(getCacheTsKey(userId), ts);
};

export async function fetchUserPreferencesCached({
  userId,
  force = false,
  ttlMs = PREF_CACHE_TTL_MS,
} = {}) {
  if (!userId) return null;

  const cooldown = readRateLimitUntil();
  if (!force && cooldown > Date.now()) {
    return readCachedPreferences(userId, ttlMs);
  }

  if (!force) {
    const cached = readCachedPreferences(userId, ttlMs);
    if (cached) return cached;
  }

  const inflight = inflightByUser.get(userId);
  if (!force && inflight) {
    return inflight;
  }

  const request = api
    .get("/profile/preferences", { params: { userId } })
    .then((response) => {
      rateLimitUntil = 0;
      writeStoredNumber(PREF_RATE_LIMIT_KEY, 0);
      const data = response?.data ?? response;
      if (data) {
        writeCachedPreferences(userId, data);
      }
      return data || null;
    })
    .catch((error) => {
      const status = error?.response?.status ?? error?.status ?? null;
      if (status === 429) {
        const retryAfterMs = resolveRetryAfterMs(error);
        setRateLimitUntil(Date.now() + retryAfterMs);
        return readCachedPreferences(userId, ttlMs);
      }
      throw error;
    })
    .finally(() => {
      inflightByUser.delete(userId);
    });

  inflightByUser.set(userId, request);
  return request;
}

export function clearUserPreferencesCache(userId) {
  if (!userId) return;
  cacheByUser.delete(userId);
  cacheAtByUser.delete(userId);
  try {
    localStorage.removeItem(getCacheKey(userId));
    localStorage.removeItem(getCacheTsKey(userId));
  } catch {
    // ignore
  }
}

export default {
  fetchUserPreferencesCached,
  clearUserPreferencesCache,
};
