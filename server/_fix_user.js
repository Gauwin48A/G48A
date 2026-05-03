require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mhub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

(async () => {
  try {
    // Check user password hash
    const { rows } = await pool.query(
      "SELECT user_id, email, password_hash, is_active, role FROM users WHERE email = $1",
      ['priya@mhub.com']
    );
    if (rows[0]) {
      console.log('User found:', rows[0].email);
      console.log('Has password:', !!rows[0].password_hash);
      console.log('Hash prefix:', rows[0].password_hash?.substring(0, 10));
      console.log('Active:', rows[0].is_active);
      console.log('Role:', rows[0].role);
    } else {
      console.log('User not found');
    }

    // Try to reset password with bcrypt
    const bcrypt = require('bcrypt');
    const newHash = await bcrypt.hash('Test@1234', 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE email = $2', [newHash, 'priya@mhub.com']);
    console.log('\nPassword reset to Test@1234');
    console.log('New hash:', newHash.substring(0, 20) + '...');

    // Also ensure user is active
    await pool.query("UPDATE users SET is_active = true WHERE email = $1", ['priya@mhub.com']);
    console.log('User activated');

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
})();
