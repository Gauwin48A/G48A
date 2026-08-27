/**
 * Cache Service
 *
 * In-memory cache (node-cache) with wildcard pattern invalidation,
 * stampede protection (coalesced fetches), and hit-rate statistics.
 */

const logger = require("../utils/logger");
const NodeCache = require("node-cache");

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const MATCH_ALL_PATTERN = "*";
const MATCHER_CACHE_LIMIT = 128;

/* ------------------------------------------------------------------ */
/*  Pattern matching                                                  */
/* ------------------------------------------------------------------ */

/**
 * Escape regex metacharacters in a string.
 * @param {string} value
 * @returns {string}
 */
function escapeRegex(value) {
  return value.replace(/[\\^$+?.()|[\]{}]/g, "\\$&");
}

/**
 * Create a predicate function that tests whether a key matches a glob pattern.
 * Supports `*` wildcards. Optimized fast-paths for common patterns.
 * @param {string} pattern - Glob pattern (e.g. "prefix:*", "*:suffix").
 * @returns {(key: string) => boolean}
 */
function createPatternMatcher(pattern) {
  if (pattern === MATCH_ALL_PATTERN) {
    return () => true;
  }

  const wildcardCount = (pattern.match(/\*/g) || []).length;

  if (wildcardCount === 0) {
    return (key) => key === pattern;
  }

  if (wildcardCount === 1) {
    if (pattern.startsWith("*")) {
      const suffix = pattern.slice(1);
      return (key) => key.endsWith(suffix);
    }
    if (pattern.endsWith("*")) {
      const prefix = pattern.slice(0, -1);
      return (key) => key.startsWith(prefix);
    }
    const [prefix, suffix] = pattern.split("*");
    return (key) => key.startsWith(prefix) && key.endsWith(suffix);
  }

  if (wildcardCount === 2 && pattern.startsWith("*") && pattern.endsWith("*")) {
    const inner = pattern.slice(1, -1);
    return (key) => key.includes(inner);
  }

  const regex = new RegExp(
    `^${pattern.split("*").map(escapeRegex).join(".*")}$`
  );
  return (key) => regex.test(key);
}

/**
 * Race a promise against a timeout.
 * @param {Promise} promise
 * @param {number} timeoutMs
 * @param {string} timeoutMessage
 * @returns {Promise}
 */
async function awaitWithTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutRef;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutRef = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    if (typeof timeoutRef.unref === "function") {
      timeoutRef.unref();
    }
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutRef) clearTimeout(timeoutRef);
  }
}

/* ------------------------------------------------------------------ */
/*  CacheService class                                                */
/* ------------------------------------------------------------------ */

class CacheService {
  constructor() {
    this.cache = new NodeCache({
      stdTTL: 60,
      checkperiod: process.env.NODE_ENV === "test" ? 0 : 120,
      useClones: false,
    });

    this.inFlightRequests = new Map();
    this.patternMatchers = new Map();
    this.stats = { hits: 0, misses: 0, stampedePrevented: 0 };

    logger.info("[CacheService] In-memory cache initialized with stampede protection");
  }

  /**
   * Get (or create) a cached pattern matcher function.
   * @param {string} pattern
   * @returns {(key: string) => boolean}
   */
  getPatternMatcher(pattern) {
    const normalizedPattern = String(pattern);
    const cachedMatcher = this.patternMatchers.get(normalizedPattern);
    if (cachedMatcher) return cachedMatcher;

    const matcher = createPatternMatcher(normalizedPattern);

    if (this.patternMatchers.size >= MATCHER_CACHE_LIMIT) {
      const oldestPattern = this.patternMatchers.keys().next().value;
      this.patternMatchers.delete(oldestPattern);
    }

    this.patternMatchers.set(normalizedPattern, matcher);
    return matcher;
  }

  /**
   * Retrieve a value from the cache.
   * @param {string} key
   * @returns {*} The cached value or undefined.
   */
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits += 1;
    } else {
      this.stats.misses += 1;
    }
    return value;
  }

  /**
   * Store a value in the cache.
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl=60] - Time-to-live in seconds.
   * @returns {boolean}
   */
  set(key, value, ttl = 60) {
    return this.cache.set(key, value, ttl);
  }

  /**
   * Delete a single key from the cache.
   * @param {string} key
   * @returns {number} Number of keys deleted.
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Delete multiple keys at once.
   * @param {string[]} keys
   * @returns {number}
   */
  deleteKeys(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return 0;
    return this.cache.del(keys);
  }

  /**
   * Delete all keys matching a glob pattern.
   * @param {string} pattern - e.g. "payments:*" or "users:123:*"
   * @returns {number} Number of keys deleted.
   */
  clearPattern(pattern) {
    const normalizedPattern = (typeof pattern === "string" ? pattern : "").trim();
    if (!normalizedPattern) return 0;

    if (!normalizedPattern.includes("*")) {
      const deletedCount = this.cache.del(normalizedPattern);
      logger.info(
        `[Cache] Invalidated ${deletedCount} keys matching pattern: ${normalizedPattern}`
      );
      return deletedCount;
    }

    const keys = this.cache.keys();
    if (!keys.length) return 0;

    const matchesPattern = this.getPatternMatcher(normalizedPattern);
    const keysToDelete = [];

    for (let i = 0; i < keys.length; i += 1) {
      if (matchesPattern(keys[i])) {
        keysToDelete.push(keys[i]);
      }
    }

    const deletedCount = this.deleteKeys(keysToDelete);
    logger.info(
      `[Cache] Invalidated ${deletedCount} keys matching pattern: ${normalizedPattern}`
    );
    return deletedCount;
  }

  /**
   * Flush all entries from the cache.
   */
  flush() {
    this.cache.flushAll();
    logger.info("[CacheService] Cache flushed");
  }

  /**
   * Get-or-set with stampede protection: concurrent calls for the same key
   * share a single in-flight fetch, preventing thundering-herd cache misses.
   * @param {string} key
   * @param {() => Promise<*>} fetchFunction
   * @param {number} [ttl=60]
   * @param {number} [lockTimeoutMs=5000]
   * @returns {Promise<*>}
   */
  async getOrSetWithStampedeProtection(key, fetchFunction, ttl = 60, lockTimeoutMs = 5000) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    if (this.inFlightRequests.has(key)) {
      this.stats.stampedePrevented += 1;
      try {
        const promise = this.inFlightRequests.get(key);
        return await awaitWithTimeout(promise, lockTimeoutMs, "Lock timeout");
      } catch (err) {
        console.warn(`[Cache] Stampede lock timeout for key: ${key}`);
      }
    }

    const fetchPromise = (async () => {
      try {
        const result = await fetchFunction();
        this.set(key, result, ttl);
        return result;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Invalidate keys matching one or more glob patterns.
   * Efficiently batches exact and wildcard patterns.
   * @param {string[]} patterns
   * @returns {number} Total number of keys invalidated.
   */
  invalidateRelated(patterns) {
    if (!Array.isArray(patterns) || patterns.length === 0) return 0;

    const normalizedPatterns = [
      ...new Set(
        patterns
          .filter((p) => typeof p === "string" && p.trim().length > 0)
          .map((p) => p.trim())
      ),
    ];
    if (!normalizedPatterns.length) return 0;

    const exactPatterns = [];
    const wildcardPatterns = [];

    for (let i = 0; i < normalizedPatterns.length; i += 1) {
      if (normalizedPatterns[i].includes("*")) {
        wildcardPatterns.push(normalizedPatterns[i]);
      } else {
        exactPatterns.push(normalizedPatterns[i]);
      }
    }

    let totalInvalidated = 0;

    if (exactPatterns.length) {
      totalInvalidated += this.deleteKeys(exactPatterns);
    }

    if (wildcardPatterns.length) {
      const keys = this.cache.keys();
      if (keys.length) {
        const matchers = wildcardPatterns.map((p) => this.getPatternMatcher(p));
        const keysToDelete = [];

        keyLoop:
        for (let i = 0; i < keys.length; i += 1) {
          for (let j = 0; j < matchers.length; j += 1) {
            if (matchers[j](keys[i])) {
              keysToDelete.push(keys[i]);
              continue keyLoop;
            }
          }
        }

        if (keysToDelete.length) {
          totalInvalidated += this.deleteKeys(keysToDelete);
        }
      }
    }

    logger.info(
      `[Cache Invalidation] Cleared ${totalInvalidated} keys across ${normalizedPatterns.length} patterns`
    );
    return totalInvalidated;
  }

  /**
   * Return cache statistics (hit rate, key count, stampede prevention count).
   * @returns {object}
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate =
      totalRequests > 0
        ? Number(((this.stats.hits / totalRequests) * 100).toFixed(2))
        : 0;
    const cacheStats = this.cache.getStats();

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      hitRatePercent: `${hitRate}%`,
      keysInCache: cacheStats.keys ?? this.cache.keys().length,
      stampedePrevented: this.stats.stampedePrevented,
      memoryUsage: (cacheStats.ksize || 0) + (cacheStats.vsize || 0),
    };
  }

  /**
   * Reset statistics counters.
   */
  resetStats() {
    this.stats = { hits: 0, misses: 0, stampedePrevented: 0 };
  }

  /**
   * Quick health check based on cache hit rate.
   * @returns {{ healthy: boolean, recommendation: string }}
   */
  healthCheck() {
    const stats = this.getStats();
    const keysInCache = stats.keysInCache || 0;

    return {
      healthy: stats.hitRate > 30 || keysInCache === 0,
      recommendation:
        stats.hitRate < 30 && keysInCache > 0
          ? "Cache hit rate low - consider increasing TTL or optimizing cache keys"
          : "Healthy",
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Singleton export                                                  */
/* ------------------------------------------------------------------ */

const cacheService = new CacheService();

module.exports = cacheService;
module.exports.CacheService = CacheService;
module.exports.createPatternMatcher = createPatternMatcher;
