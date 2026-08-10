/**
 * Money-pipeline E2E runner.
 *
 * Loads the live server's .env (dotenv) so the test-generated JWTs are signed
 * with the SAME JWT_SECRET / JWT_ISSUER / JWT_AUDIENCE the running server uses.
 * Without this, every authenticated call 401s ("Invalid or expired token").
 *
 * Usage:  node cdp-tmp/run-money-e2e.js   (from project root)
 */
const path = require("path");
const { spawnSync } = require("child_process");

const SERVER_DIR = path.join(__dirname, "..", "server");

// Load the server's real env (JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE, ...)
require(path.join(SERVER_DIR, "node_modules", "dotenv")).config({ path: path.join(SERVER_DIR, ".env") });

const SUITES = [
  "sale-trust-flow.e2e.test.js",
  "payout-linking-subscription.e2e.test.js",
  "phase7-financial-safety.e2e.test.js",
];

const env = { ...process.env };

let allGreen = true;
for (const file of SUITES) {
  console.log(`\n${"=".repeat(60)}\n>>> ${file}\n${"=".repeat(60)}`);
  const r = spawnSync("node", [path.join("tests", "e2e", file)], {
    cwd: SERVER_DIR,
    env,
    stdio: "inherit",
  });
  const ok = r.status === 0;
  console.log(`\n>>> ${file}: ${ok ? "PASS" : `FAIL (exit ${r.status})`}`);
  if (!ok) allGreen = false;
}

console.log(`\n${"=".repeat(60)}`);
console.log(allGreen ? "ALL MONEY-PIPELINE SUITES PASSED" : "SOME SUITES FAILED");
process.exit(allGreen ? 0 : 1);
