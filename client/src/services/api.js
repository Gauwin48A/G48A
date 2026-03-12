import axios from "axios";
import { getDeviceId } from "@/utils/device";
import { getApiRootUrl } from "@/lib/networkConfig";
import { normalizeMediaList, resolveMediaUrl } from "@/lib/mediaUrl";
import { mapAuthError } from "@/utils/authErrorMapper";
import { logAuthDiagnostic } from "@/services/authDiagnostics";
const getCurrentApiRootUrl = () => {
  const resolved = getApiRootUrl();
  return typeof resolved === "string" && resolved ? resolved : "/api";
};
const CLIENT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const AUTH_REFRESH_EXCLUDED_PATHS = [
  "/auth/login",
  "/auth/signup",
  "/auth/send-otp",
  "/auth/verify-otp",
  "/auth/session",
  "/auth/refresh-token",
  "/auth/csrf-token",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
];
const LOCAL_DEV_BACKEND_ORIGINS = [
  "http://localhost:5001",
  "http://localhost:5000",
];
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const BACKEND_HEALTH_TIMEOUT_MS = 2500;
const BACKEND_RECOVERY_FAILURE_TTL_MS = 15e3;
const MEDIA_URL_KEYS = new Set([
  "image",
  "image_url",
  "imageUrl",
  "thumbnail",
  "thumbnail_url",
  "thumbnailUrl",
  "avatar",
  "avatar_url",
  "avatarUrl",
  "profile_pic",
  "profilePic",
  "photo",
  "photo_url",
  "photoUrl",
  "logo_url",
  "logoUrl",
]);
const MEDIA_LIST_KEYS = new Set(["images", "image_urls", "imageUrls"]);
let refreshPromise = null;
let csrfBootstrapPromise = null;
let backendRecoveryPromise = null;
let backendRecoveryFailureUntil = 0;
let backendRecoveredOriginCache = "";
let refreshFailureBackoffUntil = 0;
let authEventCooldownUntil = 0;
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-XSRF-TOKEN";
const AUTH_EVENT_NAME = "mhub:auth-required";
const SECURITY_EVENT_NAME = "mhub:security-lockout";
const REFRESH_FAILURE_BACKOFF_MS = 10 * 1000;
const AUTH_EVENT_COOLDOWN_MS = 2 * 1000;
const normalizeOrigin = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");
const isLocalhostRuntime = () =>
  typeof window !== "undefined" &&
  LOCALHOST_HOSTNAMES.has(window.location.hostname);
const isRouteNotFoundResponse = (status, backendErrorText) => {
  if (status !== 404) return false;
  const text = String(backendErrorText || "").toLowerCase();
  return text.includes("route not found") || text.includes("not found - /api");
};
const isLikelyNetworkOrCorsError = (error) => {
  if (!error || error.response) return false;
  const text = `${error.message || ""} ${error.code || ""}`.toLowerCase();
  return (
    text.includes("network error") ||
    text.includes("failed to fetch") ||
    text.includes("cors") ||
    text.includes("err_network") ||
    text.includes("timeout")
  );
};
async function probeMhubHealth(origin) {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;
  const controller =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = setTimeout(() => {
    if (controller) {
      controller.abort();
    }
  }, BACKEND_HEALTH_TIMEOUT_MS);
  try {
    const response = await fetch(`${normalizedOrigin}/api/health`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
      cache: "no-store",
      signal: controller?.signal,
    });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null);
    if (!payload || payload.status !== "ok") return false;
    if (payload.service) {
      return String(payload.service).toLowerCase() === "mhub-backend";
    }
    return (
      Object.prototype.hasOwnProperty.call(payload, "db") ||
      Object.prototype.hasOwnProperty.call(payload, "time")
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
async function resolveLocalDevBackendOrigin() {
  if (!isLocalhostRuntime()) return "";
  const now = Date.now();
  if (backendRecoveredOriginCache) {
    return backendRecoveredOriginCache;
  }
  if (backendRecoveryFailureUntil && now < backendRecoveryFailureUntil) {
    return "";
  }
  if (!backendRecoveryPromise) {
    backendRecoveryPromise = (async () => {
      const currentRoot = getCurrentApiRootUrl();
      let currentOrigin = "";
      if (/^https?:\/\//i.test(currentRoot)) {
        try {
          currentOrigin = new URL(currentRoot).origin;
        } catch {
          currentOrigin = "";
        }
      }
      const candidates = LOCAL_DEV_BACKEND_ORIGINS.filter(
        (origin) => origin !== currentOrigin,
      );
      for (const origin of candidates) {
        const isMhub = await probeMhubHealth(origin);
        if (isMhub) {
          backendRecoveredOriginCache = normalizeOrigin(origin);
          backendRecoveryFailureUntil = 0;
          return backendRecoveredOriginCache;
        }
      }
      backendRecoveryFailureUntil =
        Date.now() + BACKEND_RECOVERY_FAILURE_TTL_MS;
      return "";
    })().finally(() => {
      backendRecoveryPromise = null;
    });
  }
  return backendRecoveryPromise;
}
const clearClientAuthState = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  localStorage.removeItem("userId");
  localStorage.removeItem("user_id");
  localStorage.removeItem("userProfile");
  localStorage.removeItem("token");
  localStorage.removeItem("authSession");
};
const dispatchGlobalEvent = (eventName, detail = {}) => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    return true;
  } catch {
    return false;
  }
};
const dispatchAuthRequiredOnce = (detail = {}) => {
  const now = Date.now();
  if (now < authEventCooldownUntil) {
    return true;
  }
  authEventCooldownUntil = now + AUTH_EVENT_COOLDOWN_MS;
  const payload = { ...detail, occurredAt: now };
  const eventDispatched = dispatchGlobalEvent(AUTH_EVENT_NAME, payload);
  if (!eventDispatched && typeof window !== "undefined") {
    window.location.href = detail.redirectTo || "/login?expired=true";
  }
  return eventDispatched;
};
const getCookieValue = (name) => {
  if (typeof document === "undefined") {
    return "";
  }
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookieParts = document.cookie ? document.cookie.split("; ") : [];
  for (const part of cookieParts) {
    if (part.startsWith(encodedName)) {
      return decodeURIComponent(part.slice(encodedName.length));
    }
  }
  return "";
};
async function ensureCsrfTokenCookie(apiRootUrl) {
  if (getCookieValue(CSRF_COOKIE_NAME)) {
    return true;
  }

  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = axios
      .get(`${apiRootUrl}/auth/csrf-token`, {
        withCredentials: true,
        timeout: 10e3,
      })
      .then(() => Boolean(getCookieValue(CSRF_COOKIE_NAME)))
      .catch(() => false)
      .finally(() => {
        csrfBootstrapPromise = null;
      });
  }

  return csrfBootstrapPromise;
}
const getRequestPath = (url) => {
  if (typeof url !== "string") {
    return "";
  }
  if (/^https?:\/\//i.test(url)) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url.startsWith("/") ? url : `/${url}`;
};
const shouldSkipAuthRefresh = (url) => {
  const requestPath = getRequestPath(url);
  return AUTH_REFRESH_EXCLUDED_PATHS.some((path) => requestPath.includes(path));
};
const isAuthRequestPath = (url) => {
  const requestPath = getRequestPath(url).toLowerCase();
  return requestPath.includes("/auth/");
};
function normalizeApiMediaPayload(payload) {
  const seen = new WeakSet();
  const walk = (value, parentKey = "") => {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) {
      if (MEDIA_LIST_KEYS.has(parentKey)) {
        return normalizeMediaList(value);
      }
      return value.map((entry) => walk(entry));
    }
    if (typeof value !== "object") {
      if (typeof value === "string" && MEDIA_URL_KEYS.has(parentKey)) {
        // Keep original when it cannot be resolved to avoid accidental data loss.
        return resolveMediaUrl(value, value);
      }
      return value;
    }
    if (seen.has(value)) return value;
    seen.add(value);
    const normalized = {};
    for (const [key, entry] of Object.entries(value)) {
      if (MEDIA_LIST_KEYS.has(key)) {
        normalized[key] = normalizeMediaList(entry);
        continue;
      }
      if (typeof entry === "string" && MEDIA_URL_KEYS.has(key)) {
        normalized[key] = resolveMediaUrl(entry, entry);
        continue;
      }
      normalized[key] = walk(entry, key);
    }
    return normalized;
  };
  return walk(payload);
}
async function refreshAccessToken() {
  if (refreshFailureBackoffUntil > Date.now()) {
    logAuthDiagnostic("refresh_skipped_backoff", {
      waitMs: Math.max(0, refreshFailureBackoffUntil - Date.now()),
    });
    return null;
  }
  if (!refreshPromise) {
    const apiRootUrl = getCurrentApiRootUrl();
    logAuthDiagnostic("refresh_attempt_started", {
      apiRootUrl,
    });
    refreshPromise = axios
      .post(`${apiRootUrl}/auth/refresh-token`, {}, {
        withCredentials: true,
        timeout: 15e3,
        headers: {
          [CSRF_HEADER_NAME]: await ensureCsrfTokenCookie(apiRootUrl)
            ? getCookieValue(CSRF_COOKIE_NAME)
            : "",
        },
      })
      .then((res) => {
        if (res.status === 200 && res.data?.token) {
          localStorage.setItem("authToken", res.data.token);
          refreshFailureBackoffUntil = 0;
          logAuthDiagnostic("refresh_attempt_success", {
            status: res.status,
          });
          return res.data.token;
        }
        refreshFailureBackoffUntil = Date.now() + REFRESH_FAILURE_BACKOFF_MS;
        logAuthDiagnostic("refresh_attempt_missing_token", {
          status: res.status,
          backoffMs: REFRESH_FAILURE_BACKOFF_MS,
        });
        return null;
      })
      .catch((error) => {
        refreshFailureBackoffUntil = Date.now() + REFRESH_FAILURE_BACKOFF_MS;
        logAuthDiagnostic("refresh_attempt_failed", {
          status: error?.response?.status || null,
          code: error?.code || null,
          backoffMs: REFRESH_FAILURE_BACKOFF_MS,
        });
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}
const api = axios.create({
  baseURL: getCurrentApiRootUrl(),
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  xsrfCookieName: CSRF_COOKIE_NAME,
  xsrfHeaderName: CSRF_HEADER_NAME,
  timeout: 15e3,
});
api.interceptors.request.use(
  (config) => {
    const headers = config.headers || {};
    config.baseURL = getCurrentApiRootUrl();
    if (
      typeof config.url === "string" &&
      !/^https?:\/\//i.test(config.url) &&
      config.url.startsWith("/api/")
    ) {
      config.url = config.url.slice(4);
    }
    const token =
      localStorage.getItem("authToken") || localStorage.getItem("token");
    if (token && !localStorage.getItem("authToken")) {
      localStorage.setItem("authToken", token);
    }
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const deviceId = getDeviceId();
    if (deviceId) {
      headers["X-Device-Id"] = deviceId;
    }
    headers["X-Timezone"] = CLIENT_TIMEZONE;
    headers["Accept-Language"] =
      localStorage.getItem("mhub_language") ||
      localStorage.getItem("lang") ||
      "en";
    const method = String(config.method || "get").toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      const csrfToken = getCookieValue(CSRF_COOKIE_NAME);
      if (csrfToken && !headers[CSRF_HEADER_NAME]) {
        headers[CSRF_HEADER_NAME] = csrfToken;
      }
    }
    config.headers = headers;
    return config;
  },
  (error) => Promise.reject(error),
);
api.interceptors.response.use(
  (response) => normalizeApiMediaPayload(response.data),
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isNetworkError = !error.response;
    const backendError =
      error.response?.data?.error || error.response?.data?.message || "";
    const backendErrorText =
      typeof backendError === "string" ? backendError.toLowerCase() : "";
    const authErrorFromApi =
      backendErrorText.includes("token") ||
      backendErrorText.includes("session");
    const shouldSkipRefresh = shouldSkipAuthRefresh(originalRequest?.url);
    if (
      originalRequest &&
      (status === 401 || (status === 403 && authErrorFromApi)) &&
      !originalRequest._retry &&
      !shouldSkipRefresh
    ) {
      logAuthDiagnostic("auth_interceptor_retry_attempt", {
        status,
        path: getRequestPath(originalRequest?.url),
      });
      originalRequest._retry = true;
      try {
        const refreshedToken = await refreshAccessToken();
        if (refreshedToken) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers["Authorization"] = `Bearer ${refreshedToken}`;
          return api(originalRequest);
        }
        throw new Error("Token refresh failed");
      } catch (refreshError) {
        clearClientAuthState();
        logAuthDiagnostic("auth_interceptor_retry_failed", {
          status: refreshError?.response?.status || null,
          path: getRequestPath(originalRequest?.url),
        });
        dispatchAuthRequiredOnce({
          reason: "session_expired",
          redirectTo: "/login?expired=true",
          source: "api_interceptor_refresh_failure",
        });
        return Promise.reject(refreshError);
      }
    }
    if (
      error.response?.status === 403 &&
      error.response?.data?.error === "Login Blocked"
    ) {
      const eventDispatched = dispatchGlobalEvent(SECURITY_EVENT_NAME, {
        reason: "login_blocked",
        redirectTo: "/security",
        source: "api_interceptor_security_policy",
        occurredAt: Date.now(),
      });
      if (!eventDispatched && typeof window !== "undefined") {
        window.location.href = "/security";
      }
    }
    const shouldAttemptBackendRecovery =
      originalRequest &&
      !originalRequest._backendRecoveryAttempted &&
      isLocalhostRuntime() &&
      (isRouteNotFoundResponse(status, backendErrorText) ||
        isLikelyNetworkOrCorsError(error));
    if (shouldAttemptBackendRecovery) {
      originalRequest._backendRecoveryAttempted = true;
      try {
        const recoveredOrigin = await resolveLocalDevBackendOrigin();
        if (recoveredOrigin) {
          if (typeof window !== "undefined") {
            window.__MHUB_API_ORIGIN_OVERRIDE__ = recoveredOrigin;
          }
          backendRecoveredOriginCache = recoveredOrigin;
          if (
            typeof originalRequest.url === "string" &&
            /^https?:\/\//i.test(originalRequest.url)
          ) {
            try {
              const parsed = new URL(originalRequest.url);
              originalRequest.url = `${parsed.pathname}${parsed.search}${parsed.hash}`;
            } catch {}
          }
          originalRequest.baseURL = `${recoveredOrigin}/api`;
          return api(originalRequest);
        }
      } catch {}
    }
    let normalizedMessage =
      error.response?.data?.error || error.response?.data?.message || "";
    if (isRouteNotFoundResponse(status, backendErrorText)) {
      const attemptedBaseUrl =
        originalRequest?.baseURL || getCurrentApiRootUrl();
      normalizedMessage = `API route not found on ${attemptedBaseUrl}. This usually means the frontend is connected to the wrong backend service/port.`;
    }
    if (!normalizedMessage && isNetworkError) {
      const currentOrigin =
        typeof window !== "undefined"
          ? window.location.origin
          : "unknown-origin";
      const attemptedBaseUrl =
        originalRequest?.baseURL || getCurrentApiRootUrl();
      normalizedMessage = `Network/CORS error. Unable to reach API (${attemptedBaseUrl}) from ${currentOrigin}. Ensure backend is running and CORS allows this origin.`;
    }
    if (!normalizedMessage) {
      normalizedMessage = error.message || "Something went wrong";
    }
    let mappedAuthError = null;
    if (isAuthRequestPath(originalRequest?.url)) {
      mappedAuthError = mapAuthError(error, {
        defaultMessage: normalizedMessage,
      });
      normalizedMessage = mappedAuthError.message;
      logAuthDiagnostic("auth_response_error", {
        path: getRequestPath(originalRequest?.url),
        status,
        category: mappedAuthError.category,
        code: mappedAuthError.code,
      });
    }
    const customError = {
      message: normalizedMessage,
      status: error.response?.status,
      code: error.code,
      isNetworkError: isNetworkError,
      response: error.response,
      data: error.response?.data,
      original: error,
      auth: mappedAuthError,
    };
    return Promise.reject(customError);
  },
);
export default api;
