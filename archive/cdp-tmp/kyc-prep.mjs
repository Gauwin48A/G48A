// Prep the DB for a fresh KYC walk as user 999:
// 1. Check candidate aadhaar numbers for existing verifications/blacklist entries
// 2. Reset user 999's KYC state so the app shows "Get Verified"
import { Client } from "pg";
import crypto from "crypto";

const c = new Client({ host: "localhost", port: 5432, user: "mhub", password: "password", database: "mhub" });
const h = (n) => crypto.createHash("sha256").update(String(n)).digest("hex");

await c.connect();

console.log("=== candidate aadhaar checks ===");
for (const num of ["111122223333", "445566778899", "999988887777", "666677778888"]) {
  const v = await c.query("SELECT user_id, status FROM kyc_verifications WHERE aadhaar_hash = $1", [h(num)]);
  const b = await c.query("SELECT reason FROM kyc_blacklist WHERE aadhaar_hash = $1", [h(num)]);
  console.log(num, "verifications:", JSON.stringify(v.rows), "blacklist:", JSON.stringify(b.rows));
}

console.log("\n=== reset user 999 KYC ===");
const del = await c.query("DELETE FROM kyc_verifications WHERE user_id = '999'");
console.log("deleted kyc_verifications rows:", del.rowCount);
// users table uses kyc_verified / kyc_status / isaadhaarverified (column names verified earlier)
try {
  const up = await c.query(
    "UPDATE users SET kyc_verified = false, kyc_status = NULL, isaadhaarverified = false WHERE user_id = '999' RETURNING user_id, kyc_verified, kyc_status"
  );
  console.log("users reset:", JSON.stringify(up.rows));
} catch (e) {
  console.log("users reset failed (try isaadhaarverified only):", e.message);
  try {
    const up2 = await c.query("UPDATE users SET isaadhaarverified = false WHERE user_id = '999'");
    console.log("isaadhaarverified reset rows:", up2.rowCount);
  } catch (e2) {
    console.log("isaadhaarverified reset failed:", e2.message);
  }
}

await c.end();
console.log("done");
