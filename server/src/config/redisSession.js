/**
 * Redis Cache Configuration
 * Used for distributed session management and rate limiting
 * Falls back to in-memory if Redis is unavailable
 */
const Redis = require('ioredis');

let redis = null;
let isRedisAvailable = false;

// Try to connect to Redis
const initRedis = () => {
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        try {
            redis = new Redis({
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD || undefined,
                db: process.env.REDIS_DB || 0,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 1,
                lazyConnect: true
            });

            redis.on('connect', () => {
                isRedisAvailable = true;
                console.log('✅ Redis connected for session management');
            });

            redis.on('error', (err) => {
                isRedisAvailable = false;
                console.log('⚠️ Redis unavailable, using in-memory fallback:', err.message);
            });

            // Attempt connection
            redis.connect().catch(() => {
                isRedisAvailable = false;
            });
        } catch (err) {
            console.log('⚠️ Redis init failed, using in-memory fallback');
        }
    } else {
        console.log('ℹ️ Redis not configured, using in-memory storage');
    }
};

// In-memory fallback storage
const memoryStore = new Map();
const memoryExpiryTimers = new Map();

const scheduleMemoryExpiry = (key, ttlSeconds) => {
    if (memoryExpiryTimers.has(key)) {
        clearTimeout(memoryExpiryTimers.get(key));
    }
    const timer = setTimeout(() => {
        memoryStore.delete(key);
        memoryExpiryTimers.delete(key);
    }, ttlSeconds * 1000);
    if (typeof timer.unref === 'function') {
        timer.unref();
    }
    memoryExpiryTimers.set(key, timer);
};

/**
 * Get value from Redis or memory
 */
const get = async (key) => {
    if (isRedisAvailable && redis) {
        try {
            const value = await redis.get(key);
            return value ? JSON.parse(value) : null;
        } catch {
            return memoryStore.get(key) || null;
        }
    }
    return memoryStore.get(key) || null;
};

/**
 * Set value in Redis or memory
 */
const set = async (key, value, ttlSeconds = 900) => {
    const serialized = JSON.stringify(value);
    if (isRedisAvailable && redis) {
        try {
            await redis.setex(key, ttlSeconds, serialized);
        } catch {
            memoryStore.set(key, value);
            scheduleMemoryExpiry(key, ttlSeconds);
        }
    } else {
        memoryStore.set(key, value);
        scheduleMemoryExpiry(key, ttlSeconds);
    }
};

/**
 * Delete key from Redis or memory
 */
const del = async (key) => {
    if (isRedisAvailable && redis) {
        try {
            await redis.del(key);
        } catch {
            memoryStore.delete(key);
            if (memoryExpiryTimers.has(key)) {
                clearTimeout(memoryExpiryTimers.get(key));
                memoryExpiryTimers.delete(key);
            }
        }
    } else {
        memoryStore.delete(key);
        if (memoryExpiryTimers.has(key)) {
            clearTimeout(memoryExpiryTimers.get(key));
            memoryExpiryTimers.delete(key);
        }
    }
};

/**
 * Increment a counter (for rate limiting)
 */
const incr = async (key, ttlSeconds = 900) => {
    if (isRedisAvailable && redis) {
        try {
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, ttlSeconds);
            }
            return count;
        } catch {
            const current = memoryStore.get(key) || 0;
            const nextCount = current + 1;
            memoryStore.set(key, nextCount);
            scheduleMemoryExpiry(key, ttlSeconds);
            return nextCount;
        }
    }
    const current = memoryStore.get(key) || 0;
    const nextCount = current + 1;
    memoryStore.set(key, nextCount);
    scheduleMemoryExpiry(key, ttlSeconds);
    return nextCount;
};

// Initialize on module load
initRedis();

module.exports = { get, set, del, incr, isRedisAvailable: () => isRedisAvailable };
