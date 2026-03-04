const CACHE_KEY = "mhub_translations_cache";
const CACHE_EXPIRY = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 3000;
const CACHE_PERSIST_DEBOUNCE_MS = 750;
const MAX_TRANSLATE_CONCURRENCY = 4;

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

let translationCache = {};
let cacheLoaded = false;
let cacheDirty = false;
let persistTimer = null;
const pendingTranslations = new Map();

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeText(value) {
  return typeof value === "string" ? value : String(value ?? "");
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
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url);
  const data = await response.json();

  let translated = "";
  if (Array.isArray(data?.[0])) {
    data[0].forEach((item) => {
      if (item?.[0]) {
        translated += item[0];
      }
    });
  }

  return translated || text;
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

  if (!trimmedText || targetLang === "en" || !isTranslatableText(trimmedText)) {
    return originalText;
  }

  const cacheKey = getCacheKey(trimmedText, targetLang);
  const cachedTranslation = getCachedTranslation(cacheKey);
  if (cachedTranslation) {
    return cachedTranslation;
  }

  if (pendingTranslations.has(cacheKey)) {
    return pendingTranslations.get(cacheKey);
  }

  const translationTask = requestTranslation(trimmedText, targetLang)
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

export async function translateBatch(texts, targetLang) {
  if (!Array.isArray(texts) || texts.length === 0) {
    return [];
  }
  if (targetLang === "en") {
    return texts;
  }
  return mapWithConcurrency(texts, (value) => translateText(value, targetLang));
}

function getPostOriginalMap(post) {
  if (post?._originalTranslations && typeof post._originalTranslations === "object") {
    return { ...post._originalTranslations };
  }
  return {};
}

function collectPostTranslationTasks(post, postIndex, originalMap) {
  const tasks = [];

  POST_TRANSLATABLE_PATHS.forEach((path) => {
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

export async function translatePost(post, targetLang) {
  if (!post || targetLang === "en") {
    return post;
  }

  const translated = { ...post };
  const originalMap = getPostOriginalMap(post);
  const tasks = collectPostTranslationTasks(post, 0, originalMap);

  if (tasks.length === 0) {
    return post;
  }

  const translatedValues = await translateBatch(
    tasks.map((task) => task.sourceValue),
    targetLang
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

export async function translatePosts(posts, targetLang) {
  if (!Array.isArray(posts) || posts.length === 0 || targetLang === "en") {
    return posts;
  }

  const translatedPosts = posts.map((post) => ({ ...post }));
  const originalMaps = posts.map((post) => getPostOriginalMap(post));
  const tasks = [];

  posts.forEach((post, postIndex) => {
    tasks.push(...collectPostTranslationTasks(post, postIndex, originalMaps[postIndex]));
  });

  if (tasks.length === 0) {
    return posts;
  }

  const translatedValues = await translateBatch(
    tasks.map((task) => task.sourceValue),
    targetLang
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
  translateText,
  translateBatch,
  translatePost,
  translatePosts,
  clearTranslationCache,
};
