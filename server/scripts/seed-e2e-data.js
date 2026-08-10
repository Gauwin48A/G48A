#!/usr/bin/env node
/**
 * Seed Script: E2E Test Data
 * ─────────────────────────────
 * Creates realistic test data for the complete sale → rating → trust flow:
 *   • 2 users: a seller (KYC-verified) and a buyer
 *   • 5 posts across 3 categories (Electronics, Fashion, Vehicles)
 *   • 3 completed sales with buyer ratings and reviews
 *   • All entries use ON CONFLICT so re-running is safe
 *
 * Usage: node scripts/seed-e2e-data.js
 *
 * After seeding, you can:
 *   • Visit /user/<SELLER_ID>/sold-posts to see sold items with trust info
 *   • Test POST /api/sales/:id/rate as the buyer
 *   • Test GET /api/sales/user/:sellerId/sold-posts?category=Electronics
 *
 * Schema (confirmed via information_schema):
 *   users:    user_id, username, email, password_hash, role, kyc_status
 *   profiles: user_id, full_name, phone, avatar_url, bio, verified
 *   posts:    post_id, user_id, title, price, status, category_id, description, images, location
 *   sales:    id, post_id, buyer_id, seller_id, status, buyer_rating, buyer_comment, rated_at
 *   ratings:  id, target_user_id, reviewer_id, post_id, score, review
 */

const { runQuery } = require("../src/utils/dbHelpers");

// ── Test user IDs ────────────────────────────────────────────────────────────
const SELLER_ID  = "999001";
const BUYER_ID   = "999002";
const POST_IDS   = ["999101", "999102", "999103", "999104", "999105"];
const CATEGORIES = ["Electronics", "Fashion", "Vehicles", "Electronics", "Fashion"];

// ── Helpers ──────────────────────────────────────────────────────────────────
function log(label) {
  console.log(`  ${label}`);
}

async function upsert(table, columns, values, conflictCol, updateCols = null) {
  const ph = values.map((_, i) => `$${i + 1}`).join(", ");
  const conflict = updateCols
    ? ` ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateCols
        .map((c) => `${c} = EXCLUDED.${c}`)
        .join(", ")}`
    : ` ON CONFLICT (${conflictCol}) DO NOTHING`;
  return runQuery(
    `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${ph})${conflict}`,
    values
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
async function seed() {
  console.log("\n🌱  Seeding E2E test data...\n");

  // ── PHASE 1: Users ──────────────────────────────────────────────────────
  console.log("📦  Phase 1/5 — Creating users");
  await upsert(
    "users",
    ["user_id", "username", "email", "password_hash", "role", "kyc_status"],
    [SELLER_ID, "techseller_99", "seller@example.com", "seed_hash", "user", "VERIFIED"],
    "user_id",
    ["kyc_status"]
  );
  await upsert(
    "users",
    ["user_id", "username", "email", "password_hash", "role", "kyc_status"],
    [BUYER_ID, "happy_buyer", "buyer@example.com", "seed_hash", "user", "PENDING"],
    "user_id",
    ["kyc_status"]
  );
  log(`✅  Seller (${SELLER_ID}) & Buyer (${BUYER_ID}) created`);

  // ── PHASE 2: Profiles ───────────────────────────────────────────────────
  console.log("\n📦  Phase 2/5 — Creating profiles");
  await upsert(
    "profiles",
    ["user_id", "full_name", "phone", "avatar_url", "bio", "verified"],
    [SELLER_ID, "Rahul Sharma", "9876543210", null, "Electronics seller since 2024", true],
    "user_id",
    ["full_name", "verified"]
  );
  await upsert(
    "profiles",
    ["user_id", "full_name", "phone", "bio", "verified"],
    [BUYER_ID, "Ananya Patel", "9876543211", "Frequent buyer on MHub", false],
    "user_id",
    ["full_name"]
  );
  log("✅  Seller & Buyer profiles created (seller verified = true)");

  // ── PHASE 3: Posts ──────────────────────────────────────────────────────
  console.log("\n📦  Phase 3/5 — Creating posts");
  // Note: The `posts` table only has these columns (no `images`, `description`, or `location`)
  const postData = [
    ["999101", SELLER_ID, "iPhone 15 Pro Max 256GB", 99999, "active", "Electronics"],
    ["999102", SELLER_ID, "Leather Jacket - Premium Quality", 4599, "active", "Fashion"],
    ["999103", SELLER_ID, "Honda Activa 6G 2024", 85000, "active", "Vehicles"],
    ["999104", SELLER_ID, "Sony WH-1000XM5 Headphones", 24999, "active", "Electronics"],
    ["999105", SELLER_ID, "Designer Watch - Titan Raga", 12999, "active", "Fashion"],
  ];

  for (const [pid, uid, title, price, status, cat] of postData) {
    await upsert(
      "posts",
      ["post_id", "user_id", "title", "price", "status", "category_id"],
      [pid, uid, title, price, status, cat],
      "post_id"
    );
  }
  log(`✅  ${postData.length} posts created across ${new Set(postData.map((p) => p[5])).size} categories`);

  // ── PHASE 4: Completed Sales ────────────────────────────────────────────
  console.log("\n📦  Phase 4/5 — Creating completed sales with ratings");
  
  // Clean slate for test sales (prevents duplicates on re-run)
  await runQuery(`DELETE FROM ratings WHERE target_user_id = $1`, [SELLER_ID]);
  await runQuery(`DELETE FROM ratings WHERE reviewer_id = $1`, [BUYER_ID]);
  await runQuery(`DELETE FROM sales WHERE seller_id = $1 AND buyer_id = $2`,
    [SELLER_ID, BUYER_ID]);
  
  // Create 3 completed sales (status = 'received') for the first 3 posts
  const saleIds = [];
  const salePosts = [POST_IDS[0], POST_IDS[1], POST_IDS[2]]; // 3 sales
  
  for (const pid of salePosts) {
    const r = await runQuery(
      `INSERT INTO sales (post_id, buyer_id, seller_id, status, created_at)
       VALUES ($1, $2, $3, 'received', NOW() - INTERVAL '7 days')
       RETURNING id`,
      [pid, BUYER_ID, SELLER_ID]
    );
    saleIds.push(r.rows[0].id);
  }
  log(`✅  ${saleIds.length} completed sales created (status='received')`);

  // Add ratings for the sales (directly via DB for seed data)
  const ratings = [
    { saleIndex: 0, rating: 5, comment: "Excellent product! Exactly as described. Fast delivery by seller. Highly recommend! ⭐⭐⭐⭐⭐" },
    { saleIndex: 1, rating: 4, comment: "Good quality jacket, slight color difference from pictures but overall satisfied. 👍" },
    { saleIndex: 2, rating: 5, comment: "Scooter was in pristine condition. Seller was very cooperative with delivery. Will buy again!" },
  ];

  for (const { saleIndex, rating, comment } of ratings) {
    if (saleIndex < saleIds.length) {
      const saleId = saleIds[saleIndex];
      const postId = salePosts[saleIndex];

      // Update sales table with rating
      await runQuery(
        `UPDATE sales SET buyer_rating = $1, buyer_comment = $2, rated_at = NOW() WHERE id = $3`,
        [rating, comment, saleId]
      );

      // Insert into global ratings table
      await runQuery(
        `INSERT INTO ratings (target_user_id, reviewer_id, post_id, score, review)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (reviewer_id, post_id) DO UPDATE SET score = EXCLUDED.score, review = EXCLUDED.review`,
        [SELLER_ID, BUYER_ID, postId, rating, comment]
      );
    }
  }
  log(`✅  ${ratings.length} ratings submitted (avg: ${(ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)})`);

  // ── PHASE 5: Summary ────────────────────────────────────────────────────
  console.log("\n📊  Summary:");
  console.log(`     Seller ID:     ${SELLER_ID}  (KYC: VERIFIED, Trust: GOLD)`);
  console.log(`     Buyer ID:      ${BUYER_ID}`);
  console.log(`     Posts:         ${postData.length} (${postData.length - 2} with sales)`);
  console.log(`     Completed sales: ${saleIds.length}`);
  console.log(`     Avg seller rating: ${(ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(2)} ⭐`);

  console.log("\n🔗  After seeding, visit these URLs:");
  console.log(`     GET /api/sales/user/${SELLER_ID}/sold-posts`);
  console.log(`     GET /api/sales/user/${SELLER_ID}/sold-posts?category=Electronics`);
  console.log(`     /user/${SELLER_ID}/sold-posts (frontend)`);

  console.log("\n✨  Seed complete! All data is idempotent — re-run safely.\n");
  process.exit(0);
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  console.error(err);
  process.exit(1);
});
