/**
 * Normalize a value to a trimmed non-empty string, or null.
 * @param {*} value
 * @returns {string|null}
 */
function normalizeId(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

const LEGACY_TOKEN_KEYS = ["authToken", "refreshToken", "token"];
let legacyCleared = false;

/**
 * Clear legacy JWT tokens from localStorage (no longer supported).
 */
export function purgeLegacyTokens() {
  if (legacyCleared || typeof window === "undefined") {
    return;
  }
  try {
    LEGACY_TOKEN_KEYS.forEach((key) => {
      window.localStorage.removeItem(key);
    });
  } catch {
    // ignore storage failures
  } finally {
    legacyCleared = true;
  }
}

/**
 * Access tokens are stored in httpOnly cookies; do not expose via JS.
 * @returns {null}
 */
export function getAccessToken() {
  purgeLegacyTokens();
  return null;
}

/**
 * Resolve the current user's ID from a fallback user object, localStorage,
 * the stored "user" JSON, or the JWT token payload.
 * @param {object|null} [fallbackUser=null] - Optional user object with id/user_id.
 * @returns {string|null}
 */
export function getUserId(fallbackUser = null) {
  if (typeof window === "undefined") {
    return normalizeId(fallbackUser?.id ?? fallbackUser?.user_id);
  }

  const fromUser = normalizeId(fallbackUser?.id ?? fallbackUser?.user_id);
  if (fromUser) {
    if (!window.localStorage.getItem("userId")) {
      window.localStorage.setItem("userId", fromUser);
    }
    if (!window.localStorage.getItem("user_id")) {
      window.localStorage.setItem("user_id", fromUser);
    }
    return fromUser;
  }

  if (!hasAuthSession()) {
    return null;
  }

  const stored = normalizeId(
    window.localStorage.getItem("userId") ||
    window.localStorage.getItem("user_id")
  );
  if (stored) {
    if (!window.localStorage.getItem("userId")) {
      window.localStorage.setItem("userId", stored);
    }
    return stored;
  }

  const storedUserRaw = window.localStorage.getItem("user");
  if (storedUserRaw) {
    try {
      const storedUser = JSON.parse(storedUserRaw);
      const storedUserId = normalizeId(
        storedUser?.id ?? storedUser?.user_id
      );
      if (storedUserId) {
        window.localStorage.setItem("userId", storedUserId);
        window.localStorage.setItem("user_id", storedUserId);
        return storedUserId;
      }
    } catch { /* ignore parse errors */ }
  }

  return null;
}

/**
 * Check whether an access token exists in storage.
 * @returns {boolean}
 */
export function hasAccessToken() {
  return false;
}

/**
 * Check whether an auth session flag is set in localStorage.
 * @returns {boolean}
 */
export function hasAuthSession() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem("authSession") === "true";
}

/**
 * Determine whether the user is currently authenticated via session flag,
 * stored token, or derived user ID.
 * @param {object|null} [fallbackUser=null]
 * @returns {boolean}
 */
export function isAuthenticated(fallbackUser = null) {
  const derivedId = normalizeId(fallbackUser?.id ?? fallbackUser?.user_id);
  return Boolean(derivedId || hasAuthSession());
}

export default {
  getAccessToken,
  getUserId,
  hasAccessToken,
  hasAuthSession,
  isAuthenticated,
  purgeLegacyTokens,
};
