/**
 * Redis Cache Configuration
 * Used for distributed session management and rate limiting
 * Falls back to in-memory if Redis is unavailable
 */
const Redis = require('ioredis');

let redis = null;
let isRedisAvailable = false;

function parseIntegerEnv(value, fallback, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
    const parsed = Number.parseInt(String(value ?? ''), 10);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        return fallback;
    }
    return parsed;
}

// Try to connect to Redis
const initRedis = () => {
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        try {
            const connectionOptions = {
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 1,
                lazyConnect: true
            };

            const redisUrl = String(process.env.REDIS_URL || '').trim();

            if (redisUrl) {
                redis = new Redis(redisUrl, connectionOptions);
            } else {
                redis = new Redis({
                    host: String(process.env.REDIS_HOST || 'localhost').trim() || 'localhost',
                    port: parseIntegerEnv(process.env.REDIS_PORT, 6379, { min: 1, max: 65535 }),
                    password: process.env.REDIS_PASSWORD || undefined,
                    db: parseIntegerEnv(process.env.REDIS_DB, 0, { min: 0, max: 1024 }),
                    ...connectionOptions
                });
            }

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

const close = async () => {
    for (const [key, timer] of memoryExpiryTimers.entries()) {
        clearTimeout(timer);
        memoryExpiryTimers.delete(key);
    }
    memoryStore.clear();

    if (redis) {
        try {
            await redis.quit();
        } catch {
            try {
                redis.disconnect();
            } catch {
                // noop
            }
        }
    }

    redis = null;
    isRedisAvailable = false;
};

// Initialize on module load
initRedis();

module.exports = { get, set, del, incr, close, isRedisAvailable: () => isRedisAvailable };
