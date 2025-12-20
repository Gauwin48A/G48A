-- ============================================================
-- COMPREHENSIVE FIX SCRIPT FOR MHUB (Version 3 - Fixed)
-- Fixes: JSONB categories, Strong password (Password123!), Missing columns
-- Run this script to fix all data issues
-- ============================================================

-- ============================================================
-- 1. FIX PASSWORDS WITH STRONG PASSWORD (Password123!)
-- Hash generated using bcrypt with 10 rounds
-- ============================================================

UPDATE users SET password_hash = '$2b$10$wddoujk7R1dyvpbL10iiiY.7exverHQbjFWXiIoIhiQKemlypHKKrC';

-- ============================================================
-- 2. FIX REFERRAL CHAINS (Direct and Indirect Referrals)
-- ============================================================

UPDATE users SET referred_by = 5 WHERE user_id IN (6, 7, 8);
UPDATE users SET referred_by = 6 WHERE user_id IN (9, 10, 11);
UPDATE users SET referred_by = 7 WHERE user_id IN (12, 13);
UPDATE users SET referred_by = 8 WHERE user_id IN (14, 15);
UPDATE users SET referred_by = 1 WHERE user_id IN (2, 3, 4);
UPDATE users SET referred_by = 2 WHERE user_id IN (16, 17);
UPDATE users SET referred_by = 3 WHERE user_id IN (18, 19, 20);

-- ============================================================
-- 3. ENSURE REQUIRED COLUMNS EXIST
-- ============================================================

ALTER TABLE posts ADD COLUMN IF NOT EXISTS buyer_id INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_at TIMESTAMP;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS condition VARCHAR(50);

-- ============================================================
-- 4. ADD POSTS FOR USER 5 (Vikram Singh) - Active, Sold, Bought
-- ============================================================

DELETE FROM posts WHERE user_id = 5;

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, condition, created_at)
VALUES 
(5, 1, 1, 'iPhone 14 Pro Max - Like New', 'Barely used iPhone 14 Pro Max, 256GB, Space Black color.', 89999, 'Mumbai', 'active', 'Like New', NOW() - INTERVAL '2 days'),
(5, 1, 1, 'MacBook Air M2 - 2023', 'Apple MacBook Air M2 chip, 8GB RAM, 512GB SSD.', 105000, 'Mumbai', 'active', 'Excellent', NOW() - INTERVAL '5 days'),
(5, 2, 1, 'Sony WH-1000XM5 Headphones', 'Industry leading noise cancellation headphones.', 24999, 'Mumbai', 'active', 'Good', NOW() - INTERVAL '7 days'),
(5, 3, 1, 'Nike Air Jordan 1 Retro', 'Limited edition Nike Air Jordan 1, Size UK 9.', 15999, 'Mumbai', 'active', 'Like New', NOW() - INTERVAL '3 days');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, condition, buyer_id, sold_at, created_at)
VALUES 
(5, 1, 1, 'Samsung Galaxy S23 Ultra', 'Samsung flagship phone, 256GB.', 79999, 'Mumbai', 'sold', 'Excellent', 2, NOW() - INTERVAL '1 day', NOW() - INTERVAL '10 days'),
(5, 4, 1, 'Herman Miller Aeron Chair', 'Original Herman Miller office chair.', 45000, 'Mumbai', 'sold', 'Good', 3, NOW() - INTERVAL '3 days', NOW() - INTERVAL '15 days'),
(5, 2, 1, 'Apple AirPods Pro 2', 'Genuine Apple AirPods Pro 2nd generation.', 18999, 'Mumbai', 'sold', 'Like New', 4, NOW() - INTERVAL '5 days', NOW() - INTERVAL '20 days');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, condition, buyer_id, sold_at, created_at)
VALUES 
(2, 1, 1, 'OnePlus 12 - Brand New', 'OnePlus 12, 256GB. Bought by Vikram!', 64999, 'Delhi', 'sold', 'Brand New', 5, NOW() - INTERVAL '2 days', NOW() - INTERVAL '12 days'),
(3, 5, 1, 'Kindle Paperwhite 11th Gen', 'Amazon Kindle, like new.', 12999, 'Bangalore', 'sold', 'Like New', 5, NOW() - INTERVAL '4 days', NOW() - INTERVAL '18 days');

-- ============================================================
-- 5. FIX PREFERENCES TABLE - Add missing columns first
-- ============================================================

-- Add missing columns to existing preferences table
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT true;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Delete existing preferences and insert fresh data
DELETE FROM preferences WHERE user_id IN (1,2,3,4,5,6,7,8,9,10);

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
(10, 'Jaipur', 500, 20000, '["Fashion", "Beauty"]'::jsonb, true);

-- ============================================================
-- 6. FIX REWARDS TABLE - Add missing columns first
-- ============================================================

ALTER TABLE rewards ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

DELETE FROM rewards WHERE user_id IN (1,2,3,4,5,6,7,8,9,10);

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
(10, 5500, 'Platinum', 10);

-- ============================================================
-- 7. FIX PROFILES TABLE - Ensure full_name is set
-- ============================================================

UPDATE profiles SET full_name = 'Rahul Sharma' WHERE user_id = 1 AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Priya Patel' WHERE user_id = 2 AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Amit Kumar' WHERE user_id = 3 AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Sneha Reddy' WHERE user_id = 4 AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Vikram Singh' WHERE user_id = 5;
UPDATE profiles SET full_name = 'Neha Gupta' WHERE user_id = 6 AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Arjun Nair' WHERE user_id = 7 AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Kavya Menon' WHERE user_id = 8 AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Rohan Singh' WHERE user_id = 9 AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Ananya Das' WHERE user_id = 10 AND (full_name IS NULL OR full_name = '');

-- ============================================================
-- 8. ADD REWARD_LOG TABLE FOR HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS reward_log (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    action VARCHAR(100),
    points INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

DELETE FROM reward_log WHERE user_id = 5;

INSERT INTO reward_log (user_id, action, points, description, created_at)
VALUES 
(5, 'referral_bonus', 50, 'Direct referral: Neha Gupta joined', NOW() - INTERVAL '20 days'),
(5, 'referral_bonus', 50, 'Direct referral: Arjun Nair joined', NOW() - INTERVAL '15 days'),
(5, 'referral_bonus', 50, 'Direct referral: Kavya Menon joined', NOW() - INTERVAL '10 days'),
(5, 'indirect_referral', 10, 'Indirect referral: Rohan Singh joined', NOW() - INTERVAL '8 days'),
(5, 'sale_bonus', 100, 'Sold Samsung Galaxy S23 Ultra', NOW() - INTERVAL '1 day'),
(5, 'daily_login', 10, 'Daily login streak bonus', NOW()),
(5, 'post_created', 20, 'Created: iPhone 14 Pro Max', NOW() - INTERVAL '2 days');

-- ============================================================
-- 9. ENSURE REFERRAL CODES EXIST
-- ============================================================

UPDATE users SET referral_code = 'REF' || LPAD(user_id::text, 6, '0') WHERE referral_code IS NULL;

-- ============================================================
-- 10. VERIFY DATA
-- ============================================================

SELECT 'Posts for User 5:' as info, COUNT(*) as total FROM posts WHERE user_id = 5;
SELECT 'Bought by User 5:' as info, COUNT(*) as total FROM posts WHERE buyer_id = 5;
SELECT 'Referrals of User 5:' as info, COUNT(*) as total FROM users WHERE referred_by = 5;

-- ============================================================
-- DONE! Login with:
-- Email: vikram.singh@mhub.com
-- Password: Password123!
-- ============================================================
