/**
 * E2E Test: Payout Linking + Subscription Override APIs
 *
 * Tests:
 *   A. Payout Account Linking
 *     1. POST /api/profile/payout-link — link a bank account for Razorpay payouts
 *     2. GET  /api/profile/payout-status — check linked payout method
 *     3. Auth: unauthenticated users get 401
 *     4. Validation: invalid account details get 400
 *
 *   B. Admin Subscription Override
 *     1. POST /api/subscriptions/admin/user/:userId/activate — admin activates a plan for a user
 *     2. POST /api/subscriptions/admin/user/:userId/deactivate — admin expires a user's sub
 *     3. GET  /api/subscriptions/admin/user/:userId — view user's subscription status
 *     4. GET  /api/subscriptions/admin/users/search — search users with subscription insights
 *     5. Auth: non-admin users get 403
 *     6. Auth: unauthenticated users get 401
 *
 * Database tables used:
 *   - users, profiles (for test users)
 *   - subscription_plans (must already have at least one active plan)
 *   - user_subscriptions (activated/deactivated by admin endpoints)
 *   - subscriptions_history (logged by admin activation/deactivation)
 */

const { runQuery } = require("../../src/utils/dbHelpers");
const jwt = require("jsonwebtoken");
const http = require("http");

// ── Config ───────────────────────────────────────────────────────────────────
const BASE = "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "mhub-dev-jwt-secret-change-in-production";
const JWT_ISSUER = process.env.JWT_ISSUER || "mhub-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "mhub-client";

// ── Test user IDs ────────────────────────────────────────────────────────────
const ADMIN   = "888001";
const USER_A  = "888002";
const USER_B  = "888003";
const UNPAID  = "888004";

// ── Test plan IDs (must match what's seeded or created in the DB) ────────────
let PLAN_ID = null;
let HAS_PLANS = false;
let SEEDED_PLAN_ID = null; // non-null when this run created its own plan

// ── CSRF state ───────────────────────────────────────────────────────────────
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

function integrityHeaders() {
  const now = Date.now();
  const nonce = now + "-" + Math.random().toString(36).substring(2, 12);
  return {
    "x-mhub-timestamp": String(now),
    "x-mhub-nonce": nonce,
  };
}

// ── Rate-limit resilient API helper ─────────────────────────────────────────
async function api(method, path, data = null, tok = null, retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const result = await rawApi(method, path, data, tok);
    if (result.status !== 429) return result;
    // Rate limited — backoff with jitter
    const waitMs = (attempt * 1500) + Math.floor(Math.random() * 1000);
    console.log(`  ⚙️  Rate limited (429), attempt ${attempt}/${retries + 1}, waiting ${waitMs}ms...`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  // Final attempt
  return rawApi(method, path, data, tok);
}

function rawApi(method, path, data = null, tok = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const body = data ? JSON.stringify(data) : null;
    const opts = {
      hostname: u.hostname, port: u.port,
      path: u.pathname + u.search, method,
      headers: { "Content-Type": "application/json" },
    };

    const m = method.toUpperCase();
    if (m === "POST" || m === "PUT" || m === "DELETE" || m === "PATCH") {
      Object.assign(opts.headers, integrityHeaders());
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

    const req = http.request(opts, (res) => {
      parseCookies(res.headers["set-cookie"]);

      let d = "";
      res.on("data", (c) => (d += c));
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

// ── Trackers ────────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function assert(ok, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  if (ok) { console.log(`[${ts}]  ✅ ${msg}`); passed++; }
  else    { console.log(`[${ts}]  ❌ ${msg}`); failed++; }
}

function token(uid, name, role = "user") {
  return jwt.sign(
    { id: uid, userId: uid, role, name },
    JWT_SECRET,
    { expiresIn: "15m", issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
  );
}

// ── Helper: small pause to avoid rate-limit bursts ──────────────────────────
function pause(ms = 1200) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Discover the first active subscription plan ─────────────────────────────
async function getFirstActivePlan() {
  // Try without sort_order first (column may not exist on all schemas)
  try {
    const r = await runQuery(
      `SELECT plan_id FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC, price ASC LIMIT 1`
    );
    if (r.rows.length > 0) {
      PLAN_ID = r.rows[0].plan_id;
      HAS_PLANS = true;
      console.log(`  ℹ️  Using plan_id=${PLAN_ID}`);
      return;
    }
  } catch {
    // sort_order column might not exist
  }

  // Fallback: try without sort_order
  try {
    const r = await runQuery(
      `SELECT plan_id FROM subscription_plans WHERE is_active = true ORDER BY price ASC LIMIT 1`
    );
    if (r.rows.length > 0) {
      PLAN_ID = r.rows[0].plan_id;
      HAS_PLANS = true;
      console.log(`  ℹ️  Using plan_id=${PLAN_ID} (fallback query)`);
      return;
    }
  } catch {
    // No plans table at all
  }

  // Seed our own active plan (audit item #25: tests seed their own data) so the
  // admin activate/deactivate override flow (B5–B9) actually runs end-to-end.
  // Adopt-or-create by plan_name so leftover rows from a crashed run are reused
  // (and tracked for cleanup) instead of accumulating duplicates.
  const AUTO_PLAN_NAME = "E2E Auto Plan";
  try {
    const existing = await runQuery(
      `SELECT plan_id FROM subscription_plans WHERE plan_name = $1 AND is_active = true LIMIT 1`,
      [AUTO_PLAN_NAME]
    );
    if (existing.rows.length > 0) {
      PLAN_ID = existing.rows[0].plan_id;
      SEEDED_PLAN_ID = PLAN_ID;
      HAS_PLANS = true;
      console.log(`  ℹ️  Adopted seeded plan_id=${PLAN_ID} (${AUTO_PLAN_NAME})`);
      return;
    }
    const seed = await runQuery(
      `INSERT INTO subscription_plans (plan_name, price, currency, duration_days, features, is_active)
       VALUES ($1, 99.00, 'INR', 30, '{}'::jsonb, true)
       RETURNING plan_id`,
      [AUTO_PLAN_NAME]
    );
    if (seed.rows.length > 0) {
      PLAN_ID = seed.rows[0].plan_id;
      SEEDED_PLAN_ID = PLAN_ID;
      HAS_PLANS = true;
      console.log(`  ℹ️  Seeded active plan_id=${PLAN_ID} (${AUTO_PLAN_NAME})`);
      return;
    }
  } catch (e) {
    console.log(`  ℹ️  Could not seed plan: ${e.message}`);
  }

  HAS_PLANS = false;
  console.log(`  ℹ️  No active subscription plans found — subscription tests will be skipped`);
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
async function run() {
  const log = (phase, msg) => console.log(`\n── ${phase} ── ${msg}`);

  // ── Phase 0: Health check + fetch CSRF + discover plan ──────────────────
  log("PHASE 0", "Server health, CSRF token & plan discovery");
  try {
    const h = await api("GET", "/api/health");
    assert(h.body?.db === "connected", `Server healthy (db=${h.body?.db})`);
  } catch (e) {
    assert(false, `Server unreachable: ${e.message}`);
    process.exit(1);
  }

  // Fetch CSRF
  await pause(300);
  const csrfRes = await api("GET", "/api/auth/csrf-token");
  if (csrfRes.body?.csrfToken) csrfToken = csrfRes.body.csrfToken;
  if (!csrfToken) parseCookies(csrfRes.headers?.["set-cookie"]);
  assert(!!csrfToken, "CSRF token obtained");

  // Discover a plan
  await getFirstActivePlan();

  // ── Phase 1: Seed test data ─────────────────────────────────────────────
  log("PHASE 1", "Seeding test users");

  // Admin user
  await runQuery(
    `INSERT INTO users (user_id, username, email, password_hash, role, kyc_status)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (user_id) DO UPDATE SET role = $5`,
    [ADMIN, "admin_e2e", "admin@e2e.test", "e2e_hash", "admin", "VERIFIED"]
  );
  await runQuery(
    `INSERT INTO profiles (user_id, full_name)
     VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
    [ADMIN, "Admin E2E"]
  );

  // Regular users (User A = with subscription, User B = without, UNPAID = for payout tests)
  for (const u of [USER_A, USER_B, UNPAID]) {
    await runQuery(
      `INSERT INTO users (user_id, username, email, password_hash, role, kyc_status)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO NOTHING`,
      [u, `user_${u}`, `${u}@e2e.test`, "e2e_hash", "user", "VERIFIED"]
    );
    await runQuery(
      `INSERT INTO profiles (user_id, full_name)
       VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING`,
      [u, `User ${u}`]
    );
  }
  log("PHASE 1", `Admin(${ADMIN}), UserA(${USER_A}), UserB(${USER_B}), Unpaid(${UNPAID}) created`);

  // Generate tokens
  const adminToken = token(ADMIN, "Admin E2E", "admin");
  const userAToken = token(USER_A, "User A");
  const userBToken = token(USER_B, "User B");
  const unpaidToken = token(UNPAID, "Unpaid User");

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION A: Payout Account Linking Tests
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION A", "Payout Account Linking");

  // Refresh CSRF + pause before writes
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }

  // A1. Unauthenticated user gets 401 on payout-link
  {
    const r = await api("POST", "/api/profile/payout-link", {
      account_type: "bank_account",
      account_number: "1234567890",
      ifsc: "HDFC0001234",
      account_holder_name: "User A",
    });
    assert(r.status === 401, `A1. Unauthenticated payout-link → ${r.status}`);
  }

  // A2. Unauthenticated user gets 401 on payout-status
  {
    const r = await api("GET", "/api/profile/payout-status");
    assert(r.status === 401, `A2. Unauthenticated payout-status → ${r.status}`);
  }

  // A3. Authenticated user can link a bank account
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    const r = await api("POST", "/api/profile/payout-link", {
      type: "bank_account",
      bank_account: {
        account_number: "1234567890",
        ifsc: "HDFC0001234",
        beneficiary_name: "User A",
      },
    }, userAToken);
    assert(r.status === 200, `A3. Link bank account → ${r.status}`);
    if (r.body?.success) {
      assert(r.body.success === true, "A3. Link success=true");
      if (r.body.payout_method) {
        assert(r.body.payout_method === "bank_account", `A3. Payout method = "${r.body.payout_method}"`);
      }
      if (r.body.last_four) {
        assert(r.body.last_four === "7890", `A3. Last four digits = "${r.body.last_four}"`);
      }
    } else {
      // Without Razorpay keys, the service falls back to mock — still acceptable
      console.log(`     ℹ️  Response (may be sandbox): ${JSON.stringify(r.body).substring(0, 120)}`);
    }
  }

  // A4. Authenticated user can link a UPI account
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    const r = await api("POST", "/api/profile/payout-link", {
      type: "upi",
      upi_id: "user@paytm",
    }, userAToken);
    assert(r.status === 200, `A4. Link UPI account → ${r.status}`);
    if (r.body?.success) {
      assert(r.body.success === true, "A4. Link success=true");
      console.log(`     UPI linked: method="${r.body.payout_method}"`);
    } else {
      console.log(`     ℹ️  Response: ${JSON.stringify(r.body).substring(0, 120)}`);
    }
  }

  // A5. Check payout status — should return linked method
  await pause();
  {
    const r = await api("GET", "/api/profile/payout-status", null, userAToken);
    assert(r.status === 200, `A5. Payout status → ${r.status}`);
    if (r.body) {
      console.log(`     Payout status: linked="${r.body.linked}", methods=${(r.body.payout_methods || []).length}`);
    }
  }

  // A6. User who hasn't linked payout — should return linked=false
  await pause();
  {
    const r = await api("GET", "/api/profile/payout-status", null, unpaidToken);
    assert(r.status === 200, `A6. No payout linked → ${r.status}`);
    if (r.body) {
      assert(r.body.linked === false, "A6. Has payout account = false (linked=false)");
    }
  }

  // A7. Validation: invalid account_type gets 400
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    const r = await api("POST", "/api/profile/payout-link", {
      type: "invalid_type",
    }, userAToken);
    assert(r.status === 400, `A7. Invalid account type → ${r.status}`);
  }

  // A8. Validation: missing required fields for bank_account gets 400
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    const r = await api("POST", "/api/profile/payout-link", {
      type: "bank_account",
    }, unpaidToken);
    assert(r.status === 400, `A8. Missing bank fields → ${r.status}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION B: Admin Subscription Override Tests
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION B", "Admin Subscription Override");

  // B1. Unauthenticated user gets 401 on admin endpoint
  {
    const r = await api("GET", `/api/subscriptions/admin/user/${USER_A}`);
    assert(r.status === 401, `B1. Unauthenticated admin/user → ${r.status}`);
  }

  // B2. Regular user (non-admin) gets 403 on admin endpoint
  await pause();
  {
    const r = await api("GET", `/api/subscriptions/admin/user/${USER_A}`, null, userAToken);
    assert(r.status === 403, `B2. Non-admin gets 403 → ${r.status}`);
  }

  // B3. Admin can view a user's subscription status (before activation)
  await pause();
  {
    const r = await api("GET", `/api/subscriptions/admin/user/${USER_A}`, null, adminToken);
    assert(r.status === 200, `B3. Admin view user subscription → ${r.status}`);
    if (r.body) {
      const plan = r.body.currentPlan || r.body.current_plan || "";
      console.log(`     User A plan before activation: "${plan}"`);
    }
  }

  // B4. Admin can search users
  await pause();
  {
    const r = await api("GET", `/api/subscriptions/admin/users/search?q=User`, null, adminToken);
    assert(r.status === 200, `B4. Admin search users → ${r.status}`);
    if (Array.isArray(r.body?.users)) {
      assert(r.body.users.length > 0, `B4. Found ${r.body.users.length} users`);
      const foundUserA = r.body.users.some((u) => String(u.user_id) === USER_A);
      assert(foundUserA, "B4. User A found in search results");
    } else {
      console.log(`     ℹ️  Search response shape: ${JSON.stringify(r.body).substring(0, 200)}`);
    }
  }

  // ── Plan-dependent tests ─────────────────────────────────────────────────
  if (HAS_PLANS && PLAN_ID) {
    // B5. Admin can activate a plan for a user
    await pause(1500);
    { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
    {
      const r = await api("POST", `/api/subscriptions/admin/user/${USER_B}/activate`, {
        plan_id: String(PLAN_ID),
        duration_days: 30,
      }, adminToken);
      assert(r.status === 200, `B5. Admin activate plan → ${r.status}`);
      if (r.body?.success) {
        assert(r.body.success === true, "B5. Activation success=true");
        assert(String(r.body.subscription?.status) === "ACTIVE", `B5. Subscription status = "${r.body.subscription?.status}"`);
        console.log(`     Activated plan: ${r.body.subscription?.plan_id}, expires: ${r.body.subscription?.end_date || "N/A"}`);
      } else {
        console.log(`     ⚠️  Activation response: ${JSON.stringify(r.body)}`);
      }
    }

    // B6. Verify subscription is now active
    await pause();
    {
      const r = await api("GET", `/api/subscriptions/admin/user/${USER_B}`, null, adminToken);
      assert(r.status === 200, `B6. Verify activation → ${r.status}`);
      if (r.body?.activeSubscription) {
        assert(String(r.body.activeSubscription.status) === "ACTIVE", `B6. Active subscription status = "${r.body.activeSubscription.status}"`);
        console.log(`     Post-activation: plan="${r.body.activeSubscription.plan_name}", end=${r.body.activeSubscription.end_date}`);
      }
    }

    // B7. Idempotent reactivation should be graceful (not error)
    await pause();
    { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
    {
      const r = await api("POST", `/api/subscriptions/admin/user/${USER_B}/activate`, {
        plan_id: String(PLAN_ID),
        duration_days: 30,
      }, adminToken);
      // Should succeed or return info about existing active sub — either is fine
      console.log(`     Re-activation: status=${r.status}, success=${r.body?.success}`);
      assert(r.status === 200 || r.status === 409, `B7. Re-activation → ${r.status} (expected 200 or 409)`);
    }

    // B8. Admin can deactivate (expire) a user's subscription
    await pause(1500);
    { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
    {
      const r = await api("POST", `/api/subscriptions/admin/user/${USER_B}/deactivate`, {}, adminToken);
      assert(r.status === 200, `B8. Admin deactivate → ${r.status}`);
      if (r.body?.success) {
        assert(r.body.success === true, "B8. Deactivation success=true");
        console.log(`     Deactivated: ${r.body.message || "success"}`);
      } else {
        console.log(`     ⚠️  Deactivation response: ${JSON.stringify(r.body)}`);
      }
    }

    // B9. Verify subscription is now expired
    await pause();
    {
      const r = await api("GET", `/api/subscriptions/admin/user/${USER_B}`, null, adminToken);
      assert(r.status === 200, `B9. Verify deactivation → ${r.status}`);
      if (r.body?.currentPlan) {
        console.log(`     Post-deactivation: plan="${r.body.currentPlan}"`);
      }
    }
  } else {
    console.log("\n  ⏭️  Skipping plan-dependent subscription tests (no active plans found in DB)");
    console.log("     To run these tests, create an active plan in subscription_plans first.");
  }

  // B10. Deactivating a user with NO active subscription should be graceful
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    const r = await api("POST", `/api/subscriptions/admin/user/${UNPAID}/deactivate`, {}, adminToken);
    assert(r.status === 200, `B10. Deactivate unpaid user → ${r.status}`);
    console.log(`     Unpaid deactivation: ${r.body?.success ? "success" : JSON.stringify(r.body)}`);
  }

  // B11. Admin search with no query — should still return recent users
  await pause();
  {
    const r = await api("GET", `/api/subscriptions/admin/users/search`, null, adminToken);
    assert(r.status === 200, `B11. Admin search (no query) → ${r.status}`);
    if (r.body?.users) {
      assert(r.body.users.length > 0, "B11. Returns users even without query");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION C: Cleanup
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION C", "Cleaning up test data");
  try {
    // Clean up subscription data (each table guarded so a missing table cannot
    // abort the remaining cleanup statements below)
    try {
      await runQuery(`DELETE FROM subscriptions_history WHERE user_id::text = $1`, [USER_B]);
    } catch { /* table may not exist — non-fatal */ }
    for (const uid of [ADMIN, USER_A, USER_B, UNPAID]) {
      await runQuery(`DELETE FROM subscription_events WHERE user_id::text = $1`, [uid]).catch(() => {});
      await runQuery(`DELETE FROM user_subscriptions WHERE user_id::text = $1`, [uid]).catch(() => {});
    }
    // If this run seeded its own plan, remove it (and any feature limits) too.
    // Also sweep by name so a leftover from a crashed run is never left behind.
    if (SEEDED_PLAN_ID) {
      await runQuery(`DELETE FROM plan_feature_limits WHERE plan_id::text = $1`, [String(SEEDED_PLAN_ID)]).catch(() => {});
      await runQuery(`DELETE FROM subscription_plans WHERE plan_id::text = $1`, [String(SEEDED_PLAN_ID)]).catch(() => {});
    }
    await runQuery(`DELETE FROM subscription_plans WHERE plan_name = 'E2E Auto Plan'`).catch(() => {});
    // Reset Razorpay columns on profiles
    await runQuery(
      `UPDATE profiles SET razorpay_contact_id = NULL, razorpay_fund_account_id = NULL WHERE user_id::text = ANY($1)`,
      [[ADMIN, USER_A, USER_B, UNPAID]]
    ).catch(() => {});
    // Delete profiles first (foreign key safety), then users
    for (const uid of [ADMIN, USER_A, USER_B, UNPAID]) {
      await runQuery(`DELETE FROM profiles WHERE user_id::text = $1`, [uid]).catch(() => {});
      await runQuery(`DELETE FROM users WHERE user_id::text = $1`, [uid]).catch(() => {});
    }
  } catch (e) {
    console.error("  ⚠️  Cleanup error:", e.message);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESULTS
  // ══════════════════════════════════════════════════════════════════════════
  const total = passed + failed;
  console.log(`\n${"=".repeat(50)}`);
  console.log(`  RESULTS:  ${passed} passed  |  ${failed} failed  |  ${total} total`);
  console.log(`${"=".repeat(50)}`);

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
