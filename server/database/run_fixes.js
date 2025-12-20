// Run SQL script to fix all data issues - Password: Password123!
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'mhub_db',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function runFixes() {
  const client = await pool.connect();

  try {
    console.log('Starting comprehensive fixes...\n');

    // 0. Update all user passwords to Password123!
    console.log('0. Updating passwords to Password123!...');
    const strongPassword = 'Password123!';
    const hash = await bcrypt.hash(strongPassword, 10);
    await client.query(`UPDATE users SET password_hash = $1`, [hash]);
    console.log('   ✅ All passwords updated to: Password123!\n');

    // 1. Ensure required columns exist
    console.log('1. Adding missing columns...');
    await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS buyer_id INTEGER`);
    await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP`);
    await client.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS condition VARCHAR(50)`);
    console.log('   ✅ Column check complete\n');

    // 2. Fix referral chains
    console.log('2. Setting up referral chains...');
    await client.query(`UPDATE users SET referred_by = 5 WHERE user_id IN (6, 7, 8)`);
    await client.query(`UPDATE users SET referred_by = 6 WHERE user_id IN (9, 10, 11)`);
    await client.query(`UPDATE users SET referred_by = 7 WHERE user_id IN (12, 13)`);
    await client.query(`UPDATE users SET referred_by = 8 WHERE user_id IN (14, 15)`);
    await client.query(`UPDATE users SET referred_by = 1 WHERE user_id IN (2, 3, 4)`);
    console.log('   ✅ Referral chains created\n');

    // 3. Delete existing posts for user 5 and add new ones
    console.log('3. Adding posts for user 5 (Vikram Singh)...');
    await client.query(`DELETE FROM posts WHERE user_id = 5`);

    // Active posts
    await client.query(`
      INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, condition, created_at)
      VALUES 
      (5, 1, 1, 'iPhone 14 Pro Max - Like New', 'Barely used iPhone 14 Pro Max, 256GB, Space Black color.', 89999, 'Mumbai', 'active', 'Like New', NOW() - INTERVAL '2 days'),
      (5, 1, 1, 'MacBook Air M2 - 2023', 'Apple MacBook Air M2 chip, 8GB RAM, 512GB SSD.', 105000, 'Mumbai', 'active', 'Excellent', NOW() - INTERVAL '5 days'),
      (5, 2, 1, 'Sony WH-1000XM5 Headphones', 'Industry leading noise cancellation headphones.', 24999, 'Mumbai', 'active', 'Good', NOW() - INTERVAL '7 days')
    `);

    // Sold posts
    await client.query(`
      INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, condition, buyer_id, sold_at, created_at)
      VALUES 
      (5, 1, 1, 'Samsung Galaxy S23 Ultra', 'Samsung flagship phone, 256GB.', 79999, 'Mumbai', 'sold', 'Excellent', 2, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
      (5, 4, 1, 'Herman Miller Aeron Chair', 'Original Herman Miller office chair.', 45000, 'Mumbai', 'sold', 'Good', 3, NOW() - INTERVAL '3 days', NOW() - INTERVAL '15 days')
    `);

    // Posts that user 5 bought (from other users)
    await client.query(`
      INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, condition, buyer_id, sold_at, created_at)
      VALUES 
      (2, 1, 1, 'OnePlus 12 - Brand New', 'OnePlus 12, 256GB, Flowy Emerald. Bought by Vikram!', 64999, 'Delhi', 'sold', 'Brand New', 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 days'),
      (3, 5, 1, 'Kindle Paperwhite 11th Gen', 'Amazon Kindle, like new condition.', 12999, 'Bangalore', 'sold', 'Like New', 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '18 days')
    `);
    console.log('   ✅ Posts created for user 5\n');

    // 4. Fix preferences (Using JSONB for categories)
    console.log('4. Setting up preferences...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS preferences (
        preference_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        location VARCHAR(100),
        min_price DECIMAL(12,2) DEFAULT 0,
        max_price DECIMAL(12,2) DEFAULT 100000,
        categories JSONB DEFAULT '[]'::jsonb,
        notification_enabled BOOLEAN DEFAULT true,
        date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO preferences (user_id, location, min_price, max_price, categories, notification_enabled)
      VALUES 
      (1, 'Delhi', 1000, 50000, '["Electronics", "Mobiles"]'::jsonb, true),
      (2, 'Mumbai', 500, 30000, '["Electronics", "Fashion"]'::jsonb, true),
      (3, 'Bangalore', 2000, 80000, '["Mobiles", "Furniture"]'::jsonb, true),
      (4, 'Chennai', 1000, 40000, '["Books", "Electronics"]'::jsonb, true),
      (5, 'Mumbai', 1500, 55000, '["Electronics", "Mobiles"]'::jsonb, true),
      (6, 'Hyderabad', 500, 25000, '["Fashion", "Beauty"]'::jsonb, true),
      (7, 'Pune', 1000, 60000, '["Furniture", "Home Appliances"]'::jsonb, true),
      (8, 'Kolkata', 800, 35000, '["Kids", "Books"]'::jsonb, true),
      (9, 'Ahmedabad', 2000, 70000, '["Electronics", "Vehicles"]'::jsonb, true),
      (10, 'Jaipur', 500, 20000, '["Fashion", "Beauty"]'::jsonb, true)
      ON CONFLICT (user_id) DO UPDATE SET
      location = EXCLUDED.location,
      min_price = EXCLUDED.min_price,
      max_price = EXCLUDED.max_price,
      categories = EXCLUDED.categories,
      notification_enabled = EXCLUDED.notification_enabled,
      updated_at = NOW()
    `);
    console.log('   ✅ Preferences created\n');

    // 5. Fix rewards
    console.log('5. Setting up rewards...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rewards (
        reward_id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE,
        points INTEGER DEFAULT 0,
        tier VARCHAR(20) DEFAULT 'Bronze',
        streak INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      INSERT INTO rewards (user_id, points, tier, streak)
      VALUES 
      (1, 1500, 'Silver', 5),
      (2, 850, 'Silver', 3),
      (3, 2500, 'Gold', 7),
      (4, 400, 'Bronze', 2),
      (5, 350, 'Bronze', 1),
      (6, 600, 'Silver', 4),
      (7, 1200, 'Silver', 6),
      (8, 300, 'Bronze', 1),
      (9, 450, 'Bronze', 2),
      (10, 5500, 'Platinum', 10)
      ON CONFLICT (user_id) DO UPDATE SET
      points = EXCLUDED.points,
      tier = EXCLUDED.tier,
      streak = EXCLUDED.streak,
      updated_at = NOW()
    `);
    console.log('   ✅ Rewards created\n');

    // 6. Fix profiles
    console.log('6. Updating profile names...');
    await client.query(`UPDATE profiles SET full_name = 'Vikram Singh' WHERE user_id = 5`);
    await client.query(`UPDATE profiles SET full_name = 'Rahul Sharma' WHERE user_id = 1 AND (full_name IS NULL OR full_name = '')`);
    await client.query(`UPDATE profiles SET full_name = 'Priya Patel' WHERE user_id = 2 AND (full_name IS NULL OR full_name = '')`);
    await client.query(`UPDATE profiles SET full_name = 'Amit Kumar' WHERE user_id = 3 AND (full_name IS NULL OR full_name = '')`);
    await client.query(`UPDATE profiles SET full_name = 'Sneha Reddy' WHERE user_id = 4 AND (full_name IS NULL OR full_name = '')`);
    await client.query(`UPDATE profiles SET full_name = 'Neha Gupta' WHERE user_id = 6 AND (full_name IS NULL OR full_name = '')`);
    console.log('   ✅ Profile names updated\n');

    // 7. Generate referral codes
    console.log('7. Generating referral codes...');
    await client.query(`UPDATE users SET referral_code = 'REF' || LPAD(user_id::text, 6, '0') WHERE referral_code IS NULL`);
    console.log('   ✅ Referral codes generated\n');

    // 8. Create reward log
    console.log('8. Creating reward history...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS reward_log (
        log_id SERIAL PRIMARY KEY,
        user_id INTEGER,
        action VARCHAR(100),
        points INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`DELETE FROM reward_log WHERE user_id = 5`);
    await client.query(`
      INSERT INTO reward_log (user_id, action, points, description, created_at)
      VALUES 
      (5, 'referral_bonus', 50, 'Direct referral: Neha Gupta joined using your code', NOW() - INTERVAL '20 days'),
      (5, 'referral_bonus', 50, 'Direct referral: Arjun Nair joined using your code', NOW() - INTERVAL '15 days'),
      (5, 'referral_bonus', 50, 'Direct referral: Kavya Menon joined using your code', NOW() - INTERVAL '10 days'),
      (5, 'indirect_referral', 10, 'Indirect referral: Rohan Singh joined via your chain', NOW() - INTERVAL '8 days'),
      (5, 'sale_bonus', 100, 'Sold Samsung Galaxy S23 Ultra', NOW() - INTERVAL '1 day'),
      (5, 'daily_login', 10, 'Daily login streak bonus', NOW()),
      (5, 'post_created', 20, 'Created new listing: iPhone 14 Pro Max', NOW() - INTERVAL '2 days')
    `);
    console.log('   ✅ Reward history created\n');

    // Summary
    const postsResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as sold
      FROM posts WHERE user_id = 5
    `);

    const boughtResult = await client.query(`SELECT COUNT(*) as bought FROM posts WHERE buyer_id = 5`);
    const referralsResult = await client.query(`SELECT COUNT(*) as referrals FROM users WHERE referred_by = 5`);

    console.log('========================================');
    console.log('USER 5 (Vikram Singh) SUMMARY:');
    console.log('========================================');
    console.log(`Posts: ${postsResult.rows[0].total} total (${postsResult.rows[0].active} active, ${postsResult.rows[0].sold} sold)`);
    console.log(`Bought: ${boughtResult.rows[0].bought} items`);
    console.log(`Direct Referrals: ${referralsResult.rows[0].referrals} users`);
    console.log('========================================');
    console.log('\n🔐 LOGIN CREDENTIALS:');
    console.log('   Email: vikram.singh@mhub.com');
    console.log('   Password: Password123!');
    console.log('========================================');
    console.log('\n✅ ALL FIXES COMPLETE!\n');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runFixes();
