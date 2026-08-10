/**
 * E2E Test: Complete Sale → Rating → User Sold Posts with Trust Info
 *
 * Tests:
 * 1. Seeds test data (users, profiles, posts, completed sales) using actual DB schema
 * 2. Rates the seller as buyer via POST /api/sales/:id/rate (with CSRF + API Integrity headers)
 * 3. Verifies UserSoldPosts endpoint returns correct trust info, ratings, reviews
 * 4. Tests category filtering, unauthorized access, invalid inputs
 * 5. Edge case: seller with 0 sales
 * 6. Cleans up all test data
 *
 * Database schema (confirmed via information_schema):
 * - users: user_id, username, email, password_hash, role, kyc_status, account_status
 * - profiles: user_id, full_name, phone, avatar_url, bio, verified
 * - posts: post_id, user_id, title, price, status, category_id
 * - sales: id, post_id, buyer_id, seller_id, status, buyer_rating, buyer_comment, rated_at
 * - ratings: id, target_user_id, reviewer_id, post_id, score, review
 */

const { runQuery } = require("../../src/utils/dbHelpers");
const jwt = require("jsonwebtoken");
const http = require("http");

// ── Config ───────────────────────────────────────────────────────────────────
const BASE = "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "mhub-dev-jwt-secret-change-in-production";
// JWT_ISSUER and JWT_AUDIENCE must match jwtConfig.js defaults (env overrides)
const JWT_ISSUER = process.env.JWT_ISSUER || "mhub-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "mhub-client";

// ── Test user IDs (integer type, matching DB column type) ────────────────────
const SELLER = "999001";
const BUYER   = "999002";
const FAKE    = "999003";
const NOSALE  = "999004";
const POSTS   = ["999101", "999102"];
const CATEGORIES = ["Electronics", "Fashion"];

// ── Cookie jar + CSRF token tracking ────────────────────────────────────────
let cookieJar = {};
let csrfToken = null;

function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return;
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const header of arr) {
    const parts = header.split(";")[0].split("=");
    if (parts.length === 2) {
      cookieJar[parts[0].trim()] = parts[1].trim();
      if (parts[0].trim() === "XSRF-TOKEN") {
        csrfToken = parts[1].trim();
      }
    }
  }
}

function getCookieString() {
  return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join("; ");
}

// ── Helper: generate API integrity headers (required by apiIntegrity middleware for writes) ──
function integrityHeaders() {
  const now = Date.now();
  const nonce = now + "-" + Math.random().toString(36).substring(2, 12);
  return {
    "x-mhub-timestamp": String(now),
    "x-mhub-nonce": nonce,
  };
}

let passed = 0, failed = 0;
function assert(ok, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  if (ok) { console.log(`[${ts}]  ✅ ${msg}`); passed++; }
  else    { console.log(`[${ts}]  ❌ ${msg}`); failed++; }
}

function token(uid, name) {
  return jwt.sign({ id: uid, userId: uid, role: "user", name },
    JWT_SECRET, { expiresIn: "15m", issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
}

function api(method, path, data = null, tok = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const body = data ? JSON.stringify(data) : null;
    const opts = {
      hostname: u.hostname, port: u.port,
      path: u.pathname + u.search, method,
      headers: { "Content-Type": "application/json" },
    };

    // API Integrity: timestamp + nonce required on all write operations (POST/PUT/DELETE)
    const m = method.toUpperCase();
    if (m === "POST" || m === "PUT" || m === "DELETE" || m === "PATCH") {
      Object.assign(opts.headers, integrityHeaders());
      // CSRF: send XSRF-TOKEN header + cookie
      if (csrfToken) {
        opts.headers["x-xsrf-token"] = csrfToken;
      }
      const cookieStr = getCookieString();
      if (cookieStr) {
        opts.headers["Cookie"] = cookieStr;
      }
    }

    if (tok) opts.headers["Authorization"] = `Bearer ${tok}`;
    if (body) opts.headers["Content-Length"] = Buffer.byteLength(body);

    const req = http.request(opts, res => {
      // Capture cookies from response (CSRF rotation etc.)
      parseCookies(res.headers["set-cookie"]);

      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: { raw: d } }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function run() {
  const log = (phase, msg) => console.log(`\n── ${phase} ── ${msg}`);

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 0: Health check + fetch CSRF token
  // ══════════════════════════════════════════════════════════════════════════
  log("PHASE 0", "Server health check & CSRF token fetch");
  try {
    const h = await api("GET", "/api/health");
    assert(h.body?.db === "connected", `Server healthy (db=${h.body?.db})`);
  } catch (e) {
    assert(false, `Server unreachable: ${e.message}`);
    process.exit(1);
  }

  // Fetch CSRF token — this sets the XSRF-TOKEN cookie
  const csrfRes = await api("GET", "/api/auth/csrf-token");
  // On this first call, the csrf endpoint sets the cookie via its own handler.
  // Our parseCookies already extracted it from set-cookie header.
  if (!csrfToken) {
    // Fallback: the csrfTokenEndpoint also returns json with the token
    if (csrfRes.body?.csrfToken) csrfToken = csrfRes.body.csrfToken;
  }
  assert(!!csrfToken, `CSRF token obtained (${csrfToken ? csrfToken.substring(0, 16) + "..." : "MISSING"})`);

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1: Seed test data
  // ══════════════════════════════════════════════════════════════════════════
  log("PHASE 1", "Seeding test users, profiles & posts");

  // 1a. Users table — no `name` or `phone_number` columns
  for (const u of [
    [SELLER, "e2e_seller",  "seller@e2e.com",  "VERIFIED"],
    [BUYER,  "e2e_buyer",   "buyer@e2e.com",   "PENDING"],
    [FAKE,   "e2e_fake",    "fake@e2e.com",    "PENDING"],
    [NOSALE, "e2e_nosale",  "nosale@e2e.com",  "PENDING"],
  ]) {
    await runQuery(
      `INSERT INTO users (user_id, username, email, password_hash, role, kyc_status)
       VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (user_id) DO UPDATE SET kyc_status = $6`,
      [u[0], u[1], u[2], "e2e_hash", "user", u[3]]
    );
  }

  // 1b. Profiles — seller gets verified=true for trust bonus
  // Note: Update full_name as well to override any leftover seed data
  await runQuery(
    `INSERT INTO profiles (user_id, full_name, verified)
     VALUES ($1,$2,$3) ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, verified = EXCLUDED.verified`,
    [SELLER, "E2E Seller", true]
  );
  await runQuery(
    `INSERT INTO profiles (user_id, full_name)
     VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
    [BUYER, "E2E Buyer"]
  );
  await runQuery(
    `INSERT INTO profiles (user_id, full_name)
     VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING`,
    [NOSALE, "No Sales User"]
  );

  // 1c. Clean slate for test data
  await runQuery(`DELETE FROM ratings WHERE target_user_id = $1`, [SELLER]);
  await runQuery(`DELETE FROM sales WHERE seller_id IN ($1,$2,$3,$4)`,
    [SELLER, BUYER, FAKE, NOSALE]);
  await runQuery(`DELETE FROM posts WHERE user_id = $1`, [SELLER]);

  // 1d. Posts — posts table uses category_id (TEXT), no `category` column
  for (let i = 0; i < POSTS.length; i++) {
    await runQuery(
      `INSERT INTO posts (post_id, user_id, title, price, status, category_id)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [POSTS[i], SELLER, `Test Product ${i+1}`, (i+1)*10000, "active", CATEGORIES[i]]
    );
  }

  log("PHASE 1", "Seed complete");

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2: Create completed sales + submit ratings via API
  // ══════════════════════════════════════════════════════════════════════════
  log("PHASE 2", "Inserting completed sales & submitting ratings");

  const bt = token(BUYER, "E2E Buyer");
  const st = token(SELLER, "E2E Seller");

  // 2a. Create 2 completed sales (status = 'received')
  const saleIds = [];
  for (const pid of POSTS) {
    const r = await runQuery(
      `INSERT INTO sales (post_id, buyer_id, seller_id, status)
       VALUES ($1,$2,$3,'received') RETURNING id`,
      [pid, BUYER, SELLER]
    );
    saleIds.push(r.rows[0].id);
  }
  assert(saleIds.length === 2, `Created ${saleIds.length} completed sales`);

  // Refresh CSRF token before POST requests (cookie may have aged during seed)
  {
    const r = await api("GET", "/api/auth/csrf-token");
    if (r.body?.csrfToken) csrfToken = r.body.csrfToken;
    assert(!!csrfToken, "CSRF token refreshed before rating POSTs");
  }

  // 2b. Rate sale 1: 5 stars with comment
  {
    const r1 = await api("POST", `/api/sales/${saleIds[0]}/rate`,
      { rating: 5, comment: "Excellent! Fast delivery and product as described." }, bt);
    assert(r1.status === 200, `Rating 1 → ${r1.status}`);
    if (r1.status !== 200) assert(false, `Rating 1 error: ${JSON.stringify(r1.body)}`);
    assert(r1.body?.success === true, "Rating 1 success=true");
  }

  // 2c. Rate sale 2: 4 stars with comment
  {
    const r2 = await api("POST", `/api/sales/${saleIds[1]}/rate`,
      { rating: 4, comment: "Good product, minor delay." }, bt);
    assert(r2.status === 200, `Rating 2 → ${r2.status}`);
    if (r2.status !== 200) assert(false, `Rating 2 error: ${JSON.stringify(r2.body)}`);
    assert(r2.body?.success === true, "Rating 2 success=true");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 3: Verify UserSoldPosts endpoint
  // ══════════════════════════════════════════════════════════════════════════
  log("PHASE 3", "GET /api/sales/user/:id/sold-posts");

  // 3a. Full fetch (no category filter)
  const full = await api("GET", `/api/sales/user/${SELLER}/sold-posts`, null, st);
  assert(full.status === 200, `Sold-posts status=${full.status}`);
  assert(full.body?.success === true, "Sold-posts success=true");

  const d = full.body;

  // Seller info
  assert(d.seller_name === "E2E Seller", `Seller name: "${d.seller_name}"`);
  assert(d.is_kyc_verified === true, "KYC verified (kyc_status=VERIFIED in users)");

  // Trust score computation:
  // Base 40 + KYC 25 + 1-4 sales 10 + avg(5+4)/2=4.5 gives +20 + 0 disputes +10 = 105 → capped at 100
  assert(d.trust_score === 100, `Trust score = 100 (got ${d.trust_score})`);

  // Trust badge
  assert(d.trust_badge?.includes("GOLD"), `Badge = "${d.trust_badge}"`);

  // Average rating
  assert(Number(d.average_rating) === 4.5, `Avg rating = 4.5 (got ${d.average_rating})`);

  // Star string for 4.5 → rounded to 5 → "★★★★★"
  assert(d.star_string === "★★★★★", `Star string = "${d.star_string}"`);

  // Sold posts
  assert(d.sold_posts?.length === 2, `Sold posts count = ${d.sold_posts?.length}`);
  assert(d.total_sold >= 2, `total_sold >= 2 (got ${d.total_sold})`);

  // Verify each sold post has correct rating & comment
  for (const p of d.sold_posts) {
    assert(p.buyer_rating >= 4, `Post ${p.post_id} rating = ${p.buyer_rating}`);
    assert(p.buyer_comment?.length > 0, `Post ${p.post_id} has comment`);
    assert(p.buyer_name === "E2E Buyer" || p.buyer_name === "e2e_buyer",
      `Buyer name = "${p.buyer_name}"`);

    // rating_stars formatting
    assert(p.rating_stars === "★★★★★" || p.rating_stars === "★★★★☆",
      `Stars = "${p.rating_stars}" for rating ${p.buyer_rating}`);

    // Verify buyer_comment matches what was submitted
    const expected = p.buyer_rating === 5 ? "Excellent" : "Good product";
    assert(p.buyer_comment.includes(expected),
      `Buyer comment for post ${p.post_id} includes "${expected}"`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // PHASE 3b: Category filter tests (comprehensive)
  // ════════════════════════════════════════════════════════════════════════
  log("PHASE 3b", "Category filter tests");

  // Refresh CSRF token (GET endpoints don't need it, but keeps state consistent)
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }

  // 3b-i. Filter by Electronics → should return 1 post (Test Product 1)
  const electronicsFilter = await api("GET",
    `/api/sales/user/${SELLER}/sold-posts?category=Electronics`, null, st);
  assert(electronicsFilter.status === 200, `Electronics filter status=${electronicsFilter.status}`);
  assert(electronicsFilter.body?.success === true, "Electronics filter success");
  assert(electronicsFilter.body?.sold_posts?.length === 1,
    `Electronics: expected 1 sold post, got ${electronicsFilter.body?.sold_posts?.length}`);
  if (electronicsFilter.body?.sold_posts?.length > 0) {
    const post = electronicsFilter.body.sold_posts[0];
    assert(post.category === "Electronics", `Post category = "${post.category}"`);
    assert(post.post_title === "Test Product 1", `Post title = "${post.post_title}"`);
    assert(post.buyer_rating === 5, `Post rating = ${post.buyer_rating}`);
  }

  // 3b-ii. Filter by Fashion → should return 1 post (Test Product 2)
  const fashionFilter = await api("GET",
    `/api/sales/user/${SELLER}/sold-posts?category=Fashion`, null, st);
  assert(fashionFilter.status === 200, `Fashion filter status=${fashionFilter.status}`);
  assert(fashionFilter.body?.success === true, "Fashion filter success");
  assert(fashionFilter.body?.sold_posts?.length === 1,
    `Fashion: expected 1 sold post, got ${fashionFilter.body?.sold_posts?.length}`);
  if (fashionFilter.body?.sold_posts?.length > 0) {
    const post = fashionFilter.body.sold_posts[0];
    assert(post.category === "Fashion", `Post category = "${post.category}"`);
    assert(post.post_title === "Test Product 2", `Post title = "${post.post_title}"`);
    assert(post.buyer_rating === 4, `Post rating = ${post.buyer_rating}`);
  }

  // 3b-iii. All posts is returned when no filter applied (already tested in Phase 3a)
  // Already verified: d.sold_posts?.length === 2, both categories present

  // 3b-iv. Filter by non-existent category → should return empty array with message
  const nonexistentFilter = await api("GET",
    `/api/sales/user/${SELLER}/sold-posts?category=Nonexistent`, null, st);
  assert(nonexistentFilter.status === 200, `Nonexistent filter status=${nonexistentFilter.status}`);
  assert(nonexistentFilter.body?.success === true, "Nonexistent filter success");
  assert(nonexistentFilter.body?.sold_posts?.length === 0,
    `Nonexistent: expected 0 sold posts, got ${nonexistentFilter.body?.sold_posts?.length}`);
  // Trust info still present for the seller even with no matching posts
  assert(nonexistentFilter.body?.seller_name === "E2E Seller",
    `Seller name preserved: "${nonexistentFilter.body?.seller_name}"`);
  assert(nonexistentFilter.body?.trust_score === 100,
    `Trust score preserved: ${nonexistentFilter.body?.trust_score}`);
  assert(nonexistentFilter.body?.total_sold >= 2,
    `Total sales preserved (not filtered): ${nonexistentFilter.body?.total_sold}`);
  assert(nonexistentFilter.body?.message?.includes("No sold posts"),
    `Empty-result message: "${nonexistentFilter.body?.message}"`);

  // 3b-v. Case-insensitive filter: "electronics" (lowercase) should match "Electronics"
  const caseInsensitiveFilter = await api("GET",
    `/api/sales/user/${SELLER}/sold-posts?category=electronics`, null, st);
  assert(caseInsensitiveFilter.status === 200, `Case-insensitive filter status=${caseInsensitiveFilter.status}`);
  assert(caseInsensitiveFilter.body?.success === true, "Case-insensitive filter success");
  assert(caseInsensitiveFilter.body?.sold_posts?.length === 1,
    `Case-insensitive: expected 1 sold post, got ${caseInsensitiveFilter.body?.sold_posts?.length}`);
  const allMatch = caseInsensitiveFilter.body.sold_posts.every(
    p => (p.category || "").toLowerCase() === "electronics"
  );
  assert(allMatch, `Case-insensitive filter matched Electronics correctly`);

  // 3b-vi. "all" filter should return all posts (same as no filter)
  const allFilter = await api("GET",
    `/api/sales/user/${SELLER}/sold-posts?category=all`, null, st);
  assert(allFilter.status === 200, `"all" filter status=${allFilter.status}`);
  assert(allFilter.body?.success === true, '"all" filter success');
  assert(allFilter.body?.sold_posts?.length === 2,
    `"all": expected 2 sold posts, got ${allFilter.body?.sold_posts?.length}`);

  // 3c. Filter chaining round-trip — consecutive filter switches should all work correctly
  log("PHASE 3c", "Filter chaining & message field edge cases");

  // Refresh CSRF
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }

  // 3c-i. Chain: Electronics → Fashion → Nonexistent → All → Electronics (round-trip)
  let chain1 = await api("GET", `/api/sales/user/${SELLER}/sold-posts?category=Electronics`);
  assert(chain1.status === 200, `Chain 1 (Electronics) status=${chain1.status}`);
  assert(chain1.body?.sold_posts?.length === 1 && chain1.body.sold_posts[0].category === "Electronics",
    `Chain 1: 1 Electronics post`);

  let chain2 = await api("GET", `/api/sales/user/${SELLER}/sold-posts?category=Fashion`);
  assert(chain2.status === 200, `Chain 2 (Fashion) status=${chain2.status}`);
  assert(chain2.body?.sold_posts?.length === 1 && chain2.body.sold_posts[0].category === "Fashion",
    `Chain 2: 1 Fashion post`);

  let chain3 = await api("GET", `/api/sales/user/${SELLER}/sold-posts?category=Nonexistent`);
  assert(chain3.status === 200, `Chain 3 (Nonexistent) status=${chain3.status}`);
  assert(chain3.body?.sold_posts?.length === 0,
    `Chain 3: 0 posts for nonexistent category`);
  assert(chain3.body?.message?.includes("No sold posts"),
    `Chain 3: message present after nonexistent filter`);
  // Trust info still intact after empty filter
  assert(chain3.body?.seller_name === "E2E Seller", `Chain 3: seller name preserved`);
  assert(chain3.body?.trust_score === 100, `Chain 3: trust score preserved`);
  assert(chain3.body?.total_sold >= 2, `Chain 3: total_sold preserved (${chain3.body?.total_sold})`);

  let chain4 = await api("GET", `/api/sales/user/${SELLER}/sold-posts?category=all`);
  assert(chain4.status === 200, `Chain 4 (All) status=${chain4.status}`);
  assert(chain4.body?.sold_posts?.length === 2,
    `Chain 4: 2 posts after returning from nonexistent filter`);

  let chain5 = await api("GET", `/api/sales/user/${SELLER}/sold-posts?category=Electronics`);
  assert(chain5.status === 200, `Chain 5 (Electronics again) status=${chain5.status}`);
  assert(chain5.body?.sold_posts?.length === 1 && chain5.body.sold_posts[0].category === "Electronics",
    `Chain 5: 1 Electronics post after round-trip`);

  // 3c-ii. Message field present only when no matching posts
  const noMessage = await api("GET", `/api/sales/user/${SELLER}/sold-posts`);
  assert(!noMessage.body?.message,
    `Message omitted when posts exist (got: "${noMessage.body?.message || "(none)"}")`);

  const withMessage = await api("GET", `/api/sales/user/${SELLER}/sold-posts?category=Books`);
  assert(withMessage.body?.sold_posts?.length === 0,
    `Books filter: 0 posts`);
  assert(withMessage.body?.message?.length > 0,
    `Message present: "${withMessage.body?.message}"`);

  // 3c-iii. URL-encoded & special characters in category filter
  await new Promise(r => setTimeout(r, 300));
  let urlEncoded = await api("GET",
    `/api/sales/user/${SELLER}/sold-posts?category=${encodeURIComponent("Electronics")}`);
  if (urlEncoded.status === 429) {
    await new Promise(r => setTimeout(r, 3000));
    urlEncoded = await api("GET",
      `/api/sales/user/${SELLER}/sold-posts?category=${encodeURIComponent("Electronics")}`);
  }
  assert(urlEncoded.status === 200 && urlEncoded.body?.sold_posts?.length === 1,
    `URL-encoded category filter works (${urlEncoded.body?.sold_posts?.length} posts)`);

  // 3c-iv. Whitespace in category name — backend trims query param via String(category).trim()
  // Trailing space "Electronics " gets trimmed to "Electronics" and DOES match
  await new Promise(r => setTimeout(r, 300));
  let withSpace = await api("GET",
    `/api/sales/user/${SELLER}/sold-posts?category=Electronics%20`);
  if (withSpace.status === 429) {
    await new Promise(r => setTimeout(r, 3000));
    withSpace = await api("GET",
      `/api/sales/user/${SELLER}/sold-posts?category=Electronics%20`);
  }
  assert(withSpace.status === 200 && withSpace.body?.sold_posts?.length === 1,
    `Whitespace trimmed by backend (got ${withSpace.body?.sold_posts?.length || 0} posts, expected 1)`);

  // 3d. Auth-free access (public endpoint)
  // Brief pause to avoid rate limiting after many rapid GETs in Phase 3c
  await new Promise(r => setTimeout(r, 1200));
  const pub = await api("GET", `/api/sales/user/${SELLER}/sold-posts`);
  if (pub.status === 429) {
    await new Promise(r => setTimeout(r, 3000));
    const pubRetry = await api("GET", `/api/sales/user/${SELLER}/sold-posts`);
    pub.status = pubRetry.status;
    pub.body = pubRetry.body;
  }
  assert(pub.status === 200, "Public (no auth) → 200");
  assert(pub.body?.success === true, "Public without token works");

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 4: Edge cases
  // ══════════════════════════════════════════════════════════════════════════
  log("PHASE 4", "Edge cases");

  // Refresh CSRF token before edge-case POSTs
  // Brief pause to ensure rate limit window resets before POSTs
  await new Promise(r => setTimeout(r, 1500));
  {
    const r = await api("GET", "/api/auth/csrf-token");
    if (r.body?.csrfToken) csrfToken = r.body.csrfToken;
    assert(!!csrfToken, "CSRF token refreshed for edge case POSTs");
  }

  // 4a. Non-buyer cannot rate
  const fr = await api("POST", `/api/sales/${saleIds[0]}/rate`,
    { rating: 3, comment: "fake" }, token(FAKE, "Fake"));
  assert(fr.status === 403, `Non-buyer rating → ${fr.status}`);
  // After a failed POST, we need a fresh CSRF token (rotated only on success)
  {
    const r = await api("GET", "/api/auth/csrf-token");
    if (r.body?.csrfToken) csrfToken = r.body.csrfToken;
  }

  // 4b. Invalid rating (6)
  const ir = await api("POST", `/api/sales/${saleIds[0]}/rate`,
    { rating: 6, comment: "bad" }, bt);
  assert(ir.status === 400, `Invalid rating 6 → ${ir.status}`);
  {
    const r = await api("GET", "/api/auth/csrf-token");
    if (r.body?.csrfToken) csrfToken = r.body.csrfToken;
  }

  // 4c. Invalid rating (0)
  const iz = await api("POST", `/api/sales/${saleIds[0]}/rate`,
    { rating: 0, comment: "bad" }, bt);
  assert(iz.status === 400, `Invalid rating 0 → ${iz.status}`);
  {
    const r = await api("GET", "/api/auth/csrf-token");
    if (r.body?.csrfToken) csrfToken = r.body.csrfToken;
  }

  // 4d. Seller with 0 sales
  // Pause to avoid rate limiting after the rapid Phase 3b API calls
  await new Promise(r => setTimeout(r, 1200));
  let empty = await api("GET", `/api/sales/user/${NOSALE}/sold-posts`);
  if (empty.status === 429) {
    console.log("  ⚙️  Rate limited (429), waiting 3s before retry...");
    await new Promise(r => setTimeout(r, 3000));
    empty = await api("GET", `/api/sales/user/${NOSALE}/sold-posts`);
  }
  assert(empty.status === 200, `0-sales user status=${empty.status}`);
  if (empty.body?.success) {
    assert(empty.body.sold_posts?.length === 0, `0-sales has ${empty.body.sold_posts?.length} posts`);
    // Base trust score = 40 + zero disputes bonus: 10 = 50 (no KYC, no sales, no rating)
    assert(empty.body.trust_score === 50, `0-sales trust score = ${empty.body.trust_score}`);
    assert(empty.body.trust_badge === "NORMAL TRUST", `0-sales badge = "${empty.body.trust_badge}"`);
  } else {
    assert(false, `0-sales endpoint failed: ${JSON.stringify(empty.body)}`);
  }

  // 4e. Non-existent user — endpoint always returns success:true with default values
  // Brief pause to avoid rate limiting from rapid API calls
  await new Promise(r => setTimeout(r, 1200));
  const nx = await api("GET", "/api/sales/user/does-not-exist-999/sold-posts");
  if (nx.status === 429) {
    // Rate limited — wait longer and retry once
    console.log("  ⚙️  Rate limited (429), waiting 3s before retry...");
    await new Promise(r => setTimeout(r, 3000));
    const nxRetry = await api("GET", "/api/sales/user/does-not-exist-999/sold-posts");
    nx.status = nxRetry.status;
    nx.body = nxRetry.body;
  }
  assert(nx.body?.success === true, `Non-existent user returns success=true (got ${nx.body?.success})`);
  assert(nx.body.seller_name === "Seller", `Non-existent user seller_name = "${nx.body.seller_name}"`);
  assert(nx.body.sold_posts?.length === 0, `Non-existent user sold_posts = ${nx.body.sold_posts?.length}`);

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 5: Cleanup
  // ══════════════════════════════════════════════════════════════════════════
  log("PHASE 5", "Cleaning up test data");
  try {
    await runQuery(`DELETE FROM ratings WHERE target_user_id = $1`, [SELLER]);
    await runQuery(`DELETE FROM ratings WHERE reviewer_id = $1`, [BUYER]);
    await runQuery(`DELETE FROM sales WHERE seller_id IN ($1,$2,$3,$4)`,
      [SELLER, BUYER, FAKE, NOSALE]);
    await runQuery(`DELETE FROM posts WHERE user_id = $1`, [SELLER]);
    await runQuery(`DELETE FROM profiles WHERE user_id IN ($1,$2,$3,$4)`,
      [SELLER, BUYER, FAKE, NOSALE]);
    await runQuery(`DELETE FROM users WHERE user_id IN ($1,$2,$3,$4)`,
      [SELLER, BUYER, FAKE, NOSALE]);
  } catch (e) {
    console.error("  ⚠️  Cleanup error:", e.message);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  RESULTS:  ${passed} passed  |  ${failed} failed  |  ${passed+failed} total`);
  console.log(`${"=".repeat(50)}`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error("FATAL:", e); process.exit(1); });
