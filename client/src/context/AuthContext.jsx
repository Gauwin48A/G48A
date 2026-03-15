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
import { mapAuthError } from "@/utils/authErrorMapper";
import { logAuthDiagnostic } from "@/services/authDiagnostics";

const AuthContext = createContext(null);
const JWT_EXP_SKEW_SECONDS = 30;
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const TERMINAL_AUTH_STATES = new Set(["invalid_token", "revoked", "password_changed"]);
const LOGIN_CHALLENGE_CODES = new Set(["RISK_CHALLENGE_REQUIRED", "TWO_FACTOR_REQUIRED"]);

const AUTH_STORAGE_KEYS = [
  "authToken",
  "refreshToken",
  "user",
  "userId",
  "user_id",
  "userProfile",
  "token",
  "authSession",
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
  const csrfBootstrapInFlightRef = useRef(null);

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
    setUserState(null);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    try {
      await ensureCsrfToken();
      const response = await api.post("/auth/refresh-token", {});
      if (!response?.token) return false;

      localStorage.setItem("authToken", response.token);
      localStorage.removeItem("token");
      localStorage.setItem("authSession", "true");

      if (response.user) {
        setUser(response.user);
      }

      logAuthDiagnostic("auth_context_refresh_success", {
        hasUserPayload: Boolean(response.user),
      });
      return true;
    } catch {
      logAuthDiagnostic("auth_context_refresh_failed");
      return false;
    }
  }, [ensureCsrfToken, setUser]);

  // Register this as the single refresh path so api.js interceptor delegates here
  useEffect(() => {
    setRefreshDelegate(async () => {
      const ok = await refreshAccessToken();
      if (!ok) throw new Error("Token refresh failed");
      return localStorage.getItem("authToken");
    });
    return () => setRefreshDelegate(null);
  }, [refreshAccessToken]);

  const fetchCurrentUser = useCallback(async () => {
    const profile = await api.get("/auth/me");
    setUser(profile);
    return true;
  }, [setUser]);

  const refreshAuth = useCallback(async () => {
    const accessToken = getAccessToken();
    logAuthDiagnostic("refresh_auth_snapshot", buildSessionDiagnostics(accessToken));
    if (!accessToken) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearSession();
        return false;
      }
      try {
        return await fetchCurrentUser();
      } catch {
        clearSession();
        return false;
      }
    }

    if (accessToken && isTokenExpired(accessToken)) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        clearSession();
        return false;
      }
    }

    try {
      return await fetchCurrentUser();
    } catch (error) {
      const status = error?.status ?? error?.response?.status ?? null;
      const isAuthError = status === 401 || status === 403;

      if (isAuthError) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          try {
            return await fetchCurrentUser();
          } catch {
            clearSession();
            return false;
          }
        }
      }

      if (!status) {
        const cached = safeParseJson(localStorage.getItem("user"));
        if (cached) {
          setUserState(cached);
          return true;
        }
      }

      clearSession();
      return false;
    }
  }, [clearSession, fetchCurrentUser, refreshAccessToken]);

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
      const session = await api.get("/auth/session");
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
        clearSession();
        return false;
      }

      if (!authenticated && !canRefresh) {
        logAuthDiagnostic("bootstrap_anonymous_no_refresh");
        clearSession();
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
        if (refreshed) {
          try {
            return await fetchCurrentUser();
          } catch {
            clearSession();
            return false;
          }
        }
      }

      if (authenticated) {
        try {
          return await fetchCurrentUser();
        } catch {
          clearSession();
          return false;
        }
      }

      clearSession();
      return false;
    } catch (error) {
      const status = error?.status ?? error?.response?.status ?? null;
      logAuthDiagnostic("bootstrap_failed", {
        status,
      });
      if (status === 404) {
        // Backward compatibility when older backend doesn't expose /auth/session yet.
        return refreshAuthSafe();
      }
      return refreshAuthSafe();
    }
  }, [
    clearSession,
    fetchCurrentUser,
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
  }, [clearSession, refreshAuthSafe]);

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
      if (responseUser) {
        setUser(responseUser);
      } else {
        await refreshAuthSafe();
      }

      return {
        success: true,
        user: responseUser || null,
      };
    } catch (error) {
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

      const response = await api.post("/auth/signup", normalizedPayload);

      if (response?.token) {
        localStorage.setItem("authToken", response.token);
        localStorage.removeItem("token");
        localStorage.setItem("authSession", "true");
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
      await api.post("/auth/logout", {});
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
      isAuthenticated: Boolean(user || getAccessToken() || hasAuthSession()),
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
  return useContext(AuthContext);
}
