const { pool } = require('../src/utils/dbHelpers');

async function main() {
  try {
    const r1 = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND (table_name LIKE '%reward%' OR table_name LIKE '%referral%' OR table_name LIKE '%streak%' OR table_name LIKE '%coin%')
       ORDER BY table_name`
    );
    console.log('Found tables:', r1.rows.map(x => x.table_name));

    const needed = [
      'rewards', 'reward_log', 'reward_idempotency',
      'reward_daily_checkins', 'reward_spin_history',
      'reward_scratch_claims', 'reward_redemptions',
      'referral_rewards', 'user_streaks',
      'referral_closure', 'referral_relationships',
      'coin_transactions'
    ];
    const existing = new Set(r1.rows.map(x => x.table_name));
    const missing = needed.filter(t => !existing.has(t));
    console.log('Missing tables:', missing.length ? missing : 'NONE - all exist');

    // Check users table for coins/xp/level/tier columns
    const r2 = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='users'
         AND column_name IN ('coins','xp','level','tier','referred_by')
       ORDER BY column_name`
    );
    console.log('Users reward columns:', r2.rows.map(x => x.column_name));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}
main();
