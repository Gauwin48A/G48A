-- =====================================================
-- MHUB COMPLETE MASTER DATABASE SCRIPT
-- Version: 3.0 (Consolidated - All Features)
-- This single file creates the complete schema with all enhancements
-- Run: \i 'C:/Users/laksh/GITHUB/AG/Mhub/server/database/MASTER_COMPLETE.sql'
-- =====================================================
-- WARNING: This will DROP all existing tables and recreate them!
-- =====================================================

-- ===========================================
-- STEP 0: DROP ALL INDEXES FIRST (to avoid orphaned index errors)
-- ===========================================
DROP INDEX IF EXISTS idx_wishlist_user;
DROP INDEX IF EXISTS idx_wishlist_post;
DROP INDEX IF EXISTS idx_recently_viewed_user;
DROP INDEX IF EXISTS idx_recently_viewed_time;
DROP INDEX IF EXISTS idx_saved_searches_user;
DROP INDEX IF EXISTS idx_price_history_post;
DROP INDEX IF EXISTS idx_price_history_time;
DROP INDEX IF EXISTS idx_reports_status;
DROP INDEX IF EXISTS idx_reports_type;
DROP INDEX IF EXISTS idx_promoted_active;
DROP INDEX IF EXISTS idx_promoted_type;
DROP INDEX IF EXISTS idx_verification_user;
DROP INDEX IF EXISTS idx_verification_type;
DROP INDEX IF EXISTS idx_push_tokens_user;
DROP INDEX IF EXISTS idx_push_tokens_active;
DROP INDEX IF EXISTS idx_offers_post;
DROP INDEX IF EXISTS idx_offers_buyer;
DROP INDEX IF EXISTS idx_offers_seller;
DROP INDEX IF EXISTS idx_offers_status;
DROP INDEX IF EXISTS idx_price_alerts_user;
DROP INDEX IF EXISTS idx_price_alerts_active;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_referral_code;
DROP INDEX IF EXISTS idx_posts_user;
DROP INDEX IF EXISTS idx_posts_status;
DROP INDEX IF EXISTS idx_posts_category;
DROP INDEX IF EXISTS idx_posts_price;
DROP INDEX IF EXISTS idx_posts_created;
DROP INDEX IF EXISTS idx_posts_views;
DROP INDEX IF EXISTS idx_posts_category_price;
DROP INDEX IF EXISTS idx_posts_location;

-- ===========================================
-- STEP 1: DROP ALL EXISTING TABLES
-- ===========================================
DROP TABLE IF EXISTS escrow CASCADE;
DROP TABLE IF EXISTS price_drop_alerts CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS push_tokens CASCADE;
DROP TABLE IF EXISTS user_verifications CASCADE;
DROP TABLE IF EXISTS promoted_posts CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS recently_viewed CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
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

SELECT 'Dropped all existing tables and indexes' as status;

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
    rating DECIMAL(3,2) DEFAULT 0,
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
CREATE INDEX idx_posts_category ON posts(category_id);
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
-- STEP 3: CREATE ENHANCEMENT TABLES
-- ===========================================

-- WISHLISTS
CREATE TABLE wishlists (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);
CREATE INDEX idx_wishlist_user ON wishlists(user_id);
CREATE INDEX idx_wishlist_post ON wishlists(post_id);

-- RECENTLY VIEWED
CREATE TABLE recently_viewed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 1,
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);
CREATE INDEX idx_recently_viewed_user ON recently_viewed(user_id);
CREATE INDEX idx_recently_viewed_time ON recently_viewed(viewed_at DESC);

-- SAVED SEARCHES
CREATE TABLE saved_searches (
    search_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    search_name VARCHAR(100),
    search_query VARCHAR(255),
    category_id INTEGER REFERENCES categories(category_id),
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2),
    location VARCHAR(100),
    condition VARCHAR(20),
    filters JSONB,
    notification_enabled BOOLEAN DEFAULT TRUE,
    email_alert BOOLEAN DEFAULT FALSE,
    push_alert BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMP,
    matches_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);

-- PRICE HISTORY
CREATE TABLE price_history (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    old_price DECIMAL(12,2) NOT NULL,
    new_price DECIMAL(12,2) NOT NULL,
    percentage_change DECIMAL(5,2),
    changed_by INTEGER REFERENCES users(user_id),
    reason VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_price_history_post ON price_history(post_id);
CREATE INDEX idx_price_history_time ON price_history(changed_at DESC);

-- REPORTS
CREATE TABLE reports (
    report_id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reported_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reported_post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('spam', 'fraud', 'inappropriate', 'fake', 'harassment', 'other')),
    reason VARCHAR(200) NOT NULL,
    description TEXT,
    evidence_urls JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'rejected', 'escalated')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    admin_notes TEXT,
    resolved_by INTEGER REFERENCES users(user_id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_type ON reports(report_type);

-- PROMOTED POSTS
CREATE TABLE promoted_posts (
    promotion_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    promotion_type VARCHAR(50) NOT NULL CHECK (promotion_type IN ('featured', 'spotlight', 'boost', 'premium', 'homepage')),
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
    views_earned INTEGER DEFAULT 0,
    clicks_earned INTEGER DEFAULT 0,
    inquiries_earned INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_promoted_active ON promoted_posts(is_active, end_date);
CREATE INDEX idx_promoted_type ON promoted_posts(promotion_type);

-- USER VERIFICATIONS
CREATE TABLE user_verifications (
    verification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('email', 'phone', 'aadhaar', 'pan', 'driving_license', 'passport', 'bank_account')),
    verified_value VARCHAR(255),
    masked_value VARCHAR(100),
    document_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(user_id),
    rejection_reason TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, verification_type)
);
CREATE INDEX idx_verification_user ON user_verifications(user_id);
CREATE INDEX idx_verification_type ON user_verifications(verification_type);

-- PUSH TOKENS
CREATE TABLE push_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_token VARCHAR(500) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
    device_name VARCHAR(100),
    device_model VARCHAR(100),
    app_version VARCHAR(20),
    os_version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active);

-- OFFERS/NEGOTIATIONS
CREATE TABLE offers (
    offer_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    original_price DECIMAL(12,2) NOT NULL,
    offered_price DECIMAL(12,2) NOT NULL,
    counter_price DECIMAL(12,2),
    final_price DECIMAL(12,2),
    message TEXT,
    seller_response TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '48 hours'),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_offers_post ON offers(post_id);
CREATE INDEX idx_offers_buyer ON offers(buyer_id);
CREATE INDEX idx_offers_seller ON offers(seller_id);
CREATE INDEX idx_offers_status ON offers(status);

-- PRICE DROP ALERTS
CREATE TABLE price_drop_alerts (
    alert_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    target_price DECIMAL(12,2),
    percentage_threshold DECIMAL(5,2) DEFAULT 10.0,
    is_active BOOLEAN DEFAULT TRUE,
    last_notified_at TIMESTAMP,
    notification_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);
CREATE INDEX idx_price_alerts_user ON price_drop_alerts(user_id);
CREATE INDEX idx_price_alerts_active ON price_drop_alerts(is_active);

-- ===========================================
-- STEP 3.5: FUNCTIONS AND TRIGGERS
-- ===========================================

-- Function: Validate new post
CREATE OR REPLACE FUNCTION validate_add_post(
    p_user_id INT,
    p_category_id INT,
    p_tier_id INT,
    p_title VARCHAR,
    p_price NUMERIC,
    p_latitude NUMERIC,
    p_longitude NUMERIC
)
RETURNS TABLE(valid BOOLEAN, message TEXT, field TEXT) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RETURN QUERY SELECT FALSE, 'User not found.', 'user_id';
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id) THEN
        RETURN QUERY SELECT FALSE, 'Category not found.', 'category_id';
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM tiers WHERE tier_id = p_tier_id) THEN
        RETURN QUERY SELECT FALSE, 'Tier not found.', 'tier_id';
        RETURN;
    END IF;
    IF p_title IS NULL OR LENGTH(p_title) < 3 THEN
        RETURN QUERY SELECT FALSE, 'Title must be at least 3 characters long.', 'title';
        RETURN;
    END IF;
    IF p_price IS NULL OR p_price <= 0 THEN
        RETURN QUERY SELECT FALSE, 'Price must be a positive number.', 'price';
        RETURN;
    END IF;
    RETURN QUERY SELECT TRUE, 'Validation successful.', NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate view priority score (lower views = higher priority)
CREATE OR REPLACE FUNCTION calculate_view_priority_score(view_count INT)
RETURNS NUMERIC AS $$
BEGIN
    IF view_count = 0 THEN
        RETURN 1000.0;
    END IF;
    RETURN 1000.0 / (view_count + 1.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp trigger to posts
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply update timestamp trigger to users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Additional performance indexes
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views_count ASC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_category_price ON posts(category_id, price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location);

-- ===========================================
-- STEP 4: SEED CATEGORIES AND TIERS
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
-- STEP 5: CREATE 50 USERS WITH PROFILES
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
        
        INSERT INTO users (username, email, password_hash, role, referral_code, preferred_language, rating)
        VALUES (
            v_username,
            v_email,
            '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- password123
            v_role,
            'REF' || LPAD(i::TEXT, 6, '0'),
            v_lang,
            (3.5 + RANDOM() * 1.5)::DECIMAL(3,2)
        ) ON CONFLICT (email) DO NOTHING;
        
        INSERT INTO profiles (user_id, full_name, phone, address)
        SELECT user_id, names[i], '98' || LPAD((1000000000 + i * 12345)::TEXT, 8, '0'), locations[((i - 1) % 10) + 1]
        FROM users WHERE email = v_email
        ON CONFLICT (user_id) DO NOTHING;
    END LOOP;
    RAISE NOTICE 'Created 50 users with profiles';
END $$;

-- ===========================================
-- STEP 6: CREATE REFERRAL CHAIN & REWARDS
-- ===========================================
INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded)
SELECT 1, user_id, 'completed', 50.00 FROM users WHERE user_id IN (2, 3, 4)
ON CONFLICT DO NOTHING;

INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded)
SELECT 2, user_id, 'completed', 50.00 FROM users WHERE user_id IN (5, 6, 7)
ON CONFLICT DO NOTHING;

UPDATE users SET referred_by = 1 WHERE user_id IN (2, 3, 4);
UPDATE users SET referred_by = 2 WHERE user_id IN (5, 6, 7);

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
-- STEP 7: CREATE 120+ POSTS WITH DESCRIPTIONS
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
        'Nike Air Jordan 1', 'Adidas Ultraboost 23', 'Levis 501 Jeans', 'Ray-Ban Aviators',
        'NCERT Books Complete Set', 'Harry Potter Box Set', 'Engineering Textbooks', 'Medical Reference Books',
        'Cricket Kit Complete', 'Badminton Racket Pro', 'Football Shoes Nike', 'Yoga Mat Premium',
        'Air Conditioner 1.5 Ton', 'Refrigerator Double Door', 'Washing Machine Front Load', 'Microwave Oven Convection'
    ];
    descriptions TEXT[] := ARRAY[
        'High-quality electronics in excellent condition. All accessories included. Original box available. Thoroughly tested and working perfectly.',
        'Premium mobile device with original charger and accessories. Screen protector applied from day one. Battery health above 90%. No scratches.',
        'Trendy fashion item in pristine condition. Worn only 1-2 times for special occasions. No stains, tears, or fading. Original tags available.',
        'Sturdy and elegant furniture piece. Solid construction with premium materials. No wobbles or squeaks. Minor usage marks that add character.',
        'Well-maintained vehicle with complete service history. All documents up to date including insurance. Regular servicing done at authorized centers.',
        'Educational material in excellent condition. No markings or highlights. Perfect for students and competitive exam preparation.',
        'Professional-grade sports equipment. Used by serious athletes. Excellent grip and performance. Cleaned and sanitized.',
        'Energy-efficient home appliance with amazing performance. Still under warranty. All original accessories included. User manual available.',
        'Premium beauty product that works wonders! Unopened and sealed with authenticity guaranteed. Perfect for gifting.',
        'Safe and educational kids item that brings joy! Age-appropriate and non-toxic materials. Stimulates creativity and learning.'
    ];
    locations TEXT[] := ARRAY['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi'];
    conditions TEXT[] := ARRAY['new', 'like_new', 'good', 'fair'];
    statuses TEXT[] := ARRAY['active', 'active', 'active', 'active', 'sold'];
BEGIN
    FOR i IN 1..120 LOOP
        v_user_id := ((i - 1) % 50) + 1;
        v_cat_id := ((i - 1) % 10) + 1;
        v_tier_id := ((i - 1) % 4) + 1;
        
        INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, latitude, longitude, status, condition, views_count, created_at)
        VALUES (
            v_user_id,
            v_cat_id,
            v_tier_id,
            titles[((i - 1) % 40) + 1],
            descriptions[v_cat_id] || ' Contact for more details and photos. Price is negotiable for serious buyers.',
            5000 + (i * 500) + (RANDOM() * 10000)::INTEGER,
            locations[((i - 1) % 10) + 1],
            17.38 + (RANDOM() * 0.1),
            78.48 + (RANDOM() * 0.1),
            statuses[((i - 1) % 5) + 1],
            conditions[((i - 1) % 4) + 1],
            (RANDOM() * 500)::INTEGER,
            NOW() - (RANDOM() * 30 || ' days')::INTERVAL
        );
    END LOOP;
    RAISE NOTICE 'Created 120 posts with descriptions';
END $$;

-- ===========================================
-- STEP 8: CREATE PREFERENCES & NOTIFICATIONS
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
-- STEP 9: SAMPLE DATA FOR CORE TABLES
-- ===========================================

-- Transactions
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  IF array_length(v_post_ids, 1) >= 10 THEN
    INSERT INTO transactions (buyer_id, seller_id, post_id, amount, status, payment_method, completed_at, created_at) VALUES
    (5, 1, v_post_ids[1], 25000, 'completed', 'UPI', NOW() - INTERVAL '5 days', NOW() - INTERVAL '7 days'),
    (6, 2, v_post_ids[2], 45000, 'completed', 'Bank Transfer', NOW() - INTERVAL '3 days', NOW() - INTERVAL '5 days'),
    (7, 3, v_post_ids[3], 18500, 'completed', 'Cash', NOW() - INTERVAL '10 days', NOW() - INTERVAL '12 days'),
    (8, 4, v_post_ids[4], 75000, 'completed', 'UPI', NOW() - INTERVAL '2 days', NOW() - INTERVAL '4 days'),
    (9, 5, v_post_ids[5], 32000, 'pending', 'UPI', NULL, NOW() - INTERVAL '1 day'),
    (10, 6, v_post_ids[6], 15000, 'completed', 'Cash', NOW() - INTERVAL '20 days', NOW() - INTERVAL '22 days'),
    (11, 7, v_post_ids[7], 8500, 'cancelled', 'Bank Transfer', NULL, NOW() - INTERVAL '15 days'),
    (12, 8, v_post_ids[8], 120000, 'completed', 'Bank Transfer', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 days'),
    (13, 9, v_post_ids[9], 55000, 'completed', 'UPI', NOW() - INTERVAL '8 days', NOW() - INTERVAL '10 days'),
    (14, 10, v_post_ids[10], 28000, 'pending', 'Cash', NULL, NOW() - INTERVAL '2 hours')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Buyer Inquiries
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  IF array_length(v_post_ids, 1) >= 9 THEN
    INSERT INTO buyer_inquiries (post_id, buyer_id, seller_id, message, status, created_at) VALUES
    (v_post_ids[1], 5, 1, 'Hi, is this still available? Can you do a discount?', 'pending', NOW() - INTERVAL '2 hours'),
    (v_post_ids[1], 6, 1, 'Interested! Can we meet tomorrow?', 'responded', NOW() - INTERVAL '5 hours'),
    (v_post_ids[2], 7, 2, 'Is the phone unlocked for all carriers?', 'responded', NOW() - INTERVAL '1 day'),
    (v_post_ids[3], 8, 3, 'Any scratches on the screen?', 'pending', NOW() - INTERVAL '3 hours'),
    (v_post_ids[4], 9, 4, 'Will you consider exchange?', 'rejected', NOW() - INTERVAL '2 days'),
    (v_post_ids[5], 10, 5, 'Can you deliver to Noida?', 'pending', NOW() - INTERVAL '4 hours'),
    (v_post_ids[6], 11, 6, 'Is the warranty transferable?', 'responded', NOW() - INTERVAL '1 day'),
    (v_post_ids[7], 12, 7, 'What is the mattress brand?', 'pending', NOW() - INTERVAL '6 hours'),
    (v_post_ids[8], 13, 8, 'Can I test before buying?', 'responded', NOW() - INTERVAL '8 hours')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Reviews
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  IF array_length(v_post_ids, 1) >= 10 THEN
    INSERT INTO reviews (reviewer_id, reviewee_id, post_id, rating, title, comment, helpful_count, verified_purchase, created_at) VALUES
    (5, 1, v_post_ids[1], 5, 'Superb seller!', 'Rahul was very professional. Highly recommended!', 12, true, NOW() - INTERVAL '5 days'),
    (6, 2, v_post_ids[2], 4, 'Good experience', 'Priya was responsive and genuine.', 8, true, NOW() - INTERVAL '3 days'),
    (7, 3, v_post_ids[3], 5, 'Best seller!', 'Amit exceeded expectations!', 15, true, NOW() - INTERVAL '10 days'),
    (8, 4, v_post_ids[4], 3, 'Average', 'Product was okay but slow response.', 3, true, NOW() - INTERVAL '2 days'),
    (9, 5, v_post_ids[5], 5, 'Excellent!', 'Vikram is a gem! Highly recommend!', 20, true, NOW() - INTERVAL '1 week'),
    (10, 6, v_post_ids[6], 4, 'Satisfied', 'Anita was nice to deal with.', 5, true, NOW() - INTERVAL '20 days'),
    (11, 7, v_post_ids[7], 5, 'Perfect!', 'Rajesh went above and beyond.', 18, true, NOW() - INTERVAL '15 days'),
    (12, 8, v_post_ids[8], 5, 'Professional', 'Pooja is highly professional!', 22, true, NOW() - INTERVAL '1 day'),
    (13, 9, v_post_ids[9], 4, 'Good but pricey', 'Suresh was honest.', 6, false, NOW() - INTERVAL '8 days'),
    (14, 10, v_post_ids[10], 5, 'Exceptional!', 'Kavitha is the best!', 25, true, NOW() - INTERVAL '2 hours')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Feedback
INSERT INTO feedback (user_id, message, rating, category, status, created_at) VALUES
(1, 'Love the new UI! Much easier to navigate now.', 5, 'general', 'reviewed', NOW() - INTERVAL '1 week'),
(2, 'Please add saved searches feature.', 4, 'feature', 'open', NOW() - INTERVAL '3 days'),
(3, 'App crashes when uploading images.', 2, 'bug', 'in_progress', NOW() - INTERVAL '2 days'),
(4, 'Price filter needs custom range option.', 4, 'ui', 'open', NOW() - INTERVAL '5 days'),
(5, 'Chat needs read receipts.', 3, 'feature', 'open', NOW() - INTERVAL '1 week'),
(6, 'Excellent platform! Made good sales.', 5, 'general', 'reviewed', NOW() - INTERVAL '2 weeks'),
(7, 'Location detection is not accurate.', 2, 'bug', 'resolved', NOW() - INTERVAL '10 days'),
(8, 'Would love video uploads for listings.', 4, 'feature', 'open', NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- User Locations
INSERT INTO user_locations (user_id, latitude, longitude, accuracy, city, country, permission_status, created_at) VALUES
(1, 17.4123, 78.4401, 10.5, 'Hyderabad', 'India', 'granted', NOW() - INTERVAL '1 hour'),
(2, 19.1136, 72.8697, 15.2, 'Mumbai', 'India', 'granted', NOW() - INTERVAL '2 hours'),
(3, 28.6315, 77.2167, 8.3, 'Delhi', 'India', 'granted', NOW() - INTERVAL '30 minutes'),
(4, 12.9352, 77.6245, 12.1, 'Bangalore', 'India', 'granted', NOW() - INTERVAL '45 minutes'),
(5, 13.0382, 80.2332, 20.0, 'Chennai', 'India', 'granted', NOW() - INTERVAL '3 hours'),
(6, 22.5726, 88.3639, 18.5, 'Kolkata', 'India', 'granted', NOW() - INTERVAL '4 hours'),
(7, 18.5074, 73.9428, 14.0, 'Pune', 'India', 'granted', NOW() - INTERVAL '5 hours'),
(8, 23.0225, 72.5714, 11.3, 'Ahmedabad', 'India', 'granted', NOW() - INTERVAL '6 hours'),
(9, 26.9124, 75.7873, 16.8, 'Jaipur', 'India', 'granted', NOW() - INTERVAL '7 hours'),
(10, 9.9312, 76.2673, 22.1, 'Kochi', 'India', 'granted', NOW() - INTERVAL '8 hours')
ON CONFLICT DO NOTHING;

-- Channels
INSERT INTO channels (name, description, owner_id, is_public, member_count, created_at) VALUES
('Hyderabad Tech Deals', 'Best tech deals in Hyderabad!', 1, true, 234, NOW() - INTERVAL '3 months'),
('Mumbai Premium Mobiles', 'Premium smartphones in Mumbai.', 2, true, 567, NOW() - INTERVAL '2 months'),
('Delhi NCR Furniture', 'Furniture deals in Delhi NCR.', 3, true, 189, NOW() - INTERVAL '1 month'),
('Bangalore Bikers Club', 'Royal Enfield, KTM, Yamaha and more!', 10, true, 456, NOW() - INTERVAL '4 months'),
('Pan India Rare Books', 'Academic and rare books!', 14, true, 123, NOW() - INTERVAL '2 months')
ON CONFLICT DO NOTHING;

-- ===========================================
-- STEP 10: SAMPLE DATA FOR ENHANCEMENT TABLES
-- ===========================================

-- Wishlists
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 15) sq;
  IF array_length(v_post_ids, 1) >= 10 THEN
    INSERT INTO wishlists (user_id, post_id, notes, created_at) VALUES
    (1, v_post_ids[5], 'Want to buy for birthday gift', NOW() - INTERVAL '2 days'),
    (1, v_post_ids[8], NULL, NOW() - INTERVAL '1 day'),
    (2, v_post_ids[3], 'Compare with other options', NOW() - INTERVAL '3 days'),
    (2, v_post_ids[7], 'Great price', NOW() - INTERVAL '5 hours'),
    (3, v_post_ids[1], NULL, NOW() - INTERVAL '1 week'),
    (3, v_post_ids[4], 'Ask about warranty', NOW() - INTERVAL '2 days'),
    (4, v_post_ids[9], NULL, NOW() - INTERVAL '4 hours'),
    (5, v_post_ids[2], 'Need to sell mine first', NOW() - INTERVAL '6 days'),
    (5, v_post_ids[6], NULL, NOW() - INTERVAL '3 days'),
    (6, v_post_ids[10], 'Perfect for my daughter', NOW() - INTERVAL '1 day')
    ON CONFLICT (user_id, post_id) DO NOTHING;
  END IF;
END $$;

-- Recently Viewed
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 20) sq;
  IF array_length(v_post_ids, 1) >= 15 THEN
    INSERT INTO recently_viewed (user_id, post_id, view_count, viewed_at) VALUES
    (1, v_post_ids[1], 3, NOW() - INTERVAL '30 minutes'),
    (1, v_post_ids[3], 1, NOW() - INTERVAL '1 hour'),
    (1, v_post_ids[5], 2, NOW() - INTERVAL '2 hours'),
    (2, v_post_ids[2], 5, NOW() - INTERVAL '15 minutes'),
    (2, v_post_ids[4], 2, NOW() - INTERVAL '45 minutes'),
    (3, v_post_ids[1], 1, NOW() - INTERVAL '20 minutes'),
    (3, v_post_ids[6], 3, NOW() - INTERVAL '1 hour'),
    (4, v_post_ids[10], 2, NOW() - INTERVAL '10 minutes'),
    (4, v_post_ids[12], 1, NOW() - INTERVAL '2 hours'),
    (5, v_post_ids[3], 4, NOW() - INTERVAL '5 minutes')
    ON CONFLICT (user_id, post_id) DO NOTHING;
  END IF;
END $$;

-- Saved Searches
INSERT INTO saved_searches (user_id, search_name, search_query, category_id, min_price, max_price, location, filters, notification_enabled, matches_count, created_at) VALUES
(1, 'Cheap iPhones', 'iPhone', 2, 20000, 50000, 'Hyderabad', '{"brand": "Apple"}', true, 12, NOW() - INTERVAL '2 weeks'),
(1, 'Gaming Laptops', 'gaming laptop', 1, 50000, 150000, NULL, '{"ram": "16GB+"}', true, 5, NOW() - INTERVAL '1 week'),
(2, 'Affordable Furniture', 'desk OR chair', 4, 5000, 30000, 'Mumbai', NULL, true, 8, NOW() - INTERVAL '3 days'),
(3, 'Royal Enfield Bikes', 'Royal Enfield', 5, 100000, 250000, 'Delhi', '{"year": "2020+"}', true, 3, NOW() - INTERVAL '5 days'),
(4, 'Samsung Phones', 'Samsung Galaxy', 2, 30000, 80000, 'Bangalore', NULL, true, 15, NOW() - INTERVAL '1 week'),
(5, 'Kids Toys', 'LEGO OR toys', 10, 1000, 20000, NULL, NULL, true, 7, NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- Price History
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  IF array_length(v_post_ids, 1) >= 8 THEN
    INSERT INTO price_history (post_id, old_price, new_price, percentage_change, changed_by, reason, changed_at) VALUES
    (v_post_ids[1], 150000, 135000, -10.0, 1, 'Festival sale', NOW() - INTERVAL '5 days'),
    (v_post_ids[1], 160000, 150000, -6.25, 1, 'Price adjustment', NOW() - INTERVAL '2 weeks'),
    (v_post_ids[2], 130000, 120000, -7.7, 2, 'Urgent sale', NOW() - INTERVAL '3 days'),
    (v_post_ids[3], 50000, 43000, -14.0, 3, 'New model launched', NOW() - INTERVAL '1 week'),
    (v_post_ids[5], 28000, 25000, -10.7, 5, 'Price drop', NOW() - INTERVAL '4 days'),
    (v_post_ids[6], 60000, 55000, -8.3, 6, 'Negotiable now', NOW() - INTERVAL '6 days'),
    (v_post_ids[7], 35000, 28000, -20.0, 7, 'Moving sale', NOW() - INTERVAL '2 days'),
    (v_post_ids[8], 85000, 75000, -11.8, 8, 'Quick sale needed', NOW() - INTERVAL '1 day')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Reports
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  IF array_length(v_post_ids, 1) >= 5 THEN
    INSERT INTO reports (reporter_id, reported_user_id, reported_post_id, report_type, reason, description, status, priority, created_at) VALUES
    (5, 15, v_post_ids[3], 'fake', 'Product images are stock photos', 'The images used are from Google.', 'under_review', 'high', NOW() - INTERVAL '2 days'),
    (6, 20, NULL, 'spam', 'Posting duplicate listings', 'This user posted the same item 5 times.', 'resolved', 'medium', NOW() - INTERVAL '1 week'),
    (7, NULL, v_post_ids[5], 'inappropriate', 'Misleading price', 'Price is for a part only.', 'pending', 'medium', NOW() - INTERVAL '3 hours'),
    (8, 25, NULL, 'fraud', 'Seller took money and disappeared', 'Paid advance but no response.', 'escalated', 'critical', NOW() - INTERVAL '1 day'),
    (9, NULL, v_post_ids[2], 'other', 'Wrong category', 'Listed in wrong category.', 'resolved', 'low', NOW() - INTERVAL '5 days')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Promoted Posts
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts WHERE status = 'active' LIMIT 10) sq;
  IF array_length(v_post_ids, 1) >= 5 THEN
    INSERT INTO promoted_posts (post_id, user_id, promotion_type, start_date, end_date, amount_paid, payment_method, views_earned, clicks_earned, is_active, created_at) VALUES
    (v_post_ids[1], 1, 'featured', NOW() - INTERVAL '5 days', NOW() + INTERVAL '9 days', 299.00, 'UPI', 1250, 89, true, NOW() - INTERVAL '5 days'),
    (v_post_ids[2], 2, 'spotlight', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 499.00, 'Card', 2100, 156, true, NOW() - INTERVAL '3 days'),
    (v_post_ids[3], 3, 'boost', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', 99.00, 'UPI', 890, 45, false, NOW() - INTERVAL '7 days'),
    (v_post_ids[4], 4, 'premium', NOW() - INTERVAL '2 days', NOW() + INTERVAL '12 days', 599.00, 'Net Banking', 450, 32, true, NOW() - INTERVAL '2 days'),
    (v_post_ids[5], 5, 'homepage', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days', 999.00, 'UPI', 3500, 210, true, NOW() - INTERVAL '1 day')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- User Verifications
INSERT INTO user_verifications (user_id, verification_type, verified_value, masked_value, is_verified, verification_attempts, verified_at, created_at) VALUES
(1, 'email', 'rahul.sharma@mhub.com', 'r***@mhub.com', true, 1, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(1, 'phone', '9876543210', '98****3210', true, 1, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(1, 'aadhaar', '1234-5678-9012', 'XXXX-XXXX-9012', true, 1, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(2, 'email', 'priya.patel@mhub.com', 'p***@mhub.com', true, 1, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(2, 'phone', '9876543211', '98****3211', true, 1, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(3, 'email', 'amit.kumar@mhub.com', 'a***@mhub.com', true, 1, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
(3, 'pan', 'ABCDE1234F', 'XXXXX1234X', true, 1, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '3 weeks'),
(4, 'email', 'sneha.reddy@mhub.com', 's***@mhub.com', true, 1, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
(5, 'email', 'vikram.singh@mhub.com', 'v***@mhub.com', true, 1, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks'),
(5, 'aadhaar', '2345-6789-0123', 'XXXX-XXXX-0123', true, 1, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks')
ON CONFLICT (user_id, verification_type) DO NOTHING;

-- Push Tokens
INSERT INTO push_tokens (user_id, device_token, device_type, device_name, device_model, app_version, os_version, is_active, last_used_at, created_at) VALUES
(1, 'ExponentPushToken[token1]', 'android', 'Rahul Phone', 'Samsung Galaxy S23', '2.5.0', 'Android 14', true, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '3 months'),
(1, 'ExponentPushToken[token2]', 'web', 'Chrome Browser', NULL, '2.5.0', 'Windows 11', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 month'),
(2, 'ExponentPushToken[token3]', 'ios', 'Priya iPhone', 'iPhone 15 Pro', '2.5.0', 'iOS 17.2', true, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '2 months'),
(3, 'ExponentPushToken[token4]', 'android', 'Amit OnePlus', 'OnePlus 12', '2.4.0', 'Android 14', true, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 month'),
(4, 'ExponentPushToken[token5]', 'ios', 'Sneha iPad', 'iPad Pro', '2.5.0', 'iPadOS 17', false, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 months'),
(5, 'ExponentPushToken[token6]', 'android', 'Vikram Pixel', 'Google Pixel 8', '2.5.0', 'Android 14', true, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '3 weeks')
ON CONFLICT (user_id, device_token) DO NOTHING;

-- Offers
DO $$
DECLARE 
  v_post_ids INTEGER[];
  v_post_prices DECIMAL(12,2)[];
  v_post_users INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id), ARRAY_AGG(price ORDER BY post_id), ARRAY_AGG(user_id ORDER BY post_id)
  INTO v_post_ids, v_post_prices, v_post_users
  FROM (SELECT post_id, price, user_id FROM posts WHERE status = 'active' LIMIT 8) sq;
  
  IF array_length(v_post_ids, 1) >= 7 THEN
    INSERT INTO offers (post_id, buyer_id, seller_id, original_price, offered_price, counter_price, final_price, message, seller_response, status, responded_at, created_at) VALUES
    (v_post_ids[1], 5, v_post_users[1], v_post_prices[1], v_post_prices[1] * 0.85, v_post_prices[1] * 0.92, v_post_prices[1] * 0.90, 'Can you give discount?', 'I can do 10% off max.', 'accepted', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days'),
    (v_post_ids[2], 6, v_post_users[2], v_post_prices[2], v_post_prices[2] * 0.80, NULL, NULL, 'Is price negotiable?', 'Sorry, price is firm.', 'rejected', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '1 day'),
    (v_post_ids[3], 7, v_post_users[3], v_post_prices[3], v_post_prices[3] * 0.88, v_post_prices[3] * 0.93, NULL, 'Can we settle at 12% off?', 'How about 7% off?', 'countered', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '6 hours'),
    (v_post_ids[4], 8, v_post_users[4], v_post_prices[4], v_post_prices[4] * 0.90, NULL, NULL, '10% discount possible?', NULL, 'pending', NULL, NOW() - INTERVAL '2 hours'),
    (v_post_ids[5], 9, v_post_users[5], v_post_prices[5], v_post_prices[5] * 0.75, NULL, NULL, '25% off?', 'Too low. Best is 15%.', 'rejected', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'),
    (v_post_ids[6], 10, v_post_users[6], v_post_prices[6], v_post_prices[6] * 0.95, NULL, v_post_prices[6] * 0.95, 'Just 5% off?', 'Done! Deal closed.', 'accepted', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '8 hours')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Price Drop Alerts
DO $$
DECLARE v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  IF array_length(v_post_ids, 1) >= 8 THEN
    INSERT INTO price_drop_alerts (user_id, post_id, target_price, percentage_threshold, is_active, notification_count, created_at) VALUES
    (5, v_post_ids[1], 120000, 10.0, true, 0, NOW() - INTERVAL '1 week'),
    (5, v_post_ids[3], 40000, 15.0, true, 1, NOW() - INTERVAL '5 days'),
    (6, v_post_ids[2], 100000, 20.0, true, 0, NOW() - INTERVAL '3 days'),
    (7, v_post_ids[4], NULL, 5.0, true, 0, NOW() - INTERVAL '2 days'),
    (8, v_post_ids[5], 22000, 10.0, false, 2, NOW() - INTERVAL '2 weeks'),
    (9, v_post_ids[6], NULL, 15.0, true, 0, NOW() - INTERVAL '4 days'),
    (10, v_post_ids[8], 60000, 25.0, true, 0, NOW() - INTERVAL '1 day')
    ON CONFLICT (user_id, post_id) DO NOTHING;
  END IF;
END $$;

-- ===========================================
-- FINAL: VERIFICATION
-- ===========================================
SELECT '=============================================' as separator;
SELECT '✅ MHUB DATABASE SETUP COMPLETE!' as status;
SELECT '=============================================' as separator;
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Profiles: ' || COUNT(*) FROM profiles;
SELECT 'Posts: ' || COUNT(*) FROM posts;
SELECT 'Categories: ' || COUNT(*) FROM categories;
SELECT 'Tiers: ' || COUNT(*) FROM tiers;
SELECT 'Transactions: ' || COUNT(*) FROM transactions;
SELECT 'Reviews: ' || COUNT(*) FROM reviews;
SELECT 'Wishlists: ' || COUNT(*) FROM wishlists;
SELECT 'Recently Viewed: ' || COUNT(*) FROM recently_viewed;
SELECT 'Saved Searches: ' || COUNT(*) FROM saved_searches;
SELECT 'Price History: ' || COUNT(*) FROM price_history;
SELECT 'Reports: ' || COUNT(*) FROM reports;
SELECT 'Promoted Posts: ' || COUNT(*) FROM promoted_posts;
SELECT 'User Verifications: ' || COUNT(*) FROM user_verifications;
SELECT 'Push Tokens: ' || COUNT(*) FROM push_tokens;
SELECT 'Offers: ' || COUNT(*) FROM offers;
SELECT 'Price Drop Alerts: ' || COUNT(*) FROM price_drop_alerts;
SELECT '=============================================' as separator;
SELECT 'Login with: rahul.sharma@mhub.com / password123' as credentials;
SELECT '=============================================' as separator;
