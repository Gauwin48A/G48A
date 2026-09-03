// =============================================================================
// Redis Cache Configuration (with in-memory fallback)
// =============================================================================

const Redis = require("ioredis");
const logger = require("../utils/logger");

// =============================================================================
// Redis Connection Options
// =============================================================================

function buildRedisOptions() {
  const redisUrl = String(process.env.REDIS_URL || "").trim();
  const commonOptions = {
    keyPrefix: "mhub:",
    retryStrategy: (times) => {
      if (times > 3) {
        logger.info(
          "[Redis] Max retries reached, falling back to in-memory cache"
        );
        return null;
      }
      return Math.min(times * 200, 1e3);
    },
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5e3,
  };

  if (redisUrl) {
    if (redisUrl.startsWith("rediss://")) {
      commonOptions.tls = {
        rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
      };
    }
    return { url: redisUrl, options: commonOptions };
  }

  return {
    url: null,
    options: {
      host: process.env.REDIS_HOST || "localhost",
      port: Number.parseInt(process.env.REDIS_PORT, 10) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number.parseInt(process.env.REDIS_DB, 10) || 0,
      ...commonOptions,
    },
  };
}

// =============================================================================
// Cache TTL Defaults (seconds)
// =============================================================================

/** @type {{ FEED: number, POSTS: number, REELS: number, USER: number, UNREAD: number, CATEGORIES: number }} */
const CACHE_TTL = {
  FEED: 5,
  POSTS: 30,
  REELS: 30,
  USER: 60,
  UNREAD: 10,
  CATEGORIES: 300,
};

// =============================================================================
// Tuning Constants
// =============================================================================

const SCAN_COUNT =
  Number.parseInt(process.env.REDIS_SCAN_COUNT, 10) || 200;
const DELETE_BATCH_SIZE =
  Number.parseInt(process.env.REDIS_DELETE_BATCH_SIZE, 10) || 200;

// =============================================================================
// Connection State
// =============================================================================

let redisClient = null;
let isRedisAvailable = false;
let connectionAttempted = false;

// =============================================================================
// Client Initialisation
// =============================================================================

/**
 * Returns the shared Redis client, lazily connecting on first call.
 * Falls back to null when Redis is unavailable.
 * @returns {Promise<import("ioredis").Redis | null>}
 */
async function getRedisClient() {
  if (redisClient && isRedisAvailable) {
    return redisClient;
  }
  if (connectionAttempted && !isRedisAvailable) {
    return null;
  }
  connectionAttempted = true;

  try {
    const { url, options } = buildRedisOptions();
    redisClient = url ? new Redis(url, options) : new Redis(options);

    redisClient.on("connect", () => {
      logger.info("[Redis] Connected successfully");
      isRedisAvailable = true;
    });

    redisClient.on("error", (err) => {
      logger.info("[Redis] Connection error:", err.message);
      isRedisAvailable = false;
    });

    redisClient.on("close", () => {
      logger.info("[Redis] Connection closed");
      isRedisAvailable = false;
    });

    await redisClient.ping();
    isRedisAvailable = true;
    logger.info("[Redis] Ready for distributed caching");
    return redisClient;
  } catch (err) {
    logger.info(
      "[Redis] Not available, using in-memory fallback:",
      err.message
    );
    isRedisAvailable = false;
    return null;
  }
}

// =============================================================================
// In-Memory Fallback Cache
// =============================================================================

const memoryCache = new Map();
const MAX_MEMORY_ENTRIES = 1e3;
let unlinkSupported = true;

/**
 * Evicts expired entries and trims the memory cache when it exceeds the max size.
 */
function cleanMemoryCache() {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (now - value.timestamp >= value.ttl * 1e3) {
      memoryCache.delete(key);
    }
  }
  if (memoryCache.size > MAX_MEMORY_ENTRIES) {
    const toRemove = Math.floor(MAX_MEMORY_ENTRIES * 0.2);
    const keys = Array.from(memoryCache.keys()).slice(0, toRemove);
    keys.forEach((k) => memoryCache.delete(k));
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Safely parses a JSON string; returns the raw value on failure.
 * @param {string} value - The string to parse.
 * @returns {*} Parsed object or original string.
 */
function parseRedisValue(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Converts a glob-style pattern (with `*` wildcards) into a matcher function.
 * @param {string} pattern - Glob pattern (e.g. "feed:*").
 * @returns {(key: string) => boolean} Matcher function.
 */
function globPatternToMatcher(pattern) {
  if (!pattern || pattern === "*") {
    return () => true;
  }
  if (!pattern.includes("*")) {
    return (key) => key === pattern;
  }
  const escaped = pattern
    .split("*")
    .map((segment) => segment.replace(/[\\^$+?.()|[\]{}]/g, "\\$&"))
    .join(".*");
  const regex = new RegExp(`^${escaped}$`);
  return (key) => regex.test(key);
}

/**
 * Batch-deletes Redis keys using UNLINK (falling back to DEL).
 * @param {import("ioredis").Redis} redis - The Redis client.
 * @param {string[]} keys - Keys to delete.
 * @returns {Promise<number>} Number of keys deleted.
 */
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
        if (err?.message?.toLowerCase?.().includes("unknown command")) {
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

// =============================================================================
// Public Cache API
// =============================================================================

/**
 * Retrieves a cached value by key (Redis first, then memory fallback).
 * @param {string} key - Cache key.
 * @returns {Promise<*|null>} Cached value or null.
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
    logger.info("[Redis] Get error, using memory:", err.message);
  }

  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl * 1e3) {
    return cached.data;
  }
  if (cached) memoryCache.delete(key);
  return null;
}

/**
 * Stores a value in the cache with a TTL.
 * @param {string} key - Cache key.
 * @param {*} value - Value to cache (will be JSON-serialised).
 * @param {number} [ttlSeconds=CACHE_TTL.FEED] - Time-to-live in seconds.
 * @returns {Promise<boolean>} True when stored successfully.
 */
async function set(key, value, ttlSeconds = CACHE_TTL.FEED) {
  try {
    const redis = await getRedisClient();
    if (redis && isRedisAvailable) {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return true;
    }
  } catch (err) {
    logger.info("[Redis] Set error, using memory:", err.message);
  }

  cleanMemoryCache();
  memoryCache.set(key, {
    data: value,
    timestamp: Date.now(),
    ttl: ttlSeconds,
  });
  return true;
}

/**
 * Deletes a single key from both Redis and memory caches.
 * @param {string} key - Cache key to delete.
 * @returns {Promise<void>}
 */
async function del(key) {
  try {
    const redis = await getRedisClient();
    if (redis && isRedisAvailable) {
      await redis.del(key);
    }
  } catch (err) {
    logger.info("[Redis] Del error:", err.message);
  }
  memoryCache.delete(key);
}

/**
 * Deletes all keys matching a glob pattern from both Redis and memory caches.
 * @param {string} pattern - Glob pattern (e.g. "feed:*"). Defaults to "*".
 * @returns {Promise<number>} Total number of keys deleted.
 */
async function clearPattern(pattern) {
  const normalizedPattern =
    typeof pattern === "string" && pattern.trim() ? pattern.trim() : "*";
  const redisPrefix = REDIS_CONFIG.keyPrefix || "";
  const redisPattern =
    redisPrefix && !normalizedPattern.startsWith(redisPrefix)
      ? `${redisPrefix}${normalizedPattern}`
      : normalizedPattern;

  let redisDeleted = 0;
  try {
    const redis = await getRedisClient();
    if (redis && isRedisAvailable) {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          redisPattern,
          "COUNT",
          SCAN_COUNT
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          const keysToDelete = redisPrefix
            ? keys.map((key) =>
                key.startsWith(redisPrefix)
                  ? key.slice(redisPrefix.length)
                  : key
              )
            : keys;
          redisDeleted += await deleteRedisKeys(redis, keysToDelete);
        }
      } while (cursor !== "0");
    }
  } catch (err) {
    logger.info("[Redis] ClearPattern error:", err.message);
  }

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

// =============================================================================
// Cache Key Builders
// =============================================================================

/**
 * Builds a time-bucketed feed cache key.
 * @param {string} userId
 * @param {number} limit
 * @param {string} seedBucket
 * @param {*} [filters]
 * @returns {string}
 */
function feedKey(userId, limit, seedBucket, filters) {
  const timeBucket = Math.floor(Date.now() / (CACHE_TTL.FEED * 1e3));
  const filterHash = filters ? JSON.stringify(filters) : "";
  return `feed:${timeBucket}:${seedBucket}:${userId}:${limit}:${filterHash}`;
}

/**
 * Builds a cache key for a single post.
 * @param {string|number} postId
 * @returns {string}
 */
function postKey(postId) {
  return `post:${postId}`;
}

/**
 * Builds a cache key for a single user.
 * @param {string|number} userId
 * @returns {string}
 */
function userKey(userId) {
  return `user:${userId}`;
}

/**
 * Returns the cache key for the categories list.
 * @returns {string}
 */
function categoriesKey() {
  return `categories:all`;
}

/**
 * Builds a cache key for reels metadata.
 * @param {string|number} reelId
 * @returns {string}
 */
function reelKey(reelId) {
  return `reel:${reelId}`;
}

/**
 * Builds a cache key for user unread notification/message counter.
 * @param {string|number} userId
 * @returns {string}
 */
function unreadCounterKey(userId) {
  return `unread:${userId}`;
}

// =============================================================================
// Cache Statistics
// =============================================================================

let cacheStats = {
  hits: 0,
  misses: 0,
  redisHits: 0,
  memoryHits: 0,
};

/**
 * Records a cache hit.
 * @param {boolean} [isRedis=false] - Whether the hit came from Redis.
 */
function recordHit(isRedis = false) {
  cacheStats.hits++;
  if (isRedis) cacheStats.redisHits++;
  else cacheStats.memoryHits++;
}

/** Records a cache miss. */
function recordMiss() {
  cacheStats.misses++;
}

/**
 * Returns a snapshot of cache statistics.
 * @returns {{ hits: number, misses: number, redisHits: number, memoryHits: number, hitRate: string, isRedisAvailable: boolean, memoryCacheSize: number }}
 */
function getStats() {
  const total = cacheStats.hits + cacheStats.misses;
  return {
    ...cacheStats,
    hitRate:
      total > 0
        ? (cacheStats.hits / total * 100).toFixed(2) + "%"
        : "0%",
    isRedisAvailable: isRedisAvailable,
    memoryCacheSize: memoryCache.size,
  };
}

// =============================================================================
// Health Check & Teardown
// =============================================================================

/**
 * Performs a health check, returning latency info for Redis or memory status.
 * @returns {Promise<{ status: string, type: string, latency?: number, size?: number, message: string }>}
 */
async function healthCheck() {
  try {
    const redis = await getRedisClient();
    if (redis && isRedisAvailable) {
      const start = Date.now();
      await redis.ping();
      return {
        status: "healthy",
        type: "redis",
        latency: Date.now() - start,
        message: "Redis distributed cache active",
      };
    }
  } catch (err) {
    // fall through to memory status
  }
  return {
    status: "healthy",
    type: "memory",
    size: memoryCache.size,
    message: "Using in-memory fallback cache",
  };
}

/**
 * Closes the Redis connection and clears all in-memory state.
 * @returns {Promise<void>}
 */
async function close() {
  memoryCache.clear();
  cacheStats = { hits: 0, misses: 0, redisHits: 0, memoryHits: 0 };

  if (redisClient) {
    try {
      await redisClient.quit();
    } catch {
      try {
        redisClient.disconnect();
      } catch {
        // ignore
      }
    }
  }

  redisClient = null;
  isRedisAvailable = false;
  connectionAttempted = false;
}

// =============================================================================
// Module Exports
// =============================================================================

module.exports = {
  get: get,
  set: set,
  del: del,
  clearPattern: clearPattern,
  feedKey: feedKey,
  postKey: postKey,
  reelKey: reelKey,
  userKey: userKey,
  unreadCounterKey: unreadCounterKey,
  categoriesKey: categoriesKey,
  getStats: getStats,
  healthCheck: healthCheck,
  recordHit: recordHit,
  recordMiss: recordMiss,
  close: close,
  CACHE_TTL: CACHE_TTL,
  isRedisAvailable: () => isRedisAvailable,
};
