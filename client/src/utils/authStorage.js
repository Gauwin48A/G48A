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

/**
 * Decode the payload section of a JWT without verification.
 * @param {string} token
 * @returns {object|null} Parsed payload or null on failure.
 */
function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") {
    return null;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4 || 4)) % 4);
    if (typeof globalThis.atob !== "function") {
      return null;
    }
    const json = globalThis.atob(`${base64}${padding}`);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Extract a user ID from a JWT payload, checking common claim names.
 * @param {string} token
 * @returns {string|null}
 */
function getUserIdFromToken(token) {
  const payload = decodeJwtPayload(token);
  const candidate =
    payload?.userId ?? payload?.id ?? payload?.user_id ?? payload?.sub ?? null;
  return normalizeId(candidate);
}

/**
 * Retrieve the stored access token from localStorage.
 * Normalizes legacy "token" key to "authToken".
 * @returns {string|null}
 */
export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  const token =
    window.localStorage.getItem("authToken") ||
    window.localStorage.getItem("token");

  if (token && !window.localStorage.getItem("authToken")) {
    window.localStorage.setItem("authToken", token);
  }

  return token || null;
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

  const token = getAccessToken();
  const tokenUserId = getUserIdFromToken(token);
  if (tokenUserId) {
    window.localStorage.setItem("userId", tokenUserId);
    window.localStorage.setItem("user_id", tokenUserId);
    return tokenUserId;
  }

  return null;
}

/**
 * Check whether an access token exists in storage.
 * @returns {boolean}
 */
export function hasAccessToken() {
  return Boolean(getAccessToken());
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
  const token = getAccessToken();
  if (!token) {
    return false;
  }
  const derivedId = getUserId(fallbackUser);
  return Boolean(derivedId || getUserIdFromToken(token));
}

export default {
  getAccessToken,
  getUserId,
  hasAccessToken,
  hasAuthSession,
  isAuthenticated,
};
