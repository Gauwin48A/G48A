/**
 * E2E: Plan purchase → subscription activation → plan-gating columns in sync
 *
 * Verifies the money-to-entitlement chain the app relies on:
 *   1. POST /api/payments/razorpay/order  (mock Razorpay — no keys in .env)
 *   2. POST /api/payments/razorpay/verify (mock signature — sandbox bypass)
 *   3. users.tier / current_plan / current_tier / subscription_expiry all updated
 *   4. user_subscriptions row ACTIVE with correct end_date
 *   5. GET /api/subscriptions/my returns the plan + active: true
 *   6. Post creation gating reads the paid plan (plan != basic, expiry set)
 *
 * Usage:  node tests/e2e/plan-purchase.e2e.test.js   (server must be on :5001)
 */
const { runQuery } = require("../../src/utils/dbHelpers");
const jwt = require("jsonwebtoken");
const http = require("http");
require("dotenv").config();

const BASE = "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "mhub-dev-jwt-secret-change-in-production";
const JWT_ISSUER = process.env.JWT_ISSUER || "mhub-dev";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "mhub-client";

const USER = "00000000-0000-0000-0000-000000000301"; // plan buyer
const PLAN_SLUG = "premium";

let cookieJar = {};
let csrfToken = null;

function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return;
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const header of arr) {
    const parts = header.split(";")[0].split("=");
    if (parts.length === 2) {
      cookieJar[parts[0].trim()] = parts[1].trim();
      if (parts[0].trim() === "XSRF-TOKEN") csrfToken = parts[1].trim();
    }
  }
}
function getCookieString() {
  return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join("; ");
}
function integrityHeaders() {
  const now = Date.now();
  return { "x-mhub-timestamp": String(now), "x-mhub-nonce": now + "-" + Math.random().toString(36).substring(2, 12) };
}

let passed = 0, failed = 0;
function assert(ok, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  if (ok) { console.log(`[${ts}]  ✅ ${msg}`); passed++; }
  else { console.log(`[${ts}]  ❌ ${msg}`); failed++; }
}

function token(uid, role = "user", name = "Plan Buyer") {
  return jwt.sign({ id: uid, userId: uid, role, name },
    JWT_SECRET, { expiresIn: "15m", issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, data = null, tok = null, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
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
        if (csrfToken) opts.headers["x-xsrf-token"] = csrfToken;
        const cookieStr = getCookieString();
        if (cookieStr) opts.headers["Cookie"] = cookieStr;
      }
      if (tok) opts.headers["Authorization"] = `Bearer ${tok}`;
      if (body) opts.headers["Content-Length"] = Buffer.byteLength(body);

      const req = http.request(opts, (res) => {
        parseCookies(res.headers["set-cookie"]);
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          let parsed;
          try { parsed = JSON.parse(d); } catch { parsed = { raw: d }; }
          if (res.statusCode === 429 && retries > 0) {
            sleep(3000).then(() => { retries--; attempt(); });
            return;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    };
    attempt();
  });
}

async function cleanup() {
  // FK-aware cleanup — dependents before parents
  for (const t of ["coin_transactions", "subscription_events", "payment_transactions", "user_subscriptions"]) {
    try { await runQuery(`DELETE FROM ${t} WHERE user_id::text = $1`, [USER]); } catch { /* ignore */ }
  }
  try { await runQuery("DELETE FROM users WHERE user_id::text = $1", [USER]); } catch { /* ignore */ }
  cookieJar = {}; csrfToken = null;
}

(async () => {
  console.log("── Plan purchase E2E ──────────────────────────────────────");
  await cleanup();

  // Seed a fresh user (plan gating defaults to basic)
  await runQuery(
    `INSERT INTO users (user_id, email, username, password_hash, role, tier, current_plan, current_tier)
     VALUES ($1, 'planbuyer@test.local', 'planbuyer', 'x', 'user', 'basic', 'basic', 'BASIC')`,
    [USER]
  );

  const tok = token(USER);

  // CSRF handshake first (the API enforces XSRF on state-changing routes)
  const csrf = await api("GET", "/api/auth/csrf-token");
  if (csrf.body?.csrfToken) csrfToken = csrf.body.csrfToken;

  // 1. Create the Razorpay order for the Premium plan (mock mode)
  const order = await api("POST", "/api/payments/razorpay/order", { tierId: PLAN_SLUG, amount: 1800.0 }, tok);
  assert(order.status === 200 && order.body.order_id, `create order → ${order.body.order_id || order.body.error}`);
  assert(order.body.mock === true, "order created in mock mode (no Razorpay keys)");
  assert(order.body.plan_id, "server resolved plan_id from slug");
  const orderId = order.body.order_id;

  // Verify a payment_transactions row exists for this user + plan (this is how the
  // server knows WHO bought WHICH plan — auth token binds the order to the user)
  const tx = await runQuery(
    `SELECT transaction_id, user_id::text, plan_id::text, amount, status FROM payment_transactions WHERE razorpay_order_id = $1`,
    [orderId]
  );
  assert(tx.rows.length === 1, "payment_transactions row recorded (user ↔ plan ↔ order)");
  assert(tx.rows[0].user_id === USER, "transaction bound to the authenticated user");
  const planRow = await runQuery(`SELECT plan_name FROM subscription_plans WHERE plan_id = $1`, [tx.rows[0].plan_id]);
  assert(String(planRow.rows[0]?.plan_name).toLowerCase().includes("premium"), "transaction references the Premium plan");

  // 2. Verify payment (mock: signature bypass, sandbox mode)
  const verify = await api("POST", "/api/payments/razorpay/verify", {
    razorpay_order_id: orderId,
    razorpay_payment_id: "pay_mock_plan123",
    razorpay_signature: "mock_signature",
  }, tok);
  assert(verify.status === 200 && verify.body.success, `verify payment → ${verify.body.error || "ok"}`);

  // 3. user_subscriptions row ACTIVE + expiry ~365 days out
  const sub = await runQuery(
    `SELECT status, end_date FROM user_subscriptions WHERE user_id::text = $1 ORDER BY end_date DESC LIMIT 1`,
    [USER]
  );
  assert(sub.rows.length === 1 && sub.rows[0].status === "ACTIVE", "user_subscriptions row ACTIVE");
  const days = Math.round((new Date(sub.rows[0].end_date) - new Date()) / (1000 * 60 * 60 * 24));
  assert(days >= 360 && days <= 370, `Premium duration ~365 days (got ${days})`);

  // 4. ALL plan-gating columns on users are in sync
  const u = await runQuery(
    `SELECT tier, current_plan, current_tier, subscription_expiry FROM users WHERE user_id::text = $1`,
    [USER]
  );
  const row = u.rows[0];
  assert(row.tier === "premium", `users.tier = premium (got ${row.tier})`);
  assert(row.current_plan === "premium", `users.current_plan = premium (got ${row.current_plan})`);
  assert(String(row.current_tier).toLowerCase() === "premium", `users.current_tier synced (got ${row.current_tier})`);
  assert(row.subscription_expiry != null && new Date(row.subscription_expiry) > new Date(),
    "users.subscription_expiry set to subscription end date");

  // 5. GET /api/subscriptions/my → active: true, tier: Premium
  const my = await api("GET", "/api/subscriptions/my", null, tok);
  assert(my.status === 200 && my.body.active === true, "mySubscription → active: true");
  assert(String(my.body.currentPlan).toLowerCase().includes("premium"), `mySubscription → currentPlan ${my.body.currentPlan}`);
  assert(my.body.expiresInDays > 0, "mySubscription → expiresInDays > 0");

  // 6. Post gating sees the paid plan. The route uses requirePlanAndKyc; the key
  //    proof is that the error is PLAN_AND_KYC_REQUIRED (subscription check PASSED,
  //    only KYC missing) rather than PLAN_REQUIRED — before the fix the subscription
  //    columns were never written and paid users fell through as plan-less.
  const post = await api("POST", "/api/posts", {
    title: "Premium gating test",
    description: "Verifying paid plan unlocks gating",
    price: 999,
    category_id: "00000000-0000-0000-0000-000000000101",
    location: "Mumbai",
  }, tok);
  const postErr = post.body?.error || "";
  assert(
    post.body?.code === "PLAN_AND_KYC_REQUIRED",
    `subscription gate passed — post blocked only on KYC (code: ${post.body?.code || post.status})`
  );

  // With KYC granted, the same user can post — and the plan gates apply from
  // users.current_plan/tier/subscription_expiry (Premium: 2/day, 10 photos).
  await runQuery(
    `UPDATE users SET kyc_status = 'VERIFIED', kyc_verified = true WHERE user_id::text = $1`,
    [USER]
  );
  const post2 = await api("POST", "/api/posts", {
    title: "Premium gating test",
    description: "Verifying paid plan unlocks gating",
    price: 999,
    category_id: "00000000-0000-0000-0000-000000000101",
    location: "Mumbai",
  }, tok);
  const post2Err = post2.body?.error || "";
  assert(
    post2.status === 201 || post2Err.includes("category") || post2Err.includes("subcategor") || post2Err.includes("Category"),
    `post gating passes with plan + KYC (status ${post2.status}, err: ${post2Err.slice(0, 80) || "none"})`
  );
  if (post2.status === 201) {
    const del = await runQuery("DELETE FROM posts WHERE post_id::text = $1", [String(post2.body.post?.post_id || post2.body.post_id)]);
    assert(del.rowCount === 1, "cleaned up test post");
  }

  // 7. getTierRules for 'premium' exposes the photo cap the app advertises
  const { getTierRules } = require("../../src/config/tierRules");
  const rules = getTierRules("premium");
  assert(rules.maxImages === 10, "Premium maxImages = 10 (advertised on plans page)");
  assert(rules.dailyLimit === 2, "Premium dailyLimit = 2 (enforced server-side)");

  await cleanup();
  console.log(`\n── Result: ${passed} passed, ${failed} failed ──────────────`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(async (e) => {
  console.error("E2E crashed:", e);
  await cleanup().catch(() => {});
  process.exit(1);
});
