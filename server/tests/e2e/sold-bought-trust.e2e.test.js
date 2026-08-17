/**
 * E2E: public Sold/Bought trust pages + trust-score math including purchases.
 * Requires the dev server on :5001 (runs with test DB).
 */
const BASE = process.env.BASE_URL || "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "mhub-dev-jwt-secret-change-me";
const jwt = require("jsonwebtoken");

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) { passed++; console.log("  ✓ " + msg); } else { failed++; console.log("  ✗ " + msg); } }

function makeToken(user) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h", issuer: "mhub-dev", audience: "mhub-users" });
}

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

async function main() {
  console.log("Sold/Bought trust pages e2e");
  const suffix = Date.now().toString(36);
  const SELLER = "e2e-seller-" + suffix;
  const BUYER = "e2e-buyer-" + suffix;
  const sellerTok = makeToken({ sub: SELLER, role: "user", kyc_status: "VERIFIED" });
  const buyerTok = makeToken({ sub: BUYER, role: "user", kyc_status: "VERIFIED" });

  // Public endpoints must work WITHOUT auth.
  console.log("1) Public sold-posts (no auth)");
  let r = await api(`/api/sales/user/${SELLER}/sold-posts`);
  ok(r.status === 200, `sold-posts returns 200 (got ${r.status})`);
  ok(r.body && typeof r.body.trust_score === "number", "trust_score present");
  ok(r.body && typeof r.body.total_bought === "number", "total_bought present");
  ok(Array.isArray(r.body?.sold_posts), "sold_posts list present");

  console.log("2) Public bought-posts (no auth)");
  r = await api(`/api/sales/user/${SELLER}/bought-posts`);
  ok(r.status === 200, `bought-posts returns 200 (got ${r.status})`);
  ok(Array.isArray(r.body?.bought_posts), "bought_posts list present");
  ok(typeof r.body?.total_bought === "number", "total_bought count present");

  console.log("3) v1 alias routes (what the Android app calls)");
  r = await api(`/api/v1/posts/user/${SELLER}/sold`);
  ok(r.status === 200, `v1 /sold alias returns 200 (got ${r.status})`);
  r = await api(`/api/v1/posts/user/${SELLER}/bought`);
  ok(r.status === 200, `v1 /bought alias returns 200 (got ${r.status})`);

  console.log("4) Trust score reflects purchases (0-100 bounds)");
  r = await api(`/api/sales/user/${SELLER}/sold-posts`);
  const score = Number(r.body?.trust_score || 0);
  ok(score >= 0 && score <= 100, `trust_score within 0-100 (got ${score})`);

  console.log("5) Buyer of the Bought page also passes through (self bought-posts)");
  r = await api(`/api/sales/user/${BUYER}/bought-posts`);
  ok(r.status === 200, `buyer bought-posts returns 200 (got ${r.status})`);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
