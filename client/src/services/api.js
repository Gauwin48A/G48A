/**
 * API Client
 * ────────────
 * Orchestrator module that wires together focused sub-modules into the
 * single axios-based API client consumed by every page and service.
 *
 * Sub-modules (./api/*):
 *   csrf.js          — CSRF token management
 *   rateLimiter.js   — Client-side rate-limit cooldowns & retry
 *   mediaHelper.js   — Media URL normalization for API responses
 *   authInterceptor.js — Auth state, token refresh, session management
 */

import axios from "axios";
import { getDeviceId } from "@/utils/device";
import { getApiRootUrl } from "@/lib/networkConfig";
import { applyResponseGuard } from "@/lib/responseGuards";
import { mapAuthError } from "@/utils/authErrorMapper";
import { logAuthDiagnostic } from "@/services/authDiagnostics";
import { isDevToolsOpen } from "@/utils/codeProtection";
import { createRequestNonce } from "@/lib/requestSecurity";
import { buildActiveAppMatcher, matchesCategoryModeItem } from "@/utils/categoryModeFilters";
import { requestSoftNavigate } from "@/utils/softNavigate";

// ── Import extracted sub-modules ──────────────────────────────────────────
import { ensureCsrfTokenCookie, getCsrfToken, invalidateCsrfToken, CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./api/csrf";
import { waitForRateLimitCooldown, recordRateLimitCooldown, resolveRetryAfterMs, sleep, RATE_LIMIT_RETRY_DEFAULT_MS, RATE_LIMIT_RETRY_MAX_MS } from "./api/rateLimiter";
import { normalizeApiMediaPayload } from "./api/mediaHelper";
import {
  setRefreshDelegate,
  shouldSkipAuthRefresh,
  isAuthRequestPath,
  shouldRetainAuthOnRefreshFailure,
  refreshAccessToken,
  handleRefreshFailure,
  dispatchAuthRequiredOnce,
  SECURITY_EVENT_NAME,
} from "./api/authInterceptor";

// ═══════════════════════════════════════════════════════════════════════════
// 1. CORE CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const getCurrentApiRootUrl = () => {
  const resolved = getApiRootUrl();
  return typeof resolved === "string" && resolved ? resolved : "/api";
};

const CLIENT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

// ═══════════════════════════════════════════════════════════════════════════
// 2. LOCAL DEV BACKEND RECOVERY
// ═══════════════════════════════════════════════════════════════════════════

const LOCAL_DEV_BACKEND_ORIGINS = ["http://localhost:5001", "http://localhost:5000"];
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);
const BACKEND_HEALTH_TIMEOUT_MS = 2500;
const BACKEND_RECOVERY_FAILURE_TTL_MS = 15e3;

let backendRecoveryPromise = null;
let backendRecoveryFailureUntil = 0;
let backendRecoveredOriginCache = "";

const normalizeOrigin = (value) =>
  String(value || "").trim().replace(/\/+$/, "");

const isLocalhostRuntime = () =>
  typeof window !== "undefined" && LOCALHOST_HOSTNAMES.has(window.location.hostname);

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
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timeout = setTimeout(() => { if (controller) controller.abort(); }, BACKEND_HEALTH_TIMEOUT_MS);
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
    if (payload.service) return String(payload.service).toLowerCase() === "mhub-backend";
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
  if (!import.meta.env.DEV) return "";
  if (!isLocalhostRuntime()) return "";
  const now = Date.now();
  if (backendRecoveredOriginCache) return backendRecoveredOriginCache;
  if (backendRecoveryFailureUntil && now < backendRecoveryFailureUntil) return "";
  if (!backendRecoveryPromise) {
    backendRecoveryPromise = (async () => {
      const currentRoot = getCurrentApiRootUrl();
      let currentOrigin = "";
      if (/^https?:\/\//i.test(currentRoot)) {
        try { currentOrigin = new URL(currentRoot).origin; } catch { currentOrigin = ""; }
      }
      const candidates = LOCAL_DEV_BACKEND_ORIGINS.filter((o) => o !== currentOrigin);
      for (const origin of candidates) {
        if (await probeMhubHealth(origin)) {
          backendRecoveredOriginCache = normalizeOrigin(origin);
          backendRecoveryFailureUntil = 0;
          return backendRecoveredOriginCache;
        }
      }
      backendRecoveryFailureUntil = Date.now() + BACKEND_RECOVERY_FAILURE_TTL_MS;
      return "";
    })().finally(() => { backendRecoveryPromise = null; });
  }
  return backendRecoveryPromise;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CATEGORY MODE FILTERING
// ═══════════════════════════════════════════════════════════════════════════

const ACTIVE_APP_STORAGE_KEY = "mhub:active-app";
const ACTIVE_CATEGORY_STORAGE_KEY = "mhub:category-mode";
const CATEGORY_CACHE_KEY = "mhub_categories_cache";
const CATEGORY_CACHE_WITH_SUB_KEY = "mhub_categories_with_sub_cache";

const ACTIVE_APP_FILTER_ROUTES = new Set([
  "/posts", "/posts/mine", "/posts/for-you", "/posts/search",
  "/feed", "/feed/mine", "/dashboard", "/admin/dashboard",
  "/nearby", "/wishlist", "/recently-viewed", "/cart",
  "/notifications", "/publicwall", "/public-wall", "/offers",
  "/reviews", "/channels", "/channels/featured", "/channels/premium",
]);

const ACTIVE_APP_FILTER_PREFIXES = [
  "/channels", "/channel", "/publicwall", "/public-wall",
  "/reviews", "/wishlist", "/recently-viewed", "/cart",
  "/notifications", "/offers",
];

const CATEGORY_SCOPE_EXCLUDED_ROUTE_PREFIXES = [
  "/login", "/signup", "/invite", "/forgot-password", "/reset-password",
  "/profile", "/security", "/rewards", "/kyc", "/aadhaar-verify",
  "/verification", "/auth",
];

const getRequestPath = (url) => {
  if (typeof url !== "string") return "";
  if (/^https?:\/\//i.test(url)) {
    try { return new URL(url).pathname; } catch { return url; }
  }
  return url.startsWith("/") ? url : `/${url}`;
};

const normalizeAppGroup = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "";
  if (normalized.startsWith("electronic") || normalized.startsWith("mobile")) return "electronics";
  if (normalized.startsWith("fashion")) return "fashion";
  if (normalized.startsWith("vehicle") || normalized.startsWith("auto")) return "vehicles";
  if (normalized === "other") return "others";
  return ["electronics", "fashion", "vehicles", "others"].includes(normalized) ? normalized : "";
};

const readStoredActiveApp = () => {
  if (typeof window === "undefined") return "";
  try { return normalizeAppGroup(window.localStorage.getItem(ACTIVE_APP_STORAGE_KEY)); }
  catch { return ""; }
};

const readStoredJsonSafe = (key) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

const readStoredActiveCategory = () => {
  const stored = readStoredJsonSafe(ACTIVE_CATEGORY_STORAGE_KEY);
  if (!stored || typeof stored !== "object") return null;
  const name = String(stored.name || "").trim();
  if (!name) return null;
  return { id: stored.id ?? null, name };
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
        (prefix) => currentPath === prefix || currentPath.startsWith(`${prefix}/`)
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
  return { activeAppMatcher, activeCategory, activeCategoryId: activeCategory?.id ?? null };
};

const hasCategoryMetadata = (value) => {
  if (!value || typeof value !== "object") return false;
  return Boolean(
    value.category_group || value.categoryGroup ||
    value.category_id || value.categoryId ||
    value.category_name || value.categoryName ||
    value.category ||
    value.subcategory_id || value.subcategoryId ||
    value.subcategory_name || value.subcategoryName
  );
};

const resolveCategoryCandidate = (value) => {
  if (!value || typeof value !== "object") return null;
  if (value.post && typeof value.post === "object") return value.post;
  if (value.listing && typeof value.listing === "object") return value.listing;
  if (value.item && typeof value.item === "object") return value.item;
  if (value.data && typeof value.data === "object" && hasCategoryMetadata(value.data)) return value.data;
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
    return matchesCategoryModeItem(candidate, { activeCategory, activeCategoryId, activeAppMatcher });
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

  if (Array.isArray(payload)) return filterCategoryArray(payload, state);
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
    if (Array.isArray(value)) next[key] = filterCategoryArray(value, state);
    else if (isPlainObject(value) && depth < 2) next[key] = applyCategoryModeFilter(value, config, depth + 1);
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
    rawUrl.includes("category_group=") || rawUrl.includes("categoryGroup=") ||
    rawUrl.includes("group=") || rawUrl.includes("category_id=") ||
    rawUrl.includes("categoryId=") || rawUrl.includes("category=")
  ) {
    return false;
  }
  return true;
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. AXIOS INSTANCE
// ═══════════════════════════════════════════════════════════════════════════

const api = axios.create({
  baseURL: getCurrentApiRootUrl(),
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  xsrfCookieName: CSRF_COOKIE_NAME,
  xsrfHeaderName: CSRF_HEADER_NAME,
  timeout: 15e3,
});

// Expose for runtime diagnostics + proactive CSRF bootstrap
try {
  if (typeof window !== "undefined") {
    window.__mhubApi = api;
    const c = window.__mhubConsole || console;
    (c.log || console.log)("[MHub:api.js] module loaded; baseURL=" + getCurrentApiRootUrl());
    const buf = window.__mhubDiagBuffer || (window.__mhubDiagBuffer = []);
    buf.push({ t: Date.now(), tag: "MODULE_LOAD", detail: getCurrentApiRootUrl() });

    // Pre-fetch CSRF token immediately so login/signup don't wait for it
    if (typeof document !== "undefined" && document.cookie.indexOf("XSRF-TOKEN") === -1) {
      fetch(getCurrentApiRootUrl() + "/auth/csrf-token", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }).catch(() => {});
    }
  }
} catch {}

// ═══════════════════════════════════════════════════════════════════════════
// 5. REQUEST INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════

api.interceptors.request.use(
  async (config) => {
    const _diag = (tag, detail) => {
      try {
        const line = `[MHub:Interceptor] ${tag}`;
        const payload = detail === undefined ? "" : detail;
        const c = (typeof window !== "undefined" && window.__mhubConsole) || console;
        (c.log || console.log)(line, payload);
        if (typeof window !== "undefined") {
          const buf = window.__mhubDiagBuffer || (window.__mhubDiagBuffer = []);
          buf.push({
            t: Date.now(),
            tag,
            detail: typeof payload === "string" ? payload : (() => { try { return JSON.stringify(payload); } catch { return String(payload); } })(),
          });
          if (buf.length > 300) buf.shift();
        }
      } catch {}
    };

    try {
      _diag("START", config?.url);

      const headers = config.headers || {};
      config.baseURL = getCurrentApiRootUrl();
      _diag("baseURL", config.baseURL);

      // Strip /api/ prefix if present (handles Vite proxy ↔ direct backend)
      if (
        typeof config.url === "string" &&
        !/^https?:\/\//i.test(config.url) &&
        config.url.startsWith("/api/")
      ) {
        config.url = config.url.slice(4);
      }

      // Device ID
      const deviceId = (() => { try { return getDeviceId(); } catch { return ""; } })();
      if (deviceId) headers["X-Device-Id"] = deviceId;

      // Device fingerprint + stored auth headers
      try {
        const storedFp = localStorage.getItem("mhub_device_fp");
        if (storedFp) headers["X-Device-Fingerprint"] = storedFp;

        const storedToken =
          localStorage.getItem("token") ||
          localStorage.getItem("authToken") ||
          localStorage.getItem("jwtToken");
        if (storedToken && !headers["Authorization"] && !headers["authorization"]) {
          headers["Authorization"] = storedToken.startsWith("Bearer ")
            ? storedToken
            : `Bearer ${storedToken}`;
        }

        const storedUserId = localStorage.getItem("userId") || localStorage.getItem("user_id");
        if (storedUserId && !headers["X-User-Id"] && !headers["x-user-id"]) {
          headers["X-User-Id"] = storedUserId;
        }
      } catch {}

      // Timezone & anti-replay
      headers["X-Timezone"] = CLIENT_TIMEZONE;
      headers["X-MHub-Timestamp"] = String(Date.now());
      headers["X-MHub-Nonce"] = createRequestNonce();

      // DevTools detection
      try { if (isDevToolsOpen()) headers["X-MHub-DevTools"] = "true"; } catch {}

      // VPN status
      try {
        const vpnStatus = sessionStorage.getItem("mhub_vpn_status");
        if (vpnStatus) {
          const parsed = JSON.parse(vpnStatus);
          if (parsed?.vpnDetected) headers["X-MHub-VPN-Detected"] = "true";
        }
      } catch {}

      headers["Accept-Language"] = (() => {
        try { return localStorage.getItem("mhub_language") || localStorage.getItem("lang") || "en"; }
        catch { return "en"; }
      })();

      // ── Rate-limit cooldown check (GET only) ──────────────────────────
      const method = String(config.method || "get").toLowerCase();
      if (method === "get") {
        await waitForRateLimitCooldown(config);
      }

      // ── Active-app category filter injection ──────────────────────────
      if (shouldApplyActiveAppFilter(config)) {
        const activeApp = readStoredActiveApp();
        const activeCategory = readStoredActiveCategory();
        if (activeApp || activeCategory?.id || activeCategory?.name) {
          let params;
          if (config.params instanceof URLSearchParams) {
            params = config.params;
          } else {
            const cleaned = {};
            if (config.params && typeof config.params === "object") {
              for (const [k, v] of Object.entries(config.params)) {
                if (v !== undefined && v !== null) cleaned[k] = v;
              }
            }
            params = new URLSearchParams(cleaned);
          }

          const hasCategoryParam =
            params.has("category_id") || params.has("categoryId") || params.has("category");
          const hasGroupParam =
            params.has("category_group") || params.has("categoryGroup") || params.has("group");

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

      // ── CSRF header for mutating requests ─────────────────────────────
      if (["post", "put", "patch", "delete"].includes(method)) {
        const apiRootUrl = config.baseURL || getCurrentApiRootUrl();
        await ensureCsrfTokenCookie(apiRootUrl);
        const csrfToken = getCsrfToken();
        if (csrfToken && !headers[CSRF_HEADER_NAME]) {
          headers[CSRF_HEADER_NAME] = csrfToken;
        }
      }

      config.headers = headers;
      _diag("DONE", config?.url);
      return config;
    } catch (fatalErr) {
      console.error("[MHub:Interceptor] FATAL", fatalErr?.message, fatalErr?.stack);
      return config;
    }
  },
  (error) => Promise.reject(error)
);

// ═══════════════════════════════════════════════════════════════════════════
// 6. RESPONSE INTERCEPTOR
// ═══════════════════════════════════════════════════════════════════════════

api.interceptors.response.use(
  // ── Success handler ───────────────────────────────────────────────────
  (response) => {
    try {
      const c = (typeof window !== "undefined" && window.__mhubConsole) || console;
      (c.log || console.log)(`[MHub:Response] OK ${response?.status} ${response?.config?.url}`);
    } catch {}

    const normalized = normalizeApiMediaPayload(response.data);
    const guarded = applyResponseGuard(response?.config?.url, normalized);
    return applyCategoryModeFilter(guarded, response?.config);
  },

  // ── Error handler ─────────────────────────────────────────────────────
  async (error) => {
    try {
      const c = (typeof window !== "undefined" && window.__mhubConsole) || console;
      (c.log || console.log)(
        `[MHub:Response] ERR url=${error?.config?.url} status=${error?.response?.status} msg=${error?.message} code=${error?.code}`
      );
    } catch {}

    const originalRequest = error.config;
    const status = error.response?.status;
    const isNetworkError = !error.response;
    const backendError = error.response?.data?.error || error.response?.data?.message || "";
    const backendErrorText = typeof backendError === "string" ? backendError.toLowerCase() : "";
    const authErrorFromApi =
      backendErrorText.includes("token") || backendErrorText.includes("session");

    // ── 429 Rate limiting — record cooldown & retry GETs ────────────────
    if (status === 429 && originalRequest) {
      const retryAfterHeader = error.response?.headers?.["retry-after"];
      let retryAfterMs = resolveRetryAfterMs(retryAfterHeader, RATE_LIMIT_RETRY_DEFAULT_MS);

      const retryAfterBody = Number(
        error.response?.data?.retryAfter ??
        error.response?.data?.retry_after ??
        error.response?.data?.retryAfterMs
      );
      if (Number.isFinite(retryAfterBody)) {
        const bodyMs = retryAfterBody > 1000 ? retryAfterBody : retryAfterBody * 1000;
        retryAfterMs = Math.max(retryAfterMs, bodyMs);
      }

      recordRateLimitCooldown(originalRequest, retryAfterMs);

      const method = String(originalRequest.method || "get").toLowerCase();
      if (method === "get" && !originalRequest._retry429) {
        if (retryAfterMs <= RATE_LIMIT_RETRY_MAX_MS) {
          originalRequest._retry429 = true;
          await sleep(retryAfterMs);
          return api(originalRequest);
        }
      }
    }

    const shouldSkipRefresh = shouldSkipAuthRefresh(originalRequest?.url);

    // ── CSRF token mismatch — force-refresh & retry once ────────────────
    if (
      originalRequest &&
      status === 403 &&
      !originalRequest._csrfRetry &&
      (backendErrorText.includes("csrf") || backendErrorText.includes("xsrf"))
    ) {
      originalRequest._csrfRetry = true;
      try {
        const apiRootUrl = originalRequest.baseURL || getCurrentApiRootUrl();
        invalidateCsrfToken();
        await ensureCsrfTokenCookie(apiRootUrl, true);
        const freshToken = getCsrfToken();
        if (freshToken) {
          originalRequest.headers[CSRF_HEADER_NAME] = freshToken;
          return api(originalRequest);
        }
      } catch {}
    }

    // ── 401/403 auth — attempt token refresh, then retry ────────────────
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
        await handleRefreshFailure(refreshError, originalRequest);
        return Promise.reject(refreshError);
      }
    }

    // ── Login blocked (403 "Login Blocked") ─────────────────────────────
    if (
      error.response?.status === 403 &&
      error.response?.data?.error === "Login Blocked"
    ) {
      const eventDispatched =
        typeof window !== "undefined"
          ? window.dispatchEvent(
              new CustomEvent(SECURITY_EVENT_NAME, {
                detail: {
                  reason: "login_blocked",
                  redirectTo: "/security",
                  source: "api_interceptor_security_policy",
                  occurredAt: Date.now(),
                },
              })
            )
          : false;
      if (!eventDispatched && typeof window !== "undefined") {
        requestSoftNavigate("/security", { replace: true });
      }
    }

    // ── VPN block ──────────────────────────────────────────────────────
    if (
      error.response?.status === 403 &&
      error.response?.data?.code === "VPN_BLOCKED"
    ) {
      sessionStorage.setItem(
        "mhub_vpn_status",
        JSON.stringify({
          vpnDetected: true,
          confidence: "high",
          reasons: ["server_vpn_block"],
          score: 100,
          timestamp: Date.now(),
        })
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("mhub:vpn-blocked", {
            detail: { code: "VPN_BLOCKED", source: "server" },
          })
        );
      }
    }

    // ── Backend recovery (dev-mode port auto-detection) ─────────────────
    const shouldAttemptBackendRecovery =
      originalRequest &&
      !originalRequest._backendRecoveryAttempted &&
      isLocalhostRuntime() &&
      (isRouteNotFoundResponse(status, backendErrorText) || isLikelyNetworkOrCorsError(error));

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

    // ── Build user-friendly error message ───────────────────────────────
    let normalizedMessage = error.response?.data?.error || error.response?.data?.message || "";

    if (isRouteNotFoundResponse(status, backendErrorText)) {
      const attemptedBaseUrl = originalRequest?.baseURL || getCurrentApiRootUrl();
      normalizedMessage = `API route not found on ${attemptedBaseUrl}. This usually means the frontend is connected to the wrong backend service/port.`;
    }

    if (!normalizedMessage && isNetworkError) {
      const currentOrigin =
        typeof window !== "undefined" ? window.location.origin : "unknown-origin";
      const attemptedBaseUrl = originalRequest?.baseURL || getCurrentApiRootUrl();
      normalizedMessage = `Network/CORS error. Unable to reach API (${attemptedBaseUrl}) from ${currentOrigin}. Ensure backend is running and CORS allows this origin.`;
    }

    if (!normalizedMessage) {
      normalizedMessage = error.message || "Something went wrong";
    }

    // ── Auth error mapping ──────────────────────────────────────────────
    let mappedAuthError = null;
    if (isAuthRequestPath(originalRequest?.url)) {
      mappedAuthError = mapAuthError(error, { defaultMessage: normalizedMessage });
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
      isNetworkError,
      response: error.response,
      data: error.response?.data,
      original: error,
      auth: mappedAuthError,
    };
    return Promise.reject(customError);
  }
);

// Re-export setRefreshDelegate for AuthContext to register
export { setRefreshDelegate };
export default api;
