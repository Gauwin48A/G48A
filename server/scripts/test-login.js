// Direct login test bypassing all middleware
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const argon2 = require('argon2');

async function main() {
  const p = new Pool({
    host: 'localhost', port: 5432,
    database: 'mhub', user: 'mhub', password: 'postgres',
  });

  const email = 'rahul.sharma@mhub.com';
  const password = 'Password123!';

  const result = await p.query(
    `SELECT u.user_id, u.name, u.email, u.phone_number, u.role,
            u.password_hash, u.is_active, u.lock_until, u.login_attempts
     FROM users u
     WHERE LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  if (result.rows.length === 0) {
    console.log('USER NOT FOUND');
    await p.end();
    return;
  }

  const user = result.rows[0];
  console.log('User:', user.email, 'active:', user.is_active);
  console.log('Hash starts with:', user.password_hash?.substring(0, 10));

  const isLegacyBcrypt = user.password_hash?.startsWith('$2b$') || user.password_hash?.startsWith('$2a$');
  console.log('Is bcrypt:', isLegacyBcrypt);

  let isMatch = false;
  if (isLegacyBcrypt) {
    isMatch = await bcrypt.compare(password, user.password_hash);
  } else {
    try {
      isMatch = await argon2.verify(user.password_hash, password);
    } catch (e) {
      console.log('argon2 error:', e.message);
    }
  }

  console.log('Password match:', isMatch);

  // Now test via HTTP with full verbose output
  const csrf = await fetch('http://localhost:5001/api/auth/csrf-token');
  const cookies = csrf.headers.getSetCookie?.() || [];
  const xsrf = (cookies.find(c => c.startsWith('XSRF-TOKEN=')) || '').split('=')[1]?.split(';')[0] || '';
  const cookieStr = cookies.map(c => c.split(';')[0]).join('; ');

  const r = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookieStr,
      'X-XSRF-TOKEN': xsrf,
      'X-MHub-Timestamp': String(Date.now()),
      'X-MHub-Nonce': 'test-' + Math.random().toString(36).slice(2),
    },
    body: JSON.stringify({ identifier: email, password: password }),
  });

  console.log('HTTP Status:', r.status);
  const headers = {};
  r.headers.forEach((v, k) => { headers[k] = v; });
  console.log('Response headers:', JSON.stringify(headers, null, 2));
  const body = await r.text();
  console.log('Response body:', body.substring(0, 800));

  await p.end();
}

main().catch(e => console.error('Fatal:', e));
