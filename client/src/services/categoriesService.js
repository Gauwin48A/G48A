import api from "@/lib/api";

const CATEGORY_CACHE_TTL_MS = 30 * 60 * 1000;
const CATEGORY_RATE_LIMIT_FALLBACK_MS = 60 * 1000;
const CATEGORY_CACHE_KEY = "mhub_categories_cache";
const CATEGORY_CACHE_TS_KEY = "mhub_categories_cache_ts";
const CATEGORY_CACHE_WITH_SUB_KEY = "mhub_categories_with_sub_cache";
const CATEGORY_CACHE_WITH_SUB_TS_KEY = "mhub_categories_with_sub_cache_ts";
const CATEGORY_RATE_LIMIT_KEY = "mhub_categories_rate_limit_until";

let cachedCategories = null;
let cachedAt = 0;
let inflightRequest = null;
let cachedCategoriesWithSubcategories = null;
let cachedWithSubcategoriesAt = 0;
let inflightWithSubcategories = null;
let rateLimitUntil = 0;

function readStoredNumber(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function readStoredJson(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function writeStoredNumber(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore storage failures
  }
}

function hydrateCacheFromStorage() {
  if (typeof localStorage === "undefined") return;
  const storedCategories = readStoredJson(CATEGORY_CACHE_KEY);
  if (Array.isArray(storedCategories)) {
    cachedCategories = storedCategories;
    cachedAt = readStoredNumber(CATEGORY_CACHE_TS_KEY);
  }
  const storedWithSub = readStoredJson(CATEGORY_CACHE_WITH_SUB_KEY);
  if (Array.isArray(storedWithSub)) {
    cachedCategoriesWithSubcategories = storedWithSub;
    cachedWithSubcategoriesAt = readStoredNumber(CATEGORY_CACHE_WITH_SUB_TS_KEY);
  }
  const storedRateLimit = readStoredNumber(CATEGORY_RATE_LIMIT_KEY);
  if (storedRateLimit) {
    rateLimitUntil = storedRateLimit;
  }
}

hydrateCacheFromStorage();

function resolveRetryAfterMs(error, fallbackMs = CATEGORY_RATE_LIMIT_FALLBACK_MS) {
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

function isRateLimited() {
  if (rateLimitUntil > Date.now()) {
    return true;
  }
  const stored = readStoredNumber(CATEGORY_RATE_LIMIT_KEY);
  if (stored && stored > Date.now()) {
    rateLimitUntil = stored;
    return true;
  }
  return false;
}

function markRateLimited(error) {
  rateLimitUntil = Date.now() + resolveRetryAfterMs(error);
  writeStoredNumber(CATEGORY_RATE_LIMIT_KEY, rateLimitUntil);
}

function normalizeCategories(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }
  if (Array.isArray(payload?.categories)) {
    return payload.categories;
  }
  if (Array.isArray(payload?.data?.categories)) {
    return payload.data.categories;
  }
  return [];
}

function isCacheFresh(cachedValue, cachedTimestamp, ttlMs = CATEGORY_CACHE_TTL_MS) {
  if (!Array.isArray(cachedValue)) return false;
  const ageMs = Date.now() - cachedTimestamp;
  return ageMs < ttlMs;
}

export async function fetchCategoriesCached({
  force = false,
  ttlMs = CATEGORY_CACHE_TTL_MS,
  includeSubcategories = false,
} = {}) {
  const cachedValue = includeSubcategories
    ? cachedCategoriesWithSubcategories
    : cachedCategories;
  const cachedTimestamp = includeSubcategories
    ? cachedWithSubcategoriesAt
    : cachedAt;
  const inflight = includeSubcategories ? inflightWithSubcategories : inflightRequest;
  const cacheHasSubcategories = !includeSubcategories
    ? true
    : Array.isArray(cachedValue) &&
      cachedValue.some((category) => Array.isArray(category?.subcategories));

  if (includeSubcategories && Array.isArray(cachedValue) && !cacheHasSubcategories) {
    cachedCategoriesWithSubcategories = null;
    cachedWithSubcategoriesAt = 0;
    try {
      localStorage.removeItem(CATEGORY_CACHE_WITH_SUB_KEY);
      localStorage.removeItem(CATEGORY_CACHE_WITH_SUB_TS_KEY);
    } catch {
      // ignore storage failures
    }
  }

  if (!force && isRateLimited()) {
    return Array.isArray(cachedValue) && cacheHasSubcategories ? cachedValue : [];
  }
  if (!force && isCacheFresh(cachedValue, cachedTimestamp, ttlMs) && cacheHasSubcategories) {
    return cachedValue;
  }
  if (!force && inflight) {
    return inflight;
  }
  const request = api
    .get(includeSubcategories ? "/categories/with-subcategories" : "/categories")
    .then((response) => {
      rateLimitUntil = 0;
      writeStoredNumber(CATEGORY_RATE_LIMIT_KEY, 0);
      const payload = response?.data ?? response;
      const normalized = normalizeCategories(payload);
      if (includeSubcategories) {
        cachedCategoriesWithSubcategories = normalized;
        cachedWithSubcategoriesAt = Date.now();
        writeStoredJson(CATEGORY_CACHE_WITH_SUB_KEY, normalized);
        writeStoredNumber(CATEGORY_CACHE_WITH_SUB_TS_KEY, cachedWithSubcategoriesAt);
      } else {
        cachedCategories = normalized;
        cachedAt = Date.now();
        writeStoredJson(CATEGORY_CACHE_KEY, normalized);
        writeStoredNumber(CATEGORY_CACHE_TS_KEY, cachedAt);
      }
      return normalized;
    })
    .catch((error) => {
      const status = error?.response?.status ?? error?.status;
      if (status === 429) {
        markRateLimited(error);
        if (Array.isArray(cachedValue)) {
          return cachedValue;
        }
        if (includeSubcategories) {
          cachedCategoriesWithSubcategories = [];
          cachedWithSubcategoriesAt = Date.now();
        } else {
          cachedCategories = [];
          cachedAt = Date.now();
        }
        return [];
      }
      throw error;
    })
    .finally(() => {
      if (includeSubcategories) {
        inflightWithSubcategories = null;
      } else {
        inflightRequest = null;
      }
    });
  if (includeSubcategories) {
    inflightWithSubcategories = request;
  } else {
    inflightRequest = request;
  }
  return request;
}

export async function fetchCategoryHierarchy(options = {}) {
  return fetchCategoriesCached({ ...options, includeSubcategories: true });
}

export function getCachedCategories() {
  return Array.isArray(cachedCategories) ? [...cachedCategories] : [];
}

export function clearCategoriesCache() {
  cachedCategories = null;
  cachedAt = 0;
  inflightRequest = null;
  cachedCategoriesWithSubcategories = null;
  cachedWithSubcategoriesAt = 0;
  inflightWithSubcategories = null;
  try {
    localStorage.removeItem(CATEGORY_CACHE_KEY);
    localStorage.removeItem(CATEGORY_CACHE_TS_KEY);
    localStorage.removeItem(CATEGORY_CACHE_WITH_SUB_KEY);
    localStorage.removeItem(CATEGORY_CACHE_WITH_SUB_TS_KEY);
  } catch {
    // ignore storage failures
  }
  resolutionCache.clear();
}

// Resolution cache for category/subcategory name lookups
const resolutionCache = new Map();
const RESOLUTION_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Resolve a category or subcategory by name.
 * Useful when URL has ?category=Beauty but Beauty might be a subcategory.
 * @param {string} nameOrId - The category/subcategory name or ID to resolve
 * @returns {Promise<{found: boolean, type?: string, category_id?: number, name?: string, parent_category_id?: number, parent_category_name?: string, suggested_params?: object}>}
 */
export async function resolveCategoryByName(nameOrId) {
  if (!nameOrId) return { found: false };

  const cacheKey = String(nameOrId).toLowerCase().trim();
  const cached = resolutionCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < RESOLUTION_CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await api.get("/categories/resolve", {
      params: { name: nameOrId },
    });

    const data = response?.data ?? response ?? { found: false };
    resolutionCache.set(cacheKey, { data, cachedAt: Date.now() });
    return data;
  } catch (error) {
    // On error, check if we have stale cache
    if (cached) {
      return cached.data;
    }
    // Return not found on error
    return { found: false, error: error.message };
  }
}

/**
 * Check if a category name is actually a subcategory and get the parent category.
 * @param {string} categoryName - The name to check
 * @param {Array} categories - List of all categories
 * @returns {Promise<{isSubcategory: boolean, parentCategory?: string, subcategoryName?: string, subcategoryId?: number}>}
 */
export async function checkIfSubcategory(categoryName, categories = []) {
  if (!categoryName) return { isSubcategory: false };

  const normalized = String(categoryName).toLowerCase().trim();

  // First check if it's a direct category match
  const directMatch = categories.find(
    (c) => String(c.name || "").toLowerCase().trim() === normalized
  );
  if (directMatch) {
    return { isSubcategory: false };
  }

  // Not a direct category, check via API
  const resolution = await resolveCategoryByName(categoryName);

  if (resolution.found && resolution.type === "subcategory") {
    return {
      isSubcategory: true,
      parentCategory: resolution.parent_category_name,
      subcategoryName: resolution.name,
      subcategoryId: resolution.subcategory_id || resolution.entity_id || null,
      suggestedParams: resolution.suggested_params,
    };
  }

  return { isSubcategory: false };
}

export default {
  fetchCategoriesCached,
  fetchCategoryHierarchy,
  getCachedCategories,
  clearCategoriesCache,
  resolveCategoryByName,
  checkIfSubcategory,
};
