/**
 * E2E: Cart → "Buy with Platform" (Electronics in-app escrow)
 *
 * Verifies the exact data the Android cart screen needs for its per-item
 * "Buy with Platform (2.5% fee)" button:
 *   1. GET /api/cart returns seller_id + category_name on each item
 *   2. POST /api/sales/request for an Electronics cart item forces IN_APP
 *   3. Non-Electronics stays OUTSIDE (direct) — no escrow button
 *
 * Usage:  node tests/e2e/cart-buy-platform.e2e.test.js  (server on :5001)
 */
const { runQuery } = require("../../src/utils/dbHelpers");
const jwt = require("jsonwebtoken");
const http = require("http");
require("dotenv").config();

const BASE = "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "mhub-dev-jwt-secret-change-in-production";
const JWT_ISSUER = process.env.JWT_ISSUER || "mhub-dev";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "mhub-client";

const BUYER = "00000000-0000-0000-0000-000000000401";
const SELLER = "00000000-0000-0000-0000-000000000402";
const CAT_ELEC = "00000000-0000-0000-0000-000000000101";
const CAT_FASH = "00000000-0000-0000-0000-000000000102";
const POST_ELEC = "00000000-0000-0000-0000-000000000403";
const POST_FASH = "00000000-0000-0000-0000-000000000404";

let cookieJar = {};
let csrfToken = null;
function parseCookies(setCookieHeaders) {
  if (!setCookieHeaders) return;
  const arr = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const h of arr) {
    const p = h.split(";")[0].split("=");
    if (p.length === 2) { cookieJar[p[0].trim()] = p[1].trim(); if (p[0].trim() === "XSRF-TOKEN") csrfToken = p[1].trim(); }
  }
}
function getCookieString() { return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join("; "); }
function integrityHeaders() { const n = Date.now(); return { "x-mhub-timestamp": String(n), "x-mhub-nonce": n + "-" + Math.random().toString(36).slice(2, 12) }; }

let passed = 0, failed = 0;
function assert(ok, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  if (ok) { console.log(`[${ts}]  ✅ ${msg}`); passed++; } else { console.log(`[${ts}]  ❌ ${msg}`); failed++; }
}
function token(uid, role = "user", name = "Cart Buyer") {
  return jwt.sign({ id: uid, userId: uid, role, name }, JWT_SECRET, { expiresIn: "15m", issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(method, path, data = null, tok = null, retries = 3) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const u = new URL(path, BASE);
      const body = data ? JSON.stringify(data) : null;
      const opts = { hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: { "Content-Type": "application/json" } };
      if (["POST", "PUT", "DELETE", "PATCH"].includes(method.toUpperCase())) {
        Object.assign(opts.headers, integrityHeaders());
        if (csrfToken) opts.headers["x-xsrf-token"] = csrfToken;
        const cs = getCookieString(); if (cs) opts.headers["Cookie"] = cs;
      }
      if (tok) opts.headers["Authorization"] = `Bearer ${tok}`;
      if (body) opts.headers["Content-Length"] = Buffer.byteLength(body);
      const req = http.request(opts, (res) => {
        parseCookies(res.headers["set-cookie"]);
        let d = ""; res.on("data", (c) => (d += c));
        res.on("end", () => {
          let parsed; try { parsed = JSON.parse(d); } catch { parsed = { raw: d }; }
          if (res.statusCode === 429 && retries > 0) { sleep(3000).then(() => { retries--; attempt(); }); return; }
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
  const ids = [BUYER, SELLER];
  const q = (sql, v) => runQuery(sql, v).catch(() => {});
  await q(`DELETE FROM sales WHERE buyer_id IN ($1,$2) OR seller_id IN ($1,$2)`, ids);
  await q(`DELETE FROM cart_items WHERE user_id::text = $1`, [BUYER]);
  await q(`DELETE FROM posts WHERE post_id IN ($1,$2)`, [POST_ELEC, POST_FASH]);
  await q(`DELETE FROM users WHERE user_id IN ($1,$2)`, ids);
  cookieJar = {}; csrfToken = null;
}

(async () => {
  console.log("── Cart → Buy with Platform (Electronics escrow) ─────────────");
  await cleanup();

  // Seed seller + buyer + categories + posts (electronics + fashion)
  await runQuery(
    `INSERT INTO users (user_id, email, username, password_hash, role) VALUES
     ($1, 'cartbuyer@test.local', 'cartbuyer', 'x', 'user'),
     ($2, 'cartseller@test.local', 'cartseller', 'x', 'user')`,
    [BUYER, SELLER]
  );
  await runQuery(
    `INSERT INTO categories (category_id, name) VALUES ($1, 'Electronics'), ($2, 'Fashion')
     ON CONFLICT (category_id) DO NOTHING`,
    [CAT_ELEC, CAT_FASH]
  );
  await runQuery(
    `INSERT INTO posts (post_id, user_id, title, description, price, category_id, status) VALUES
     ($1::uuid, $2::uuid, 'Phone', 'elec', 10000, $3::uuid, 'active'),
     ($4::uuid, $5::uuid, 'Shirt', 'fash', 500, $6::uuid, 'active')`,
    [POST_ELEC, SELLER, CAT_ELEC, POST_FASH, SELLER, CAT_FASH]
  );

  // Buyers must hold an active plan + verified KYC to purchase in-app (product rule).
  await runQuery(
    `UPDATE users SET kyc_status = 'VERIFIED', kyc_verified = true WHERE user_id::text = $1`,
    [BUYER]
  );
  const plan = await runQuery(`SELECT plan_id FROM subscription_plans WHERE slug = 'starter' LIMIT 1`);
  if (plan.rows[0]) {
    await runQuery(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
       VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')`,
      [BUYER, plan.rows[0].plan_id]
    );
  }

  const tok = token(BUYER);
  const csrf = await api("GET", "/api/auth/csrf-token");
  if (csrf.body?.csrfToken) csrfToken = csrf.body.csrfToken;

  // Add both to cart
  const addE = await api("POST", `/api/cart/${POST_ELEC}`, { quantity: 1 }, tok);
  const addF = await api("POST", `/api/cart/${POST_FASH}`, { quantity: 1 }, tok);
  assert(addE.status === 201 || addE.status === 200, `electronics added to cart (${addE.status})`);
  assert(addF.status === 201 || addF.status === 200, `fashion added to cart (${addF.status})`);

  // Cart response must carry seller_id + category_name — the fields the app's
  // "Buy with Platform" button reads.
  const cart = await api("GET", "/api/cart", null, tok);
  assert(cart.status === 200 && Array.isArray(cart.body.items), "GET /api/cart returns items");
  const elecItem = cart.body.items.find((i) => String(i.post_id) === POST_ELEC);
  const fashItem = cart.body.items.find((i) => String(i.post_id) === POST_FASH);
  assert(elecItem && String(elecItem.seller_id) === SELLER, "electronics item carries seller_id");
  assert(elecItem && String(elecItem.category_name).toLowerCase().includes("electron"), `electronics item carries category_name (${elecItem?.category_name})`);
  assert(fashItem && String(fashItem.category_name).toLowerCase().includes("fashion"), "fashion item carries category_name");
  assert(fashItem && String(fashItem.seller_id) === SELLER, "fashion item carries seller_id");

  // Initiate platform purchase on the ELECTRONICS item → server must force IN_APP
  const buyE = await api("POST", "/api/sales/request", { postId: POST_ELEC, sellerId: SELLER }, tok);
  assert(buyE.status === 201, `electronics request accepted (${buyE.status})`);
  assert(buyE.body.paymentMode === "IN_APP", `electronics → IN_APP escrow (got ${buyE.body.paymentMode})`);
  assert(String(buyE.body.sale?.payment_mode).toUpperCase() === "IN_APP", "sale row payment_mode = IN_APP");

  // Non-electronics → OUTSIDE (no escrow; direct dealing)
  const buyF = await api("POST", "/api/sales/request", { postId: POST_FASH, sellerId: SELLER }, tok);
  assert(buyF.status === 201, `fashion request accepted (${buyF.status})`);
  assert(buyF.body.paymentMode === "OUTSIDE", `fashion → OUTSIDE direct (got ${buyF.body.paymentMode})`);

  // Duplicate request on the same post is rejected (already exists)
  const dup = await api("POST", "/api/sales/request", { postId: POST_ELEC, sellerId: SELLER }, tok);
  assert(dup.status === 400, "duplicate active request rejected");

  await cleanup();
  console.log(`\n── Result: ${passed} passed, ${failed} failed ───────────────────`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(async (e) => { console.error("E2E crashed:", e); await cleanup().catch(() => {}); process.exit(1); });
