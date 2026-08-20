/**
 * Seed demo user with premium subscription + KYC for full access
 */
const { runQuery } = require('../src/utils/dbHelpers');

const DEMO_USER = 'fe2570f5-f37e-4313-8974-ff2318a94377';

async function main() {
  // Upsert subscription
  await runQuery(
    `INSERT INTO user_subscriptions (user_id, plan_id, status, expires_at, created_at)
     VALUES ($1, 'premium', 'active', NOW() + interval '365 days', NOW())
     ON CONFLICT (user_id) DO UPDATE SET status = 'active', plan_id = 'premium', expires_at = NOW() + interval '365 days'`,
    [DEMO_USER]
  ).catch(async () => {
    // If upsert failed (no unique constraint), just update
    await runQuery(
      `UPDATE user_subscriptions SET status = 'active', plan_id = 'premium', expires_at = NOW() + interval '365 days' WHERE user_id = $1`,
      [DEMO_USER]
    );
  });

  // Update user tier + KYC
  await runQuery(
    `UPDATE users SET tier = 'premium', current_plan = 'premium', current_tier = 'premium', kyc_status = 'approved' WHERE user_id = $1`,
    [DEMO_USER]
  );

  const user = await runQuery('SELECT tier, current_plan, kyc_status FROM users WHERE user_id = $1', [DEMO_USER]);
  console.log('✅ Demo user:', JSON.stringify(user.rows[0]));
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
