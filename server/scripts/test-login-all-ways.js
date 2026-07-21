const argon2 = require('argon2');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'mhub',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'mhub',
});

async function verifyCredential(identifier, password, label) {
  const res = await pool.query(
    `SELECT u.user_id, u.name, u.email, u.phone_number, u.username, u.password_hash 
     FROM users u 
     WHERE LOWER(u.email) = LOWER($1) 
        OR LOWER(COALESCE(u.username, '')) = LOWER($1) 
        OR u.phone_number = $1 
     LIMIT 1`,
    [identifier]
  );

  if (res.rows.length === 0) {
    console.log(`[${label}] Identifier: "${identifier}" -> ❌ USER NOT FOUND IN DB`);
    return;
  }

  const user = res.rows[0];
  const isMatch = await argon2.verify(user.password_hash, password);

  if (isMatch) {
    console.log(`[${label}] Identifier: "${identifier}" -> ✅ AUTH SUCCESS! Name: ${user.name} | Email: ${user.email} | Phone: ${user.phone_number}`);
  } else {
    console.log(`[${label}] Identifier: "${identifier}" -> ❌ PASSWORD MISMATCH`);
  }
}

async function main() {
  console.log("🧪 Testing Database Multi-Identifier Match (Email, Phone, Username)...\n");
  // 1. Test Email
  await verifyCredential('newuser@mhub.com', 'Test@123456', 'EMAIL AUTH');
  // 2. Test Phone Number
  await verifyCredential('9876543210', 'Test@123456', 'PHONE NUMBER AUTH');
  // 3. Test Username
  await verifyCredential('newuser', 'Test@123456', 'USERNAME AUTH');
  
  await pool.end();
}

main().catch(console.error);
