const NodeCache = require('node-cache');
const log = require('../utils/logger'); // Ensure you have a logger, or use console

/**
 * CACHE SERVICE (The Memory Bank)
 * 
 * Strategy: In-Memory Caching (Zero-Config)
 * Why: Fastest possible access (RAM), no external dependencies (Redis) for local dev.
 * 
 * TTL: 60 seconds default (Fresh enough for feed, static enough for performance)
 */
class CacheService {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 60, // Standard Time To Live: 60 seconds
            checkperiod: 120, // Delete check interval
            useClones: false // Performance optimization (store reference)
        });

        console.log('⚡ [CacheService] In-Memory Cache Initialized');
    }

    /**
     * Get value from cache
     * @param {string} key 
     * @returns {any | undefined}
     */
    get(key) {
        const value = this.cache.get(key);
        if (value) {
            // console.log(`⚡ [CACHE HIT] ${key}`);
        } else {
            // console.log(`🐢 [CACHE MISS] ${key}`);
        }
        return value;
    }

    /**
     * Set value in cache
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttl - Optional specific TTL in seconds
     */
    set(key, value, ttl = 60) {
        return this.cache.set(key, value, ttl);
    }

    /**
     * Delete value from cache
     * @param {string} key 
     */
    del(key) {
        return this.cache.del(key);
    }

    /**
     * Flush entire cache (Use with caution)
     */
    flush() {
        this.cache.flushAll();
        console.log('🧹 [CacheService] Cache Flushed');
    }

    /**
     * Helper: Get or Set (Atomic-ish)
     * if key exists, return it.
     * if not, run fetchFunction(), set cache, return result.
     */
    async getOrSet(key, fetchFunction, ttl = 60) {
        const cached = this.get(key);
        if (cached) {
            return cached;
        }

        const result = await fetchFunction();
        this.set(key, result, ttl);
        return result;
    }
}

module.exports = new CacheService();
