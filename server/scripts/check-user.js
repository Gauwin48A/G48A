const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const p = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mhub',
    user: 'mhub',
    password: 'postgres',
  });
  try {
    // Check if user exists
    const r = await p.query(
      "SELECT user_id, email, phone_number, name, is_active, password_hash, login_attempts, lock_until FROM users WHERE LOWER(email) = LOWER('rahul.sharma@mhub.com') LIMIT 1"
    );
    if (r.rows.length === 0) {
      console.log('USER NOT FOUND - need to create test user');
      // Create a test user with known password
      const hash = await bcrypt.hash('Password123!', 10);
      const ins = await p.query(
        "INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('Rahul Sharma', 'rahul.sharma@mhub.com', $1, 'admin', true) RETURNING user_id, email",
        [hash]
      );
      console.log('CREATED:', JSON.stringify(ins.rows[0]));
    } else {
      const user = r.rows[0];
      console.log('User found:', user.email, 'active:', user.is_active, 'has_password:', !!user.password_hash, 'attempts:', user.login_attempts, 'lock_until:', user.lock_until);
      // Test password
      if (user.password_hash) {
        const match1 = await bcrypt.compare('Password123!', user.password_hash).catch(() => false);
        console.log('Password123! matches:', match1);
        const match2 = await bcrypt.compare('password123', user.password_hash).catch(() => false);
        console.log('password123 matches:', match2);
        
        if (!match1 && !match2) {
          // Reset password
          const newHash = await bcrypt.hash('Password123!', 10);
          await p.query("UPDATE users SET password_hash = $1, login_attempts = 0, lock_until = NULL WHERE user_id = $2", [newHash, user.user_id]);
          console.log('PASSWORD RESET to Password123!');
        }
        // Clear any lock
        if (user.lock_until || user.login_attempts > 0) {
          await p.query("UPDATE users SET login_attempts = 0, lock_until = NULL WHERE user_id = $1", [user.user_id]);
          console.log('Cleared login attempts and lock');
        }
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.end();
  }
}
main();
