const argon2 = require("argon2");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "mhub",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "mhub",
});

async function createTestUsers() {
  const client = await pool.connect();
  try {
    console.log("🌱 Creating test user credentials...\n");
    const userPassHash = await argon2.hash("Test@123456");
    const adminPassHash = await argon2.hash("Admin@123456");

    // 1. New Unsubscribed User
    await client.query(`
      INSERT INTO users (username, name, email, phone_number, password_hash, role, is_active, kyc_verified, tier)
      VALUES ('newuser', 'New Test User', 'newuser@mhub.com', '9876543210', $1, 'user', true, false, 'none')
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = $1, 
        is_active = true,
        kyc_verified = false, 
        tier = 'none';
    `, [userPassHash]);

    // 2. Active Verified User (Gold Plan + Verified KYC)
    await client.query(`
      INSERT INTO users (username, name, email, phone_number, password_hash, role, is_active, kyc_verified, tier)
      VALUES ('rahulsharma', 'Rahul Sharma', 'rahul.sharma@mhub.com', '9999999999', $1, 'user', true, true, 'gold')
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = $1, 
        is_active = true,
        kyc_verified = true, 
        tier = 'gold';
    `, [userPassHash]);

    // 3. Admin User
    await client.query(`
      INSERT INTO users (username, name, email, phone_number, password_hash, role, is_active, kyc_verified, tier)
      VALUES ('adminuser', 'Platform Admin', 'admin@mhub.com', '9000000000', $1, 'admin', true, true, 'premium')
      ON CONFLICT (email) DO UPDATE SET 
        password_hash = $1, 
        role = 'admin',
        is_active = true;
    `, [adminPassHash]);

    console.log("✅ Test accounts successfully created & updated!");
  } catch (err) {
    console.error("❌ Error seeding test users:", err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createTestUsers();
