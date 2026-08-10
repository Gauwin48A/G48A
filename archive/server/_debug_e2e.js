const http = require("http");
const { runQuery } = require("./src/utils/dbHelpers");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const BASE = "http://localhost:5001";
const JWT_SECRET = process.env.JWT_SECRET || "mhub-dev-jwt-secret-change-in-production";
const JWT_ISSUER = process.env.JWT_ISSUER || "mhub-api";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "mhub-client";

const SELLER = "999001";
const BUYER = "999002";

let cookieJar = {};

function token(uid, name) {
  return jwt.sign({ id: uid, userId: uid, role: "user", name },
    JWT_SECRET, { expiresIn: "15m", issuer: JWT_ISSUER, audience: JWT_AUDIENCE });
}

function api(method, path, data = null, tok = null, xsrf = null, cookies = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const body = data ? JSON.stringify(data) : null;
    const opts = {
      hostname: u.hostname, port: u.port,
      path: u.pathname + u.search, method,
      headers: { "Content-Type": "application/json" },
    };
    if (tok) opts.headers["Authorization"] = `Bearer ${tok}`;
    if (xsrf) {
      opts.headers["X-XSRF-TOKEN"] = xsrf;
      // Also send as cookie
      opts.headers["Cookie"] = `XSRF-TOKEN=${xsrf}`;
    }
    if (cookies) {
      opts.headers["Cookie"] = cookies;
    }
    if (body) opts.headers["Content-Length"] = Buffer.byteLength(body);
    const req = http.request(opts, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        // Capture set-cookie headers
        const setCookie = res.headers["set-cookie"];
        if (setCookie) {
          for (const c of (Array.isArray(setCookie) ? setCookie : [setCookie])) {
            const parts = c.split(";")[0].split("=");
            if (parts.length === 2) cookieJar[parts[0]] = parts[1];
          }
        }
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d.substring(0, 500) }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log("JWT_ISSUER:", JWT_ISSUER);
  console.log("JWT_SECRET:", JWT_SECRET.substring(0, 20) + "...");

  // Get CSRF token
  const csrfRes = await api("GET", "/api/auth/csrf-token");
  const xsrfToken = cookieJar["XSRF-TOKEN"];
  console.log("CSRF token:", xsrfToken);
  console.log("CSRF response:", JSON.stringify(csrfRes.body));

  // Clean & seed test data
  await runQuery(`DELETE FROM ratings`);
  await runQuery(`DELETE FROM sales WHERE seller_id IN ($1,$2)`, [SELLER, BUYER]);
  await runQuery(`DELETE FROM posts WHERE user_id = $1`, [SELLER]);
  await runQuery(`DELETE FROM profiles WHERE user_id IN ($1,$2)`, [SELLER, BUYER]);
  await runQuery(`DELETE FROM users WHERE user_id IN ($1,$2)`, [SELLER, BUYER]);

  await runQuery(
    `INSERT INTO users (user_id, username, email, password_hash, role, kyc_status) VALUES ($1,$2,$3,$4,$5,$6)`,
    [SELLER, "e2e_s", "s@e.com", "h", "user", "VERIFIED"]);
  await runQuery(
    `INSERT INTO users (user_id, username, email, password_hash, role) VALUES ($1,$2,$3,$4,$5)`,
    [BUYER, "e2e_b", "b@e.com", "h", "user"]);
  await runQuery(
    `INSERT INTO profiles (user_id, full_name, verified) VALUES ($1,$2,$3)`,
    [SELLER, "Seller", true]);
  await runQuery(
    `INSERT INTO posts (post_id, user_id, title, price, status, category_id) VALUES ($1,$2,$3,$4,$5,$6)`,
    ["999101", SELLER, "Test", 10000, "active", "Electronics"]);

  const r = await runQuery(
    `INSERT INTO sales (post_id, buyer_id, seller_id, status) VALUES ($1,$2,$3,'received') RETURNING id`,
    ["999101", BUYER, SELLER]);
  const saleId = r.rows[0].id;
  console.log("Sale ID:", saleId);

  // Test rating with CSRF token
  const bt = token(BUYER, "Buyer");
  console.log("\n--- Testing POST /api/sales/:id/rate with CSRF ---");
  const ratingRes = await api("POST", `/api/sales/${saleId}/rate`,
    { rating: 5, comment: "Great!" }, bt, xsrfToken);
  console.log("Rating status:", ratingRes.status);
  console.log("Rating body:", JSON.stringify(ratingRes.body));

  // Test sold posts without CSRF (GET doesn't need it)
  console.log("\n--- Testing GET /api/sales/user/:id/sold-posts ---");
  // Try with the CSRF cookie
  const st = token(SELLER, "Seller");
  const cookieStr = Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join("; ");
  console.log("Cookies:", cookieStr);

  const soldRes = await api("GET", `/api/sales/user/${SELLER}/sold-posts`,
    null, st, null, cookieStr);
  console.log("Sold posts status:", soldRes.status);
  console.log("Sold posts body:", JSON.stringify(soldRes.body).substring(0, 800));

  // Also test without any auth (public endpoint)
  console.log("\n--- Testing public access (no token) ---");
  const pubRes = await api("GET", `/api/sales/user/${SELLER}/sold-posts`);
  console.log("Public status:", pubRes.status);

  // Cleanup
  await runQuery(`DELETE FROM ratings`);
  await runQuery(`DELETE FROM sales WHERE seller_id IN ($1,$2)`, [SELLER, BUYER]);
  await runQuery(`DELETE FROM posts WHERE user_id = $1`, [SELLER]);
  await runQuery(`DELETE FROM profiles WHERE user_id IN ($1,$2)`, [SELLER, BUYER]);
  await runQuery(`DELETE FROM users WHERE user_id IN ($1,$2)`, [SELLER, BUYER]);

  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
