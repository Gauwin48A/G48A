/**
 * E2E: Electronics Escrow — flat 2.5% all-inclusive platform fee
 *
 * Verifies the model decided with the product team:
 *  - Electronics listings → in-app escrow (IN_APP), flat 2.5% all-inclusive fee
 *    (GST absorbed inside the 2.5%; seller receives 97.5%).
 *  - Non-Electronics (Fashion/Vehicles/Others) → OUTSIDE/direct, 0% fee.
 *  - Negative case: buyer non-receipt → both accounts frozen, post frozen,
 *    funds held → admin resolves → unfreeze + reactivate.
 *
 * Runs against a locally started server. Razorpay keys are empty in .env, so
 * every payment call runs in MOCK mode (no real money, no real Razorpay).
 *
 * Usage:  node tests/e2e/escrow-electronics.e2e.test.js
 */
const { runQuery } = require("../../src/utils/dbHelpers");
const jwt = require("jsonwebtoken");
const http = require("http");
require("dotenv").config();

const BASE = "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "mhub-dev-jwt-secret-change-in-production";
const JWT_ISSUER = process.env.JWT_ISSUER || "mhub-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "mhub-client";

// Test IDs — fixed UUIDs so the seed can reference them (users/posts/categories are UUID PKs)
const SELLER = "00000000-0000-0000-0000-000000000001";
const BUYER = "00000000-0000-0000-0000-000000000002";
const ADMIN = "00000000-0000-0000-0000-000000000003";
const CAT_ELEC = "00000000-0000-0000-0000-000000000101";
const CAT_FASH = "00000000-0000-0000-0000-000000000102";
const POST_ELEC = "00000000-0000-0000-0000-000000000201";   // Electronics, ₹10000 → happy path
const POST_FASH = "00000000-0000-0000-0000-000000000202";   // Fashion,    ₹5000  → OUTSIDE path
const POST_ELEC2 = "00000000-0000-0000-0000-000000000203";  // Electronics, ₹8000  → negative path

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
  const nonce = now + "-" + Math.random().toString(36).substring(2, 12);
  return { "x-mhub-timestamp": String(now), "x-mhub-nonce": nonce };
}

let passed = 0, failed = 0;
function assert(ok, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  if (ok) { console.log(`[${ts}]  ✅ ${msg}`); passed++; }
  else { console.log(`[${ts}]  ❌ ${msg}`); failed++; }
}

function token(uid, role = "user", name = "E2E User") {
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

async function refreshCsrf() {
  const r = await api("GET", "/api/auth/csrf-token");
  if (r.body?.csrfToken) csrfToken = r.body.csrfToken;
}

// Column-aware subscription insert (handles old & new user_subscriptions shapes)
async function grantActiveSubscription(userId) {
  const colsRes = await runQuery(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'user_subscriptions'`
  );
  const cols = colsRes.rows.map((r) => r.column_name);
  if (cols.includes("status") && cols.includes("end_date")) {
    let planId = null;
    try {
      const p = await runQuery(`SELECT plan_id FROM subscription_plans WHERE slug = 'starter' LIMIT 1`);
      planId = p.rows[0]?.plan_id ?? null;
    } catch { planId = null; }
    if (cols.includes("plan_id") && planId) {
      await runQuery(
        `INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date)
         VALUES ($1, $2, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')`,
        [String(userId), planId]
      );
    } else {
      await runQuery(
        `INSERT INTO user_subscriptions (user_id, status, start_date, end_date)
         VALUES ($1, 'ACTIVE', NOW(), NOW() + INTERVAL '30 days')`,
        [String(userId)]
      );
    }
  } else {
    await runQuery(
      `INSERT INTO user_subscriptions (user_id, plan_name, is_active, expires_at)
       VALUES ($1, 'starter', true, NOW() + INTERVAL '30 days')`,
      [String(userId)]
    );
  }
}

async function cleanup() {
  const ids = [SELLER, BUYER, ADMIN];
  const posts = [POST_ELEC, POST_ELEC2, POST_FASH];
  const q = (sql, v) => runQuery(sql, v).catch((e) => console.log(`  ⚠️ cleanup skip (${sql.slice(0, 40)}…): ${e.message}`));
  // Collect the sales we created so dependent rows can be removed in FK order.
  const saleRows = (await runQuery(
    `SELECT id FROM sales WHERE seller_id IN ($1,$2,$3) OR buyer_id IN ($1,$2,$3)`, ids
  ).catch(() => ({ rows: [] }))).rows;
  const saleIds = saleRows.map((r) => r.id);
  if (saleIds.length) {
    await q(`DELETE FROM sale_confirmations WHERE sale_id = ANY($1)`, [saleIds]);
    await q(`DELETE FROM sale_payments WHERE sale_id = ANY($1)`, [saleIds]);
    await q(`DELETE FROM suspensions WHERE sale_id = ANY($1)`, [saleIds]);
    await q(`DELETE FROM financial_ledger WHERE reference_id = ANY($1)`, [saleIds.map((id) => `sale_${id}`)]);
    await q(`DELETE FROM financial_snapshots WHERE entity_type = 'SALE' AND entity_id = ANY($1)`, [saleIds.map(String)]);
    await q(`DELETE FROM payout_records WHERE reference_id = ANY($1)`, [saleIds.map((id) => `sale_dispute_${id}`)]);
    await q(`DELETE FROM sales WHERE id = ANY($1)`, [saleIds]);
  }
  await q(`DELETE FROM coin_transactions WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM rewards WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM buyer_inquiries WHERE buyer_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM recently_viewed WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM wishlists WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM cart_items WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM saved_searches WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM post_drafts WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM device_tokens WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM user_sessions WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM user_subscriptions WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM notifications WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM posts WHERE post_id IN ($1,$2,$3)`, posts);
  await q(`DELETE FROM profiles WHERE user_id IN ($1,$2,$3)`, ids);
  await q(`DELETE FROM categories WHERE category_id IN ($1,$2)`, [CAT_ELEC, CAT_FASH]);
  await q(`DELETE FROM users WHERE user_id IN ($1,$2,$3)`, ids);
}

async function run() {
  const log = (phase, msg) => console.log(`\n── ${phase} ── ${msg}`);

  // ══ PHASE 0: health + CSRF ══════════════════════════════════════════════
  log("PHASE 0", "Server health check & CSRF token");
  try {
    const h = await api("GET", "/api/health");
    assert(h.body?.db === "connected", `Server healthy (db=${h.body?.db})`);
  } catch (e) {
    assert(false, `Server unreachable: ${e.message} — start it with: cd server && node src/index.js`);
    process.exit(1);
  }
  await refreshCsrf();
  assert(!!csrfToken, `CSRF token obtained`);

  // ══ PHASE 1: seed ═══════════════════════════════════════════════════════
  log("PHASE 1", "Seeding users, subscriptions, categories, posts");
  await cleanup();
  // Categories (name drives escrow eligibility)
  await runQuery(
    `INSERT INTO categories (category_id, name, slug) VALUES ($1,'Electronics','electronics'), ($2,'Fashion','fashion')
     ON CONFLICT (category_id) DO NOTHING`,
    [CAT_ELEC, CAT_FASH]
  );
  for (const [uid, uname, email, role, kyc] of [
    [SELLER, "esc_seller", "esc_seller@e2e.com", "user", "VERIFIED"],
    [BUYER, "esc_buyer", "esc_buyer@e2e.com", "user", "VERIFIED"],
    [ADMIN, "esc_admin", "esc_admin@e2e.com", "admin", "VERIFIED"],
  ]) {
    await runQuery(
      `INSERT INTO users (user_id, username, email, password_hash, role, kyc_status, kyc_verified, account_status, is_active)
       VALUES ($1,$2,$3,'e2e_hash',$4,$5,true,'active',true)
       ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, kyc_status = EXCLUDED.kyc_status, kyc_verified = true, account_status = 'active', is_active = true`,
      [uid, uname, email, role, kyc]
    );
  }
  await runQuery(
    `INSERT INTO profiles (user_id, full_name, verified) VALUES ($1,'E2E Seller',true)
     ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, verified = EXCLUDED.verified`,
    [SELLER]
  );
  await runQuery(
    `INSERT INTO profiles (user_id, full_name) VALUES ($1,'E2E Buyer')
     ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name`,
    [BUYER]
  );
  // Active plan for seller + buyer (required by requirePlanAndKyc on /sales/request)
  for (const uid of [SELLER, BUYER]) await grantActiveSubscription(uid);
  await runQuery(
    `INSERT INTO posts (post_id, user_id, title, price, status, category_id) VALUES
     ($1,$2,'E2E Laptop (Electronics)',10000,'active',$3),
     ($4,$2,'E2E Jacket (Fashion)',5000,'active',$5),
     ($6,$2,'E2E Phone (Electronics)',8000,'active',$3)`,
    [POST_ELEC, SELLER, CAT_ELEC, POST_FASH, CAT_FASH, POST_ELEC2]
  );
  log("PHASE 1", "Seed complete");

  const st = token(SELLER);
  const bt = token(BUYER);
  const at = token(ADMIN, "admin", "E2E Admin");

  // ══ PHASE 2: ELECTRONICS POSITIVE PATH ══════════════════════════════════
  log("PHASE 2", "Electronics escrow — happy path (₹10000, expect flat 2.5% all-inclusive)");
  await refreshCsrf();

  // 2.1 Buyer requests sale → IN_APP enforced server-side
  const req1 = await api("POST", "/api/sales/request", { postId: POST_ELEC, sellerId: SELLER }, bt);
  assert(req1.status === 201 || req1.status === 200, `request → ${req1.status} (${req1.body?.error || "ok"})`);
  assert(req1.body?.paymentMode === "IN_APP", `payment_mode = IN_APP (got ${req1.body?.paymentMode})`);
  const sale1Id = req1.body?.sale?.id;
  assert(!!sale1Id, `sale id = ${sale1Id}`);

  // 2.2 Seller approves
  const ap1 = await api("POST", `/api/sales/${sale1Id}/approve`, {}, st);
  assert(ap1.status === 200 && ap1.body?.sale?.status === "approved", `approve → ${ap1.status} (${ap1.body?.sale?.status})`);

  // 2.3 Buyer creates mock Razorpay order
  await sleep(300);
  const ord1 = await api("POST", "/api/payments/razorpay/order", { saleId: sale1Id }, bt);
  assert(ord1.status === 200 && !!ord1.body?.order_id, `razorpay order → ${ord1.status} (id=${ord1.body?.order_id})`);
  assert(ord1.body?.mock === true, `order is MOCK (sandbox, no real money)`);
  assert(Number(ord1.body?.amount) === 10000, `order amount = ₹${ord1.body?.amount}`);

  // 2.4 Buyer verifies payment → PAID + escrow hold
  await refreshCsrf();
  const ver1 = await api("POST", "/api/payments/razorpay/verify",
    { razorpay_order_id: ord1.body.order_id, razorpay_payment_id: "pay_mock_001", razorpay_signature: "sig_mock_001" }, bt);
  assert(ver1.status === 200 && ver1.body?.payment_status === "PAID", `verify → ${ver1.status} (${ver1.body?.payment_status})`);

  // 2.5 Seller confirms amount received → fees computed (flat 2.5% all-inclusive)
  await sleep(300);
  const amt1 = await api("POST", `/api/sales/${sale1Id}/amount-received`, { agreedPrice: 10000 }, st);
  assert(amt1.status === 200, `amount-received → ${amt1.status} (${amt1.body?.error || amt1.body?.detail || "ok"})`);
  if (amt1.status === 200) {
    const s = amt1.body?.sale || {};
    assert(Number(s.platform_fee) === 250, `platform_fee = ₹${s.platform_fee} (expect 250 = 2.5% of ₹10000)`);
    assert(Number(s.seller_payout) === 9750, `seller_payout = ₹${s.seller_payout} (expect 9750 = 97.5%)`);
    assert(s.gst_on_fee !== undefined, `gst_on_fee present (₹${s.gst_on_fee}) — GST absorbed inside the 2.5%`);
  }

  // 2.6 Buyer confirms receipt → settled
  await refreshCsrf();
  const rec1 = await api("POST", `/api/sales/${sale1Id}/order-received`, {}, bt);
  assert(rec1.status === 200 && rec1.body?.sale?.status === "settled", `order-received → ${rec1.status} (${rec1.body?.sale?.status})`);

  // 2.7 DB verification: ledger + snapshot + hold released
  await sleep(500);
  const saleRow1 = (await runQuery(`SELECT * FROM sales WHERE id = $1`, [sale1Id])).rows[0];
  assert(Number(saleRow1.platform_fee) === 250, `DB: platform_fee = ₹${saleRow1.platform_fee}`);
  assert(Number(saleRow1.seller_payout) === 9750, `DB: seller_payout = ₹${saleRow1.seller_payout}`);
  assert(Number(saleRow1.gst_on_fee) > 0 && Number(saleRow1.gst_on_fee) < 250, `DB: gst_on_fee = ₹${saleRow1.gst_on_fee} (inside 2.5%)`);
  assert(Number(saleRow1.platform_fee) + Number(saleRow1.seller_payout) === 10000, `DB: fee+payout = agreed price (all-inclusive)`);
  const ledger1 = (await runQuery(
    `SELECT event_type, direction, amount FROM financial_ledger WHERE reference_id = $1`,
    [`sale_${sale1Id}`]
  )).rows;
  assert(ledger1.some((l) => l.event_type === "PLATFORM_FEE" && Number(l.amount) === 250), `ledger: PLATFORM_FEE ₹250 recorded`);
  assert(ledger1.some((l) => l.event_type === "SELLER_TRANSFER" && Number(l.amount) === 9750), `ledger: SELLER_TRANSFER ₹9750 recorded`);
  const snap1 = (await runQuery(
    `SELECT calculation_version, platform_fee, seller_payout FROM financial_snapshots WHERE entity_type='SALE' AND entity_id=$1`,
    [String(sale1Id)]
  )).rows[0];
  assert(snap1 && String(snap1.calculation_version).includes("ALL_INCLUSIVE"), `snapshot version = ${snap1?.calculation_version}`);
  assert(snap1 && Number(snap1.seller_payout) === 9750, `snapshot seller_payout = ₹${snap1?.seller_payout}`);

  // ══ PHASE 3: ELECTRONICS NEGATIVE PATH ══════════════════════════════════
  log("PHASE 3", "Electronics escrow — negative (buyer non-receipt → freeze/hold → admin resolve)");
  await refreshCsrf();

  const req2 = await api("POST", "/api/sales/request", { postId: POST_ELEC2, sellerId: SELLER }, bt);
  assert(req2.body?.paymentMode === "IN_APP", `request#2 → IN_APP`);
  const sale2Id = req2.body?.sale?.id;
  await api("POST", `/api/sales/${sale2Id}/approve`, {}, st);
  const ord2 = await api("POST", "/api/payments/razorpay/order", { saleId: sale2Id }, bt);
  await refreshCsrf();
  const ver2 = await api("POST", "/api/payments/razorpay/verify",
    { razorpay_order_id: ord2.body.order_id, razorpay_payment_id: "pay_mock_002", razorpay_signature: "sig_mock_002" }, bt);
  assert(ver2.body?.payment_status === "PAID", `sale#2 paid (mock)`);

  // 3.1 Buyer reports non-receipt
  await sleep(300);
  const nr = await api("POST", `/api/sales/${sale2Id}/order-not-received`, { reason: "Parcel never arrived" }, bt);
  assert(nr.status === 200, `order-not-received → ${nr.status} (${nr.body?.error || "ok"})`);

  // 3.2 Verify freeze + hold + post frozen
  const saleRow2 = (await runQuery(`SELECT * FROM sales WHERE id = $1`, [sale2Id])).rows[0];
  assert(saleRow2.status === "fraud", `DB: sale status = ${saleRow2.status} (expect fraud)`);
  assert(saleRow2.razorpay_hold === true, `DB: razorpay_hold = true (funds held)`);
  const buyer2 = (await runQuery(`SELECT account_status FROM users WHERE user_id::text = $1`, [BUYER])).rows[0];
  const seller2 = (await runQuery(`SELECT account_status FROM users WHERE user_id::text = $1`, [SELLER])).rows[0];
  assert(String(buyer2.account_status).toUpperCase() === "FROZEN",
    `buyer account FROZEN (${buyer2.account_status})`);
  assert(String(seller2.account_status).toUpperCase() === "FROZEN",
    `seller account FROZEN (${seller2.account_status})`);
  const post2 = (await runQuery(`SELECT status FROM posts WHERE post_id::text = $1`, [POST_ELEC2])).rows[0];
  assert(String(post2.status).toLowerCase() === "frozen" || String(post2.status).toLowerCase() === "inactive",
    `post frozen (${post2.status})`);

  // 3.3 Admin resolves BUYER_FAVOR → unfreeze + release hold + reactivate
  await sleep(300);
  await refreshCsrf();
  const res2 = await api("POST", `/api/sales/${sale2Id}/admin-resolve`,
    { decision: "BUYER_FAVOR", resolution: "Buyer refunded — item not received" }, at);
  assert(res2.status === 200, `admin-resolve → ${res2.status} (${res2.body?.error || "ok"})`);
  if (res2.status === 200) {
    assert(res2.body?.hold_released === true, `hold released (${res2.body?.hold_released})`);
    assert(res2.body?.post_reactivated === true, `post reactivated (${res2.body?.post_reactivated})`);
    assert(Array.isArray(res2.body?.unfrozen) && res2.body.unfrozen.length === 2, `both parties unfrozen (${res2.body?.unfrozen})`);
  }
  const saleRow2b = (await runQuery(`SELECT status FROM sales WHERE id = $1`, [sale2Id])).rows[0];
  assert(saleRow2b.status === "cancelled", `sale#2 → ${saleRow2b.status} (expect cancelled after BUYER_FAVOR)`);
  const post2b = (await runQuery(`SELECT status FROM posts WHERE post_id::text = $1`, [POST_ELEC2])).rows[0];
  assert(String(post2b.status).toLowerCase() === "active", `post reactivated (${post2b.status})`);

  // ══ PHASE 4: NON-ELECTRONICS OUTSIDE PATH ═══════════════════════════════
  log("PHASE 4", "Fashion — direct/outside payment, 0% fee");
  await refreshCsrf();

  const req3 = await api("POST", "/api/sales/request", { postId: POST_FASH, sellerId: SELLER }, bt);
  assert(req3.body?.paymentMode === "OUTSIDE", `Fashion request → OUTSIDE (got ${req3.body?.paymentMode})`);
  const sale3Id = req3.body?.sale?.id;
  await api("POST", `/api/sales/${sale3Id}/approve`, {}, st);

  // OUTSIDE sale needs no in-app payment — seller confirms amount received directly
  await sleep(300);
  const amt3 = await api("POST", `/api/sales/${sale3Id}/amount-received`, { agreedPrice: 5000 }, st);
  assert(amt3.status === 200, `Fashion amount-received → ${amt3.status} (${amt3.body?.error || "ok"})`);
  if (amt3.status === 200) {
    const s = amt3.body?.sale || {};
    assert(Number(s.platform_fee) === 0, `Fashion platform_fee = ₹${s.platform_fee} (expect 0)`);
    assert(Number(s.seller_payout) === 5000, `Fashion seller_payout = ₹${s.seller_payout} (expect full ₹5000)`);
  }

  // ══ PHASE 5: cleanup + results ═══════════════════════════════════════════
  log("PHASE 5", "Cleanup");
  await cleanup();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`  RESULTS:  ${passed} passed  |  ${failed} failed  |  ${passed + failed} total`);
  console.log(`${"=".repeat(50)}`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => { console.error("FATAL:", e); process.exit(1); });
