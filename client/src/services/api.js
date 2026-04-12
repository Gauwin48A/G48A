import axios from "axios";
import { getDeviceId } from "@/utils/device";
import { getApiRootUrl } from "@/lib/networkConfig";
import { normalizeMediaList, resolveMediaUrl } from "@/lib/mediaUrl";
import { applyResponseGuard } from "@/lib/responseGuards";
import { mapAuthError } from "@/utils/authErrorMapper";
import { logAuthDiagnostic } from "@/services/authDiagnostics";
import { isDevToolsOpen } from "@/utils/codeProtection";
import { createRequestNonce } from "@/lib/requestSecurity";
import { buildActiveAppMatcher, matchesCategoryModeItem } from "@/utils/categoryModeFilters";
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
  "/auth/aadhaar/send-otp",
  "/auth/aadhaar/verify-otp",
  "/auth/aadhaar/complete-signup",
  "/auth/pan/verify",
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
// External refresh delegate — AuthContext registers its refresh function here
// so that only ONE refresh path exists (avoids dual-caller race condition)
let externalRefreshFn = null;
export function setRefreshDelegate(fn) {
  externalRefreshFn = typeof fn === "function" ? fn : null;
}
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
const FORCE_DISABLE_AUTO_LOGOUT = false;
const DISABLE_AUTO_LOGOUT =
  FORCE_DISABLE_AUTO_LOGOUT ||
  String(import.meta.env.VITE_DISABLE_AUTO_LOGOUT || "false")
    .trim()
    .toLowerCase() === "true";
const ACTIVE_APP_STORAGE_KEY = "mhub:active-app";
const ACTIVE_CATEGORY_STORAGE_KEY = "mhub:category-mode";
const CATEGORY_CACHE_KEY = "mhub_categories_cache";
const CATEGORY_CACHE_WITH_SUB_KEY = "mhub_categories_with_sub_cache";
const ACTIVE_APP_FILTER_ROUTES = new Set([
  "/posts",
  "/posts/mine",
  "/posts/for-you",
  "/posts/search",
  "/feed",
  "/feed/mine",
  "/dashboard",
  "/admin/dashboard",
  "/nearby",
  "/wishlist",
  "/recently-viewed",
  "/cart",
  "/notifications",
  "/publicwall",
  "/public-wall",
  "/offers",
  "/reviews",
  "/channels",
  "/channels/featured",
  "/channels/premium",
]);
const ACTIVE_APP_FILTER_PREFIXES = [
  "/channels",
  "/channel",
  "/publicwall",
  "/public-wall",
  "/reviews",
  "/wishlist",
  "/recently-viewed",
  "/cart",
  "/notifications",
  "/offers",
];
const CATEGORY_SCOPE_EXCLUDED_ROUTE_PREFIXES = [
  "/login",
  "/signup",
  "/invite",
  "/forgot-password",
  "/reset-password",
  "/profile",
  "/security",
  "/rewards",
  "/kyc",
  "/aadhaar-verify",
  "/verification",
  "/auth",
];
const RATE_LIMIT_RETRY_DEFAULT_MS = 1500;
const RATE_LIMIT_RETRY_MAX_MS = 5000;
const RATE_LIMIT_COOLDOWN_MAX_MS = 5 * 60 * 1000;
const RATE_LIMIT_JITTER_MS = 300;
const normalizeOrigin = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");
const resolveRetryAfterMs = (headerValue, fallbackMs = RATE_LIMIT_RETRY_DEFAULT_MS) => {
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
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const rateLimitCooldowns = new Map();
const rateLimitCooldownWaiters = new Map();
const buildRateLimitKey = (config) => {
  const method = String(config?.method || "get").toLowerCase();
  const base = String(config?.baseURL || getCurrentApiRootUrl()).trim();
  const url = String(config?.url || "").trim();
  return `${method}:${base}:${url}`;
};
const normalizeAppGroup = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.startsWith("electronic") || normalized.startsWith("mobile")) {
    return "electronics";
  }
  if (normalized.startsWith("fashion")) return "fashion";
  if (normalized.startsWith("vehicle") || normalized.startsWith("auto")) {
    return "vehicles";
  }
  if (normalized === "other") return "others";
  return ["electronics", "fashion", "vehicles", "others"].includes(normalized)
    ? normalized
    : "";
};
const readStoredActiveApp = () => {
  if (typeof window === "undefined") return "";
  try {
    return normalizeAppGroup(window.localStorage.getItem(ACTIVE_APP_STORAGE_KEY));
  } catch {
    return "";
  }
};
const readStoredJsonSafe = (key) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const readStoredActiveCategory = () => {
  const stored = readStoredJsonSafe(ACTIVE_CATEGORY_STORAGE_KEY);
  if (!stored || typeof stored !== "object") return null;
  const name = String(stored.name || "").trim();
  if (!name) return null;
  return {
    id: stored.id ?? null,
    name,
  };
};
const readStoredCategoryCache = () => {
  const withSub = readStoredJsonSafe(CATEGORY_CACHE_WITH_SUB_KEY);
  if (Array.isArray(withSub)) return withSub;
  const base = readStoredJsonSafe(CATEGORY_CACHE_KEY);
  return Array.isArray(base) ? base : [];
};
const resolveCategoryModeState = () => {
  if (typeof window !== "undefined") {
    const currentPath = String(window.location?.pathname || "").toLowerCase();
    if (
      currentPath &&
      CATEGORY_SCOPE_EXCLUDED_ROUTE_PREFIXES.some(
        (prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`),
      )
    ) {
      return null;
    }
  }
  const activeApp = readStoredActiveApp();
  const activeCategory = readStoredActiveCategory();
  if (!activeApp && !activeCategory?.name) return null;
  const categories = readStoredCategoryCache();
  const activeAppMatcher = buildActiveAppMatcher(activeApp, categories);
  return {
    activeAppMatcher,
    activeCategory,
    activeCategoryId: activeCategory?.id ?? null,
  };
};
const hasCategoryMetadata = (value) => {
  if (!value || typeof value !== "object") return false;
  return Boolean(
    value.category_group ||
      value.categoryGroup ||
      value.category_id ||
      value.categoryId ||
      value.category_name ||
      value.categoryName ||
      value.category ||
      value.subcategory_id ||
      value.subcategoryId ||
      value.subcategory_name ||
      value.subcategoryName,
  );
};
const resolveCategoryCandidate = (value) => {
  if (!value || typeof value !== "object") return null;
  if (value.post && typeof value.post === "object") return value.post;
  if (value.listing && typeof value.listing === "object") return value.listing;
  if (value.item && typeof value.item === "object") return value.item;
  if (value.data && typeof value.data === "object" && hasCategoryMetadata(value.data)) {
    return value.data;
  }
  return value;
};
const filterCategoryArray = (items, state) => {
  if (!state || !Array.isArray(items)) return items;
  const activeCategory = state.activeCategory?.name ? state.activeCategory : null;
  const activeCategoryId = state.activeCategoryId;
  const activeAppMatcher = state.activeAppMatcher;
  return items.filter((item) => {
    const candidate = resolveCategoryCandidate(item);
    if (!candidate) return true;
    if (!hasCategoryMetadata(candidate)) return true;
    return matchesCategoryModeItem(candidate, {
      activeCategory,
      activeCategoryId,
      activeAppMatcher,
    });
  });
};
const isPlainObject = (value) =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const applyCategoryModeFilter = (payload, config, depth = 0) => {
  if (!payload || typeof window === "undefined") return payload;
  if (config?.skipActiveAppFilter) return payload;
  const method = String(config?.method || "get").toLowerCase();
  if (method !== "get") return payload;
  const path = getRequestPath(config?.url);
  const matchesPath =
    ACTIVE_APP_FILTER_ROUTES.has(path) ||
    ACTIVE_APP_FILTER_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!matchesPath) return payload;
  const state = resolveCategoryModeState();
  if (!state) return payload;

  if (Array.isArray(payload)) {
    return filterCategoryArray(payload, state);
  }
  if (!isPlainObject(payload)) return payload;

  if (hasCategoryMetadata(payload)) {
    const candidate = resolveCategoryCandidate(payload) || payload;
    const matches = matchesCategoryModeItem(candidate, {
      activeCategory: state.activeCategory?.name ? state.activeCategory : null,
      activeCategoryId: state.activeCategoryId,
      activeAppMatcher: state.activeAppMatcher,
    });
    if (!matches) return null;
  }

  const next = { ...payload };
  Object.keys(next).forEach((key) => {
    const value = next[key];
    if (Array.isArray(value)) {
      next[key] = filterCategoryArray(value, state);
    } else if (isPlainObject(value) && depth < 2) {
      next[key] = applyCategoryModeFilter(value, config, depth + 1);
    }
  });
  return next;
};
const shouldApplyActiveAppFilter = (config) => {
  const method = String(config?.method || "get").toLowerCase();
  if (method !== "get" || config?.skipActiveAppFilter) return false;
  const path = getRequestPath(config?.url);
  const matchesPath =
    ACTIVE_APP_FILTER_ROUTES.has(path) ||
    ACTIVE_APP_FILTER_PREFIXES.some((prefix) => path.startsWith(prefix));
  if (!matchesPath) return false;
  const rawUrl = String(config?.url || "");
  if (
    rawUrl.includes("category_group=") ||
    rawUrl.includes("categoryGroup=") ||
    rawUrl.includes("group=") ||
    rawUrl.includes("category_id=") ||
    rawUrl.includes("categoryId=") ||
    rawUrl.includes("category=")
  ) {
    return false;
  }
  return true;
};
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
const shouldRetainAuthOnRefreshFailure = (error) => {
  const status = error?.status ?? error?.response?.status ?? null;
  const isNetworkError =
    typeof error?.isNetworkError === "boolean"
      ? error.isNetworkError
      : !error?.response;
  if (status === 429) return true;
  if (typeof status === "number" && status >= 500) return true;
  if (isNetworkError) return true;
  return false;
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
let csrfBootstrapRetryCount = 0;
const CSRF_MAX_RETRIES = 3;
async function ensureCsrfTokenCookie(apiRootUrl) {
  if (getCookieValue(CSRF_COOKIE_NAME)) {
    csrfBootstrapRetryCount = 0;
    return true;
  }

  if (csrfBootstrapRetryCount >= CSRF_MAX_RETRIES) {
    return false;
  }

  if (!csrfBootstrapPromise) {
    csrfBootstrapPromise = axios
      .get(`${apiRootUrl}/auth/csrf-token`, {
        withCredentials: true,
        timeout: 10e3,
      })
      .then(() => {
        csrfBootstrapRetryCount = 0;
        return Boolean(getCookieValue(CSRF_COOKIE_NAME));
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
    return false;
  }
  // If AuthContext has registered a delegate, use it as the single source of truth
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
  if (!refreshPromise) {
    const apiRootUrl = getCurrentApiRootUrl();
    const refreshTimestamp = Date.now();
    const refreshNonce = createRequestNonce();
    logAuthDiagnostic("refresh_attempt_started", {
      apiRootUrl,
    });
    refreshPromise = axios
      .post(`${apiRootUrl}/auth/refresh-token`, {
        _timestamp: refreshTimestamp,
        _nonce: refreshNonce,
      }, {
        withCredentials: true,
        timeout: 15e3,
        headers: {
          [CSRF_HEADER_NAME]: await ensureCsrfTokenCookie(apiRootUrl)
            ? getCookieValue(CSRF_COOKIE_NAME)
            : "",
          "X-MHub-Timestamp": String(refreshTimestamp),
          "X-MHub-Nonce": refreshNonce,
        },
      })
      .then((res) => {
        if (res.status >= 200 && res.status < 300) {
          refreshFailureBackoffUntil = 0;
          logAuthDiagnostic("refresh_attempt_success", {
            status: res.status,
          });
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
        const backoffMs = resolveRetryAfterMs(
          retryAfterHeader,
          REFRESH_FAILURE_BACKOFF_MS,
        );
        refreshFailureBackoffUntil = Date.now() + backoffMs;
        logAuthDiagnostic("refresh_attempt_failed", {
          status: error?.response?.status || null,
          code: error?.code || null,
          backoffMs,
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
  async (config) => {
    const headers = config.headers || {};
    config.baseURL = getCurrentApiRootUrl();
    if (
      typeof config.url === "string" &&
      !/^https?:\/\//i.test(config.url) &&
      config.url.startsWith("/api/")
    ) {
      config.url = config.url.slice(4);
    }
    const deviceId = getDeviceId();
    if (deviceId) {
      headers["X-Device-Id"] = deviceId;
    }
    // Send persistent device fingerprint for device binding enforcement
    const storedFp = localStorage.getItem("mhub_device_fp");
    if (storedFp) {
      headers["X-Device-Fingerprint"] = storedFp;
    }
    headers["X-Timezone"] = CLIENT_TIMEZONE;
    // Send request timestamp for anti-replay protection
    headers["X-MHub-Timestamp"] = String(Date.now());
    headers["X-MHub-Nonce"] = createRequestNonce();
    // Send DevTools detection signal for sensitive operation blocking
    try {
      if (isDevToolsOpen()) {
        headers["X-MHub-DevTools"] = "true";
      }
    } catch { /* ignore in dev */ }
    // Send client-side VPN detection result to server for cross-validation
    const vpnStatus = sessionStorage.getItem("mhub_vpn_status");
    if (vpnStatus) {
      try {
        const parsed = JSON.parse(vpnStatus);
        if (parsed?.vpnDetected) {
          headers["X-MHub-VPN-Detected"] = "true";
        }
      } catch { /* ignore */ }
    }
    headers["Accept-Language"] =
      localStorage.getItem("mhub_language") ||
      localStorage.getItem("lang") ||
      "en";
    const method = String(config.method || "get").toLowerCase();
    if (method === "get") {
      const rateLimitKey = buildRateLimitKey(config);
      const now = Date.now();
      const cooldownUntil = rateLimitCooldowns.get(rateLimitKey) || 0;
      if (cooldownUntil > now) {
        const waitMs = cooldownUntil - now;
        const existingWaiter = rateLimitCooldownWaiters.get(rateLimitKey);
        if (existingWaiter && existingWaiter.until === cooldownUntil) {
          await existingWaiter.promise;
        } else {
          const jitter = Math.floor(Math.random() * RATE_LIMIT_JITTER_MS);
          const promise = sleep(waitMs + jitter);
          rateLimitCooldownWaiters.set(rateLimitKey, {
            until: cooldownUntil,
            promise,
          });
          await promise;
          rateLimitCooldownWaiters.delete(rateLimitKey);
        }
      }
    }
    if (shouldApplyActiveAppFilter(config)) {
      const activeApp = readStoredActiveApp();
      const activeCategory = readStoredActiveCategory();
      if (activeApp || activeCategory?.id || activeCategory?.name) {
        let params;
        if (config.params instanceof URLSearchParams) {
          params = config.params;
        } else {
          // Strip undefined/null values before constructing URLSearchParams
          // to prevent them from being serialized as the literal string "undefined"/"null".
          const cleaned = {};
          if (config.params && typeof config.params === "object") {
            for (const [k, v] of Object.entries(config.params)) {
              if (v !== undefined && v !== null) cleaned[k] = v;
            }
          }
          params = new URLSearchParams(cleaned);
        }
        const hasCategoryParam =
          params.has("category_id") ||
          params.has("categoryId") ||
          params.has("category");
        const hasGroupParam =
          params.has("category_group") ||
          params.has("categoryGroup") ||
          params.has("group");

        if (!hasCategoryParam) {
          if (activeCategory?.id != null && activeCategory?.id !== "") {
            params.set("category_id", String(activeCategory.id));
          } else if (activeCategory?.name) {
            params.set("category", String(activeCategory.name));
          }
        }

        if (activeApp && !hasGroupParam) {
          params.set("category_group", activeApp);
        }

        config.params = params;
      }
    }
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
  (response) => {
    const normalized = normalizeApiMediaPayload(response.data);
    const guarded = applyResponseGuard(response?.config?.url, normalized);
    return applyCategoryModeFilter(guarded, response?.config);
  },
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
    if (status === 429 && originalRequest) {
      const retryAfterHeader = error.response?.headers?.["retry-after"];
      let retryAfterMs = resolveRetryAfterMs(
        retryAfterHeader,
        RATE_LIMIT_RETRY_DEFAULT_MS,
      );
      const retryAfterBody = Number(
        error.response?.data?.retryAfter ??
          error.response?.data?.retry_after ??
          error.response?.data?.retryAfterMs,
      );
      if (Number.isFinite(retryAfterBody)) {
        const bodyMs = retryAfterBody > 1000 ? retryAfterBody : retryAfterBody * 1000;
        retryAfterMs = Math.max(retryAfterMs, bodyMs);
      }
      const cooldownMs = Math.min(retryAfterMs, RATE_LIMIT_COOLDOWN_MAX_MS);
      const method = String(originalRequest.method || "get").toLowerCase();
      if (method === "get") {
        const rateLimitKey = buildRateLimitKey(originalRequest);
        rateLimitCooldowns.set(rateLimitKey, Date.now() + cooldownMs);
      }
      if (method === "get" && !originalRequest._retry429) {
        if (retryAfterMs <= RATE_LIMIT_RETRY_MAX_MS) {
          originalRequest._retry429 = true;
          await sleep(retryAfterMs);
          return api(originalRequest);
        }
      }
    }
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
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return api(originalRequest);
        }
        throw new Error("Session refresh failed");
      } catch (refreshError) {
        const refreshStatus =
          refreshError?.status ?? refreshError?.response?.status ?? null;
        const retainAuth = shouldRetainAuthOnRefreshFailure(refreshError);
        logAuthDiagnostic("auth_interceptor_retry_failed", {
          status: refreshStatus,
          path: getRequestPath(originalRequest?.url),
          retainAuth,
        });
        if (!retainAuth) {
          const hardAuthFailure = refreshStatus === 401 || refreshStatus === 403;
          if (DISABLE_AUTO_LOGOUT && !hardAuthFailure) {
            logAuthDiagnostic("auto_logout_suppressed", {
              source: "api_interceptor_refresh_failure",
              status: refreshStatus,
            });
          } else {
            clearClientAuthState();
            if (DISABLE_AUTO_LOGOUT) {
              logAuthDiagnostic("auto_logout_forced", {
                source: "api_interceptor_refresh_failure",
                status: refreshStatus,
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
    // Handle server-side VPN block — trigger client VPN blocker
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "VPN_BLOCKED"
    ) {
      // Update sessionStorage so VPN blocker picks it up
      sessionStorage.setItem("mhub_vpn_status", JSON.stringify({
        vpnDetected: true,
        confidence: "high",
        reasons: ["server_vpn_block"],
        score: 100,
        timestamp: Date.now(),
      }));
      // Dispatch event for VPNBlocker component
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("mhub:vpn-blocked", {
          detail: { code: "VPN_BLOCKED", source: "server" },
        }));
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
