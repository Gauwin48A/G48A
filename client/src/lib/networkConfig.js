const DEFAULT_DEV_API_ORIGIN = 'http://localhost:5001';
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
const FORCE_ABSOLUTE_LOCAL_API_ORIGIN =
    String(import.meta.env.VITE_FORCE_ABSOLUTE_API_ORIGIN || '').toLowerCase() === 'true';

const normalize = (value) => String(value || '').trim().replace(/\/+$/, '');
const isLocalhostRuntime = () =>
    typeof window !== 'undefined' && LOCALHOST_HOSTNAMES.has(window.location.hostname);
const shouldPreferLocalDevProxy = () =>
    Boolean(import.meta.env.DEV) && isLocalhostRuntime() && !FORCE_ABSOLUTE_LOCAL_API_ORIGIN;
const getRuntimeApiOriginOverride = () => {
    if (typeof window === 'undefined') return '';
    return normalize(window.__MHUB_API_ORIGIN_OVERRIDE__ || '');
};

export function getApiOriginBase() {
    const runtimeOverride = getRuntimeApiOriginOverride();
    if (runtimeOverride) {
        return runtimeOverride.endsWith('/api') ? runtimeOverride.slice(0, -4) : runtimeOverride;
    }

    // In localhost dev, prefer same-origin `/api` via Vite proxy to avoid CORS drift
    // when multiple local backends are running on different ports.
    if (shouldPreferLocalDevProxy()) {
        return '';
    }

    const configuredBase = normalize(import.meta.env.VITE_API_BASE_URL || '');

    if (!configuredBase) {
        if (import.meta.env.DEV || isLocalhostRuntime()) {
            return DEFAULT_DEV_API_ORIGIN;
        }
        return '';
    }

    if (configuredBase === '/api') {
        return '';
    }

    if (configuredBase.startsWith('/')) {
        return configuredBase;
    }

    return configuredBase.endsWith('/api') ? configuredBase.slice(0, -4) : configuredBase;
}

export function getApiRootUrl() {
    const originBase = getApiOriginBase();
    if (!originBase) {
        return '/api';
    }
    if (originBase === '/api' || originBase.endsWith('/api')) {
        return originBase;
    }
    if (originBase.startsWith('/')) {
        return `${originBase}/api`;
    }
    return `${originBase}/api`;
}

export function getSocketUrl() {
    const runtimeOverride = getRuntimeApiOriginOverride();
    if (runtimeOverride) {
        return runtimeOverride.endsWith('/api') ? runtimeOverride.slice(0, -4) : runtimeOverride;
    }

    if (shouldPreferLocalDevProxy() && typeof window !== 'undefined') {
        return window.location.origin;
    }

    const configuredSocketUrl = normalize(import.meta.env.VITE_SOCKET_URL || '');
    if (configuredSocketUrl) {
        return configuredSocketUrl;
    }

    const originBase = getApiOriginBase();
    if (originBase && !originBase.startsWith('/')) {
        return originBase;
    }

    if (import.meta.env.DEV || isLocalhostRuntime()) {
        return DEFAULT_DEV_API_ORIGIN;
    }

    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return DEFAULT_DEV_API_ORIGIN;
}

export function buildApiPath(path = '') {
    const safePath = path.startsWith('/') ? path : `/${path}`;
    return `${getApiRootUrl()}${safePath}`;
}
