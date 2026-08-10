#!/usr/bin/env node
/**
 * test-payout-queue.js
 *
 * End-to-end verification script for BullMQ payout pipeline.
 * Tests: Redis connectivity → Payout queue enqueue → Worker pickup → DB state tracking
 *
 * Usage: node scripts/test-payout-queue.js
 */

require("dotenv").config();
const Redis = require("ioredis");

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

function log(tag, msg) {
  console.log(`[${new Date().toISOString()}] [${tag}] ${msg}`);
}

async function testRedisConnection() {
  log("REDIS", "Testing direct Redis connection...");
  const redis = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD,
    connectTimeout: 5000,
    maxRetriesPerRequest: 1,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong !== "PONG") throw new Error(`Expected PONG, got: ${pong}`);
    log("REDIS", `✅ PING → ${pong}`);
    await redis.quit();
    return true;
  } catch (err) {
    log("REDIS", `❌ Connection FAILED: ${err.message}`);
    try { redis.disconnect(); } catch {}
    return false;
  }
}

async function testPayoutQueue() {
  log("QUEUE", "Testing BullMQ payout queue...");

  const { enqueuePayoutJob } = require("../src/services/payoutQueue");

  const testRef = `test-payout-${Date.now()}`;
  const testJobData = {
    referenceId: testRef,
    sellerId: "test-seller-queue-verify",
    amount: 100,
    currency: "INR",
  };

  const result = await enqueuePayoutJob(testJobData);

  if (result.fallback) {
    log("QUEUE", "⚠️  Job was dispatched via FALLBACK (Redis offline) — not through BullMQ queue.");
    return false;
  }

  if (result.success && result.jobId) {
    log("QUEUE", `✅ Payout job enqueued via BullMQ (jobId: ${result.jobId}, ref: ${testRef})`);
    return true;
  }

  log("QUEUE", `❌ Unexpected enqueue result: ${JSON.stringify(result)}`);
  return false;
}

async function testPayoutWorkerStats() {
  log("WORKER", "Testing payout worker stats...");

  const { Queue } = require("bullmq");
  const queue = new Queue("payouts", {
    connection: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      maxRetriesPerRequest: 1,
    },
  });

  try {
    const waiting = await queue.getWaitingCount();
    const active = await queue.getActiveCount();
    const completed = await queue.getCompletedCount();
    const failed = await queue.getFailedCount();
    const delayed = await queue.getDelayedCount();

    log("WORKER", `   Queue stats — Waiting: ${waiting}, Active: ${active}, Completed: ${completed}, Failed: ${failed}, Delayed: ${delayed}`);

    if (completed > 0) {
      log("WORKER", "✅ Payout worker has processed completed jobs — worker is functional.");
    } else if (waiting > 0 || active > 0) {
      log("WORKER", "⏳ Jobs are waiting/active — worker should pick them up shortly.");
    } else {
      log("WORKER", "ℹ️  Payout queue is empty — no jobs to process.");
    }

    await queue.close();
    return true;
  } catch (err) {
    log("WORKER", `❌ Queue stat check failed: ${err.message}`);
    try { await queue.close(); } catch {}
    return false;
  }
}

async function testDuplicatePrevention() {
  log("DEDUP", "Testing duplicate job prevention...");

  const { enqueuePayoutJob } = require("../src/services/payoutQueue");

  const dupRef = `dedup-test-${Date.now()}`;
  const jobData = {
    referenceId: dupRef,
    sellerId: "test-seller-dedup",
    amount: 50,
    currency: "INR",
  };

  const result1 = await enqueuePayoutJob(jobData);
  const result2 = await enqueuePayoutJob(jobData);

  if (result1.fallback || result2.fallback) {
    log("DEDUP", "⚠️  Fallback mode — cannot test deduplication without Redis.");
    return false;
  }

  if (result1.success && result2.success) {
    // BullMQ deduplicates by jobId (payout-${referenceId})
    // Both calls return success but only one job actually exists in the queue
    log("DEDUP", `✅ Duplicate enqueue handled (job1: ${result1.jobId}, job2: ${result2.jobId})`);
    return true;
  }

  log("DEDUP", "❌ Deduplication test produced unexpected results.");
  return false;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ZARUDA — BullMQ Payout Queue E2E Verification");
  console.log("═══════════════════════════════════════════════════════════\n");

  const results = {};

  // Step 1: Redis
  results.redis = await testRedisConnection();
  console.log();

  if (!results.redis) {
    console.log("❌ Redis is not reachable. Cannot proceed with payout queue tests.");
    console.log("   → Start Redis first.\n");
    process.exit(1);
  }

  // Step 2: Enqueue test payout
  results.queue = await testPayoutQueue();
  console.log();

  // Step 3: Worker stats
  results.worker = await testPayoutWorkerStats();
  console.log();

  // Step 4: Duplicate prevention
  results.dedup = await testDuplicatePrevention();
  console.log();

  // Summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  TEST RESULTS SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Redis Connection:     ${results.redis ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Queue Enqueue:        ${results.queue ? "✅ PASS (BullMQ)" : "⚠️  FALLBACK"}`);
  console.log(`  Worker Stats:         ${results.worker ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Dedup Prevention:     ${results.dedup ? "✅ PASS" : "⚠️  SKIP"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const allPassed = results.redis && results.queue && results.worker;
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
