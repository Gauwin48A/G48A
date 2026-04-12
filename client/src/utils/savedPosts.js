import { hasAuthSession } from "@/utils/authStorage";

const SAVED_POSTS_STORAGE_KEY = "mhub_saved_post_ids";
const SAVED_POSTS_UPDATED_EVENT = "mhub:saved-posts-updated";
const SAVED_POSTS_MUTATION_GUARD = new Set();
const WISHLIST_CACHE_TTL_MS = 60 * 1000;
const WISHLIST_COOLDOWN_FALLBACK_MS = 60 * 1000;
const WISHLIST_COOLDOWN_KEY = "mhub_wishlist_cooldown_until";

let wishlistFetchPromise = null;
let wishlistCache = null;
let wishlistCacheExpiresAt = 0;
let wishlistCooldownUntil = 0;

function readWishlistCooldown() {
  if (wishlistCooldownUntil > Date.now()) {
    return wishlistCooldownUntil;
  }
  try {
    const raw = localStorage.getItem(WISHLIST_COOLDOWN_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      wishlistCooldownUntil = parsed;
      return parsed;
    }
  } catch {
    // ignore
  }
  return 0;
}

function setWishlistCooldown(untilMs) {
  wishlistCooldownUntil = Math.max(wishlistCooldownUntil, untilMs);
  try {
    localStorage.setItem(WISHLIST_COOLDOWN_KEY, String(wishlistCooldownUntil));
  } catch {
    // ignore
  }
  return wishlistCooldownUntil;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function hasAuthToken() {
  return hasAuthSession();
}

export function normalizeSavedPostId(postId) {
  if (postId === null || postId === undefined) {
    return "";
  }
  const normalized = String(postId).trim();
  return normalized.length ? normalized : "";
}

export function beginSavedPostMutation(postId) {
  const normalizedId = normalizeSavedPostId(postId);
  if (!normalizedId) {
    return "";
  }
  if (SAVED_POSTS_MUTATION_GUARD.has(normalizedId)) {
    return "";
  }
  SAVED_POSTS_MUTATION_GUARD.add(normalizedId);
  return normalizedId;
}

export function endSavedPostMutation(postId) {
  const normalizedId = normalizeSavedPostId(postId);
  if (!normalizedId) {
    return;
  }
  SAVED_POSTS_MUTATION_GUARD.delete(normalizedId);
}

export function isSavedPostMutationInFlight(postId) {
  const normalizedId = normalizeSavedPostId(postId);
  if (!normalizedId) {
    return false;
  }
  return SAVED_POSTS_MUTATION_GUARD.has(normalizedId);
}

export function readSavedPostIds() {
  if (!canUseStorage() || !hasAuthToken()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(SAVED_POSTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return Array.from(
      new Set(
        parsed
          .map((value) => normalizeSavedPostId(value))
          .filter(Boolean),
      ),
    );
  } catch {
    return [];
  }
}

export function buildSavedPostsMap(ids) {
  const source = Array.isArray(ids) ? ids : [];
  return source.reduce((acc, value) => {
    const id = normalizeSavedPostId(value);
    if (id) {
      acc[id] = true;
    }
    return acc;
  }, {});
}

export function getSavedPostsMap() {
  return buildSavedPostsMap(readSavedPostIds());
}

function emitSavedPostsUpdated(ids) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(SAVED_POSTS_UPDATED_EVENT, {
      detail: { ids: Array.isArray(ids) ? ids : [] },
    }),
  );
}

export function replaceSavedPostIds(ids) {
  if (!hasAuthToken()) {
    if (canUseStorage()) {
      try {
        localStorage.removeItem(SAVED_POSTS_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
    emitSavedPostsUpdated([]);
    return {};
  }
  const normalizedIds = Array.from(
    new Set(
      (Array.isArray(ids) ? ids : [])
        .map((value) => normalizeSavedPostId(value))
        .filter(Boolean),
    ),
  );

  if (canUseStorage()) {
    try {
      localStorage.setItem(SAVED_POSTS_STORAGE_KEY, JSON.stringify(normalizedIds));
    } catch {
      // Ignore storage quota/write failures.
    }
  }

  emitSavedPostsUpdated(normalizedIds);
  return buildSavedPostsMap(normalizedIds);
}

export function setSavedPostStatus(postId, isSaved) {
  if (!hasAuthToken()) {
    return getSavedPostsMap();
  }
  const normalizedId = normalizeSavedPostId(postId);
  if (!normalizedId) {
    return getSavedPostsMap();
  }

  const ids = readSavedPostIds();
  const idSet = new Set(ids);
  if (isSaved) {
    idSet.add(normalizedId);
  } else {
    idSet.delete(normalizedId);
  }

  return replaceSavedPostIds(Array.from(idSet));
}

export function isSavedPostId(postId) {
  const normalizedId = normalizeSavedPostId(postId);
  if (!normalizedId) {
    return false;
  }
  return readSavedPostIds().includes(normalizedId);
}

function toListCandidate(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = payload?.data ?? payload;
  if (Array.isArray(root)) {
    return root;
  }
  if (Array.isArray(root?.items)) {
    return root.items;
  }
  if (Array.isArray(root?.wishlist)) {
    return root.wishlist;
  }
  if (Array.isArray(root?.rows)) {
    return root.rows;
  }
  if (Array.isArray(root?.posts)) {
    return root.posts;
  }

  return [];
}

export function extractSavedPostIds(payload) {
  const candidates = toListCandidate(payload);
  const ids = candidates
    .map((item) =>
      normalizeSavedPostId(
        item?.post_id ??
          item?.postId ??
          item?.post?.post_id ??
          item?.post?.postId ??
          item?.post?.id ??
          item?.id,
      ),
    )
    .filter(Boolean);

  return Array.from(new Set(ids));
}

function resolveRetryAfterMs(headerValue, fallbackMs = WISHLIST_COOLDOWN_FALLBACK_MS) {
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
}

export function fetchWishlistIds(fetcher) {
  if (!hasAuthToken()) {
    clearWishlistCache();
    replaceSavedPostIds([]);
    return Promise.resolve([]);
  }
  const now = Date.now();
  const cooldownUntil = readWishlistCooldown();
  if (cooldownUntil > now) {
    return Promise.resolve(Array.isArray(wishlistCache) ? wishlistCache : []);
  }
  if (wishlistCache && now < wishlistCacheExpiresAt) {
    return Promise.resolve(wishlistCache);
  }
  if (wishlistFetchPromise) {
    return wishlistFetchPromise;
  }
  wishlistFetchPromise = (async () => {
    try {
      const payload = await fetcher();
      const ids = extractSavedPostIds(payload);
      wishlistCache = ids;
      wishlistCacheExpiresAt = Date.now() + WISHLIST_CACHE_TTL_MS;
      replaceSavedPostIds(ids);
      return ids;
    } catch (error) {
      const status = error?.status ?? error?.response?.status ?? null;
      if (status === 429) {
        const retryAfterHeader =
          error?.response?.headers?.["retry-after"] ||
          error?.response?.headers?.["Retry-After"];
        let retryAfterMs = resolveRetryAfterMs(retryAfterHeader);
        const retryAfterBody = Number(
          error?.response?.data?.retryAfter ??
            error?.response?.data?.retry_after ??
            error?.response?.data?.retryAfterMs,
        );
        if (Number.isFinite(retryAfterBody)) {
          const bodyMs = retryAfterBody > 1000 ? retryAfterBody : retryAfterBody * 1000;
          retryAfterMs = Math.max(retryAfterMs, bodyMs);
        }
        setWishlistCooldown(Date.now() + retryAfterMs);
        return Array.isArray(wishlistCache) ? wishlistCache : [];
      }
      throw error;
    } finally {
      wishlistFetchPromise = null;
    }
  })();

  return wishlistFetchPromise;
}

export function clearWishlistCache() {
  wishlistCache = null;
  wishlistCacheExpiresAt = 0;
}

export function subscribeSavedPosts(listener) {
  if (typeof window === "undefined" || typeof listener !== "function") {
    return () => {};
  }

  const notify = (ids) => {
    listener(buildSavedPostsMap(Array.isArray(ids) ? ids : readSavedPostIds()));
  };

  const onUpdated = (event) => {
    notify(event?.detail?.ids);
  };

  const onStorage = (event) => {
    if (event.key === SAVED_POSTS_STORAGE_KEY) {
      notify();
    }
  };

  window.addEventListener(SAVED_POSTS_UPDATED_EVENT, onUpdated);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(SAVED_POSTS_UPDATED_EVENT, onUpdated);
    window.removeEventListener("storage", onStorage);
  };
}
