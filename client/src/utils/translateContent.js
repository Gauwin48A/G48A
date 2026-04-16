import { buildApiPath } from "@/lib/networkConfig";
import { buildRequestSecurity } from "@/lib/requestSecurity";
import { buildCsrfHeaders } from "@/lib/csrf";

const CACHE_KEY = "mhub_translations_cache";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 3000;
const CACHE_PERSIST_DEBOUNCE_MS = 750;
const MAX_TRANSLATE_CONCURRENCY = 8;
const MAX_TRANSLATE_BATCH_ITEMS = 25;
const MAX_TRANSLATE_BATCH_CHARS = 4500;
const MAX_TRANSLATE_BATCH_CONCURRENCY = 2;
const BATCH_ENDPOINT_BACKOFF_MS = 5 * 60 * 1000;
const RUNTIME_TRANSLATION_ENABLED =
  String(import.meta.env.VITE_ENABLE_RUNTIME_TRANSLATION || "true").toLowerCase() !==
  "false";

const POST_TRANSLATABLE_PATHS = [
  "title",
  "description",
  "category",
  "category_name",
  "condition",
  "location",
  "city",
  "area",
  "state",
  "brand",
  "model",
  "summary",
  "subtitle",
];

function resolveTranslatablePaths(paths) {
  if (!Array.isArray(paths) || paths.length === 0) {
    return POST_TRANSLATABLE_PATHS;
  }
  const normalized = paths
    .map((path) => String(path || "").trim())
    .filter(Boolean);
  return normalized.length > 0 ? normalized : POST_TRANSLATABLE_PATHS;
}

let translationCache = {};
let cacheLoaded = false;
let cacheDirty = false;
let persistTimer = null;
let batchEndpointUnavailableUntil = 0;
const pendingTranslations = new Map();

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeText(value) {
  return typeof value === "string" ? value : String(value ?? "");
}

function normalizeLanguage(value) {
  return String(value || "en")
    .trim()
    .toLowerCase()
    .split("-")[0];
}

function isBatchEndpointAvailable() {
  return Date.now() >= batchEndpointUnavailableUntil;
}

function markBatchEndpointUnavailable(durationMs = BATCH_ENDPOINT_BACKOFF_MS) {
  batchEndpointUnavailableUntil = Date.now() + durationMs;
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

function getCacheKey(text, targetLang) {
  const normalized = normalizeText(text).trim();
  return `${targetLang}:${normalized.length}:${hashText(normalized)}`;
}

function pruneExpiredEntries(cache, now = Date.now()) {
  Object.keys(cache).forEach((key) => {
    const entry = cache[key];
    if (!entry || !entry.timestamp || now - entry.timestamp > CACHE_EXPIRY) {
      delete cache[key];
    }
  });
}

function enforceCacheLimit(cache) {
  const keys = Object.keys(cache);
  if (keys.length <= MAX_CACHE_ENTRIES) {
    return;
  }
  const keysByAge = keys.sort((left, right) => {
    const leftTs = Number(cache[left]?.timestamp || 0);
    const rightTs = Number(cache[right]?.timestamp || 0);
    return leftTs - rightTs;
  });
  const deleteCount = keysByAge.length - MAX_CACHE_ENTRIES;
  for (let index = 0; index < deleteCount; index += 1) {
    delete cache[keysByAge[index]];
  }
}

function loadCache() {
  if (cacheLoaded) {
    return;
  }

  cacheLoaded = true;
  translationCache = {};

  if (!canUseStorage()) {
    return;
  }

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      translationCache = parsed;
    }
  } catch {
    translationCache = {};
  }

  pruneExpiredEntries(translationCache);
  enforceCacheLimit(translationCache);
}

function scheduleCachePersist() {
  if (!canUseStorage() || persistTimer || !cacheDirty) {
    return;
  }

  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    if (!cacheDirty) {
      return;
    }
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(translationCache));
      cacheDirty = false;
    } catch {
      // Ignore storage quota/availability errors.
    }
  }, CACHE_PERSIST_DEBOUNCE_MS);
}

function markCacheDirty() {
  cacheDirty = true;
  scheduleCachePersist();
}

function getCachedTranslation(cacheKey) {
  loadCache();
  const entry = translationCache[cacheKey];
  if (!entry) {
    return null;
  }

  if (!entry.timestamp || Date.now() - entry.timestamp > CACHE_EXPIRY) {
    delete translationCache[cacheKey];
    markCacheDirty();
    return null;
  }

  return entry.text;
}

function hasCachedTranslation(cacheKey) {
  loadCache();
  const entry = translationCache[cacheKey];
  if (!entry) {
    return false;
  }

  if (!entry.timestamp || Date.now() - entry.timestamp > CACHE_EXPIRY) {
    delete translationCache[cacheKey];
    markCacheDirty();
    return false;
  }

  return typeof entry.text === "string";
}

function setCachedTranslation(cacheKey, text) {
  loadCache();
  translationCache[cacheKey] = {
    text,
    timestamp: Date.now(),
  };
  pruneExpiredEntries(translationCache);
  enforceCacheLimit(translationCache);
  markCacheDirty();
}

function getByPath(record, path) {
  return path.split(".").reduce((accumulator, part) => {
    if (accumulator == null || typeof accumulator !== "object") {
      return undefined;
    }
    return accumulator[part];
  }, record);
}

function setByPath(record, path, value) {
  const parts = path.split(".");
  let cursor = record;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    } else {
      cursor[key] = { ...cursor[key] };
    }
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

function isTranslatableText(text) {
  if (typeof text !== "string") {
    return false;
  }
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  // Skip values that are mostly numeric/symbols.
  return /\p{L}/u.test(trimmed);
}

async function requestTranslation(text, targetLang) {
  const endpoint = buildApiPath("/translation/translate");
  const security = buildRequestSecurity();
  const csrfHeaders = await buildCsrfHeaders();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...security.headers,
      ...csrfHeaders,
    },
    credentials: "include",
    body: JSON.stringify({
      text,
      targetLang,
      _timestamp: security.body._timestamp,
      _nonce: security.body._nonce,
    }),
  });

  if (response.ok) {
    const payload = await response.json().catch(() => null);
    const translatedText = payload?.translatedText || payload?.text || "";
    return translatedText || text;
  }

  throw new Error("Translation proxy unavailable");
}

function buildBatchChunks(texts) {
  const batches = [];
  let current = [];
  let currentChars = 0;
  let batchStartIndex = 0;

  texts.forEach((text, index) => {
    const length = text.length;
    const wouldOverflow =
      current.length >= MAX_TRANSLATE_BATCH_ITEMS ||
      currentChars + length > MAX_TRANSLATE_BATCH_CHARS;

    if (wouldOverflow && current.length > 0) {
      batches.push({ texts: current, startIndex: batchStartIndex });
      current = [];
      currentChars = 0;
    }

    if (current.length === 0) {
      batchStartIndex = index;
    }

    current.push(text);
    currentChars += length;
  });

  if (current.length > 0) {
    batches.push({ texts: current, startIndex: batchStartIndex });
  }

  return batches;
}

async function requestTranslationBatch(texts, targetLang) {
  if (!isBatchEndpointAvailable()) {
    throw new Error("Translation batch unavailable");
  }

  const endpoint = buildApiPath("/translation/batch");
  const security = buildRequestSecurity();
  const csrfHeaders = await buildCsrfHeaders();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...security.headers,
      ...csrfHeaders,
    },
    credentials: "include",
    body: JSON.stringify({
      texts,
      targetLang,
      _timestamp: security.body._timestamp,
      _nonce: security.body._nonce,
    }),
  });

  if (!response.ok) {
    if (response.status === 404) {
      markBatchEndpointUnavailable();
    }
    throw new Error("Translation batch unavailable");
  }

  const payload = await response.json().catch(() => null);
  if (!payload || !Array.isArray(payload.translations)) {
    throw new Error("Translation batch invalid response");
  }
  return payload.translations;
}

async function mapWithConcurrency(items, mapper, concurrency = MAX_TRANSLATE_CONCURRENCY) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    }
  );

  await Promise.all(workers);
  return results;
}

export async function translateText(text, targetLang) {
  const originalText = normalizeText(text);
  const trimmedText = originalText.trim();
  const normalizedTargetLang = normalizeLanguage(targetLang);

  if (
    !trimmedText ||
    normalizedTargetLang === "en" ||
    !isTranslatableText(trimmedText)
  ) {
    return originalText;
  }

  const cacheKey = getCacheKey(trimmedText, normalizedTargetLang);
  const cachedTranslation = getCachedTranslation(cacheKey);
  if (cachedTranslation) {
    return cachedTranslation;
  }

  if (!RUNTIME_TRANSLATION_ENABLED) {
    return originalText;
  }

  if (pendingTranslations.has(cacheKey)) {
    return pendingTranslations.get(cacheKey);
  }

  const translationTask = requestTranslation(trimmedText, normalizedTargetLang)
    .then((translatedText) => {
      if (translatedText && translatedText !== trimmedText) {
        setCachedTranslation(cacheKey, translatedText);
      }
      return translatedText || originalText;
    })
    .catch((error) => {
      if (import.meta.env.DEV) {
        console.warn("Translation failed, using original text:", error?.message || error);
      }
      return originalText;
    })
    .finally(() => {
      pendingTranslations.delete(cacheKey);
    });

  pendingTranslations.set(cacheKey, translationTask);
  return translationTask;
}

export function translateTextFromCache(text, targetLang) {
  const originalText = normalizeText(text);
  const trimmedText = originalText.trim();
  const normalizedTargetLang = normalizeLanguage(targetLang);

  if (
    !trimmedText ||
    normalizedTargetLang === "en" ||
    !isTranslatableText(trimmedText)
  ) {
    return originalText;
  }

  const cacheKey = getCacheKey(trimmedText, normalizedTargetLang);
  return getCachedTranslation(cacheKey) ?? originalText;
}

export function isTextTranslationCached(text, targetLang) {
  const originalText = normalizeText(text);
  const trimmedText = originalText.trim();
  const normalizedTargetLang = normalizeLanguage(targetLang);

  if (
    !trimmedText ||
    normalizedTargetLang === "en" ||
    !isTranslatableText(trimmedText)
  ) {
    return true;
  }

  const cacheKey = getCacheKey(trimmedText, normalizedTargetLang);
  return hasCachedTranslation(cacheKey);
}

export async function translateBatch(texts, targetLang) {
  const normalizedTargetLang = normalizeLanguage(targetLang);

  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }

  if (normalizedTargetLang === "en" || !RUNTIME_TRANSLATION_ENABLED) {
    return texts;
  }

  const results = new Array(texts.length);
  const uniqueTextToIndexes = new Map();

  texts.forEach((value, index) => {
    const originalText = normalizeText(value);
    const trimmedText = originalText.trim();

    if (!trimmedText || !isTranslatableText(trimmedText)) {
      results[index] = originalText;
      return;
    }

    const cached = translateTextFromCache(originalText, normalizedTargetLang);
    if (cached !== originalText) {
      results[index] = cached;
      return;
    }

    if (!uniqueTextToIndexes.has(trimmedText)) {
      uniqueTextToIndexes.set(trimmedText, []);
    }
    uniqueTextToIndexes.get(trimmedText).push(index);
    results[index] = originalText;
  });

  const uniqueTexts = Array.from(uniqueTextToIndexes.keys());
  if (uniqueTexts.length === 0) {
    return results;
  }

  const translatedUniqueTexts = new Array(uniqueTexts.length);
  const batches = buildBatchChunks(uniqueTexts);
  const batchResults = await mapWithConcurrency(
    batches,
    async (batch) => {
      try {
        return await requestTranslationBatch(batch.texts, normalizedTargetLang);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            "Translation batch failed, falling back:",
            error?.message || error,
          );
        }
        return null;
      }
    },
    MAX_TRANSLATE_BATCH_CONCURRENCY,
  );

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const { texts: batchTexts, startIndex } = batches[batchIndex];
    let translations = batchResults[batchIndex];

    if (!Array.isArray(translations) || translations.length !== batchTexts.length) {
      translations = await mapWithConcurrency(
        batchTexts,
        (value) => translateText(value, normalizedTargetLang),
        1,
      );
    }

    batchTexts.forEach((sourceText, localIndex) => {
      const translatedValue =
        translations?.[localIndex] ?? sourceText;
      const targetIndex = startIndex + localIndex;
      translatedUniqueTexts[targetIndex] = translatedValue;

      if (translatedValue && translatedValue !== sourceText) {
        const cacheKey = getCacheKey(sourceText, normalizedTargetLang);
        setCachedTranslation(cacheKey, translatedValue);
      }
    });
  }

  uniqueTexts.forEach((sourceText, idx) => {
    const translatedValue = translatedUniqueTexts[idx] ?? sourceText;
    const targetIndexes = uniqueTextToIndexes.get(sourceText) || [];
    targetIndexes.forEach((targetIndex) => {
      results[targetIndex] = translatedValue;
    });
  });

  return results;
}

export function translatePostsInstant(posts, targetLang, options = {}) {
  const normalizedTargetLang = normalizeLanguage(targetLang);
  if (
    !Array.isArray(posts) ||
    posts.length === 0 ||
    normalizedTargetLang === "en"
  ) {
    return Array.isArray(posts) ? posts : [];
  }

  const instantLookup = new Map();

  return posts.map((post) => {
    if (!post || typeof post !== "object") {
      return post;
    }

    const translated = { ...post };
    const originalMap = getPostOriginalMap(post);
    const tasks = collectPostTranslationTasks(post, 0, originalMap, options);

    tasks.forEach((task) => {
      let cachedOrSource;
      if (instantLookup.has(task.sourceValue)) {
        cachedOrSource = instantLookup.get(task.sourceValue);
      } else {
        cachedOrSource = translateTextFromCache(
          task.sourceValue,
          normalizedTargetLang,
        );
        instantLookup.set(task.sourceValue, cachedOrSource);
      }
      setByPath(translated, task.path, cachedOrSource);
    });

    translated._originalTranslations = originalMap;
    translated._originalTitle = originalMap.title ?? post?.title;
    translated._originalDescription = originalMap.description ?? post?.description;
    return translated;
  });
}

function getPostOriginalMap(post) {
  if (post?._originalTranslations && typeof post._originalTranslations === "object") {
    return { ...post._originalTranslations };
  }
  return {};
}

function collectPostTranslationTasks(post, postIndex, originalMap, options = {}) {
  const tasks = [];
  const paths = resolveTranslatablePaths(options?.paths);

  paths.forEach((path) => {
    const currentValue = getByPath(post, path);
    const fallback = typeof currentValue === "string" ? currentValue : "";
    const sourceValue =
      path === "title"
        ? post?._originalTitle ?? originalMap[path] ?? fallback
        : path === "description"
          ? post?._originalDescription ?? originalMap[path] ?? fallback
          : originalMap[path] ?? fallback;

    if (!isTranslatableText(sourceValue)) {
      return;
    }

    originalMap[path] = sourceValue;
    tasks.push({
      postIndex,
      path,
      sourceValue,
    });
  });

  return tasks;
}

export function arePostsTranslationsCached(posts, targetLang, options = {}) {
  const normalizedTargetLang = normalizeLanguage(targetLang);
  if (
    !Array.isArray(posts) ||
    posts.length === 0 ||
    normalizedTargetLang === "en" ||
    !RUNTIME_TRANSLATION_ENABLED
  ) {
    return true;
  }

  const lookup = new Map();
  for (let postIndex = 0; postIndex < posts.length; postIndex += 1) {
    const post = posts[postIndex];
    const originalMap = getPostOriginalMap(post);
    const tasks = collectPostTranslationTasks(post, postIndex, originalMap, options);

    for (let index = 0; index < tasks.length; index += 1) {
      const sourceValue = tasks[index].sourceValue;
      if (lookup.has(sourceValue)) {
        if (!lookup.get(sourceValue)) {
          return false;
        }
        continue;
      }

      const isCached = isTextTranslationCached(sourceValue, normalizedTargetLang);
      lookup.set(sourceValue, isCached);
      if (!isCached) {
        return false;
      }
    }
  }

  return true;
}

export async function translatePost(post, targetLang, options = {}) {
  const normalizedTargetLang = normalizeLanguage(targetLang);
  if (
    !post ||
    normalizedTargetLang === "en" ||
    !RUNTIME_TRANSLATION_ENABLED
  ) {
    return post;
  }

  const translated = { ...post };
  const originalMap = getPostOriginalMap(post);
  const tasks = collectPostTranslationTasks(post, 0, originalMap, options);

  if (tasks.length === 0) {
    return post;
  }

  const translatedValues = await translateBatch(
    tasks.map((task) => task.sourceValue),
    normalizedTargetLang,
  );

  tasks.forEach((task, index) => {
    const translatedValue = translatedValues[index] ?? task.sourceValue;
    setByPath(translated, task.path, translatedValue);
  });

  translated._originalTranslations = originalMap;
  translated._originalTitle = originalMap.title ?? post?.title;
  translated._originalDescription = originalMap.description ?? post?.description;

  return translated;
}

export async function translatePosts(posts, targetLang, options = {}) {
  const normalizedTargetLang = normalizeLanguage(targetLang);
  if (
    !Array.isArray(posts) ||
    posts.length === 0 ||
    normalizedTargetLang === "en" ||
    !RUNTIME_TRANSLATION_ENABLED
  ) {
    return Array.isArray(posts) ? posts : [];
  }

  const translatedPosts = posts.map((post) => ({ ...post }));
  const originalMaps = posts.map((post) => getPostOriginalMap(post));
  const tasks = [];

  posts.forEach((post, postIndex) => {
    tasks.push(
      ...collectPostTranslationTasks(post, postIndex, originalMaps[postIndex], options),
    );
  });

  if (tasks.length === 0) {
    return posts;
  }

  const translatedValues = await translateBatch(
    tasks.map((task) => task.sourceValue),
    normalizedTargetLang,
  );

  tasks.forEach((task, taskIndex) => {
    const post = translatedPosts[task.postIndex];
    const translatedValue = translatedValues[taskIndex] ?? task.sourceValue;
    setByPath(post, task.path, translatedValue);
  });

  translatedPosts.forEach((post, index) => {
    const originalMap = originalMaps[index];
    post._originalTranslations = originalMap;
    post._originalTitle = originalMap.title ?? posts[index]?.title;
    post._originalDescription = originalMap.description ?? posts[index]?.description;
  });

  return translatedPosts;
}

export function clearTranslationCache() {
  translationCache = {};
  cacheLoaded = true;
  cacheDirty = false;
  pendingTranslations.clear();

  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  if (canUseStorage()) {
    window.localStorage.removeItem(CACHE_KEY);
  }
}

export default {
  RUNTIME_TRANSLATION_ENABLED,
  translateText,
  translateTextFromCache,
  isTextTranslationCached,
  translateBatch,
  translatePost,
  translatePosts,
  translatePostsInstant,
  arePostsTranslationsCached,
  clearTranslationCache,
};

export { RUNTIME_TRANSLATION_ENABLED };
