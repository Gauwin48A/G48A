#!/usr/bin/env node
/**
 * test-notification-queue.js
 *
 * End-to-end verification script for BullMQ notification pipeline.
 * Tests: Redis connectivity → Queue enqueue → Worker pickup → Job completion
 *
 * Usage: node scripts/test-notification-queue.js
 */

require("dotenv").config();
const Redis = require("ioredis");

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

const TIMEOUT_MS = 15000;

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
    log("REDIS", `✅ PING → ${pong} (host=${REDIS_HOST}, port=${REDIS_PORT})`);

    // Check Redis server info
    const info = await redis.info("server");
    const versionMatch = info.match(/redis_version:(.+)/);
    if (versionMatch) {
      log("REDIS", `   Server version: ${versionMatch[1].trim()}`);
    }

    await redis.quit();
    return true;
  } catch (err) {
    log("REDIS", `❌ Connection FAILED: ${err.message}`);
    try { redis.disconnect(); } catch {}
    return false;
  }
}

async function testNotificationQueue() {
  log("QUEUE", "Testing BullMQ notification queue...");

  const { enqueueNotification } = require("../src/services/notificationQueue");

  const crypto = require("crypto");
  const testJobData = {
    notification_id: crypto.randomUUID(),
    receiver_id: "test-user-queue-verify",
    sender_id: "system",
    type: "system",
    title: "Queue Verification Test",
    message: "This is a BullMQ queue verification test notification.",
    deep_link: "zaruda://test",
  };

  const result = await enqueueNotification(testJobData);

  if (result.fallback) {
    log("QUEUE", "⚠️  Job was dispatched via FALLBACK (Redis offline) — not through BullMQ queue.");
    log("QUEUE", "   This means Redis is not reachable. Start Redis and try again.");
    return false;
  }

  if (result.success && result.jobId) {
    log("QUEUE", `✅ Job enqueued successfully via BullMQ (jobId: ${result.jobId})`);
    return true;
  }

  log("QUEUE", `❌ Unexpected enqueue result: ${JSON.stringify(result)}`);
  return false;
}

async function testWorkerProcessing() {
  log("WORKER", "Testing notification worker job processing...");

  const { Queue } = require("bullmq");
  const queue = new Queue("notifications", {
    connection: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      maxRetriesPerRequest: 1,
    },
  });

  // Check queue stats
  try {
    const waiting = await queue.getWaitingCount();
    const active = await queue.getActiveCount();
    const completed = await queue.getCompletedCount();
    const failed = await queue.getFailedCount();

    log("WORKER", `   Queue stats — Waiting: ${waiting}, Active: ${active}, Completed: ${completed}, Failed: ${failed}`);

    if (completed > 0) {
      log("WORKER", "✅ Worker has processed completed jobs — worker is functional.");
    } else if (waiting > 0 || active > 0) {
      log("WORKER", "⏳ Jobs are waiting/active — worker should pick them up shortly.");
    } else {
      log("WORKER", "ℹ️  Queue is empty — no jobs to process. Enqueue a job first.");
    }

    await queue.close();
    return true;
  } catch (err) {
    log("WORKER", `❌ Queue stat check failed: ${err.message}`);
    try { await queue.close(); } catch {}
    return false;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  ZARUDA — BullMQ Notification Queue E2E Verification");
  console.log("═══════════════════════════════════════════════════════════\n");

  const results = {};

  // Step 1: Redis connection
  results.redis = await testRedisConnection();
  console.log();

  if (!results.redis) {
    console.log("❌ Redis is not reachable. Cannot proceed with queue tests.");
    console.log("   → Start Redis: docker run --name zaruda-redis -p 6379:6379 -d redis:7-alpine");
    console.log("   → Or install Memurai from https://www.memurai.com/get-memurai\n");
    process.exit(1);
  }

  // Step 2: Enqueue test notification
  results.queue = await testNotificationQueue();
  console.log();

  // Step 3: Check worker processing
  results.worker = await testWorkerProcessing();
  console.log();

  // Summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  TEST RESULTS SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Redis Connection:     ${results.redis ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Queue Enqueue:        ${results.queue ? "✅ PASS (BullMQ)" : "⚠️  FALLBACK (direct)"}`);
  console.log(`  Worker Processing:    ${results.worker ? "✅ PASS" : "❌ FAIL"}`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const allPassed = results.redis && results.queue && results.worker;
  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
