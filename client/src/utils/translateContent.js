/**
 * Dynamic Content Translation Utility
 * Translates post titles, descriptions, and other dynamic content
 * Uses free Google Translate API with localStorage caching
 */

// Cache for storing translations to avoid repeated API calls
const CACHE_KEY = 'mhub_translations_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Get cached translations
function getCache() {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        if (cache) {
            const parsed = JSON.parse(cache);
            // Clean expired entries
            const now = Date.now();
            Object.keys(parsed).forEach(key => {
                if (parsed[key].timestamp && (now - parsed[key].timestamp) > CACHE_EXPIRY) {
                    delete parsed[key];
                }
            });
            return parsed;
        }
    } catch (e) { }
    return {};
}

// Save to cache
function setCache(cache) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) { }
}

// Generate cache key
function getCacheKey(text, targetLang) {
    return `${targetLang}:${text.substring(0, 100)}:${text.length}`;
}

/**
 * Translate text using free Google Translate API
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (hi, te, ta, kn, mr, bn)
 * @returns {Promise<string>} - Translated text
 */
export async function translateText(text, targetLang) {
    // Don't translate if target is English or text is empty
    if (!text || targetLang === 'en' || !text.trim()) {
        return text;
    }

    // Check cache first
    const cache = getCache();
    const cacheKey = getCacheKey(text, targetLang);

    if (cache[cacheKey]) {
        return cache[cacheKey].text;
    }

    try {
        // Use Google Translate free API
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;

        const response = await fetch(url);
        const data = await response.json();

        // Extract translated text from response
        let translated = '';
        if (data && data[0]) {
            data[0].forEach(item => {
                if (item[0]) {
                    translated += item[0];
                }
            });
        }

        // If translation failed, return original
        if (!translated) {
            return text;
        }

        // Save to cache
        cache[cacheKey] = { text: translated, timestamp: Date.now() };
        setCache(cache);

        return translated;
    } catch (error) {
        console.warn('Translation failed, using original text:', error.message);
        return text;
    }
}

/**
 * Translate multiple texts in batch (for efficiency)
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language code
 * @returns {Promise<string[]>} - Array of translated texts
 */
export async function translateBatch(texts, targetLang) {
    if (targetLang === 'en') {
        return texts;
    }

    const results = await Promise.all(
        texts.map(text => translateText(text, targetLang))
    );

    return results;
}

/**
 * Translate a post object (title and description)
 * @param {Object} post - Post object with title and description
 * @param {string} targetLang - Target language code
 * @returns {Promise<Object>} - Post with translated fields
 */
export async function translatePost(post, targetLang) {
    if (!post || targetLang === 'en') {
        return post;
    }

    const [translatedTitle, translatedDescription] = await Promise.all([
        translateText(post.title || '', targetLang),
        translateText(post.description || '', targetLang)
    ]);

    return {
        ...post,
        title: translatedTitle,
        description: translatedDescription,
        _originalTitle: post.title,
        _originalDescription: post.description
    };
}

/**
 * Translate an array of posts
 * @param {Object[]} posts - Array of post objects
 * @param {string} targetLang - Target language code
 * @returns {Promise<Object[]>} - Array of translated posts
 */
export async function translatePosts(posts, targetLang) {
    if (!posts?.length || targetLang === 'en') {
        return posts;
    }

    const translatedPosts = await Promise.all(
        posts.map(post => translatePost(post, targetLang))
    );

    return translatedPosts;
}

/**
 * Clear translation cache
 */
export function clearTranslationCache() {
    localStorage.removeItem(CACHE_KEY);
}

export default {
    translateText,
    translateBatch,
    translatePost,
    translatePosts,
    clearTranslationCache
};
