/* Temporary: sign up a fresh real user for the emulator E2E trial test. */
const BASE = "http://localhost:5001";
const fs = require("fs");

const writeHdrs = () => {
  const ts = Date.now().toString();
  return {
    "Content-Type": "application/json",
    "x-client-platform": "android-native",
    "x-platform": "android",
    "x-device-fingerprint": "e2e-signup",
    "x-device-id": "e2e-signup",
    "x-mhub-timestamp": ts,
    "x-mhub-nonce": `s-${ts}-${Math.floor(Math.random() * 1e9)}`,
  };
};

async function main() {
  const phone = "9" + String(Date.now()).slice(-9);
  const password = "Test@1234";
  const res = await fetch(`${BASE}/api/auth/signup`, {
    method: "POST",
    headers: writeHdrs(),
    body: JSON.stringify({ fullName: "E2E Trial User", email: `e2e_${phone}@test.local`, phone, password }),
  });
  const data = await res.json();
  if (res.status === 201 && data.token) {
    console.log("SIGNUP OK:", phone);
    fs.writeFileSync("_e2e_user.json", JSON.stringify({ phone, password }));
  } else {
    console.log("SIGNUP FAILED:", res.status, JSON.stringify(data).slice(0, 200));
    process.exit(1);
  }
}
main().catch((e) => { console.error("ERR:", e.message); process.exit(1); });
