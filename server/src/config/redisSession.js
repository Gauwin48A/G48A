// =============================================================================
// Redis Session Store (with in-memory fallback)
// =============================================================================

const Redis = require("ioredis");
const logger = require("../utils/logger");

// =============================================================================
// Connection State
// =============================================================================

let redis = null;
let isRedisAvailable = false;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Parses an environment variable as a bounded integer, returning a fallback
 * when the value is missing, not a safe integer, or out of range.
 * @param {*} value - Raw env value.
 * @param {number} fallback - Default when parsing fails.
 * @param {{ min?: number, max?: number }} [bounds] - Optional min/max constraints.
 * @returns {number}
 */
function parseIntegerEnv(
  value,
  fallback,
  { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}
) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    return fallback;
  }
  return parsed;
}

// =============================================================================
// Redis Initialisation
// =============================================================================

/**
 * Initialises the Redis client from environment variables.
 * Falls back to in-memory storage when Redis is not configured or unavailable.
 */
const initRedis = () => {
  if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    try {
      const connectionOptions = {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      };

      const redisUrl = String(process.env.REDIS_URL || "").trim();

      if (redisUrl) {
        redis = new Redis(redisUrl, connectionOptions);
      } else {
        redis = new Redis({
          host:
            String(process.env.REDIS_HOST || "localhost").trim() || "localhost",
          port: parseIntegerEnv(process.env.REDIS_PORT, 6379, {
            min: 1,
            max: 65535,
          }),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseIntegerEnv(process.env.REDIS_DB, 0, {
            min: 0,
            max: 1024,
          }),
          ...connectionOptions,
        });
      }

      redis.on("connect", () => {
        isRedisAvailable = true;
        logger.info("✅ Redis connected for session management");
      });

      redis.on("error", (err) => {
        isRedisAvailable = false;
        logger.info(
          "⚠️ Redis unavailable, using in-memory fallback:",
          err.message
        );
      });

      redis.connect().catch(() => {
        isRedisAvailable = false;
      });
    } catch (err) {
      logger.info("⚠️ Redis init failed, using in-memory fallback");
    }
  } else {
    logger.info("ℹ️ Redis not configured, using in-memory storage");
  }
};

// =============================================================================
// In-Memory Fallback Store
// =============================================================================

const memoryStore = new Map();
const memoryExpiryTimers = new Map();

/**
 * Schedules automatic expiry for a key in the memory store.
 * @param {string} key - The key to expire.
 * @param {number} ttlSeconds - Seconds until expiry.
 */
const scheduleMemoryExpiry = (key, ttlSeconds) => {
  if (memoryExpiryTimers.has(key)) {
    clearTimeout(memoryExpiryTimers.get(key));
  }
  const timer = setTimeout(() => {
    memoryStore.delete(key);
    memoryExpiryTimers.delete(key);
  }, ttlSeconds * 1e3);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
  memoryExpiryTimers.set(key, timer);
};

// =============================================================================
// Public Session API
// =============================================================================

/**
 * Retrieves a session value by key.
 * @param {string} key - Session key.
 * @returns {Promise<*|null>} Parsed value or null.
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
 * Stores a session value with a TTL.
 * @param {string} key - Session key.
 * @param {*} value - Value to store (will be JSON-serialised).
 * @param {number} [ttlSeconds=900] - Time-to-live in seconds (default 15 min).
 * @returns {Promise<void>}
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
 * Set a value only if the key does not already exist (NX), with TTL.
 * Returns true if the value was set, false if the key already existed.
 * @param {string} key - Session key.
 * @param {*} value - Value to store (will be JSON-serialised).
 * @param {number} [ttlSeconds=900] - Time-to-live in seconds.
 * @returns {Promise<boolean>}
 */
const setIfNotExists = async (key, value, ttlSeconds = 900) => {
  const serialized = JSON.stringify(value);
  if (isRedisAvailable && redis) {
    try {
      const result = await redis.set(
        key,
        serialized,
        "EX",
        ttlSeconds,
        "NX",
      );
      return result === "OK";
    } catch {
      // fall through to memory fallback
    }
  }
  if (memoryStore.has(key)) {
    return false;
  }
  memoryStore.set(key, value);
  scheduleMemoryExpiry(key, ttlSeconds);
  return true;
};

/**
 * Deletes a session key from both Redis and memory.
 * @param {string} key - Session key.
 * @returns {Promise<void>}
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
 * Atomically increments a counter key, initialising the TTL on first increment.
 * @param {string} key - Counter key.
 * @param {number} [ttlSeconds=900] - TTL applied when the key is first created.
 * @returns {Promise<number>} The new counter value.
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

// =============================================================================
// Teardown
// =============================================================================

/**
 * Closes the Redis connection and clears all in-memory state and timers.
 * @returns {Promise<void>}
 */
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
        // ignore
      }
    }
  }

  redis = null;
  isRedisAvailable = false;
};

// =============================================================================
// Bootstrap
// =============================================================================

initRedis();

// =============================================================================
// Module Exports
// =============================================================================

module.exports = {
  get: get,
  set: set,
  setIfNotExists: setIfNotExists,
  del: del,
  incr: incr,
  close: close,
  isRedisAvailable: () => isRedisAvailable,
};
