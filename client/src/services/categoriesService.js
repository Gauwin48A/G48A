import api from '@/lib/api';

const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedCategories = null;
let cachedAt = 0;
let inflightRequest = null;

function normalizeCategories(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }
    if (Array.isArray(payload?.categories)) {
        return payload.categories;
    }
    return [];
}

function isCacheFresh(ttlMs = CATEGORY_CACHE_TTL_MS) {
    return Array.isArray(cachedCategories) && cachedCategories.length > 0 && Date.now() - cachedAt < ttlMs;
}

export async function fetchCategoriesCached({ force = false, ttlMs = CATEGORY_CACHE_TTL_MS } = {}) {
    if (!force && isCacheFresh(ttlMs)) {
        return cachedCategories;
    }

    if (!force && inflightRequest) {
        return inflightRequest;
    }

    inflightRequest = api
        .get('/categories')
        .then((payload) => {
            const normalized = normalizeCategories(payload);
            cachedCategories = normalized;
            cachedAt = Date.now();
            return normalized;
        })
        .finally(() => {
            inflightRequest = null;
        });

    return inflightRequest;
}

export function getCachedCategories() {
    return Array.isArray(cachedCategories) ? [...cachedCategories] : [];
}

export function clearCategoriesCache() {
    cachedCategories = null;
    cachedAt = 0;
    inflightRequest = null;
}

export default {
    fetchCategoriesCached,
    getCachedCategories,
    clearCategoriesCache
};
