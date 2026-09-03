/**
 * Shared Redis Connection Option Resolver
 * Supports standard REDIS_HOST/PORT as well as cloud REDIS_URL with TLS (rediss://)
 * for Upstash and GCP Memorystore in Mumbai (ap-south-1).
 */

const logger = require("../utils/logger");

function getRedisConnectionOptions(overrides = {}) {
  const redisUrl = String(process.env.REDIS_URL || "").trim();

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      const isTls = parsed.protocol === "rediss:";
      const opts = {
        host: parsed.hostname,
        port: parseInt(parsed.port || (isTls ? "6380" : "6379"), 10),
        username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        ...overrides,
      };
      if (parsed.pathname && parsed.pathname.length > 1) {
        const parsedDb = parseInt(parsed.pathname.slice(1), 10);
        if (!isNaN(parsedDb)) {
          opts.db = parsedDb;
        }
      }
      if (isTls) {
        opts.tls = {
          rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
        };
      }
      return opts;
    } catch (e) {
      logger.warn(`[RedisConnection] Failed to parse REDIS_URL (${e.message}), falling back to host/port`);
    }
  }

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || "0", 10),
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    ...overrides,
  };
}

module.exports = {
  getRedisConnectionOptions,
};
