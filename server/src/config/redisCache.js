/**
 * Redis Cache Service
 * 
 * High-performance distributed caching for 10 lakh+ concurrent users
 * Falls back to in-memory cache if Redis is unavailable
 */

const Redis = require('ioredis');

// ============================================
// REDIS CONNECTION CONFIGURATION
// ============================================
const REDIS_CONFIG = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number.parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    db: Number.parseInt(process.env.REDIS_DB, 10) || 0,
    keyPrefix: 'mhub:',
    retryStrategy: (times) => {
        if (times > 3) {
            console.log('[Redis] Max retries reached, falling back to in-memory cache');
            return null; // Stop retrying, use fallback
        }
        return Math.min(times * 200, 1000);
    },
    lazyConnect: true, // Don't connect until first command
    maxRetriesPerRequest: 1,
    connectTimeout: 3000,
};

// Cache TTL configuration (in seconds)
const CACHE_TTL = {
    FEED: 5,           // Feed cache - 5 seconds (fast rotation)
    POSTS: 30,         // Post details - 30 seconds
    USER: 60,          // User data - 1 minute
    CATEGORIES: 300,   // Categories - 5 minutes (rarely change)
};
const SCAN_COUNT = Number.parseInt(process.env.REDIS_SCAN_COUNT, 10) || 200;
const DELETE_BATCH_SIZE = Number.parseInt(process.env.REDIS_DELETE_BATCH_SIZE, 10) || 200;

// ============================================
// REDIS CLIENT SINGLETON
// ============================================
let redisClient = null;
let isRedisAvailable = false;
let connectionAttempted = false;

async function getRedisClient() {
    if (redisClient && isRedisAvailable) {
        return redisClient;
    }

    if (connectionAttempted && !isRedisAvailable) {
        return null; // Already tried and failed
    }

    connectionAttempted = true;

    try {
        redisClient = new Redis(REDIS_CONFIG);

        redisClient.on('connect', () => {
            console.log('[Redis] Connected successfully');
            isRedisAvailable = true;
        });

        redisClient.on('error', (err) => {
            console.log('[Redis] Connection error:', err.message);
            isRedisAvailable = false;
        });

        redisClient.on('close', () => {
            console.log('[Redis] Connection closed');
            isRedisAvailable = false;
        });

        // Test connection
        await redisClient.ping();
        isRedisAvailable = true;
        console.log('[Redis] Ready for distributed caching');
        return redisClient;
    } catch (err) {
        console.log('[Redis] Not available, using in-memory fallback:', err.message);
        isRedisAvailable = false;
        return null;
    }
}

// ============================================
// IN-MEMORY FALLBACK CACHE
// ============================================
const memoryCache = new Map();
const MAX_MEMORY_ENTRIES = 1000;
let unlinkSupported = true;

function cleanMemoryCache() {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
        if ((now - value.timestamp) >= (value.ttl * 1000)) {
            memoryCache.delete(key);
        }
    }

    if (memoryCache.size > MAX_MEMORY_ENTRIES) {
        const toRemove = Math.floor(MAX_MEMORY_ENTRIES * 0.2);
        const keys = Array.from(memoryCache.keys()).slice(0, toRemove);
        keys.forEach(k => memoryCache.delete(k));
    }
}

function parseRedisValue(value) {
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function globPatternToMatcher(pattern) {
    if (!pattern || pattern === '*') {
        return () => true;
    }

    if (!pattern.includes('*')) {
        return (key) => key === pattern;
    }

    const escaped = pattern
        .split('*')
        .map((segment) => segment.replace(/[\\^$+?.()|[\]{}]/g, '\\$&'))
        .join('.*');
    const regex = new RegExp(`^${escaped}$`);
    return (key) => regex.test(key);
}

async function deleteRedisKeys(redis, keys) {
    let deleted = 0;
    for (let i = 0; i < keys.length; i += DELETE_BATCH_SIZE) {
        const batch = keys.slice(i, i + DELETE_BATCH_SIZE);
        if (!batch.length) {
            continue;
        }

        if (unlinkSupported) {
            try {
                deleted += await redis.unlink(...batch);
                continue;
            } catch (err) {
                if (err?.message?.toLowerCase?.().includes('unknown command')) {
                    unlinkSupported = false;
                } else {
                    throw err;
                }
            }
        }

        deleted += await redis.del(...batch);
    }
    return deleted;
}

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Get value from cache (Redis or memory fallback)
 */
async function get(key) {
    try {
        const redis = await getRedisClient();
        if (redis && isRedisAvailable) {
            const value = await redis.get(key);
            if (value === null || value === undefined) {
                return null;
            }
            return parseRedisValue(value);
        }
    } catch (err) {
        console.log('[Redis] Get error, using memory:', err.message);
    }

    // Memory fallback
    const cached = memoryCache.get(key);
    if (cached && (Date.now() - cached.timestamp) < (cached.ttl * 1000)) {
        return cached.data;
    }
    if (cached) memoryCache.delete(key);
    return null;
}

/**
 * Set value in cache with TTL
 */
async function set(key, value, ttlSeconds = CACHE_TTL.FEED) {
    try {
        const redis = await getRedisClient();
        if (redis && isRedisAvailable) {
            await redis.setex(key, ttlSeconds, JSON.stringify(value));
            return true;
        }
    } catch (err) {
        console.log('[Redis] Set error, using memory:', err.message);
    }

    // Memory fallback
    cleanMemoryCache();
    memoryCache.set(key, { data: value, timestamp: Date.now(), ttl: ttlSeconds });
    return true;
}

/**
 * Delete from cache
 */
async function del(key) {
    try {
        const redis = await getRedisClient();
        if (redis && isRedisAvailable) {
            await redis.del(key);
        }
    } catch (err) {
        console.log('[Redis] Del error:', err.message);
    }
    memoryCache.delete(key);
}

/**
 * Clear all cache with pattern
 */
async function clearPattern(pattern) {
    const normalizedPattern = (typeof pattern === 'string' && pattern.trim())
        ? pattern.trim()
        : '*';
    const redisPrefix = REDIS_CONFIG.keyPrefix || '';
    const redisPattern = redisPrefix && !normalizedPattern.startsWith(redisPrefix)
        ? `${redisPrefix}${normalizedPattern}`
        : normalizedPattern;
    let redisDeleted = 0;

    try {
        const redis = await getRedisClient();
        if (redis && isRedisAvailable) {
            let cursor = '0';
            do {
                const [nextCursor, keys] = await redis.scan(
                    cursor,
                    'MATCH',
                    redisPattern,
                    'COUNT',
                    SCAN_COUNT
                );
                cursor = nextCursor;
                if (keys.length > 0) {
                    const keysToDelete = redisPrefix
                        ? keys.map((key) => key.startsWith(redisPrefix) ? key.slice(redisPrefix.length) : key)
                        : keys;
                    redisDeleted += await deleteRedisKeys(redis, keysToDelete);
                }
            } while (cursor !== '0');
        }
    } catch (err) {
        console.log('[Redis] ClearPattern error:', err.message);
    }

    // Clear matching keys from memory
    const matchesPattern = globPatternToMatcher(normalizedPattern);
    let memoryDeleted = 0;
    for (const key of memoryCache.keys()) {
        if (matchesPattern(key)) {
            memoryCache.delete(key);
            memoryDeleted += 1;
        }
    }

    return redisDeleted + memoryDeleted;
}

// ============================================
// CACHE KEY GENERATORS
// ============================================

function feedKey(userId, limit, seedBucket, filters) {
    const timeBucket = Math.floor(Date.now() / (CACHE_TTL.FEED * 1000));
    const filterHash = filters ? JSON.stringify(filters) : '';
    return `feed:${timeBucket}:${seedBucket}:${userId}:${limit}:${filterHash}`;
}

function postKey(postId) {
    return `post:${postId}`;
}

function userKey(userId) {
    return `user:${userId}`;
}

function categoriesKey() {
    return `categories:all`;
}

// ============================================
// CACHE STATS
// ============================================
let cacheStats = {
    hits: 0,
    misses: 0,
    redisHits: 0,
    memoryHits: 0,
};

function recordHit(isRedis = false) {
    cacheStats.hits++;
    if (isRedis) cacheStats.redisHits++;
    else cacheStats.memoryHits++;
}

function recordMiss() {
    cacheStats.misses++;
}

function getStats() {
    const total = cacheStats.hits + cacheStats.misses;
    return {
        ...cacheStats,
        hitRate: total > 0 ? ((cacheStats.hits / total) * 100).toFixed(2) + '%' : '0%',
        isRedisAvailable,
        memoryCacheSize: memoryCache.size,
    };
}

// ============================================
// HEALTH CHECK
// ============================================
async function healthCheck() {
    try {
        const redis = await getRedisClient();
        if (redis && isRedisAvailable) {
            const start = Date.now();
            await redis.ping();
            return {
                status: 'healthy',
                type: 'redis',
                latency: Date.now() - start,
                message: 'Redis distributed cache active'
            };
        }
    } catch (err) {
        // Fallback check
    }

    return {
        status: 'healthy',
        type: 'memory',
        size: memoryCache.size,
        message: 'Using in-memory fallback cache'
    };
}

async function close() {
    memoryCache.clear();
    cacheStats = {
        hits: 0,
        misses: 0,
        redisHits: 0,
        memoryHits: 0,
    };

    if (redisClient) {
        try {
            await redisClient.quit();
        } catch {
            try {
                redisClient.disconnect();
            } catch {
                // noop
            }
        }
    }

    redisClient = null;
    isRedisAvailable = false;
    connectionAttempted = false;
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
    get,
    set,
    del,
    clearPattern,
    feedKey,
    postKey,
    userKey,
    categoriesKey,
    getStats,
    healthCheck,
    recordHit,
    recordMiss,
    close,
    CACHE_TTL,
    isRedisAvailable: () => isRedisAvailable,
};
