/**
 * Dynamic Content Translation Utility
 * Translates post titles, descriptions, and other dynamic content.
 * Uses Google Translate endpoint with in-memory + localStorage caching.
 */

const CACHE_KEY = 'mhub_translations_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 3000;
const CACHE_PERSIST_DEBOUNCE_MS = 750;
const MAX_TRANSLATE_CONCURRENCY = 4;

let translationCache = {};
let cacheLoaded = false;
let cacheDirty = false;
let persistTimer = null;
const pendingTranslations = new Map();

function canUseStorage() {
    return typeof window !== 'undefined' && Boolean(window.localStorage);
}

function normalizeText(value) {
    return typeof value === 'string' ? value : String(value ?? '');
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
        if (parsed && typeof parsed === 'object') {
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
            // Ignore storage write errors (quota/private mode).
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
        timestamp: Date.now()
    };
    pruneExpiredEntries(translationCache);
    enforceCacheLimit(translationCache);
    markCacheDirty();
}

async function requestTranslation(text, targetLang) {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    const data = await response.json();

    let translated = '';
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

/**
 * Translate text using Google Translate API.
 * @param {string} text - Text to translate.
 * @param {string} targetLang - Target language code.
 * @returns {Promise<string>}
 */
export async function translateText(text, targetLang) {
    const originalText = normalizeText(text);
    const trimmedText = originalText.trim();

    if (!trimmedText || targetLang === 'en') {
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
                console.warn('Translation failed, using original text:', error?.message || error);
            }
            return originalText;
        })
        .finally(() => {
            pendingTranslations.delete(cacheKey);
        });

    pendingTranslations.set(cacheKey, translationTask);
    return translationTask;
}

/**
 * Translate multiple texts with limited concurrency.
 * @param {string[]} texts
 * @param {string} targetLang
 * @returns {Promise<string[]>}
 */
export async function translateBatch(texts, targetLang) {
    if (!Array.isArray(texts) || texts.length === 0) {
        return [];
    }

    if (targetLang === 'en') {
        return texts;
    }

    return mapWithConcurrency(texts, (value) => translateText(value, targetLang));
}

/**
 * Translate a post object (title and description).
 * @param {Object} post
 * @param {string} targetLang
 * @returns {Promise<Object>}
 */
export async function translatePost(post, targetLang) {
    if (!post || targetLang === 'en') {
        return post;
    }

    const [translatedTitle, translatedDescription] = await translateBatch(
        [post.title || '', post.description || ''],
        targetLang
    );

    return {
        ...post,
        title: translatedTitle,
        description: translatedDescription,
        _originalTitle: post.title,
        _originalDescription: post.description
    };
}

/**
 * Translate an array of posts.
 * @param {Object[]} posts
 * @param {string} targetLang
 * @returns {Promise<Object[]>}
 */
export async function translatePosts(posts, targetLang) {
    if (!Array.isArray(posts) || posts.length === 0 || targetLang === 'en') {
        return posts;
    }

    const [translatedTitles, translatedDescriptions] = await Promise.all([
        translateBatch(posts.map((post) => post?.title || ''), targetLang),
        translateBatch(posts.map((post) => post?.description || ''), targetLang)
    ]);

    return posts.map((post, index) => ({
        ...post,
        title: translatedTitles[index] ?? post?.title ?? '',
        description: translatedDescriptions[index] ?? post?.description ?? '',
        _originalTitle: post?.title,
        _originalDescription: post?.description
    }));
}

/**
 * Clear translation cache.
 */
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
    clearTranslationCache
};
