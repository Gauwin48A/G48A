-- =====================================================
-- MHUB MASTER DATABASE SCRIPT
-- Version: 2.0 (Consolidated Production)
-- Run: \i 'C:/Users/laksh/GITHUB/AG/Mhub/server/database/00_master_setup.sql'
-- =====================================================
-- This single file replaces all other SQL files in this folder.
-- It creates the complete schema, seed data, and 50 test users.
-- =====================================================

-- ===========================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ===========================================
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS buyer_inquiries CASCADE;
DROP TABLE IF EXISTS preferences CASCADE;
DROP TABLE IF EXISTS user_locations CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS channels CASCADE;
DROP TABLE IF EXISTS tiers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ===========================================
-- STEP 2: CREATE CORE TABLES
-- ===========================================

-- USERS
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'premium', 'admin')),
    referral_code VARCHAR(20) UNIQUE,
    referred_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    isAadhaarVerified BOOLEAN DEFAULT FALSE,
    preferred_language VARCHAR(10) DEFAULT 'en',
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- PROFILES
CREATE TABLE profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    avatar_url VARCHAR(500),
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- CATEGORIES
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

-- TIERS
CREATE TABLE tiers (
    tier_id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    features JSONB,
    description TEXT
);

-- POSTS
CREATE TABLE posts (
    post_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    tier_id INTEGER REFERENCES tiers(tier_id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    location VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'bought', 'inactive', 'expired', 'undone')),
    images JSONB,
    condition VARCHAR(20) DEFAULT 'good',
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_price ON posts(price);
CREATE INDEX idx_posts_created ON posts(created_at DESC);

-- REFERRALS
CREATE TABLE referrals (
    referral_id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    referee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    bonus_awarded DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referrer_id, referee_id)
);

-- REWARDS
CREATE TABLE rewards (
    reward_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'Bronze',
    last_activity TIMESTAMP DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    buyer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- FEEDBACK
CREATE TABLE feedback (
    feedback_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
);

-- PREFERENCES
CREATE TABLE preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    location VARCHAR(100),
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2),
    categories JSONB,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- USER LOCATIONS
CREATE TABLE user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(10,2),
    heading DECIMAL(10,2),
    city VARCHAR(100),
    country VARCHAR(100),
    permission_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- CHANNELS
CREATE TABLE channels (
    channel_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT TRUE,
    member_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- BUYER INQUIRIES
CREATE TABLE buyer_inquiries (
    inquiry_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);

-- REVIEWS
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    reviewer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(100),
    comment TEXT,
    helpful_count INTEGER DEFAULT 0,
    verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (reviewer_id, reviewee_id, post_id)
);

-- ===========================================
-- STEP 3: SEED CATEGORIES AND TIERS
-- ===========================================
INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets and electronic devices'),
('Mobiles', 'Smartphones and tablets'),
('Fashion', 'Clothing and accessories'),
('Furniture', 'Home and office furniture'),
('Vehicles', 'Cars, bikes, and more'),
('Books', 'Educational and fiction books'),
('Sports', 'Sports equipment'),
('Home Appliances', 'Kitchen and home appliances'),
('Beauty', 'Cosmetics and personal care'),
('Kids', 'Toys and kids items');

INSERT INTO tiers (name, price, description) VALUES
('Free', 0.00, 'Basic listing with limited features'),
('Standard', 99.00, 'Enhanced visibility for 7 days'),
('Premium', 299.00, 'Top placement for 14 days'),
('Featured', 499.00, 'Homepage spotlight for 30 days');

-- ===========================================
-- STEP 4: CREATE 50 USERS WITH PROFILES
-- ===========================================
DO $$
DECLARE
    i INTEGER;
    v_username TEXT;
    v_email TEXT;
    v_role TEXT;
    v_lang TEXT;
    names TEXT[] := ARRAY[
        'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh',
        'Anita Gupta', 'Rajesh Verma', 'Pooja Nair', 'Suresh Iyer', 'Kavitha Menon',
        'Arjun Das', 'Meera Joshi', 'Karthik Rao', 'Lakshmi Pillai', 'Sanjay Mishra',
        'Deepa Krishnan', 'Arun Bhat', 'Divya Sharma', 'Manoj Tiwari', 'Sunita Bansal',
        'Ravi Shankar', 'Geeta Saxena', 'Nitin Agarwal', 'Rekha Dubey', 'Ashok Jain',
        'Padma Iyengar', 'Venkat Swamy', 'Uma Maheshwari', 'Ganesh Kulkarni', 'Bhavani Rajan',
        'Harish Bhai', 'Sarla Devi', 'Mohan Lal', 'Kamala Das', 'Prakash Yadav',
        'Suman Kumari', 'Dinesh Thakur', 'Parvati Shetty', 'Ramesh Pandey', 'Annapurna Roy',
        'Vikas Chauhan', 'Shanti Nath', 'Mukesh Kapoor', 'Radha Venkatesh', 'Sunil Mehta',
        'Lalitha Naidu', 'Ajay Chatterjee', 'Usha Krishnamurthy', 'Kishan Reddy', 'Jayanthi Bose'
    ];
    locations TEXT[] := ARRAY['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi'];
    roles TEXT[] := ARRAY['user', 'user', 'user', 'premium', 'user', 'user', 'admin', 'user', 'premium', 'user'];
    langs TEXT[] := ARRAY['en', 'hi', 'te', 'ta', 'kn', 'mr', 'en', 'hi', 'te', 'en'];
BEGIN
    FOR i IN 1..50 LOOP
        v_username := 'user' || i;
        v_email := LOWER(REPLACE(names[i], ' ', '.')) || '@mhub.com';
        v_role := roles[((i - 1) % 10) + 1];
        v_lang := langs[((i - 1) % 10) + 1];
        
        INSERT INTO users (username, email, password_hash, role, referral_code, preferred_language)
        VALUES (
            v_username,
            v_email,
            '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- password123
            v_role,
            'REF' || LPAD(i::TEXT, 6, '0'),
            v_lang
        ) ON CONFLICT (email) DO NOTHING;
        
        INSERT INTO profiles (user_id, full_name, phone, address)
        SELECT user_id, names[i], '98' || LPAD((1000000000 + i * 12345)::TEXT, 8, '0'), locations[((i - 1) % 10) + 1]
        FROM users WHERE email = v_email
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
    RAISE NOTICE 'Created 50 users with profiles';
END $$;

-- ===========================================
-- STEP 5: CREATE REFERRAL CHAIN
-- ===========================================
INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded)
SELECT 1, user_id, 'completed', 50.00 FROM users WHERE user_id IN (2, 3, 4)
ON CONFLICT DO NOTHING;

INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded)
SELECT 2, user_id, 'completed', 50.00 FROM users WHERE user_id IN (5, 6, 7)
ON CONFLICT DO NOTHING;

UPDATE users SET referred_by = 1 WHERE user_id IN (2, 3, 4);
UPDATE users SET referred_by = 2 WHERE user_id IN (5, 6, 7);

-- ===========================================
-- STEP 6: CREATE REWARDS
-- ===========================================
INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 
       100 + (user_id * 50),
       CASE 
           WHEN user_id <= 5 THEN 'Gold'
           WHEN user_id <= 15 THEN 'Silver'
           ELSE 'Bronze'
       END
FROM users
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points;

-- ===========================================
-- STEP 7: CREATE 100+ POSTS
-- ===========================================
DO $$
DECLARE
    i INTEGER;
    v_user_id INTEGER;
    v_cat_id INTEGER;
    v_tier_id INTEGER;
    titles TEXT[] := ARRAY[
        'iPhone 15 Pro Max - Like New', 'Samsung Galaxy S24 Ultra', 'MacBook Pro M3 14"', 'Sony WH-1000XM5',
        'PlayStation 5 with Games', 'Nintendo Switch OLED', 'Canon EOS R6 Camera', 'DJI Mini 3 Pro Drone',
        'Apple Watch Ultra 2', 'iPad Pro 12.9" M2', 'Dell XPS 15 Laptop', 'Bose QuietComfort Earbuds',
        'LG 65" OLED TV', 'Dyson V15 Vacuum', 'Instant Pot Duo 7-in-1', 'KitchenAid Stand Mixer',
        'Herman Miller Aeron Chair', 'Standing Desk Electric', 'L-Shaped Gaming Desk', 'Ergonomic Office Chair',
        'Royal Enfield Classic 350', 'Honda Activa 6G', 'Toyota Fortuner 2023', 'Maruti Suzuki Swift',
        'Nike Air Jordan 1', 'Adidas Ultraboost 23', 'Levi''s 501 Jeans', 'Ray-Ban Aviators',
        'NCERT Books Complete Set', 'Harry Potter Box Set', 'Engineering Textbooks', 'Medical Reference Books',
        'Cricket Kit Complete', 'Badminton Racket Pro', 'Football Shoes Nike', 'Yoga Mat Premium',
        'Air Conditioner 1.5 Ton', 'Refrigerator Double Door', 'Washing Machine Front Load', 'Microwave Oven Convection'
    ];
    locations TEXT[] := ARRAY['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi'];
    conditions TEXT[] := ARRAY['new', 'like_new', 'good', 'fair'];
    statuses TEXT[] := ARRAY['active', 'active', 'active', 'active', 'sold'];
BEGIN
    FOR i IN 1..105 LOOP
        v_user_id := ((i - 1) % 50) + 1;
        v_cat_id := ((i - 1) % 10) + 1;
        v_tier_id := ((i - 1) % 4) + 1;
        
        INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, latitude, longitude, status, condition, views_count)
        VALUES (
            v_user_id,
            v_cat_id,
            v_tier_id,
            titles[((i - 1) % 40) + 1],
            'High quality item in excellent condition. Contact for details.',
            5000 + (i * 500) + (RANDOM() * 10000)::INTEGER,
            locations[((i - 1) % 10) + 1],
            17.38 + (RANDOM() * 0.1),
            78.48 + (RANDOM() * 0.1),
            statuses[((i - 1) % 5) + 1],
            conditions[((i - 1) % 4) + 1],
            (RANDOM() * 500)::INTEGER
        );
    END LOOP;
    RAISE NOTICE 'Created 105 posts';
END $$;

-- ===========================================
-- STEP 8: CREATE PREFERENCES FOR 30 USERS
-- ===========================================
INSERT INTO preferences (user_id, location, min_price, max_price, categories, notification_enabled)
SELECT user_id, 
       CASE (user_id % 5) WHEN 0 THEN 'Mumbai' WHEN 1 THEN 'Delhi' WHEN 2 THEN 'Bangalore' WHEN 3 THEN 'Chennai' ELSE 'Hyderabad' END,
       1000 + (user_id * 100),
       50000 + (user_id * 1000),
       '["Electronics", "Mobiles"]'::JSONB,
       user_id % 2 = 0
FROM users WHERE user_id <= 30
ON CONFLICT (user_id) DO NOTHING;

-- ===========================================
-- STEP 9: CREATE NOTIFICATIONS
-- ===========================================
INSERT INTO notifications (user_id, title, message, type, is_read)
SELECT user_id, 
       CASE (user_id % 5) 
           WHEN 0 THEN 'New inquiry on your post!'
           WHEN 1 THEN 'Referral bonus earned!'
           WHEN 2 THEN 'Your post is trending!'
           WHEN 3 THEN 'Profile verification complete'
           ELSE 'Weekly digest available'
       END,
       'Check your dashboard for more details.',
       CASE (user_id % 4) WHEN 0 THEN 'inquiry' WHEN 1 THEN 'reward' WHEN 2 THEN 'system' ELSE 'marketing' END,
       user_id % 3 = 0
FROM users WHERE user_id <= 40;

-- ===========================================
-- STEP 10: CREATE SAMPLE REVIEWS
-- ===========================================
INSERT INTO reviews (reviewer_id, reviewee_id, rating, title, comment, verified_purchase)
VALUES 
(6, 1, 5, 'Excellent seller!', 'Fast delivery, product as described. Highly recommended!', true),
(7, 1, 4, 'Good experience', 'Product was good, slight delay but overall satisfied.', true),
(8, 2, 5, 'Amazing quality!', 'Best purchase I made this year. Will buy again!', true),
(9, 3, 3, 'Average', 'Product is okay, not great but acceptable for the price.', false)
ON CONFLICT DO NOTHING;

-- ===========================================
-- FINAL: VERIFICATION
-- ===========================================
SELECT 'SETUP COMPLETE!' as status;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Posts: ' || COUNT(*) FROM posts;
SELECT 'Categories: ' || COUNT(*) FROM categories;
SELECT 'Tiers: ' || COUNT(*) FROM tiers;
SELECT 'Login with: rahul.sharma@mhub.com / password123' as credentials;
