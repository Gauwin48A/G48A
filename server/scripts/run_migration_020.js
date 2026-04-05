const { pool } = require('../src/utils/dbHelpers');
const fs = require('fs');

async function main() {
  try {
    const sql = fs.readFileSync('database/migrations/020_rewards_chain_complete.sql', 'utf8');
    await pool.query(sql);
    console.log('Migration 020 applied successfully');

    const r1 = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema='public'
         AND (table_name LIKE '%reward%' OR table_name LIKE '%referral%' OR table_name LIKE '%streak%')
       ORDER BY table_name`
    );
    console.log('Reward tables:', r1.rows.map(x => x.table_name));

    const r2 = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema='public' AND table_name='users'
         AND column_name IN ('coins','xp','level','tier','referred_by')
       ORDER BY column_name`
    );
    console.log('User reward columns:', r2.rows.map(x => x.column_name));

    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
}
main();
