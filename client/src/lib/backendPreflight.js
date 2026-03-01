import { getApiRootUrl } from '@/lib/networkConfig';

const PRECHECK_TIMEOUT_MS = Number.parseInt(import.meta.env.VITE_BACKEND_PREFLIGHT_TIMEOUT_MS || '3500', 10);
const LOCAL_DEV_BACKEND_ORIGINS = ['http://localhost:5001', 'http://localhost:5000'];
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function normalize(value) {
    return String(value || '').trim().replace(/\/+$/, '');
}

function withTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error('Preflight timeout'));
        }, timeoutMs);

        promise
            .then((value) => {
                clearTimeout(timer);
                resolve(value);
            })
            .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
    });
}

function toAbsoluteUrl(url) {
    if (!url.startsWith('/')) {
        return url;
    }
    if (typeof window === 'undefined') {
        return url;
    }
    return `${window.location.origin}${url}`;
}

function isLocalhostRuntime() {
    return typeof window !== 'undefined' && LOCALHOST_HOSTNAMES.has(window.location.hostname);
}

function getCandidateHealthUrls() {
    const apiRootUrl = normalize(getApiRootUrl());
    const candidates = [`${apiRootUrl}/health`];

    if (isLocalhostRuntime()) {
        LOCAL_DEV_BACKEND_ORIGINS.forEach((origin) => {
            candidates.push(`${origin}/api/health`);
        });
    }

    const seen = new Set();
    return candidates
        .map((candidate) => normalize(candidate))
        .filter(Boolean)
        .filter((candidate) => {
            if (seen.has(candidate)) return false;
            seen.add(candidate);
            return true;
        });
}

function parseJsonSafe(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function looksLikeMhubHealth(payload) {
    if (!payload || typeof payload !== 'object') return false;
    if (payload.status !== 'ok') return false;
    // Mhub health returns db/time keys. A mismatched backend often has different shape.
    return Object.prototype.hasOwnProperty.call(payload, 'db') || Object.prototype.hasOwnProperty.call(payload, 'time');
}

function getApiOriginFromHealthUrl(url) {
    try {
        const parsed = new URL(toAbsoluteUrl(url));
        return normalize(parsed.origin);
    } catch {
        return '';
    }
}

export async function runBackendPreflight() {
    const candidateUrls = getCandidateHealthUrls();
    let lastFailure = null;

    for (let index = 0; index < candidateUrls.length; index += 1) {
        const healthUrl = candidateUrls[index];
        try {
            const response = await withTimeout(
                fetch(healthUrl, {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store',
                    headers: {
                        Accept: 'application/json'
                    }
                }),
                PRECHECK_TIMEOUT_MS
            );
            const bodyText = await response.text();
            const payload = parseJsonSafe(bodyText);

            if (!response.ok) {
                lastFailure = {
                    healthUrl,
                    status: response.status,
                    bodyText
                };
                continue;
            }

            if (!looksLikeMhubHealth(payload)) {
                lastFailure = {
                    healthUrl,
                    status: response.status,
                    bodyText: bodyText || 'Unexpected health payload'
                };
                continue;
            }

            const resolvedOrigin = getApiOriginFromHealthUrl(healthUrl);
            if (typeof window !== 'undefined' && resolvedOrigin) {
                window.__MHUB_API_ORIGIN_OVERRIDE__ = resolvedOrigin;
            }

            return {
                ok: true,
                healthUrl,
                resolvedOrigin
            };
        } catch (error) {
            lastFailure = {
                healthUrl,
                status: null,
                bodyText: error?.message || String(error)
            };
        }
    }

    return {
        ok: false,
        failure: lastFailure
    };
}
