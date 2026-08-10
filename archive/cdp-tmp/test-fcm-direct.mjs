// Direct FCM layer test — reproduce exactly what the dispatch path calls.
import { createRequire } from "module";
const require = createRequire(import.meta.url);
require("dotenv").config({ path: new URL("../server/.env", import.meta.url).pathname });
const { sendFcmMulticast } = require("../server/src/services/fcmAdminService");
const { sendToMultiple } = require("../server/src/services/fcm");
const { Client } = require("pg");

const pool = new Client({ host: "localhost", port: 5432, user: "mhub", password: "password", database: "mhub" });

async function main() {
  await pool.connect();
  const res = await pool.query("SELECT fcm_token AS token, platform FROM device_tokens WHERE is_active = true");
  console.log("ACTIVE TOKENS:", JSON.stringify(res.rows));
  if (res.rows.length === 0) { console.log("no tokens"); process.exit(0); }

  const androidTokens = res.rows.filter(r => (r.platform || "android") !== "web").map(r => r.token);
  const webTokens = res.rows.filter(r => r.platform === "web").map(r => r.token);

  console.log("androidTokens:", androidTokens.length, "webTokens:", webTokens.length);

  const payload = { notification_id: "e2e-direct-test", type: "system", title: "Direct FCM test", message: "hello", deep_link: "", data: {} };
  const androidResult = androidTokens.length ? await sendFcmMulticast(androidTokens, payload) : null;
  console.log("sendFcmMulticast result:", JSON.stringify(androidResult, null, 1));

  const webResult = webTokens.length ? await sendToMultiple(webTokens, "Direct FCM test", "hello", payload) : null;
  console.log("sendToMultiple (web) result:", JSON.stringify(webResult));

  await pool.end();
  process.exit(0);
}
main().catch(e => { console.error("ERR:", e.message); process.exit(1); });
