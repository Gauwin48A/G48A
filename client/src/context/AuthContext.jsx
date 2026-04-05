import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api, { setRefreshDelegate } from "../services/api";
import { getAccessToken, hasAuthSession } from "@/utils/authStorage";
import { clearWishlistCache, replaceSavedPostIds } from "@/utils/savedPosts";
import { mapAuthError } from "@/utils/authErrorMapper";
import { logAuthDiagnostic } from "@/services/authDiagnostics";
import { getDeviceFingerprint, getDeviceInfo } from "@/services/deviceFingerprint";
import { emitCoinBalanceUpdated, subscribeSubscriptionUpdated } from "@/utils/appStateEvents";
import { socket, connectSocketWithToken, disconnectSocket } from "@/lib/socket";

const AuthContext = createContext(null);
const JWT_EXP_SKEW_SECONDS = 30;
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const TERMINAL_AUTH_STATES = new Set(["invalid_token", "revoked", "password_changed"]);
const LOGIN_CHALLENGE_CODES = new Set(["RISK_CHALLENGE_REQUIRED", "TWO_FACTOR_REQUIRED"]);
const AUTH_RATE_LIMIT_FALLBACK_MS = 30 * 1000;
const AUTH_REQUEST_THROTTLE_MS = 2 * 1000;
const LOGIN_RATE_LIMIT_FALLBACK_MS = 60 * 1000;
const LOGIN_RATE_LIMIT_KEY = "mhub_login_rate_limit_until";
const AUTH_RATE_LIMIT_STORAGE_KEY = "mhub_auth_rate_limit_until";
const AUTH_SESSION_CACHE_TTL_MS = 60 * 1000;
const AUTH_SESSION_LAST_CHECK_KEY = "mhub_auth_session_last_check";
const AUTO_CHECKIN_COOLDOWN_KEY = "mhub_rewards_auto_checkin_until";
const FORCE_DISABLE_AUTO_LOGOUT = false;
const DISABLE_AUTO_LOGOUT =
  FORCE_DISABLE_AUTO_LOGOUT ||
  String(import.meta.env.VITE_DISABLE_AUTO_LOGOUT || "false")
    .trim()
    .toLowerCase() === "true";

const AUTH_STORAGE_KEYS = [
  "authToken",
  "refreshToken",
  "user",
  "userId",
  "user_id",
  "userProfile",
  "token",
  "authSession",
  "mhub_cart_v1",
  "mhub_user_city",
  "mhub_wishlist_cooldown_until",
];

function safeParseJson(rawValue) {
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
}

function normalizeUserId(user) {
  const value = user?.id ?? user?.user_id ?? null;
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function decodeJwtPayload(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4 || 4)) % 4);
    if (typeof globalThis.atob !== "function") return null;
    const json = globalThis.atob(`${base64}${padding}`);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function resolveRetryAfterMs(error, fallbackMs = AUTH_RATE_LIMIT_FALLBACK_MS) {
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
}
function readLoginRateLimitUntil() {
  try {
    const raw = localStorage.getItem(LOGIN_RATE_LIMIT_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}
function writeLoginRateLimitUntil(untilMs) {
  try {
    localStorage.setItem(LOGIN_RATE_LIMIT_KEY, String(untilMs));
  } catch {
    // ignore storage failures
  }
}
function readAuthRateLimitUntil() {
  try {
    const raw = localStorage.getItem(AUTH_RATE_LIMIT_STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function parseTimestamp(value) {
  if (!value) return 0;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;
  const asDate = Date.parse(String(value));
  return Number.isFinite(asDate) ? asDate : 0;
}

function readAutoCheckinUntil() {
  try {
    const raw = localStorage.getItem(AUTO_CHECKIN_COOLDOWN_KEY);
    const parsed = parseTimestamp(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeAutoCheckinUntil(value) {
  const parsed = parseTimestamp(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return;
  try {
    localStorage.setItem(AUTO_CHECKIN_COOLDOWN_KEY, String(parsed));
  } catch {
    // ignore storage failures
  }
}
function writeAuthRateLimitUntil(untilMs) {
  try {
    localStorage.setItem(AUTH_RATE_LIMIT_STORAGE_KEY, String(untilMs));
  } catch {
    // ignore storage failures
  }
}
function readAuthSessionLastCheck() {
  try {
    const raw = localStorage.getItem(AUTH_SESSION_LAST_CHECK_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}
function writeAuthSessionLastCheck(ts) {
  try {
    localStorage.setItem(AUTH_SESSION_LAST_CHECK_KEY, String(ts));
  } catch {
    // ignore storage failures
  }
}

function isTokenExpired(token, skewSeconds = JWT_EXP_SKEW_SECONDS) {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  if (!Number.isFinite(exp)) return false;
  const expiresAtMs = exp * 1000;
  return expiresAtMs <= Date.now() + skewSeconds * 1000;
}

function getTokenExpiryMs(token) {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);
  return Number.isFinite(exp) ? exp * 1000 : null;
}

function buildSessionDiagnostics(tokenOverride) {
  const token = tokenOverride !== undefined ? tokenOverride : getAccessToken();
  const tokenPresent = Boolean(token);
  const tokenExpiryMs = tokenPresent ? getTokenExpiryMs(token) : null;
  const msUntilExpiry = tokenExpiryMs ? tokenExpiryMs - Date.now() : null;
  const cachedUser = safeParseJson(localStorage.getItem("user"));

  return {
    tokenPresent,
    tokenExpired: tokenPresent ? isTokenExpired(token) : null,
    tokenExpiryMs,
    msUntilExpiry,
    authSessionFlag: hasAuthSession(),
    hasCachedUser: Boolean(cachedUser),
  };
}

function clearAuthStorage() {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

function getCookieValue(name) {
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
}

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(() => safeParseJson(localStorage.getItem("user")));
  const [loading, setLoading] = useState(true);
  const authRefreshInFlightRef = useRef(null);
  const refreshTokenInFlightRef = useRef(null);
  const csrfBootstrapInFlightRef = useRef(null);
  const authRateLimitUntilRef = useRef(readAuthRateLimitUntil());
  const authMeInFlightRef = useRef(null);
  const authSessionInFlightRef = useRef(null);
  const lastAuthMeAtRef = useRef(0);
  const lastAuthSessionAtRef = useRef(0);
  const loginRateLimitUntilRef = useRef(0);
  const autoCheckinInFlightRef = useRef(null);

  const applyCachedUser = useCallback(() => {
    const cached = safeParseJson(localStorage.getItem("user"));
    if (cached) {
      setUserState(cached);
      return true;
    }
    return false;
  }, []);

  const markAuthRateLimited = useCallback((error) => {
    authRateLimitUntilRef.current = Date.now() + resolveRetryAfterMs(error);
    writeAuthRateLimitUntil(authRateLimitUntilRef.current);
  }, []);

  const ensureCsrfToken = useCallback(async () => {
    if (getCookieValue(CSRF_COOKIE_NAME)) {
      return true;
    }
    if (!csrfBootstrapInFlightRef.current) {
      csrfBootstrapInFlightRef.current = api
        .get("/auth/csrf-token")
        .then(() => Boolean(getCookieValue(CSRF_COOKIE_NAME)))
        .catch(() => false)
        .finally(() => {
          csrfBootstrapInFlightRef.current = null;
        });
    }
    return csrfBootstrapInFlightRef.current;
  }, []);

  const setUser = useCallback((nextUserOrUpdater) => {
    setUserState((previous) => {
      const nextUser =
        typeof nextUserOrUpdater === "function"
          ? nextUserOrUpdater(previous)
          : nextUserOrUpdater;

      if (nextUser && typeof nextUser === "object") {
        localStorage.setItem("user", JSON.stringify(nextUser));
        const userId = normalizeUserId(nextUser);
        if (userId) {
          localStorage.setItem("userId", userId);
          localStorage.setItem("user_id", userId);
        }
        localStorage.setItem("authSession", "true");
        return nextUser;
      }

      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("user_id");
      localStorage.removeItem("authSession");
      return null;
    });
  }, []);

  const clearSession = useCallback(() => {
    clearAuthStorage();
    clearWishlistCache();
    replaceSavedPostIds([]);
    setUserState(null);
    disconnectSocket();
  }, []);
  const clearSessionIfAllowed = useCallback(
    (reason, meta = {}, force = false) => {
      const status = meta?.status ?? null;
      const forceClear =
        Boolean(force) || status === 401 || status === 403;

      if (DISABLE_AUTO_LOGOUT && !forceClear) {
        logAuthDiagnostic("auto_logout_suppressed", {
          reason,
          forced: Boolean(forceClear),
          ...meta,
        });
        return false;
      }

      clearSession();
      logAuthDiagnostic("auto_logout_executed", {
        reason,
        forced: Boolean(forceClear),
        ...meta,
      });
      return true;
    },
    [clearSession],
  );

  const buildRefreshErrorMeta = useCallback((error) => {
    const status = error?.response?.status ?? error?.status ?? null;
    const retryAfterMs = resolveRetryAfterMs(error, AUTH_RATE_LIMIT_FALLBACK_MS);
    return {
      status,
      code: error?.code ?? null,
      isNetworkError: !error?.response,
      retryAfterMs,
    };
  }, []);

  const shouldKeepSessionOnRefreshFailure = useCallback(
    (meta) =>
      meta?.status === 429 ||
      meta?.status >= 500 ||
      Boolean(meta?.isNetworkError),
    [],
  );

  const refreshAccessToken = useCallback(async () => {
    if (refreshTokenInFlightRef.current) {
      return refreshTokenInFlightRef.current;
    }

    refreshTokenInFlightRef.current = (async () => {
      try {
        await ensureCsrfToken();
        const response = await api.post("/auth/refresh-token", {});
        if (!response?.token) {
          return {
            ok: false,
            error: new Error("Token refresh failed"),
            meta: { status: null, code: null, isNetworkError: false, retryAfterMs: null },
          };
        }

        localStorage.setItem("authToken", response.token);
        localStorage.removeItem("token");
        localStorage.setItem("authSession", "true");
        connectSocketWithToken(response.token);

        if (response.user) {
          setUser(response.user);
        }

        logAuthDiagnostic("auth_context_refresh_success", {
          hasUserPayload: Boolean(response.user),
        });
        return { ok: true };
      } catch (error) {
        const meta = buildRefreshErrorMeta(error);
        if (meta?.status === 429) {
          markAuthRateLimited(error);
        }
        if (meta?.status === 401 || meta?.status === 403) {
          clearSessionIfAllowed("refresh_failed_invalid_session", {
            status: meta.status,
            code: meta.code,
          }, true);
        }
        logAuthDiagnostic("auth_context_refresh_failed", {
          status: meta.status,
          code: meta.code,
          isNetworkError: meta.isNetworkError,
        });
        return { ok: false, error, meta };
      }
    })().finally(() => {
      refreshTokenInFlightRef.current = null;
    });

    return refreshTokenInFlightRef.current;
  }, [
    buildRefreshErrorMeta,
    clearSessionIfAllowed,
    ensureCsrfToken,
    markAuthRateLimited,
    setUser,
  ]);

  // Register this as the single refresh path so api.js interceptor delegates here
  useEffect(() => {
    setRefreshDelegate(async () => {
      const result = await refreshAccessToken();
      if (!result?.ok) {
        const err = result?.error || new Error("Token refresh failed");
        if (result?.meta) {
          err.status = result.meta.status ?? err.status;
          err.code = result.meta.code ?? err.code;
          err.isNetworkError = result.meta.isNetworkError ?? err.isNetworkError;
          err.retryAfterMs = result.meta.retryAfterMs ?? err.retryAfterMs;
        }
        throw err;
      }
      return localStorage.getItem("authToken");
    });
    return () => setRefreshDelegate(null);
  }, [refreshAccessToken]);

  const fetchCurrentUser = useCallback(
    async ({ force = false } = {}) => {
      if (Date.now() < authRateLimitUntilRef.current) {
        return applyCachedUser();
      }
      if (!force) {
        if (authMeInFlightRef.current) {
          return authMeInFlightRef.current;
        }
        if (Date.now() - lastAuthMeAtRef.current < AUTH_REQUEST_THROTTLE_MS) {
          return applyCachedUser();
        }
      }

      lastAuthMeAtRef.current = Date.now();
      authMeInFlightRef.current = api
        .get("/auth/me")
        .then((profile) => {
          authRateLimitUntilRef.current = 0;
          writeAuthRateLimitUntil(0);
          setUser(profile);
          return true;
        })
        .catch((error) => {
          if (error?.status === 429) {
            markAuthRateLimited(error);
            return applyCachedUser();
          }
          throw error;
        })
        .finally(() => {
          authMeInFlightRef.current = null;
        });

      return authMeInFlightRef.current;
    },
    [applyCachedUser, markAuthRateLimited, setUser],
  );

  const refreshAuth = useCallback(async () => {
    if (Date.now() < authRateLimitUntilRef.current) {
      return applyCachedUser();
    }
    const accessToken = getAccessToken();
    logAuthDiagnostic("refresh_auth_snapshot", buildSessionDiagnostics(accessToken));
    if (!accessToken) {
      const refreshed = await refreshAccessToken();
      if (!refreshed?.ok) {
        if (shouldKeepSessionOnRefreshFailure(refreshed?.meta)) {
          return applyCachedUser();
        }
        if (!clearSessionIfAllowed("refresh_failed_no_token", {
          status: refreshed?.meta?.status ?? null,
        })) {
          return applyCachedUser();
        }
        return false;
      }
      try {
        return await fetchCurrentUser();
      } catch {
        if (!clearSessionIfAllowed("refresh_failed_profile_no_token")) {
          return applyCachedUser();
        }
        return false;
      }
    }

    if (accessToken && isTokenExpired(accessToken)) {
      const refreshed = await refreshAccessToken();
      if (!refreshed?.ok) {
        if (shouldKeepSessionOnRefreshFailure(refreshed?.meta)) {
          return applyCachedUser();
        }
        if (!clearSessionIfAllowed("refresh_failed_expired_token", {
          status: refreshed?.meta?.status ?? null,
        })) {
          return applyCachedUser();
        }
        return false;
      }
    }

    try {
      return await fetchCurrentUser();
    } catch (error) {
      const status = error?.status ?? error?.response?.status ?? null;
      const isAuthError = status === 401 || status === 403;
      if (status === 429) {
        markAuthRateLimited(error);
        return applyCachedUser();
      }

      if (isAuthError) {
        const refreshed = await refreshAccessToken();
        if (refreshed?.ok) {
          try {
            return await fetchCurrentUser();
          } catch {
            if (!clearSessionIfAllowed("refresh_failed_post_retry")) {
              return applyCachedUser();
            }
            return false;
          }
        }
        if (shouldKeepSessionOnRefreshFailure(refreshed?.meta)) {
          return applyCachedUser();
        }
        if (!clearSessionIfAllowed("refresh_failed_auth_error", {
          status: refreshed?.meta?.status ?? null,
        })) {
          return applyCachedUser();
        }
        return false;
      }

      if (!status) {
        const cached = safeParseJson(localStorage.getItem("user"));
        if (cached) {
          setUserState(cached);
          return true;
        }
      }

      if (!clearSessionIfAllowed("refresh_failed_unknown", { status })) {
        return applyCachedUser();
      }
      return false;
    }
  }, [
    applyCachedUser,
    clearSessionIfAllowed,
    fetchCurrentUser,
    markAuthRateLimited,
    refreshAccessToken,
    shouldKeepSessionOnRefreshFailure,
  ]);

  const refreshAuthSafe = useCallback(() => {
    if (!authRefreshInFlightRef.current) {
      authRefreshInFlightRef.current = refreshAuth().finally(() => {
        authRefreshInFlightRef.current = null;
      });
    }
    return authRefreshInFlightRef.current;
  }, [refreshAuth]);

  const bootstrapAuth = useCallback(async () => {
    try {
      if (Date.now() < authRateLimitUntilRef.current) {
        return applyCachedUser();
      }
      const lastSessionCheck = readAuthSessionLastCheck();
      const cachedUser = safeParseJson(localStorage.getItem("user"));
      const hasCachedSession = hasAuthSession() || Boolean(cachedUser);
      if (
        hasCachedSession &&
        lastSessionCheck &&
        Date.now() - lastSessionCheck < AUTH_SESSION_CACHE_TTL_MS
      ) {
        return applyCachedUser();
      }

      if (authSessionInFlightRef.current) {
        return authSessionInFlightRef.current;
      }

      if (Date.now() - lastAuthSessionAtRef.current < AUTH_REQUEST_THROTTLE_MS) {
        return applyCachedUser();
      }

      lastAuthSessionAtRef.current = Date.now();
      writeAuthSessionLastCheck(lastAuthSessionAtRef.current);
      authSessionInFlightRef.current = api
        .get("/auth/session")
        .catch((error) => {
          if (error?.status === 429) {
            markAuthRateLimited(error);
            return null;
          }
          throw error;
        })
        .finally(() => {
          authSessionInFlightRef.current = null;
        });

      const session = await authSessionInFlightRef.current;
      if (!session) {
        return applyCachedUser();
      }
      authRateLimitUntilRef.current = 0;
      writeAuthRateLimitUntil(0);
      const authenticated = Boolean(session?.authenticated);
      const hasRefreshCookie = Boolean(session?.hasRefreshCookie);
      const authState = String(session?.authState || "").trim().toLowerCase();
      const requiresReauth =
        Boolean(session?.requiresReauth) || TERMINAL_AUTH_STATES.has(authState);
      const canRefresh =
        typeof session?.canRefresh === "boolean"
          ? session.canRefresh
          : hasRefreshCookie;
      const token = getAccessToken();
      logAuthDiagnostic("bootstrap_session_snapshot", {
        authenticated,
        hasRefreshCookie,
        canRefresh,
        authState,
        requiresReauth,
        hasSessionUser: Boolean(session?.user),
        ...buildSessionDiagnostics(token),
      });

      if (requiresReauth) {
        logAuthDiagnostic("bootstrap_requires_reauth", {
          authState,
        });
        if (!clearSessionIfAllowed("bootstrap_requires_reauth", { authState }, true)) {
          return applyCachedUser();
        }
        return false;
      }

      if (!authenticated && !canRefresh) {
        logAuthDiagnostic("bootstrap_anonymous_no_refresh");
        if (!clearSessionIfAllowed("bootstrap_anonymous_no_refresh")) {
          return applyCachedUser();
        }
        return false;
      }

      if (
        authenticated &&
        session?.user &&
        !safeParseJson(localStorage.getItem("user"))
      ) {
        setUser(session.user);
      }
      if (authenticated) {
        localStorage.setItem("authSession", "true");
      }

      if (token && !isTokenExpired(token)) {
        try {
          return await fetchCurrentUser();
        } catch {
          // fall through to refresh fallback
        }
      }

      if (canRefresh) {
        const refreshed = await refreshAccessToken();
        if (refreshed?.ok) {
          try {
            return await fetchCurrentUser();
          } catch {
            if (!clearSessionIfAllowed("bootstrap_refresh_failed_profile")) {
              return applyCachedUser();
            }
            return false;
          }
        }
        if (shouldKeepSessionOnRefreshFailure(refreshed?.meta)) {
          return applyCachedUser();
        }
      }

      if (authenticated) {
        try {
          return await fetchCurrentUser();
        } catch {
          if (!clearSessionIfAllowed("bootstrap_authenticated_profile_failed")) {
            return applyCachedUser();
          }
          return false;
        }
      }

      if (!clearSessionIfAllowed("bootstrap_fallback_clear")) {
        return applyCachedUser();
      }
      return false;
    } catch (error) {
      const status = error?.status ?? error?.response?.status ?? null;
      logAuthDiagnostic("bootstrap_failed", {
        status,
      });
      if (status === 429) {
        markAuthRateLimited(error);
        return applyCachedUser();
      }
      if (status === 404) {
        // Backward compatibility when older backend doesn't expose /auth/session yet.
        return refreshAuthSafe();
      }
      return refreshAuthSafe();
    }
  }, [
    applyCachedUser,
    clearSessionIfAllowed,
    fetchCurrentUser,
    markAuthRateLimited,
    refreshAccessToken,
    refreshAuthSafe,
    setUser,
  ]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      await bootstrapAuth();
      if (mounted) {
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [bootstrapAuth]);

  useEffect(() => {
    const onStorageChange = (event) => {
      if (event.key && !AUTH_STORAGE_KEYS.includes(event.key)) {
        return;
      }

      const hasAnyToken = Boolean(
        localStorage.getItem("authToken") ||
          localStorage.getItem("token"),
      );

      if (!hasAnyToken) {
        if (DISABLE_AUTO_LOGOUT) {
          logAuthDiagnostic("auto_logout_suppressed", {
            reason: "storage_missing_token",
          });
          applyCachedUser();
          setLoading(false);
          return;
        }
        clearSession();
        setLoading(false);
        return;
      }

      const nextUser = safeParseJson(localStorage.getItem("user"));
      if (nextUser) {
        setUserState(nextUser);
      }

      void refreshAuthSafe();
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [applyCachedUser, clearSession, refreshAuthSafe]);

  useEffect(
    () =>
      subscribeSubscriptionUpdated(() => {
        void refreshAuthSafe();
      }),
    [refreshAuthSafe],
  );

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      connectSocketWithToken(token);
    } else {
      disconnectSocket();
    }
  }, [user]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    if (autoCheckinInFlightRef.current) return;
    const cooldownUntil = readAutoCheckinUntil();
    if (cooldownUntil && Date.now() < cooldownUntil) return;

    let cancelled = false;
    autoCheckinInFlightRef.current = (async () => {
      try {
        const engagement = await api.get("/coins/engagement");
        if (cancelled) return;
        const nextAt = engagement?.dailyCheckIn?.nextCheckInAt;
        if (nextAt) writeAutoCheckinUntil(nextAt);
        const alreadyCheckedIn = Boolean(engagement?.dailyCheckIn?.hasCheckedInToday);

        if (!alreadyCheckedIn) {
          try {
            const checkin = await api.post("/coins/daily-checkin");
            if (cancelled) return;
            const nextCheckInAt = checkin?.nextCheckInAt;
            if (nextCheckInAt) writeAutoCheckinUntil(nextCheckInAt);
            if (Number.isFinite(Number(checkin?.newBalance))) {
              emitCoinBalanceUpdated(Number(checkin.newBalance), { source: "auto-checkin" });
            }
          } catch (error) {
            const status = error?.status ?? error?.response?.status ?? null;
            if (status === 409) {
              const nextCheckInAt = error?.response?.data?.nextCheckInAt;
              if (nextCheckInAt) writeAutoCheckinUntil(nextCheckInAt);
            }
          }
        }

        if (engagement?.referralMilestone?.eligible && !engagement?.referralMilestone?.claimed) {
          try {
            const milestone = await api.post("/coins/referral-milestones");
            if (Number.isFinite(Number(milestone?.newBalance))) {
              emitCoinBalanceUpdated(Number(milestone.newBalance), { source: "auto-milestone" });
            }
          } catch {
            // ignore auto-claim failures
          }
        }
      } catch {
        // ignore engagement bootstrap failures
      }
    })().finally(() => {
      autoCheckinInFlightRef.current = null;
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const userId = normalizeUserId(user);
    if (!userId) return undefined;
    socket.emit("join_room", `user_${userId}`);
    return () => {
      socket.emit("leave_room", `user_${userId}`);
    };
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => {
      const token = getAccessToken();
      if (!token) {
        return;
      }

      const expiryMs = getTokenExpiryMs(token);
      if (!expiryMs) {
        return;
      }

      const msRemaining = expiryMs - Date.now();
      if (msRemaining <= 2 * 60 * 1000) {
        void refreshAuthSafe();
      }
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, [refreshAuthSafe]);

  const login = async (identifier, password, extraPayload = {}) => {
    try {
      const now = Date.now();
      const storedLimit = readLoginRateLimitUntil();
      const effectiveLimit = Math.max(
        loginRateLimitUntilRef.current,
        storedLimit,
      );
      if (effectiveLimit > now) {
        const waitSeconds = Math.ceil((effectiveLimit - now) / 1000);
        return {
          success: false,
          error: `Too many login attempts. Try again in ${waitSeconds}s.`,
        };
      }
      const payload =
        identifier && typeof identifier === "object"
          ? { ...identifier }
          : { identifier, password, ...extraPayload };
      if (
        !payload.identifier &&
        typeof identifier === "string" &&
        identifier.trim().length
      ) {
        payload.identifier = identifier;
      }
      if (password && payload.password === undefined) {
        payload.password = password;
      }

      // Attach device fingerprint for device binding
      try {
        const deviceInfo = await getDeviceInfo();
        payload.deviceFingerprint = deviceInfo.deviceFingerprint;
        payload.platform = deviceInfo.platform;
        payload.screenResolution = deviceInfo.screenResolution;
      } catch {
        // Don't block login if fingerprint fails
      }

      const response = await api.post("/auth/login", payload);

      const challengeCode = String(response?.code || "").trim().toUpperCase();
      if (
        response?.requireOtp ||
        String(response?.challengeType || "").trim().toLowerCase() === "otp" ||
        LOGIN_CHALLENGE_CODES.has(challengeCode)
      ) {
        logAuthDiagnostic("login_challenge_required", {
          challengeCode: challengeCode || null,
          challengeType: response?.challengeType || null,
        });
        return {
          success: false,
          requireOtp: true,
          challengeType: response?.challengeType || "otp",
          code: challengeCode || null,
          message: response?.message || "Additional verification required",
          otpSessionId: response?.otpSessionId || response?.sessionId || null,
        };
      }

      const { token, user: responseUser } = response || {};
      if (!token) {
        logAuthDiagnostic("login_missing_token_response");
        return {
          success: false,
          error: "Login failed: missing access token",
        };
      }

      localStorage.setItem("authToken", token);
      localStorage.removeItem("token");
      localStorage.setItem("authSession", "true");
      connectSocketWithToken(token);
      if (responseUser) {
        setUser(responseUser);
      } else {
        await refreshAuthSafe();
      }
      loginRateLimitUntilRef.current = 0;
      writeLoginRateLimitUntil(0);

      return {
        success: true,
        user: responseUser || null,
      };
    } catch (error) {
      const status = error?.status ?? error?.response?.status ?? null;
      if (status === 429) {
        const retryAfterMs = resolveRetryAfterMs(
          error,
          LOGIN_RATE_LIMIT_FALLBACK_MS,
        );
        const until = Date.now() + retryAfterMs;
        loginRateLimitUntilRef.current = Math.max(
          loginRateLimitUntilRef.current,
          until,
        );
        writeLoginRateLimitUntil(until);
      }
      const mapped = mapAuthError(error, {
        defaultMessage: "Login failed",
      });
      logAuthDiagnostic("login_failed", {
        status: mapped.status,
        code: mapped.code,
        category: mapped.category,
      });
      return {
        success: false,
        error: mapped.message,
        auth: mapped,
        requireOtp: mapped.requiresOtp,
      };
    }
  };

  const signup = async (payload) => {
    try {
      const normalizedPayload = {
        ...payload,
      };
      if (!normalizedPayload.fullName && normalizedPayload.name) {
        normalizedPayload.fullName = normalizedPayload.name;
      }

      // Attach device fingerprint for device binding
      try {
        const deviceInfo = await getDeviceInfo();
        normalizedPayload.deviceFingerprint = deviceInfo.deviceFingerprint;
        normalizedPayload.platform = deviceInfo.platform;
        normalizedPayload.screenResolution = deviceInfo.screenResolution;
      } catch {
        // Don't block signup if fingerprint fails
      }

      const response = await api.post("/auth/signup", normalizedPayload);

      if (response?.token) {
        localStorage.setItem("authToken", response.token);
        localStorage.removeItem("token");
        localStorage.setItem("authSession", "true");
        connectSocketWithToken(response.token);
      }
      if (response?.user) {
        setUser(response.user);
      } else if (response?.token) {
        await refreshAuthSafe();
      }

      return {
        success: true,
        message: response?.message,
        user: response?.user || null,
      };
    } catch (error) {
      const mapped = mapAuthError(error, {
        defaultMessage: "Signup failed",
      });
      logAuthDiagnostic("signup_failed", {
        status: mapped.status,
        code: mapped.code,
        category: mapped.category,
      });
      return {
        success: false,
        error: mapped.message,
        auth: mapped,
      };
    }
  };

  const logout = async () => {
    try {
      await ensureCsrfToken();
      // Include device fingerprint for activity tracking
      let logoutPayload = {};
      try {
        const fp = await getDeviceFingerprint();
        logoutPayload.deviceFingerprint = fp;
      } catch { /* ignore */ }
      await api.post("/auth/logout", logoutPayload);
    } catch {
      // ignore logout API failures and clear local state
      logAuthDiagnostic("logout_request_failed");
    } finally {
      clearSession();
      logAuthDiagnostic("logout_local_cleared");
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user || getAccessToken()),
      setUser,
      login,
      signup,
      logout,
      loading,
      refreshAuth,
    }),
    [loading, refreshAuth, setUser, user],
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context) return context;
  if (import.meta.env.DEV) {
    console.warn("useAuth called outside AuthProvider.");
  }
  const noop = () => {};
  const noopAsync = async () => false;
  return {
    user: null,
    isAuthenticated: false,
    setUser: noop,
    login: noop,
    signup: noop,
    logout: noop,
    loading: false,
    refreshAuth: noopAsync,
  };
}
