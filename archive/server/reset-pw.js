const argon2 = require('argon2');
const { Pool } = require('pg');
const pool = new Pool({ user: 'mhub', password: 'postgres', host: 'localhost', port: 5432, database: 'mhub' });

async function main() {
  const hash = await argon2.hash('Test@12345');
  console.log('Hash:', hash);
  const r = await pool.query('UPDATE users SET password_hash = $1, login_attempts = 0, lock_until = NULL WHERE phone_number = $2', [hash, '9876543210']);
  console.log('Updated:', r.rowCount);
  
  // Verify
  const check = await pool.query('SELECT LEFT(password_hash, 30) as hp FROM users WHERE phone_number = $1', ['9876543210']);
  console.log('Verify:', check.rows[0].hp);
  
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
