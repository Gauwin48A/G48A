/* Temporary: claim-trial E2E for the fresh emulator user (same endpoint the app's Claim button calls). */
const BASE = "http://localhost:5001";
const fs = require("fs");
const creds = JSON.parse(fs.readFileSync("_e2e_user.json", "utf8"));

const writeHdrs = () => {
  const ts = Date.now().toString();
  return {
    "Content-Type": "application/json",
    "x-client-platform": "android-native",
    "x-platform": "android",
    "x-device-fingerprint": "e2e-device",
    "x-device-id": "e2e-device",
    "x-mhub-timestamp": ts,
    "x-mhub-nonce": `c-${ts}-${Math.floor(Math.random() * 1e9)}`,
  };
};

async function main() {
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: writeHdrs(),
    body: JSON.stringify({ phone: creds.phone, password: creds.password }),
  });
  const login = await loginRes.json();
  const token = login.token || login.accessToken;
  console.log("login:", loginRes.status, token ? "token OK" : JSON.stringify(login).slice(0, 100));
  if (!token) return;

  const auth = { ...writeHdrs(), Authorization: `Bearer ${token}` };
  const read = { "x-client-platform": "android-native", Authorization: `Bearer ${token}` };

  const claim = await (await fetch(`${BASE}/api/subscriptions/claim-trial`, {
    method: "POST", headers: auth, body: JSON.stringify({}),
  })).json();
  console.log("claim-trial:", claim.success ? "OK ✅" : "FAIL ❌", "|", claim.message || claim.error);

  const my = await (await fetch(`${BASE}/api/subscriptions/my`, { headers: read })).json();
  console.log("my-subscription:", JSON.stringify({
    plan: my.subscription?.tier,
    status: my.subscription?.status,
    start: my.subscription?.started_at,
    expires: my.subscription?.expires_at,
  }));
}
main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
