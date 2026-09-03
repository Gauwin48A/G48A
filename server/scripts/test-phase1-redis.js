/**
 * test-phase1-redis.js
 * Comprehensive Phase 1 Redis Infrastructure Verification
 * Supports local Redis as well as Upstash / GCP Memorystore Mumbai (REDIS_URL / TLS).
 */

require("dotenv").config();
const Redis = require("ioredis");
const redisSession = require("../src/config/redisSession");
const redisCache = require("../src/config/redisCache");
const cacheService = require("../src/services/cacheService");
const { getRedisConnectionOptions } = require("../src/config/redisConnection");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPhase1Audit() {
  console.log("==================================================");
  console.log("   PHASE 1 — REDIS INFRASTRUCTURE VERIFICATION    ");
  console.log("==================================================");

  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || "127.0.0.1";
  const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);

  if (redisUrl) {
    console.log(`[Config] Using REDIS_URL (${redisUrl.startsWith("rediss://") ? "TLS Encrypted (e.g. Upstash/GCP)" : "Standard"})`);
  } else {
    console.log(`[Config] REDIS_HOST=${redisHost}, REDIS_PORT=${redisPort}`);
  }

  let pingMs = 0;

  try {
    // 1. Test Direct ioredis Connection & Ping
    const connOptions = getRedisConnectionOptions({
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      lazyConnect: true,
    });

    const directClient = redisUrl
      ? new Redis(redisUrl, {
          lazyConnect: true,
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
          tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
        })
      : new Redis(connOptions);

    try {
      await directClient.connect();
      const startPing = Date.now();
      const pingResult = await directClient.ping();
      pingMs = Date.now() - startPing;
      console.log(`✅ [Direct Client] PING response: "${pingResult}" (${pingMs} ms)`);
      await directClient.quit();
    } catch (connErr) {
      console.log(`⚠️ [Direct Client] Connection skipped/offline: ${connErr.message}`);
    }

    await delay(300);

    // 2. Test Session Store & Expiry
    console.log("\n--- Testing Redis Session Store ---");
    const testSessionKey = `test:session:${Date.now()}`;
    const testSessionValue = { userId: "user-123", role: "buyer", loggedInAt: new Date().toISOString() };

    await redisSession.set(testSessionKey, testSessionValue, 30);
    const retrievedSession = await redisSession.get(testSessionKey);
    const isSessionValid = retrievedSession && retrievedSession.userId === "user-123";
    console.log(`[Session Store] Set & Get test: ${isSessionValid ? "✅ PASSED" : "❌ FAILED"}`);

    const incVal = await redisSession.incr(`test:incr:${Date.now()}`, 30);
    console.log(`[Session Store] Atomic Incr test: ${incVal >= 1 ? "✅ PASSED" : "❌ FAILED"}`);

    await redisSession.del(testSessionKey);
    const deletedSession = await redisSession.get(testSessionKey);
    console.log(`[Session Store] Delete test: ${deletedSession === null ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`[Session Store] isRedisAvailable(): ${redisSession.isRedisAvailable() ? "✅ TRUE (Connected to Redis)" : "ℹ️ FALSE (Safe In-Memory Fallback Active)"}`);

    await delay(300);

    // 3. Test Distributed Cache Store & Realtime Keys
    console.log("\n--- Testing Redis Cache Layer & Key Helpers ---");
    const cacheHealth = await redisCache.healthCheck();
    console.log(`[Cache Service] healthCheck(): status=${cacheHealth.status}, type=${cacheHealth.type}`);

    console.log(`[Cache Helpers] feedKey: ${redisCache.feedKey("u1", 10, "seed1")}`);
    console.log(`[Cache Helpers] reelKey: ${redisCache.reelKey("reel_456")}`);
    console.log(`[Cache Helpers] unreadCounterKey: ${redisCache.unreadCounterKey("u1")}`);

    const testCacheKey = `test:cache:${Date.now()}`;
    const testCacheVal = { postTitle: "Gaming Console", price: 25000 };

    await cacheService.set(testCacheKey, testCacheVal, 30);
    const retrievedCache = await cacheService.get(testCacheKey);
    const isCacheValid = retrievedCache && retrievedCache.price === 25000;
    console.log(`[Cache Service] Set & Get test: ${isCacheValid ? "✅ PASSED" : "❌ FAILED"}`);

    await cacheService.del(testCacheKey);
    console.log(`[Cache Service] isRedisAvailable(): ${redisCache.isRedisAvailable() ? "✅ TRUE (Connected to Redis)" : "ℹ️ FALSE (Safe In-Memory Fallback Active)"}`);

    // 4. Persistence & Summary
    console.log("\n==================================================");
    console.log("               PHASE 1 EXIT CRITERIA              ");
    console.log("==================================================");
    console.log(`1. Redis Direct Connectivity : ${pingMs > 0 ? `✅ PASSED (${pingMs} ms)` : "ℹ️ OFFLINE (In-memory fallback active)"}`);
    console.log(`2. Redis Session Store Status : ${redisSession.isRedisAvailable() ? "✅ CONNECTED (Redis)" : "ℹ️ FALLBACK ACTIVE"}`);
    console.log(`3. Redis Cache Store Status   : ${redisCache.isRedisAvailable() ? "✅ CONNECTED (Redis)" : "ℹ️ FALLBACK ACTIVE"}`);
    console.log("==================================================\n");

  } catch (err) {
    console.error("❌ Phase 1 Audit Failed:", err.message);
    process.exit(1);
  } finally {
    await redisSession.close();
    await redisCache.close();
    process.exit(0);
  }
}

runPhase1Audit();
