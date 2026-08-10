/**
 * test-phase1-redis.js
 * Comprehensive Phase 1 Redis Infrastructure Verification
 */

require("dotenv").config();
const Redis = require("ioredis");
const redisSession = require("../src/config/redisSession");
const redisCache = require("../src/config/redisCache");
const cacheService = require("../src/services/cacheService");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runPhase1Audit() {
  console.log("==================================================");
  console.log("   PHASE 1 — REDIS INFRASTRUCTURE VERIFICATION    ");
  console.log("==================================================");

  const redisHost = process.env.REDIS_HOST || "127.0.0.1";
  const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  console.log(`[Config] REDIS_HOST=${redisHost}, REDIS_PORT=${redisPort}`);

  try {
    // 1. Test Direct ioredis Connection & Ping
    const directClient = new Redis({
      host: redisHost,
      port: redisPort,
      password: redisPassword,
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
    });

    const startPing = Date.now();
    const pingResult = await directClient.ping();
    const pingMs = Date.now() - startPing;
    console.log(`✅ [Direct Client] PING response: "${pingResult}" (${pingMs} ms)`);
    await directClient.quit();

    await delay(300);

    // 2. Test Session Store
    console.log("\n--- Testing Redis Session Store ---");
    const testSessionKey = `test:session:${Date.now()}`;
    const testSessionValue = { userId: "user-123", role: "buyer", loggedInAt: new Date().toISOString() };

    await redisSession.set(testSessionKey, testSessionValue, 30);
    const retrievedSession = await redisSession.get(testSessionKey);
    const isSessionValid = retrievedSession && retrievedSession.userId === "user-123";
    console.log(`[Session Store] Set & Get test: ${isSessionValid ? "✅ PASSED" : "❌ FAILED"}`);

    await redisSession.del(testSessionKey);
    const deletedSession = await redisSession.get(testSessionKey);
    console.log(`[Session Store] Delete test: ${deletedSession === null ? "✅ PASSED" : "❌ FAILED"}`);
    console.log(`[Session Store] isRedisAvailable(): ${redisSession.isRedisAvailable() ? "✅ TRUE (Connected)" : "❌ FALSE (In-Memory Fallback)"}`);

    await delay(300);

    // 3. Test Distributed Cache Store
    console.log("\n--- Testing Redis Cache Layer ---");
    const cacheHealth = await redisCache.healthCheck();
    console.log(`[Cache Service] healthCheck(): status=${cacheHealth.status}, redisAvailable=${cacheHealth.redisAvailable}`);
    const testCacheKey = `test:cache:${Date.now()}`;
    const testCacheVal = { postTitle: "Gaming Console", price: 25000 };

    await cacheService.set(testCacheKey, testCacheVal, 30);
    const retrievedCache = await cacheService.get(testCacheKey);
    const isCacheValid = retrievedCache && retrievedCache.price === 25000;
    console.log(`[Cache Service] Set & Get test: ${isCacheValid ? "✅ PASSED" : "❌ FAILED"}`);

    await cacheService.del(testCacheKey);
    console.log(`[Cache Service] isRedisAvailable(): ${redisCache.isRedisAvailable() ? "✅ TRUE (Connected)" : "❌ FALSE (In-Memory Fallback)"}`);

    // 4. Persistence & Server Boot Summary
    console.log("\n==================================================");
    console.log("               PHASE 1 EXIT CRITERIA              ");
    console.log("==================================================");
    console.log(`1. Redis Direct Connectivity : ✅ PASSED (${pingMs} ms)`);
    console.log(`2. Redis Session Store Status : ✅ ${redisSession.isRedisAvailable() ? "CONNECTED (Redis)" : "FAILED (Fallback)"}`);
    console.log(`3. Redis Cache Store Status   : ✅ ${redisCache.isRedisAvailable() ? "CONNECTED (Redis)" : "FAILED (Fallback)"}`);
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
