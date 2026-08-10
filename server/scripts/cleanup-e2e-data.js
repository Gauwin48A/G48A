#!/usr/bin/env node
/**
 * Cleanup: Delete E2E / Test Data
 * ────────────────────────────────
 * Removes all seeded test & e2e accounts (and every row referencing them)
 * from the database: users, profiles, posts, sales, ratings, sessions,
 * audit logs, notifications, disputes, flagged devices, coupons.
 *
 * Identities matched: usernames starting with e2e_/test/trial_/verify_,
 * emails @test.local / @e2e.com, and the reserved seed user ids
 * (999xxx / 10000x used by seed-e2e-data.js & _debug_e2e.js).
 *
 * Safe to re-run. Uses a single transaction — either all deletions commit
 * or none do.
 *
 * Usage: node scripts/cleanup-e2e-data.js
 */
require("dotenv").config();
const { transaction } = require("../src/config/db");

const TEST_USER_IDS_SQL = `
  SELECT user_id::text AS id FROM users
  WHERE username ILIKE 'e2e%'
     OR username ILIKE 'test%'
     OR username ILIKE 'trial\\_%'
     OR username ILIKE 'verify\\_%'
     OR email ILIKE '%@test.local'
     OR email ILIKE '%@e2e.com'
     OR user_id::text IN ('999','999001','999002','999003','999004',
                          '100001','100002','100003','100004')
`;

const TABLE_COLUMN_PAIRS = [
  ["ratings", "target_user_id"],
  ["ratings", "reviewer_id"],
  ["sales", "seller_id"],
  ["sales", "buyer_id"],
  ["posts", "user_id"],
  ["notifications", "user_id"],
  ["notifications", "sender_id"],
  ["dispute_messages", "sender_id"],
  ["flagged_devices", "attempted_user_id"],
  ["flagged_devices", "bound_user_id"],
  ["user_sessions", "user_id"],
  ["audit_logs", "user_id"],
  ["coupon_redemptions", "user_id"],
  ["profiles", "user_id"],
];

async function tableHasColumn(client, table, column) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function main() {
  console.log("\n🧹  Cleaning E2E / test data...\n");

  const deleted = {};
  await transaction(async (client) => {
    const idResult = await client.query(TEST_USER_IDS_SQL);
    const ids = idResult.rows.map((r) => r.id);
    if (ids.length === 0) {
      console.log("  No test users found — nothing to delete.");
      return;
    }
    console.log(`  Found ${ids.length} test user(s): ${ids.join(", ")}`);

    for (const [table, column] of TABLE_COLUMN_PAIRS) {
      if (!(await tableHasColumn(client, table, column))) continue;
      const r = await client.query(
        `DELETE FROM ${table} WHERE ${column}::text = ANY($1::text[])`,
        [ids]
      );
      if (r.rowCount > 0) {
        deleted[`${table}.${column}`] = r.rowCount;
        console.log(`  ✅ ${table}.${column}: ${r.rowCount} row(s) deleted`);
      }
    }

    const userDelete = await client.query(
      `DELETE FROM users WHERE user_id::text = ANY($1::text[])`,
      [ids]
    );
    if (userDelete.rowCount > 0) {
      deleted["users.user_id"] = userDelete.rowCount;
      console.log(`  ✅ users: ${userDelete.rowCount} row(s) deleted`);
    }
  });

  console.log("\n📊  Summary:");
  const total = Object.values(deleted).reduce((a, b) => a + b, 0);
  Object.entries(deleted).forEach(([k, v]) => console.log(`     ${k}: ${v}`));
  console.log(`     TOTAL rows deleted: ${total}`);
  console.log("\n✨  Cleanup complete.\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌  Cleanup failed:", err.message);
  console.error(err);
  process.exit(1);
});
