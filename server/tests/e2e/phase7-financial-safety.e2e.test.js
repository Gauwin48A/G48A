/**
 * E2E Test: Phase 7 — Financial Safety Guards (Fraud, Chargeback, Payout, Alerts, Deletion)
 *
 * Tests:
 *   A. Fraud Guards (Phase 4)
 *     1. Self-trade (buyer === seller) blocked on sale request
 *     2. Same-UPI buyer/seller blocked
 *     3. Amount below minimum blocked
 *   B. Chargeback Webhook (Phase 5/6)
 *     1. Invalid signature rejected (401)
 *     2. Valid chargeback.created → RECONCILIATION_MISMATCH alert raised
 *     3. Valid chargeback.resolved (merchant won) → accepted (200)
 *   C. KYC Payout Gating (Phase 7, item 45)
 *     1. Payout enqueued for a non-KYC seller → worker/fallback blocks (PAYOUT_FAILED_FINAL)
 *     2. KYC eligibility guard unit check (ineligible PENDING vs eligible VERIFIED)
 *   D. Admin Payout Management (Phase 6)
 *     1. GET /admin/payouts works for admin (403 for non-admin)
 *     2. GET /admin/payouts/:id returns record
 *     3. POST /admin/payouts/:id/retry re-enqueues (403 for non-admin)
 *   E. Financial Alerts (Phase 6, item 54)
 *     1. GET /admin/financial-alerts returns the chargeback alert
 *     2. Non-admin gets 403
 *     3. POST /admin/financial-alerts/:id/resolve marks resolved
 *   F. Account Deletion Protection (Phase 7, item 50)
 *     1. User with active escrow (razorpay_hold sale) cannot delete (409)
 *     2. User with pending payout cannot delete (409)
 *     3. Clean user has no financial blockers (guard returns blocked:false)
 *
 * Live-schema notes (verified via information_schema):
 *   - users.user_id and posts.post_id are INTEGER columns
 *   - No orders / products / disputes / transactions tables in this environment
 *   - webhook_events uses gateway_event_id (no idempotency_key/provider columns)
 *   - suspensions uses suspended_until (no expires_at/created_by/updated_at)
 *   - profiles.phone is the phone column (users has none); PAN hash lives in kyc_verifications
 */

const { runQuery } = require("../../src/utils/dbHelpers");
const jwt = require("jsonwebtoken");
const http = require("http");
const crypto = require("crypto");

// ── Config ───────────────────────────────────────────────────────────────────
const BASE = "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "mhub-dev-jwt-secret-change-in-production";
const JWT_ISSUER = process.env.JWT_ISSUER || "mhub-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "mhub-client";
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "razorpay_webhook_secret_placeholder";

// ── Test user IDs (integer-friendly values matching live users.user_id) ─────
const ADMIN    = "889001";
const BUYER_A  = "889002";
const SELLER_A = "889003";
const BUYER_B  = "889004";
const SELLER_B = "889005";
const KYC_LESS = "889006";
const CLEAN    = "889007";

// Post IDs (integer-valued; posts.post_id is an INTEGER column)
const POST_IDS = ["889201", "889202", "889203"];

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

async function api(method, path, data = null, tok = null, retries = 2) {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    const result = await rawApi(method, path, data, tok);
    if (result.status !== 429) return result;
    const waitMs = (attempt * 1500) + Math.floor(Math.random() * 1000);
    console.log(`  ⚙️  Rate limited (429), attempt ${attempt}/${retries + 1}, waiting ${waitMs}ms...`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
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

function pause(ms = 800) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Build a fake-but-valid Razorpay webhook payload with correct signature. */
function signedWebhook(eventType, payloadObject) {
  const payload = {
    event: eventType,
    account_id: "acc_test",
    cont: 0,
    created_at: Date.now(),
    event_id: `evt_test_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
    payload: payloadObject,
  };
  const rawBody = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  return { rawBody, signature, payload };
}

/** Send a raw webhook request (bypasses JSON helper to preserve raw body). */
function sendWebhook(rawBody, signature) {
  return new Promise((resolve, reject) => {
    const u = new URL("/api/v1/webhooks/razorpay", BASE);
    const opts = {
      hostname: u.hostname, port: u.port,
      path: u.pathname, method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(rawBody),
        "x-razorpay-signature": signature,
      },
    };
    const req = http.request(opts, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: { raw: d } }); }
      });
    });
    req.on("error", reject);
    req.write(rawBody);
    req.end();
  });
}

/** Safe cleanup helper — each statement is isolated so one missing table can't abort the rest. */
async function safeDelete(sql, params = []) {
  try { await runQuery(sql, params); }
  catch (e) { console.log(`     ⚠️  Cleanup skipped (${e.message.slice(0, 90)})`); }
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════════════════
async function run() {
  const log = (phase, msg) => console.log(`\n── ${phase} ── ${msg}`);

  // ── Phase 0: Health check + CSRF ─────────────────────────────────────────
  log("PHASE 0", "Server health & CSRF");
  try {
    const h = await api("GET", "/api/health");
    assert(h.body?.db === "connected", `Server healthy (db=${h.body?.db})`);
  } catch (e) {
    assert(false, `Server unreachable: ${e.message}`);
    process.exit(1);
  }
  await pause(200);
  const csrfRes = await api("GET", "/api/auth/csrf-token");
  if (csrfRes.body?.csrfToken) csrfToken = csrfRes.body.csrfToken;
  if (!csrfToken) parseCookies(csrfRes.headers?.["set-cookie"]);
  assert(!!csrfToken, "CSRF token obtained");

  // ── Phase 1: Seed test data ──────────────────────────────────────────────
  log("PHASE 1", "Seeding test users");
  const seedUser = async (uid, username, role = "user", kyc = "PENDING", upi = null, phone = null) => {
    await runQuery(
      `INSERT INTO users (user_id, username, email, password_hash, role, kyc_status)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET role = $5, kyc_status = $6`,
      [uid, username, `${uid}@e2e.test`, "e2e_hash", role, kyc]
    );
    await runQuery(
      `INSERT INTO profiles (user_id, full_name, payout_upi_id, phone)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name,
         payout_upi_id = COALESCE(EXCLUDED.payout_upi_id, profiles.payout_upi_id),
         phone = COALESCE(EXCLUDED.phone, profiles.phone)`,
      [uid, `User ${uid}`, upi, phone]
    );
  };

  await seedUser(ADMIN, "admin_phase7", "admin", "VERIFIED");
  await seedUser(BUYER_A, "buyer_a_phase7", "user", "VERIFIED", null, "+911234567001");
  await seedUser(SELLER_A, "seller_a_phase7", "user", "VERIFIED", "seller.a@upi", "+911234567002");
  await seedUser(BUYER_B, "buyer_b_phase7", "user", "VERIFIED", null, "+911234567003");
  await seedUser(SELLER_B, "seller_b_phase7", "user", "VERIFIED", "seller.b@upi", "+911234567004");
  await seedUser(KYC_LESS, "kyc_less_phase7", "user", "PENDING", null, "+911234567005");
  await seedUser(CLEAN, "clean_phase7", "user", "VERIFIED", null, "+911234567006");
  log("PHASE 1", "7 users seeded");

  const adminToken = token(ADMIN, "Admin Phase7", "admin");
  const buyerAToken = token(BUYER_A, "Buyer A");
  const sellerAToken = token(SELLER_A, "Seller A");
  const buyerBToken = token(BUYER_B, "Buyer B");
  const sellerBToken = token(SELLER_B, "Seller B");
  const kycLessToken = token(KYC_LESS, "KYC Less");

  // Posts (integer post_id values; posts.post_id is an INTEGER column)
  const postA = await runQuery(
    `INSERT INTO posts (post_id, user_id, title, description, price, status, category_id)
     VALUES ($1,$2,$3,$4,$5,'active',$6) RETURNING post_id`,
    [POST_IDS[0], SELLER_A, "Phase7 Item A", "desc", 1500, "electronics"]
  );
  const postB = await runQuery(
    `INSERT INTO posts (post_id, user_id, title, description, price, status, category_id)
     VALUES ($1,$2,$3,$4,$5,'active',$6) RETURNING post_id`,
    [POST_IDS[1], SELLER_B, "Phase7 Item B", "desc", 800, "furniture"]
  );

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION A: Fraud Guards
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION A", "Fraud Guards (Phase 4)");

  // A1. Self-trade blocked — seller requests own post
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    const r = await api("POST", "/api/sales/request", {
      postId: POST_IDS[0],
      sellerId: SELLER_A,
    }, sellerAToken);
    assert(r.status === 403, `A1. Self-trade blocked → ${r.status} (expected 403)`);
    if (r.body?.code) assert(r.body.code === "SELF_TRADE", `A1. Block code = "${r.body.code}"`);
  }

  // A2. Same-UPI pair blocked — buyer shares the seller's UPI
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    await runQuery(`UPDATE profiles SET payout_upi_id = 'seller.a@upi' WHERE user_id::text = $1`, [BUYER_A]);
    const r = await api("POST", "/api/sales/request", {
      postId: POST_IDS[0],
      sellerId: SELLER_A,
    }, buyerAToken);
    assert(r.status === 403, `A2. Same-UPI sale blocked → ${r.status} (expected 403)`);
    if (r.body?.code) assert(r.body.code === "SAME_UPI", `A2. Block code = "${r.body.code}"`);
    await runQuery(`UPDATE profiles SET payout_upi_id = NULL WHERE user_id::text = $1`, [BUYER_A]);
  }

  // A3. Amount below minimum blocked — create a ₹5 post
  await pause();
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    const cheapPost = await runQuery(
      `INSERT INTO posts (post_id, user_id, title, description, price, status)
       VALUES ($1,$2,$3,$4,5,'active') RETURNING post_id`,
      [POST_IDS[2], SELLER_B, "Cheap item", "desc"]
    );
    const r = await api("POST", "/api/sales/request", {
      postId: String(cheapPost.rows[0].post_id),
      sellerId: SELLER_B,
    }, buyerBToken);
    assert(r.status === 403, `A3. Below-minimum amount blocked → ${r.status} (expected 403)`);
    if (r.body?.code) assert(r.body.code === "amount", `A3. Block code = "${r.body.code}"`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION B: Chargeback Webhook (Phase 5/6)
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION B", "Chargeback Webhook");
  const PAYMENT_ID = "pay_phase7_1";

  // B1. Invalid signature rejected
  {
    const fakeSig = "0".repeat(64);
    const { rawBody } = signedWebhook("chargeback.created", { payment: { entity: { id: PAYMENT_ID } } });
    const r = await sendWebhook(rawBody, fakeSig);
    assert(r.status === 401, `B1. Invalid webhook signature → ${r.status} (expected 401)`);
  }

  // B2. Valid chargeback.created → RECONCILIATION_MISMATCH alert raised
  await pause();
  {
    const { rawBody, signature } = signedWebhook("chargeback.created", {
      payment: { entity: { id: PAYMENT_ID } },
      dispute: { entity: { id: "dsp_1", payment_id: PAYMENT_ID } },
    });
    const r = await sendWebhook(rawBody, signature);
    assert(r.status === 200, `B2. Chargeback.created → ${r.status}`);
    const alerts = await runQuery(
      `SELECT id FROM financial_alerts WHERE alert_type = 'RECONCILIATION_MISMATCH'
       AND entity_id = $1 ORDER BY id DESC LIMIT 1`,
      [PAYMENT_ID]
    );
    assert(alerts.rows.length > 0, "B2. Financial alert raised for chargeback");
  }

  // B3. Valid chargeback.resolved (merchant won) → accepted (200, no crash)
  await pause();
  {
    const { rawBody, signature } = signedWebhook("chargeback.resolved", {
      payment: { entity: { id: PAYMENT_ID } },
      dispute: { entity: { id: "dsp_1", payment_id: PAYMENT_ID, outcome: "won" } },
    });
    const r = await sendWebhook(rawBody, signature);
    assert(r.status === 200, `B3. Chargeback.resolved → ${r.status}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION C: KYC Payout Gating (Phase 7, item 45)
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION C", "KYC Payout Gating");

  // C1. Enqueue a payout for a non-KYC seller → record must end PAYOUT_FAILED_FINAL
  //     with a KYC reason. Exercises the REAL gate: with Redis the BullMQ worker
  //     runs it; without Redis the fallback direct-dispatch path enforces it too.
  await pause();
  {
    const ref = `p_phase7_kyc_${Date.now()}`;
    const rec = await runQuery(
      `INSERT INTO payout_records (reference_id, seller_id, amount, currency, status)
       VALUES ($1, $2, 100, 'INR', 'PAYOUT_PENDING') RETURNING payout_id`,
      [ref, KYC_LESS]
    );
    const payoutId = rec.rows[0].payout_id;
    const { enqueuePayoutJob } = require("../../src/services/payoutQueue");
    const enq = await enqueuePayoutJob({ referenceId: ref, sellerId: KYC_LESS, amount: 100, currency: "INR", payoutRecordId: payoutId });
    assert(enq.success === true, `C1. Payout job enqueued (${enq.fallback ? "fallback" : "bullmq"})`);

    // Poll briefly for the worker/fallback to apply the KYC gate
    let finalStatus = null;
    let lastError = null;
    for (let i = 0; i < 8; i++) {
      await pause(750);
      const row = await runQuery(`SELECT status, last_error FROM payout_records WHERE payout_id = $1`, [payoutId]);
      if (row.rows[0] && row.rows[0].status !== "PAYOUT_PENDING" && row.rows[0].status !== "PAYOUT_PROCESSING") {
        finalStatus = row.rows[0].status;
        lastError = row.rows[0].last_error;
        break;
      }
    }
    console.log(`     KYC payout final status: "${finalStatus}"${lastError ? ` — ${lastError}` : ""}`);
    assert(finalStatus === "PAYOUT_FAILED_FINAL", `C1. Non-KYC payout blocked → "${finalStatus}" (expected PAYOUT_FAILED_FINAL)`);
    if (lastError) assert(lastError.toUpperCase().includes("KYC"), "C1. Block reason references KYC");
  }

  // C2. Direct guard check: PENDING is ineligible, VERIFIED is eligible
  {
    const { checkPayoutKycEligibility } = require("../../src/services/payoutKycGuard");
    const blocked = await checkPayoutKycEligibility(KYC_LESS);
    assert(blocked.eligible === false, `C2. KYC_LESS (${blocked.kycStatus}) is ineligible`);
    const allowed = await checkPayoutKycEligibility(SELLER_A);
    assert(allowed.eligible === true, `C2. SELLER_A (${allowed.kycStatus}) is eligible`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION D: Admin Payout Management (Phase 6)
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION D", "Admin Payout Management");

  const payoutRef = `p_phase7_admin_${Date.now()}`;
  const payoutRec = await runQuery(
    `INSERT INTO payout_records (reference_id, seller_id, amount, currency, status)
     VALUES ($1, $2, 500, 'INR', 'PAYOUT_FAILED_FINAL') RETURNING payout_id`,
    [payoutRef, SELLER_B]
  );
  const payoutId = payoutRec.rows[0].payout_id;

  // D1. Non-admin gets 403 on payouts list
  await pause();
  {
    const r = await api("GET", "/api/admin/payouts", null, buyerAToken);
    assert(r.status === 403, `D1. Non-admin payouts list → ${r.status} (expected 403)`);
  }

  // D2. Admin can list payouts
  await pause();
  {
    const r = await api("GET", "/api/admin/payouts", null, adminToken);
    assert(r.status === 200, `D2. Admin payouts list → ${r.status}`);
    if (r.body?.payouts) {
      const found = r.body.payouts.some((p) => String(p.payout_id) === String(payoutId));
      assert(found, "D2. Seeded payout appears in admin list");
    }
  }

  // D3. Admin can get a payout by ID
  await pause();
  {
    const r = await api("GET", `/api/admin/payouts/${payoutId}`, null, adminToken);
    assert(r.status === 200, `D3. Admin payout detail → ${r.status}`);
    if (r.body?.payout) {
      assert(String(r.body.payout.payout_id) === String(payoutId), "D3. Correct payout returned");
    }
  }

  // D4. Admin retry re-enqueues (non-admin blocked)
  await pause();
  {
    const r = await api("POST", `/api/admin/payouts/${payoutId}/retry`, {}, buyerBToken);
    assert(r.status === 403, `D4. Non-admin retry → ${r.status} (expected 403)`);
  }
  await pause(1200);
  { const r = await api("GET", "/api/auth/csrf-token"); if (r.body?.csrfToken) csrfToken = r.body.csrfToken; }
  {
    const r = await api("POST", `/api/admin/payouts/${payoutId}/retry`, {}, adminToken);
    assert(r.status === 200, `D4. Admin retry → ${r.status}`);
    if (r.body?.success) assert(r.body.success === true, "D4. Retry success=true");
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION E: Financial Alerts (Phase 6, item 54)
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION E", "Financial Alerts");

  // E1. Admin lists unresolved alerts — chargeback alert must be present
  await pause();
  {
    const r = await api("GET", "/api/admin/financial-alerts", null, adminToken);
    assert(r.status === 200, `E1. Admin financial alerts → ${r.status}`);
    if (r.body?.alerts) {
      const found = r.body.alerts.some((a) => String(a.entity_id) === PAYMENT_ID);
      assert(found, "E1. Chargeback alert appears in list");
    }
  }

  // E2. Non-admin gets 403
  await pause();
  {
    const r = await api("GET", "/api/admin/financial-alerts", null, sellerBToken);
    assert(r.status === 403, `E2. Non-admin alerts → ${r.status} (expected 403)`);
  }

  // E3. Admin resolves the chargeback alert
  await pause();
  {
    const alertRow = await runQuery(
      `SELECT id FROM financial_alerts WHERE alert_type = 'RECONCILIATION_MISMATCH'
       AND entity_id = $1 ORDER BY id DESC LIMIT 1`,
      [PAYMENT_ID]
    );
    if (alertRow.rows.length > 0) {
      const alertId = alertRow.rows[0].id;
      await pause(800);
      const r = await api("POST", `/api/admin/financial-alerts/${alertId}/resolve`, {}, adminToken);
      assert(r.status === 200, `E3. Resolve alert → ${r.status}`);
      const check = await runQuery(`SELECT is_resolved FROM financial_alerts WHERE id = $1`, [alertId]);
      assert(check.rows[0]?.is_resolved === true, "E3. Alert marked resolved");
    } else {
      assert(false, "E3. No alert to resolve");
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION F: Account Deletion Protection (Phase 7, item 50)
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION F", "Account Deletion Protection");

  // F1. User with active escrow (razorpay_hold sale) cannot delete
  await pause();
  {
    await runQuery(
      `INSERT INTO sales (post_id, buyer_id, seller_id, status, razorpay_hold)
       VALUES ($1, $2, $3, 'received', true)`,
      [String(postB.rows[0].post_id), BUYER_B, KYC_LESS]
    );
    await pause(800);
    const r = await api("DELETE", "/api/users/account", { confirmation: "DELETE_MY_ACCOUNT", password: "" }, kycLessToken);
    assert(r.status === 409, `F1. Escrow user delete blocked → ${r.status} (expected 409)`);
    if (r.body?.reasons) assert(r.body.reasons.length > 0, "F1. Returns blocking reasons");
  }

  // F2. User with pending payout cannot delete
  await pause();
  {
    await runQuery(
      `INSERT INTO payout_records (reference_id, seller_id, amount, currency, status)
       VALUES ($1, $2, 250, 'INR', 'PAYOUT_PENDING')`,
      [`p_phase7_pending_${Date.now()}`, BUYER_A]
    );
    await pause(800);
    const r = await api("DELETE", "/api/users/account", { confirmation: "DELETE_MY_ACCOUNT", password: "" }, buyerAToken);
    assert(r.status === 409, `F2. Pending-payout user delete blocked → ${r.status} (expected 409)`);
  }

  // F3. Clean user has no financial blockers (guard returns blocked:false)
  {
    const { checkAccountFinancialExposure } = require("../../src/services/accountFinancialGuardService");
    const exposure = await checkAccountFinancialExposure(CLEAN);
    assert(exposure.blocked === false, `F3. Clean user has no financial blockers (blocked=${exposure.blocked})`);
    if (exposure.reasons && exposure.reasons.length) {
      console.log(`     F3 reasons: ${exposure.reasons.join(" | ")}`);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION G: Cleanup
  // ══════════════════════════════════════════════════════════════════════════
  log("SECTION G", "Cleaning up test data");
  const TEST_USERS = [ADMIN, BUYER_A, SELLER_A, BUYER_B, SELLER_B, KYC_LESS, CLEAN];

  await safeDelete(`DELETE FROM webhook_events WHERE gateway_event_id LIKE 'razorpay_evt_test_%'`);
  await safeDelete(`DELETE FROM financial_alerts WHERE message LIKE '%phase7%' OR entity_id LIKE '%phase7%'`);
  await safeDelete(`DELETE FROM sale_confirmations WHERE sale_id IN (SELECT id FROM sales WHERE seller_id::text = ANY($1::text[]) OR buyer_id::text = ANY($1::text[]))`, [TEST_USERS]);
  await safeDelete(`DELETE FROM sales WHERE seller_id::text = ANY($1::text[]) OR buyer_id::text = ANY($1::text[])`, [TEST_USERS]);
  await safeDelete(`DELETE FROM payout_records WHERE seller_id::text = ANY($1::text[])`, [TEST_USERS]);
  await safeDelete(`DELETE FROM posts WHERE user_id::text = ANY($1::text[])`, [TEST_USERS]);
  await safeDelete(`DELETE FROM financial_ledger WHERE reference_id LIKE 'p_phase7_%'`);
  await safeDelete(`DELETE FROM suspensions WHERE user_id::text = ANY($1::text[])`, [TEST_USERS]);
  for (const uid of TEST_USERS) {
    await safeDelete(`DELETE FROM profiles WHERE user_id::text = $1`, [uid]);
    await safeDelete(`DELETE FROM users WHERE user_id::text = $1`, [uid]);
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
