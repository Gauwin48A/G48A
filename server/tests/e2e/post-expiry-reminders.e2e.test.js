/**
 * E2E: Post expiry reminders (cron)
 *
 * Verifies sendExpiryReminders():
 *  - post expiring in ~5 days  → "Is your post sold?" prompt (post_expiry_sold_prompt)
 *  - post expiring in ~1 day   → repost prompt (post_expiry_repost_prompt)
 *  - each window fires at most once per post (no daily spam)
 *  - posts WITHOUT a device token get no reminder
 *
 * Usage:  node tests/e2e/post-expiry-reminders.e2e.test.js  (server on :5001)
 */
const { runQuery } = require("../../src/utils/dbHelpers");
const { sendExpiryReminders } = require("../../src/cron/postExpiryReminders");
require("dotenv").config();

const OWNER = "00000000-0000-0000-0000-000000000501";
const OWNER_NO_TOKEN = "00000000-0000-0000-0000-000000000502";
const CAT = "00000000-0000-0000-0000-000000000101";
const POST_5D = "00000000-0000-0000-0000-000000000503";
const POST_1D = "00000000-0000-0000-0000-000000000504";
const POST_NO_TOKEN = "00000000-0000-0000-0000-000000000505";

let passed = 0, failed = 0;
function assert(ok, msg) {
  const ts = new Date().toISOString().substring(11, 19);
  if (ok) { console.log(`[${ts}]  ✅ ${msg}`); passed++; } else { console.log(`[${ts}]  ❌ ${msg}`); failed++; }
}

async function cleanup() {
  const q = (sql, v) => runQuery(sql, v).catch(() => {});
  await q(`DELETE FROM notifications WHERE user_id::text IN ($1,$2)`, [OWNER, OWNER_NO_TOKEN]);
  await q(`DELETE FROM device_tokens WHERE user_id::text IN ($1,$2)`, [OWNER, OWNER_NO_TOKEN]);
  await q(`DELETE FROM posts WHERE post_id IN ($1,$2,$3)`, [POST_5D, POST_1D, POST_NO_TOKEN]);
  await q(`DELETE FROM users WHERE user_id::text IN ($1,$2)`, [OWNER, OWNER_NO_TOKEN]);
}

(async () => {
  console.log("── Post expiry reminders ──────────────────────────────────────");
  await cleanup();

  await runQuery(
    `INSERT INTO users (user_id, email, username, password_hash, role) VALUES
     ($1, 'expowner@test.local', 'expowner', 'x', 'user'),
     ($2, 'expowner2@test.local', 'expowner2', 'x', 'user')`,
    [OWNER, OWNER_NO_TOKEN]
  );
  await runQuery(`INSERT INTO categories (category_id, name) VALUES ($1, 'Electronics') ON CONFLICT (category_id) DO NOTHING`, [CAT]);
  await runQuery(
    `INSERT INTO posts (post_id, user_id, title, description, price, category_id, status, expires_at) VALUES
     ($1::uuid, $2::uuid, 'Phone 5d', 'x', 100, $5::uuid, 'active', NOW() + INTERVAL '5 days'),
     ($3::uuid, $2::uuid, 'Shirt 1d', 'x', 100, $5::uuid, 'active', NOW() + INTERVAL '1 day'),
     ($4::uuid, $6::uuid, 'NoToken', 'x', 100, $5::uuid, 'active', NOW() + INTERVAL '3 days')`,
    [POST_5D, OWNER, POST_1D, POST_NO_TOKEN, CAT, OWNER_NO_TOKEN]
  );
  // Only OWNER has a registered device token
  await runQuery(
    `INSERT INTO device_tokens (user_id, fcm_token, platform, is_active) VALUES
     ($1, 'fcm-test-expiry-001', 'android', true)`,
    [OWNER]
  );

  // Run 1 → both prompts should fire (5d post → sold prompt; 1d post → sold + repost)
  const r1 = await sendExpiryReminders();
  const notifs = await runQuery(
    `SELECT type, data->>'post_id' AS pid FROM notifications
     WHERE user_id::text = $1 ORDER BY created_at`,
    [OWNER]
  );
  const types = notifs.rows.map((n) => `${n.type}:${n.pid}`);
  assert(types.includes(`post_expiry_sold_prompt:${POST_5D}`), "5-day post got the Sold/Not-sold prompt");
  assert(types.includes(`post_expiry_sold_prompt:${POST_1D}`), "1-day post got the Sold/Not-sold prompt too");
  assert(types.includes(`post_expiry_repost_prompt:${POST_1D}`), "1-day post got the Repost prompt");

  const noTokenNotifs = await runQuery(
    `SELECT type FROM notifications WHERE user_id::text = $1`, [OWNER_NO_TOKEN]
  );
  assert(noTokenNotifs.rowCount === 0, "post owner without a device token gets no reminder");

  // Run 2 → nothing new (once per window per post)
  const r2 = await sendExpiryReminders();
  const count2 = await runQuery(
    `SELECT COUNT(*)::int AS c FROM notifications WHERE user_id::text = $1`, [OWNER]
  );
  assert(count2.rows[0].c === notifs.rowCount, "re-running sends no duplicates (once per window)");
  assert(r1.sent7 >= 2 && r1.sent2 >= 1, `run1 counters (sent7=${r1.sent7}, sent2=${r1.sent2})`);
  assert(r2.sent7 === 0 && r2.sent2 === 0, `run2 counters are zero (sent7=${r2.sent7}, sent2=${r2.sent2})`);

  await cleanup();
  console.log(`\n── Result: ${passed} passed, ${failed} failed ───────────────────`);
  process.exit(failed === 0 ? 0 : 1);
})().catch(async (e) => { console.error("E2E crashed:", e); await cleanup().catch(() => {}); process.exit(1); });
