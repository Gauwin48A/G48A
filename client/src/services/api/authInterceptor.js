/**
 * Auth Interceptor
 * ─────────────────
 * Manages authentication state for API calls: token refresh, session expiry,
 * automatic logout, and the auth-required event dispatch.
 *
 * This module co-ordinates with AuthContext via an optional delegate function
 * to avoid dual-caller race conditions during token refresh.
 */

import axios from "axios";
import { logAuthDiagnostic } from "@/services/authDiagnostics";
import { getApiRootUrl } from "@/lib/networkConfig";
import { createRequestNonce } from "@/lib/requestSecurity";
import { requestSoftNavigate } from "@/utils/softNavigate";
import { ensureCsrfTokenCookie, getCsrfToken, CSRF_HEADER_NAME } from "./csrf";
import { resolveRetryAfterMs } from "./rateLimiter";

// ── Constants ─────────────────────────────────────────────────────────────
const AUTH_REFRESH_EXCLUDED_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/aadhaar/send-otp",
  "/auth/aadhaar/verify-otp",
  "/auth/aadhaar/complete-signup",
  "/auth/pan/verify",
  "/auth/session",
  "/auth/refresh-token",
  "/auth/csrf-token",
  "/auth/logout",
  "/recently-viewed",
  "/wishlist",
  "/profile",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/me",
];

const REFRESH_FAILURE_BACKOFF_MS = 10 * 1000;
const AUTH_EVENT_COOLDOWN_MS = 2 * 1000;
const AUTH_FAILURE_RESET_WINDOW_MS = 60 * 1000;
const MAX_CONSECUTIVE_AUTH_FAILURES = 2;

const AUTH_EVENT_NAME = "mhub:auth-required";
const SECURITY_EVENT_NAME = "mhub:security-lockout";

const FORCE_DISABLE_AUTO_LOGOUT = false;
export const DISABLE_AUTO_LOGOUT =
  FORCE_DISABLE_AUTO_LOGOUT ||
  String(import.meta.env.VITE_DISABLE_AUTO_LOGOUT || "false")
    .trim()
    .toLowerCase() === "true";

// ── Module state (mutable, shared across interceptor calls) ────────────────
let refreshPromise = null;
let externalRefreshFn = null;
let refreshFailureBackoffUntil = 0;
let consecutiveAuthFailures = 0;
let lastAuthFailureAt = 0;
let authEventCooldownUntil = 0;

// ── Helpers ───────────────────────────────────────────────────────────────

/** Extract the path portion from a URL string (shared with api.js). */
const getRequestPath = (url) => {
  if (typeof url !== "string") return "";
  if (/^https?:\/\//i.test(url)) {
    try { return new URL(url).pathname; } catch { return url; }
  }
  return url.startsWith("/") ? url : `/${url}`;
};

// ── Exported API ──────────────────────────────────────────────────────────

export function setRefreshDelegate(fn) {
  externalRefreshFn = typeof fn === "function" ? fn : null;
}

export function shouldSkipAuthRefresh(url) {
  const requestPath = getRequestPath(url);
  return AUTH_REFRESH_EXCLUDED_PATHS.some((path) => requestPath.includes(path));
}

export function isAuthRequestPath(url) {
  const requestPath = getRequestPath(url).toLowerCase();
  return requestPath.includes("/auth/");
}

export function shouldRetainAuthOnRefreshFailure(error) {
  const status = error?.status ?? error?.response?.status ?? null;
  const isNetworkError =
    typeof error?.isNetworkError === "boolean"
      ? error.isNetworkError
      : !error?.response;
  if (status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;
  if (isNetworkError) return true;
  return false;
}

function isParityOfflineAuthMode() {
  if (typeof window === "undefined") return false;
  try {
    const localFlag = window.localStorage.getItem("mhub_parity_offline_auth") === "1";
    if (localFlag) return true;
    const ua = String(window.navigator?.userAgent || "").toLowerCase();
    return ua.includes("mhubandroidwebreplica");
  } catch {
    return false;
  }
}

function clearClientAuthState() {
  if (isParityOfflineAuthMode()) return;

  try {
    if (localStorage.getItem("authSession") === "true") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("token");
      return;
    }
  } catch {}

  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("user_id");
  localStorage.removeItem("userProfile");
  localStorage.removeItem("token");
  localStorage.removeItem("authSession");
}

function dispatchGlobalEvent(eventName, detail = {}) {
  if (typeof window === "undefined") return false;
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    return true;
  } catch {
    return false;
  }
}

export function dispatchAuthRequiredOnce(detail = {}) {
  if (isParityOfflineAuthMode()) {
    logAuthDiagnostic("auto_logout_suppressed_parity", {
      source: "api_auth_required_event",
      ...detail,
    });
    return true;
  }

  try {
    if (localStorage.getItem("authSession") === "true") {
      logAuthDiagnostic("auto_logout_suppressed_demo_session", {
        source: "api_auth_required_event",
        ...detail,
      });
      return true;
    }
  } catch {}

  const now = Date.now();
  if (now < authEventCooldownUntil) return true;
  authEventCooldownUntil = now + AUTH_EVENT_COOLDOWN_MS;

  const payload = { ...detail, occurredAt: now };
  const eventDispatched = dispatchGlobalEvent(AUTH_EVENT_NAME, payload);
  if (!eventDispatched) {
    requestSoftNavigate(detail.redirectTo || "/login?expired=true", { replace: true });
  }
  return eventDispatched;
}

/**
 * Attempt to refresh the access token via the refresh-token endpoint.
 * Uses an optional external delegate (registered by AuthContext) as the
 * single source of truth to avoid dual-caller race conditions.
 *
 * @returns {Promise<boolean>} true when a new token was obtained
 */
export async function refreshAccessToken() {
  if (refreshFailureBackoffUntil > Date.now()) {
    logAuthDiagnostic("refresh_skipped_backoff", {
      waitMs: Math.max(0, refreshFailureBackoffUntil - Date.now()),
    });
    return false;
  }

  // Use external delegate if registered (AuthContext)
  if (externalRefreshFn) {
    if (!refreshPromise) {
      refreshPromise = externalRefreshFn()
        .then((result) => {
          refreshFailureBackoffUntil = 0;
          return Boolean(result);
        })
        .catch((err) => {
          refreshFailureBackoffUntil = Date.now() + REFRESH_FAILURE_BACKOFF_MS;
          throw err;
        })
        .finally(() => { refreshPromise = null; });
    }
    return refreshPromise;
  }

  // Fallback: direct API call
  if (!refreshPromise) {
    const apiRootUrl = getApiRootUrl();
    const refreshTimestamp = Date.now();
    const refreshNonce = createRequestNonce();

    logAuthDiagnostic("refresh_attempt_started", { apiRootUrl });

    refreshPromise = axios
      .post(
        `${apiRootUrl}/auth/refresh-token`,
        { _timestamp: refreshTimestamp, _nonce: refreshNonce },
        {
          withCredentials: true,
          timeout: 15e3,
          headers: {
            [CSRF_HEADER_NAME]: (await ensureCsrfTokenCookie(apiRootUrl))
              ? getCsrfToken()
              : "",
            "X-MHub-Timestamp": String(refreshTimestamp),
            "X-MHub-Nonce": refreshNonce,
          },
        }
      )
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          refreshFailureBackoffUntil = 0;
          logAuthDiagnostic("refresh_attempt_success", { status: res.status });
          return true;
        }
        refreshFailureBackoffUntil = Date.now() + REFRESH_FAILURE_BACKOFF_MS;
        logAuthDiagnostic("refresh_attempt_missing_token", {
          status: res.status,
          backoffMs: REFRESH_FAILURE_BACKOFF_MS,
        });
        return false;
      })
      .catch((error) => {
        const retryAfterHeader = error?.response?.headers?.["retry-after"];
        const backoffMs = resolveRetryAfterMs(retryAfterHeader, REFRESH_FAILURE_BACKOFF_MS);
        refreshFailureBackoffUntil = Date.now() + backoffMs;
        logAuthDiagnostic("refresh_attempt_failed", {
          status: error?.response?.status || null,
          code: error?.code || null,
          backoffMs,
        });
        throw error;
      })
      .finally(() => { refreshPromise = null; });
  }

  return refreshPromise;
}

/**
 * Handle a refresh failure — track consecutive failures and clear auth state
 * when the threshold is crossed.
 */
export async function handleRefreshFailure(refreshError, originalRequest) {
  const refreshStatus =
    refreshError?.status ?? refreshError?.response?.status ?? null;
  const retainAuth = shouldRetainAuthOnRefreshFailure(refreshError);

  logAuthDiagnostic("auth_interceptor_retry_failed", {
    status: refreshStatus,
    path: getRequestPath(originalRequest?.url),
    retainAuth,
  });

  if (!retainAuth) {
    const now = Date.now();
    if (now - lastAuthFailureAt > AUTH_FAILURE_RESET_WINDOW_MS) {
      consecutiveAuthFailures = 0;
    }
    lastAuthFailureAt = now;
    consecutiveAuthFailures++;

    logAuthDiagnostic("auth_consecutive_failures", {
      count: consecutiveAuthFailures,
      threshold: MAX_CONSECUTIVE_AUTH_FAILURES,
      path: getRequestPath(originalRequest?.url),
    });

    if (consecutiveAuthFailures >= MAX_CONSECUTIVE_AUTH_FAILURES) {
      const hardAuthFailure = refreshStatus === 401 || refreshStatus === 403;
      if (DISABLE_AUTO_LOGOUT && !hardAuthFailure) {
        logAuthDiagnostic("auto_logout_suppressed", {
          source: "api_interceptor_refresh_failure",
          status: refreshStatus,
          consecutiveFailures: consecutiveAuthFailures,
        });
      } else {
        clearClientAuthState();
        if (DISABLE_AUTO_LOGOUT) {
          logAuthDiagnostic("auto_logout_forced", {
            source: "api_interceptor_refresh_failure",
            status: refreshStatus,
            consecutiveFailures: consecutiveAuthFailures,
          });
        } else {
          dispatchAuthRequiredOnce({
            reason: "session_expired",
            redirectTo: "/login?expired=true",
            source: "api_interceptor_refresh_failure",
          });
        }
      }
    }
  }
}

export { SECURITY_EVENT_NAME };
