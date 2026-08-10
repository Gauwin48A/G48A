/**
 * CSRF Token Management
 * ───────────────────────
 * Handles fetching, caching, and retrieving CSRF tokens for write operations.
 * Tokens are stored both as cookies and in-memory (fallback for cross-origin).
 */

import axios from "axios";

// ── Constants ─────────────────────────────────────────────────────────────
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const CSRF_TOKEN_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const CSRF_MAX_RETRIES = 3;

// ── Module state ──────────────────────────────────────────────────────────
let csrfBootstrapPromise = null;
let csrfBootstrapRetryCount = 0;
let csrfTokenFromBody = "";
let csrfTokenTimestamp = 0;

// ── Helpers ───────────────────────────────────────────────────────────────

function getCookieValue(name) {
  if (typeof document === "undefined") return "";
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookieParts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of cookieParts) {
    if (part.startsWith(encodedName)) {
      return decodeURIComponent(part.slice(encodedName.length));
    }
  }
  return "";
}

/**
 * Read the current CSRF token — prefers the cookie, falls back to the
 * in-memory body-extracted token within the max-age window.
 */
export function getCsrfToken() {
  const cookieVal = getCookieValue(CSRF_COOKIE_NAME);
  if (cookieVal) return cookieVal;
  if (csrfTokenFromBody && (Date.now() - csrfTokenTimestamp) < CSRF_TOKEN_MAX_AGE_MS) {
    return csrfTokenFromBody;
  }
  return "";
}

/**
 * Ensure a CSRF token is available. Fetches one from the server if needed.
 * @param {string} apiRootUrl - Base API URL
 * @param {boolean} forceRefresh - Skip cache and force a new fetch
 * @returns {Promise<boolean>} true if a token is now available
 */
export async function ensureCsrfTokenCookie(apiRootUrl, forceRefresh = false) {
  if (!forceRefresh && getCsrfToken()) {
    csrfBootstrapRetryCount = 0;
    return true;
  }

  if (csrfBootstrapRetryCount >= CSRF_MAX_RETRIES) return false;

  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = axios
      .get(`${apiRootUrl}/auth/csrf-token`, {
        withCredentials: true,
        timeout: 10e3,
      })
      .then((res) => {
        csrfBootstrapRetryCount = 0;
        const bodyToken = res?.data?.csrfToken || res?.data?.token;
        if (bodyToken) {
          csrfTokenFromBody = bodyToken;
          csrfTokenTimestamp = Date.now();
        }
        return Boolean(getCsrfToken());
      })
      .catch(() => {
        csrfBootstrapRetryCount++;
        return false;
      })
      .finally(() => {
        csrfBootstrapPromise = null;
      });
  }

  return csrfBootstrapPromise;
}

/**
 * Invalidate the cached CSRF token so the next call to ensureCsrfTokenCookie
 * will fetch a fresh one from the server.
 */
export function invalidateCsrfToken() {
  csrfTokenFromBody = "";
  csrfTokenTimestamp = 0;
  csrfBootstrapRetryCount = 0;
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
