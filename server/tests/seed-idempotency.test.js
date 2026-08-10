#!/usr/bin/env node
/**
 * Idempotency Test: Seed Script
 * ──────────────────────────────
 * Runs `node scripts/seed-e2e-data.js` multiple times and verifies:
 *   1. The script exits with code 0 each time (no crashes)
 *   2. Console output contains expected success markers
 *   3. API data remains consistent across runs (same counts, same values)
 *   4. Database state doesn't degrade (no duplicate sales, no constraint violations)
 *
 * This ensures the seed script's ON CONFLICT / DELETE-before-insert logic
 * works correctly on repeated execution.
 *
 * Usage: node tests/seed-idempotency.test.js
 */

const { execSync } = require("child_process");
const http = require("http");
const path = require("path");

const BASE = "http://localhost:5001";
const SELLER_ID = "999001";
const SEED_SCRIPT = path.join(__dirname, "..", "scripts", "seed-e2e-data.js");

// ── Test state tracking ─────────────────────────────────────────────────────
let passed = 0, failed = 0;
let dataSnapshots = []; // snapshots after each run

function assert(ok, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  if (ok) { console.log(`[${ts}]  ✅ ${msg}`); passed++; }
  else    { console.log(`[${ts}]  ❌ ${msg}`); failed++; }
}

function apiGet(path) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    http.get(
      { hostname: u.hostname, port: u.port, path: u.pathname + u.search },
      (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
          catch { resolve({ status: res.statusCode, body: { raw: d } }); }
        });
      }
    ).on("error", reject);
  });
}

function runSeed() {
  try {
    const stdout = execSync(`node "${SEED_SCRIPT}"`, {
      cwd: path.join(__dirname, ".."),
      timeout: 30000,
      encoding: "utf-8",
    });
    return { exitCode: 0, stdout };
  } catch (e) {
    return { exitCode: e.status ?? 1, stdout: e.stdout || "", stderr: e.stderr || "" };
  }
}

async function verifyApiData(runIndex, sellerId) {
  const r = await apiGet(`/api/sales/user/${sellerId}/sold-posts`);
  assert(r.status === 200, `Run ${runIndex}: API status=200`);

  const d = r.body;
  assert(d.success === true, `Run ${runIndex}: success=true`);
  assert(d.seller_name === "Rahul Sharma", `Run ${runIndex}: seller_name="${d.seller_name}"`);
  assert(d.is_kyc_verified === true, `Run ${runIndex}: KYC verified`);
  assert(d.total_sold >= 3, `Run ${runIndex}: total_sold=${d.total_sold} (≥3)`);
  assert(d.trust_score >= 90, `Run ${runIndex}: trust_score=${d.trust_score} (≥90)`);
  assert(Array.isArray(d.sold_posts) && d.sold_posts.length === 3,
    `Run ${runIndex}: sold_posts.length=${d.sold_posts?.length} (expected 3)`);

  // Verify each sold post has required fields (seller_name is top-level, not per-post)
  const validFields = d.sold_posts.every((p) => {
    return p.post_title
      && typeof p.buyer_rating === 'number' && p.buyer_rating >= 1 && p.buyer_rating <= 5
      && p.buyer_comment
      && p.category;
  });
  assert(validFields, `Run ${runIndex}: all sold posts have valid fields`);

  // Verify categories match expected set
  const cats = new Set(d.sold_posts.map((p) => p.category));
  assert(cats.has("Electronics") && cats.has("Fashion") && cats.has("Vehicles"),
    `Run ${runIndex}: categories found: ${[...cats].join(", ")}`);

  // Return snapshot for cross-run comparison
  return {
    total_sold: d.total_sold,
    trust_score: d.trust_score,
    average_rating: Number(d.average_rating).toFixed(2),
    sold_count: d.sold_posts.length,
    categories: [...cats].sort(),
    post_ids: d.sold_posts.map((p) => p.post_id).sort(),
  };
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("=".repeat(55));
  console.log("  SEED IDEMPOTENCY TEST");
  console.log("  Runs the seed script 3× & verifies consistent output");
  console.log("=".repeat(55));

  // ── Phase 0: Health check ──────────────────────────────────────────────
  console.log("\n── PHASE 0 ── Server health check");
  const health = await apiGet("/api/health");
  assert(health.body?.db === "connected", `Server healthy (db=${health.body?.db})`);
  if (health.body?.db !== "connected") {
    console.error("  ⚠️  Server not available — aborting.");
    process.exit(1);
  }

  // ── Phase 1: Seed cleanup ─────────────────────────────────────────────
  console.log("\n── PHASE 1 ── Initial cleanup (remove leftover seed data)");
  // Force a clean slate so the first run is a fresh seed
  const { runQuery } = require("../src/utils/dbHelpers");
  await runQuery(`DELETE FROM ratings WHERE target_user_id = $1`, [SELLER_ID]);
  await runQuery(`DELETE FROM sales WHERE seller_id = $1`, [SELLER_ID]);
  await runQuery(`DELETE FROM posts WHERE user_id = $1`, [SELLER_ID]);
  await runQuery(`DELETE FROM profiles WHERE user_id = $1`, [SELLER_ID]);
  await runQuery(`DELETE FROM users WHERE user_id IN ('999001','999002')`);
  assert(true, "Initial data cleaned");

  // ── Phase 2: Run seed 3 times ─────────────────────────────────────────
  const RUN_COUNT = 3;

  for (let i = 1; i <= RUN_COUNT; i++) {
    console.log(`\n── PHASE 2.${i} ── Seed run #${i}`);
    const result = runSeed();
    assert(result.exitCode === 0, `Run ${i}: exit code = ${result.exitCode}`);
    assert(result.stdout.includes("Seed complete"), `Run ${i}: output shows "Seed complete"`);
    assert(result.stdout.includes("idempotent"), `Run ${i}: output shows "idempotent"`);

    // Pause briefly to let DB writes settle, then verify API data
    await new Promise((r) => setTimeout(r, 500));

    const snapshot = await verifyApiData(i, SELLER_ID);
    dataSnapshots.push(snapshot);
  }

  // ── Phase 3: Cross-run consistency check ──────────────────────────────
  console.log("\n── PHASE 3 ── Cross-run data consistency");

  // All runs should have identical data
  const first = dataSnapshots[0];
  let allConsistent = true;
  for (let i = 1; i < dataSnapshots.length; i++) {
    const snap = dataSnapshots[i];
    if (JSON.stringify(first) !== JSON.stringify(snap)) {
      allConsistent = false;
      console.log(`  ⚠️  Snapshot ${i + 1} differs from snapshot 1:`);
      console.log(`     Snapshot 1: ${JSON.stringify(first)}`);
      console.log(`     Snapshot ${i + 1}: ${JSON.stringify(snap)}`);
    }
  }
  assert(allConsistent, "All 3 runs produce identical API response data");

  // ── Phase 4: Edge: No duplicate sales ─────────────────────────────────
  console.log("\n── PHASE 4 ── No duplicate sales check");

  const salesCheck = await runQuery(
    `SELECT post_id, COUNT(*) as cnt FROM sales 
     WHERE seller_id = $1 AND buyer_id = $2
     GROUP BY post_id HAVING COUNT(*) > 1`,
    [SELLER_ID, "999002"]
  );
  assert(salesCheck.rows.length === 0,
    `No duplicate sales (found ${salesCheck.rows.length} duplicates)`);

  // ── Results ───────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(55)}`);
  console.log(`  RESULTS:  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
  console.log(`${"=".repeat(55)}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
