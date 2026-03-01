import axios from 'axios';
import { getDeviceId } from '@/utils/device'; // Ensure this matches your alias
import { getApiRootUrl } from '@/lib/networkConfig';

// Prefer same-origin `/api` in browser dev/prod to leverage Vite/reverse proxy and avoid CORS drift.
// Explicit `VITE_API_BASE_URL` still overrides this default when needed (mobile/native/prod custom domains).
const getCurrentApiRootUrl = () => {
    const resolved = getApiRootUrl();
    return typeof resolved === 'string' && resolved ? resolved : '/api';
};
const CLIENT_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const AUTH_REFRESH_EXCLUDED_PATHS = [
    '/auth/login',
    '/auth/signup',
    '/auth/send-otp',
    '/auth/verify-otp',
    '/auth/refresh-token',
    '/auth/logout',
    '/auth/forgot-password',
    '/auth/reset-password'
];
const LOCAL_DEV_BACKEND_ORIGINS = ['http://localhost:5001', 'http://localhost:5000'];
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const BACKEND_HEALTH_TIMEOUT_MS = 2500;
const BACKEND_RECOVERY_FAILURE_TTL_MS = 15000;
let refreshPromise = null;
let backendRecoveryPromise = null;
let backendRecoveryFailureUntil = 0;
let backendRecoveredOriginCache = '';

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/+$/, '');
const isLocalhostRuntime = () =>
    typeof window !== 'undefined' && LOCALHOST_HOSTNAMES.has(window.location.hostname);
const isRouteNotFoundResponse = (status, backendErrorText) => {
    if (status !== 404) return false;
    const text = String(backendErrorText || '').toLowerCase();
    return text.includes('route not found') || text.includes('not found - /api');
};
const isLikelyNetworkOrCorsError = (error) => {
    if (!error || error.response) return false;
    const text = `${error.message || ''} ${error.code || ''}`.toLowerCase();
    return (
        text.includes('network error')
        || text.includes('failed to fetch')
        || text.includes('cors')
        || text.includes('err_network')
        || text.includes('timeout')
    );
};

async function probeMhubHealth(origin) {
    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) return false;

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = setTimeout(() => {
        if (controller) {
            controller.abort();
        }
    }, BACKEND_HEALTH_TIMEOUT_MS);

    try {
        const response = await fetch(`${normalizedOrigin}/api/health`, {
            method: 'GET',
            headers: { Accept: 'application/json' },
            credentials: 'include',
            cache: 'no-store',
            signal: controller?.signal
        });
        if (!response.ok) return false;

        const payload = await response.json().catch(() => null);
        if (!payload || payload.status !== 'ok') return false;

        // Prefer explicit service fingerprint, but keep backward compatibility with db/time shape.
        if (payload.service) {
            return String(payload.service).toLowerCase() === 'mhub-backend';
        }

        return Object.prototype.hasOwnProperty.call(payload, 'db')
            || Object.prototype.hasOwnProperty.call(payload, 'time');
    } catch {
        return false;
    } finally {
        clearTimeout(timeout);
    }
}

async function resolveLocalDevBackendOrigin() {
    if (!isLocalhostRuntime()) return '';

    const now = Date.now();
    if (backendRecoveredOriginCache) {
        return backendRecoveredOriginCache;
    }
    if (backendRecoveryFailureUntil && now < backendRecoveryFailureUntil) {
        return '';
    }

    if (!backendRecoveryPromise) {
        backendRecoveryPromise = (async () => {
            const currentRoot = getCurrentApiRootUrl();
            let currentOrigin = '';
            if (/^https?:\/\//i.test(currentRoot)) {
                try {
                    currentOrigin = new URL(currentRoot).origin;
                } catch {
                    currentOrigin = '';
                }
            }

            const candidates = LOCAL_DEV_BACKEND_ORIGINS.filter((origin) => origin !== currentOrigin);
            for (const origin of candidates) {
                const isMhub = await probeMhubHealth(origin);
                if (isMhub) {
                    backendRecoveredOriginCache = normalizeOrigin(origin);
                    backendRecoveryFailureUntil = 0;
                    return backendRecoveredOriginCache;
                }
            }

            backendRecoveryFailureUntil = Date.now() + BACKEND_RECOVERY_FAILURE_TTL_MS;
            return '';
        })().finally(() => {
            backendRecoveryPromise = null;
        });
    }

    return backendRecoveryPromise;
}

const clearClientAuthState = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userProfile');
    localStorage.removeItem('token');
};

const getRequestPath = (url) => {
    if (typeof url !== 'string') {
        return '';
    }

    if (/^https?:\/\//i.test(url)) {
        try {
            return new URL(url).pathname;
        } catch {
            return url;
        }
    }

    return url.startsWith('/') ? url : `/${url}`;
};

const shouldSkipAuthRefresh = (url) => {
    const requestPath = getRequestPath(url);
    return AUTH_REFRESH_EXCLUDED_PATHS.some((path) => requestPath.includes(path));
};

async function refreshAccessToken() {
    if (!refreshPromise) {
        const apiRootUrl = getCurrentApiRootUrl();
        refreshPromise = axios
            .post(`${apiRootUrl}/auth/refresh-token`, {}, { withCredentials: true, timeout: 15000 })
            .then((res) => {
                if (res.status === 200 && res.data?.token) {
                    localStorage.setItem('authToken', res.data.token);
                    return res.data.token;
                }
                return null;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
}

// 1. Create Axios Instance
// IMPORTANT: baseURL includes /api so routes like '/auth/login' become '/api/auth/login'
const api = axios.create({
    baseURL: getCurrentApiRootUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // For HttpOnly Cookies
    timeout: 15000,
});

// 2. Request Interceptor (The Defender Gate)
api.interceptors.request.use(
    (config) => {
        const headers = config.headers || {};
        config.baseURL = getCurrentApiRootUrl();

        // Keep legacy callers compatible: avoid "/api/api" duplication.
        if (typeof config.url === 'string' && !/^https?:\/\//i.test(config.url) && config.url.startsWith('/api/')) {
            config.url = config.url.slice(4);
        }

        // A. Attach Access Token (if using localStorage fallback)
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        if (token && !localStorage.getItem('authToken')) {
            localStorage.setItem('authToken', token);
        }
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // B. Attach Device Fingerprint (Protocol: Velocity Block)
        const deviceId = getDeviceId();
        if (deviceId) {
            headers['X-Device-Id'] = deviceId;
        }

        // C. Attach Timezone (Fraud Detection)
        headers['X-Timezone'] = CLIENT_TIMEZONE;
        headers['Accept-Language'] = localStorage.getItem('lang') || 'en';
        config.headers = headers;

        return config;
    },
    (error) => Promise.reject(error)
);

// 3. Response Interceptor (The Error Shield)
api.interceptors.response.use(
    (response) => {
        // Unwrap response data for cleaner usage in components
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const isNetworkError = !error.response;
        const backendError = error.response?.data?.error || error.response?.data?.message || '';
        const backendErrorText = typeof backendError === 'string' ? backendError.toLowerCase() : '';
        const authErrorFromApi = backendErrorText.includes('token') || backendErrorText.includes('session');
        const shouldSkipRefresh = shouldSkipAuthRefresh(originalRequest?.url);

        // A. Handle token expiry/invalidation with one refresh retry.
        if (
            originalRequest &&
            (status === 401 || (status === 403 && authErrorFromApi)) &&
            !originalRequest._retry &&
            !shouldSkipRefresh
        ) {
            originalRequest._retry = true;

            try {
                const refreshedToken = await refreshAccessToken();

                if (refreshedToken) {
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers['Authorization'] = `Bearer ${refreshedToken}`;
                    return api(originalRequest);
                }

                throw new Error('Token refresh failed');
            } catch (refreshError) {
                // Refresh failed - Force Logout
                clearClientAuthState();
                window.location.href = '/login?expired=true';
                return Promise.reject(refreshError);
            }
        }

        // B. Handle Velocity Block / Device Lock (403)
        if (error.response?.status === 403 && error.response?.data?.error === 'Login Blocked') {
            window.location.href = '/security-lockout'; // Special page for scammers
        }

        // C. Auto-recover from wrong local backend attachment (common during multi-project dev).
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
                    if (typeof window !== 'undefined') {
                        window.__MHUB_API_ORIGIN_OVERRIDE__ = recoveredOrigin;
                    }
                    backendRecoveredOriginCache = recoveredOrigin;
                    if (typeof originalRequest.url === 'string' && /^https?:\/\//i.test(originalRequest.url)) {
                        try {
                            const parsed = new URL(originalRequest.url);
                            originalRequest.url = `${parsed.pathname}${parsed.search}${parsed.hash}`;
                        } catch {
                            // Keep original URL when parsing fails.
                        }
                    }
                    originalRequest.baseURL = `${recoveredOrigin}/api`;
                    return api(originalRequest);
                }
            } catch {
                // Continue to normalized error when recovery fails.
            }
        }

        let normalizedMessage = error.response?.data?.error || error.response?.data?.message || '';

        if (isRouteNotFoundResponse(status, backendErrorText)) {
            const attemptedBaseUrl = originalRequest?.baseURL || getCurrentApiRootUrl();
            normalizedMessage = `API route not found on ${attemptedBaseUrl}. This usually means the frontend is connected to the wrong backend service/port.`;
        }

        if (!normalizedMessage && isNetworkError) {
            const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'unknown-origin';
            const attemptedBaseUrl = originalRequest?.baseURL || getCurrentApiRootUrl();
            normalizedMessage = `Network/CORS error. Unable to reach API (${attemptedBaseUrl}) from ${currentOrigin}. Ensure backend is running and CORS allows this origin.`;
        }

        if (!normalizedMessage) {
            normalizedMessage = error.message || 'Something went wrong';
        }

        // C. Global Error Simplification
        // Return a standardized error object to the UI
        const customError = {
            message: normalizedMessage,
            status: error.response?.status,
            code: error.code,
            isNetworkError,
            response: error.response,
            data: error.response?.data,
            original: error
        };

        return Promise.reject(customError);
    }
);

export default api;
