-- ============================================================================
-- ZARUDA PLATFORM: PRODUCTION MASTER DATABASE SCHEMA
-- Version: 7.0 (Consolidated E2E Production Release)
-- Tables: 36 | Indexes: 43+ | Procedures: 3 | Views: 1
-- ============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

-- Reusable Auto-Update Timestamp Trigger Function
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. USERS (Core Authentication & Identity)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100),
    email CITEXT UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','premium','seller','admin')),
    referral_code VARCHAR(20) UNIQUE,
    referred_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    kyc_verified BOOLEAN DEFAULT FALSE,
    is_aadhaar_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    verification_token_expiry TIMESTAMP,
    reset_token TEXT,
    reset_token_expiry TIMESTAMP,
    refresh_token TEXT,
    last_login TIMESTAMP,
    preferred_language VARCHAR(10) DEFAULT 'en',
    rating DECIMAL(3,2) DEFAULT 0,
    trust_score INTEGER DEFAULT 50,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    tier VARCHAR(20) DEFAULT 'basic',
    current_plan VARCHAR(20) DEFAULT 'basic',
    subscription_id INTEGER,
    subscription_expiry TIMESTAMP,
    post_credits INTEGER DEFAULT 0,
    payout_methods JSONB DEFAULT '[]'::jsonb,
    two_fa_secret TEXT,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    backup_codes TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    suspended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================================
-- 2. PROFILES (Extended User Profile Information)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    avatar_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    bio TEXT,
    social_links JSONB DEFAULT '{}'::jsonb,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- ============================================================================
-- 3. USER_SESSIONS (Multi-device Session & Refresh Token Tracking)
-- ============================================================================
-- Uses ALTER TABLE to safely add columns to existing table (from prior migrations)
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_info VARCHAR(255);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_name VARCHAR(100);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NOW();
-- Add missing columns to existing table (safe for all schemas)
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

-- ============================================================================
-- 4. USER_VERIFICATIONS (Aadhaar / PAN / Driving License KYC)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_verifications (
    verification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('email','phone','aadhaar','pan','driving_license','passport','bank_account')),
    verified_value VARCHAR(255),
    masked_value VARCHAR(100),
    document_front_url VARCHAR(500),
    document_back_url VARCHAR(500),
    selfie_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    verification_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(user_id),
    rejection_reason TEXT,
    full_name VARCHAR(150),
    dob DATE,
    gender VARCHAR(10),
    full_address TEXT,
    house_number VARCHAR(100),
    street VARCHAR(255),
    locality VARCHAR(255),
    district VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    kyc_ref_token VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, verification_type)
);
CREATE INDEX IF NOT EXISTS idx_verif_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_type ON user_verifications(verification_type);

-- ============================================================================
-- 5. CATEGORIES (Top-level Taxonomy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    banner_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 6. SUBCATEGORIES (Granular Taxonomy Hierarchy)
-- ============================================================================
CREATE TABLE IF NOT EXISTS subcategories (
    subcategory_id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(category_id, name)
);
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subcategories' AND column_name='is_active') THEN CREATE INDEX IF NOT EXISTS idx_subcategories_active ON subcategories(is_active); END IF; END $$;

-- ============================================================================
-- 7. TIERS (Platform Subscription Tiers)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tiers (
    tier_id SERIAL PRIMARY KEY,
    name VARCHAR(30) UNIQUE NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    features JSONB,
    perks TEXT[],
    listing_limit INTEGER,
    boost_limit INTEGER,
    description TEXT
);

-- ============================================================================
-- 8. USER_SUBSCRIPTIONS (Subscription History & Monthly Quotas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    plan_name VARCHAR(20) NOT NULL,
    tier_id INTEGER REFERENCES tiers(tier_id),
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    is_trial BOOLEAN DEFAULT FALSE,
    payment_id TEXT,
    boost_used_this_month INTEGER DEFAULT 0,
    featured_used_this_month INTEGER DEFAULT 0,
    spotlight_used_this_month INTEGER DEFAULT 0,
    listings_count INTEGER DEFAULT 0,
    quota_reset_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP,
    cancel_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_subscriptions' AND column_name='is_active') THEN CREATE INDEX IF NOT EXISTS idx_sub_user_active ON user_subscriptions(user_id, is_active); END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_sub_expires ON user_subscriptions(expires_at);

-- ============================================================================
-- 9. POSTS (Marketplace Classified Listings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS posts (
    post_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(category_id) ON DELETE SET NULL,
    subcategory_id INTEGER REFERENCES subcategories(subcategory_id) ON DELETE SET NULL,
    tier_id INTEGER REFERENCES tiers(tier_id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(5) DEFAULT 'INR',
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    location VARCHAR(100),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','sold','bought','inactive','expired','undone','draft')),
    condition VARCHAR(20) DEFAULT 'good',
    brand VARCHAR(100),
    model VARCHAR(100),
    contact_number VARCHAR(20),
    warranty_status VARCHAR(50),
    age_months INTEGER,
    is_negotiable BOOLEAN DEFAULT FALSE,
    is_flash_sale BOOLEAN DEFAULT FALSE,
    audio_url TEXT,
    post_type VARCHAR(20) DEFAULT 'text',
    images JSONB DEFAULT '[]'::jsonb,
    views_count INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_posts_updated ON posts;
CREATE TRIGGER trg_posts_updated
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_subcategory ON posts(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_status ON posts(category_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_active_feed ON posts(created_at DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_category_price ON posts(category_id, price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_fulltext ON posts USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ============================================================================
-- 10. REFERRALS (Referral Network & Graph Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
    referral_id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    referee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending',
    bonus_awarded DECIMAL(10,2) DEFAULT 0,
    depth INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referrer_id, referee_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);

-- ============================================================================
-- 11. REWARDS (User Coins, XP, Levels & Streaks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS rewards (
    reward_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    total_earned INTEGER DEFAULT 0,
    tier VARCHAR(20) DEFAULT 'Bronze',
    level INTEGER DEFAULT 1,
    xp_current INTEGER DEFAULT 0,
    xp_required INTEGER DEFAULT 100,
    streak INTEGER DEFAULT 0,
    visit_streak INTEGER DEFAULT 0,
    post_streak INTEGER DEFAULT 0,
    last_spin_date DATE,
    last_checkin_date DATE,
    last_activity TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 12. REWARD_LOG (Immutable Coin Ledger & History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reward_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action VARCHAR(80) NOT NULL,
    points INTEGER NOT NULL,
    balance INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reward_log_user ON reward_log(user_id, created_at DESC);

-- ============================================================================
-- 13. TRANSACTIONS (P2P Sales, Escrow & OTP Handshakes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    buyer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    amount DECIMAL(12,2),
    agreed_price DECIMAL(12,2),
    listing_price DECIMAL(12,2),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','completed','cancelled','undone','fraud_flagged')),
    payment_method VARCHAR(50),
    secret_otp VARCHAR(20),
    otp_expires_at TIMESTAMP,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    fraud_reason TEXT,
    fraud_evidence JSONB,
    seller_rating INTEGER,
    buyer_rating INTEGER,
    receipt_id VARCHAR(100),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_txn_updated ON transactions;
CREATE TRIGGER trg_txn_updated
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

CREATE INDEX IF NOT EXISTS idx_txn_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_txn_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);

-- ============================================================================
-- 14. ORDERS (E-Commerce Multi-item Orders & Gateway Records)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    subtotal DECIMAL(12,2),
    tax DECIMAL(12,2) DEFAULT 0,
    shipping DECIMAL(12,2) DEFAULT 0,
    discount DECIMAL(12,2) DEFAULT 0,
    coupon_code VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','confirmed','shipped','delivered','cancelled','returned')),
    payment_intent_id VARCHAR(100),
    payment_method VARCHAR(50),
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    shipping_name VARCHAR(150),
    shipping_phone VARCHAR(20),
    shipping_line1 TEXT,
    shipping_line2 TEXT,
    shipping_city VARCHAR(100),
    shipping_state VARCHAR(100),
    shipping_pincode VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);

-- ============================================================================
-- 15. ORDER_ITEMS (Order Line Items)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE RESTRICT,
    seller_id INTEGER REFERENCES users(user_id),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- ============================================================================
-- 16. NOTIFICATIONS (In-App & Push Notification Inbox)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(50) DEFAULT 'info',
    channel_id VARCHAR(50) DEFAULT 'general',
    deep_link TEXT,
    image_url TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    snoozed_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- 17. PUSH_TOKENS (FCM Push Device Registrations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS push_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_token VARCHAR(500) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios','android','web')),
    device_name VARCHAR(100),
    device_model VARCHAR(100),
    app_version VARCHAR(20),
    os_version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, device_token)
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_tokens(user_id);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='push_tokens' AND column_name='is_active') THEN CREATE INDEX IF NOT EXISTS idx_push_active ON push_tokens(is_active); END IF; END $$;

-- ============================================================================
-- 18. WISHLISTS (User Favorites)
-- ============================================================================
CREATE TABLE IF NOT EXISTS wishlists (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wish_post ON wishlists(post_id);

-- ============================================================================
-- 19. RECENTLY_VIEWED (User Browse History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recently_viewed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    source VARCHAR(20) DEFAULT 'allposts',
    view_count INTEGER DEFAULT 1,
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_rv_user ON recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_rv_time ON recently_viewed(viewed_at DESC);

-- ============================================================================
-- 20. SAVED_SEARCHES (Search Alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_searches (
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
CREATE INDEX IF NOT EXISTS idx_ss_user ON saved_searches(user_id);

-- ============================================================================
-- 21. REVIEWS (User & Transaction Ratings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
    review_id SERIAL PRIMARY KEY,
    reviewer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reviewee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    transaction_id INTEGER REFERENCES transactions(transaction_id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(100),
    comment TEXT,
    response TEXT,
    helpful_count INTEGER DEFAULT 0,
    verified_purchase BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (reviewer_id, reviewee_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);

-- ============================================================================
-- 22. OFFERS (Price Negotiations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS offers (
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
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','countered','expired','withdrawn')),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '48 hours'),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_offers_post ON offers(post_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- ============================================================================
-- 23. BUYER_INQUIRIES (Direct Inquiry / Express Interest)
-- ============================================================================
CREATE TABLE IF NOT EXISTS buyer_inquiries (
    inquiry_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    buyer_name VARCHAR(150),
    phone VARCHAR(20),
    address TEXT,
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inquiries_post ON buyer_inquiries(post_id);

-- ============================================================================
-- 24. PRICE_HISTORY (Audit Log of Price Fluctuations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    old_price DECIMAL(12,2) NOT NULL,
    new_price DECIMAL(12,2) NOT NULL,
    percentage_change DECIMAL(5,2),
    changed_by INTEGER REFERENCES users(user_id),
    reason VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ph_post ON price_history(post_id);

-- ============================================================================
-- 25. PRICE_DROP_ALERTS (Automated Price Alerts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS price_drop_alerts (
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
CREATE INDEX IF NOT EXISTS idx_pda_user ON price_drop_alerts(user_id);

-- ============================================================================
-- 26. PROMOTED_POSTS (Sponsored / Boosted Listings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS promoted_posts (
    promotion_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    promotion_type VARCHAR(50) NOT NULL CHECK (promotion_type IN ('featured','spotlight','boost','premium','homepage')),
    start_date TIMESTAMP NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'completed',
    views_earned INTEGER DEFAULT 0,
    clicks_earned INTEGER DEFAULT 0,
    inquiries_earned INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='promoted_posts' AND column_name='is_active') THEN CREATE INDEX IF NOT EXISTS idx_promo_active ON promoted_posts(is_active, end_date); END IF; END $$;

-- ============================================================================
-- 27. REPORTS (Complaints, Abuse & Moderation)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reports (
    report_id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reported_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reported_post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('spam','fraud','inappropriate','fake','harassment','other')),
    subject VARCHAR(200),
    reason VARCHAR(200) NOT NULL,
    description TEXT,
    evidence_urls JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','under_review','resolved','rejected','escalated')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    admin_notes TEXT,
    resolved_by INTEGER REFERENCES users(user_id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================================================
-- 28. FEEDBACK (Customer App Experience Feedback)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50),
    subject VARCHAR(200),
    message TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 29. CHANNELS (Centre Pages / Verified Storefronts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channels (
    channel_id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    logo_url VARCHAR(500),
    cover_url VARCHAR(500),
    location VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_website VARCHAR(500),
    is_public BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    member_count INTEGER DEFAULT 0,
    follower_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 30. CHANNEL_FOLLOWERS (Storefront Follow Graph)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_followers (
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    channel_id INTEGER REFERENCES channels(channel_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);

-- ============================================================================
-- 31. CHANNEL_POSTS (Storefront Updates & Announcements)
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_posts (
    post_id SERIAL PRIMARY KEY,
    channel_id INTEGER NOT NULL REFERENCES channels(channel_id) ON DELETE CASCADE,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    description TEXT,
    image_url TEXT,
    video_url TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 32. FEED_POSTS (Social Feed / Community Wall)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feed_posts (
    feed_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT,
    images TEXT[] DEFAULT '{}',
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    source VARCHAR(20) DEFAULT 'feed',
    type VARCHAR(20) DEFAULT 'text',
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feed_user ON feed_posts(user_id, created_at DESC);

-- ============================================================================
-- 33. USER_FOLLOWS (User-to-User Social Network)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- ============================================================================
-- 34. USER_BLOCKS (Safety & Moderation Block List)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_blocks (
    blocker_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    blocked_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id)
);

-- ============================================================================
-- 35. PREFERENCES (User Discovery & Notification Preferences)
-- ============================================================================
CREATE TABLE IF NOT EXISTS preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    location VARCHAR(100),
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2),
    categories JSONB,
    notification_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 36. USER_LOCATIONS (GPS Geo-history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    accuracy DECIMAL(10,2),
    city VARCHAR(100),
    country VARCHAR(100),
    permission_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- 1. Atomic Daily Spin Claim
CREATE OR REPLACE FUNCTION fn_claim_daily_spin(p_user_id INT, p_coins INT)
RETURNS TABLE(success BOOLEAN, new_balance INT, message TEXT) AS $$
DECLARE
    v_last DATE;
    v_bal INT;
    v_today DATE := CURRENT_DATE;
BEGIN
    SELECT last_spin_date, points INTO v_last, v_bal FROM rewards WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO rewards (user_id, points, total_earned, last_spin_date) VALUES (p_user_id, p_coins, p_coins, v_today);
        INSERT INTO reward_log (user_id, action, points, balance, description) VALUES (p_user_id, 'SPIN_WHEEL', p_coins, p_coins, 'Daily Spin Wheel');
        RETURN QUERY SELECT TRUE, p_coins, 'Spin claimed successfully!'::TEXT;
        RETURN;
    END IF;

    IF v_last = v_today THEN
        RETURN QUERY SELECT FALSE, v_bal, 'You have already spun the wheel today.'::TEXT;
        RETURN;
    END IF;

    UPDATE rewards
    SET points = points + p_coins,
        total_earned = total_earned + p_coins,
        last_spin_date = v_today,
        last_activity = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO reward_log (user_id, action, points, balance, description)
    VALUES (p_user_id, 'SPIN_WHEEL', p_coins, v_bal + p_coins, 'Daily Spin Wheel');

    RETURN QUERY SELECT TRUE, (v_bal + p_coins), 'Spin claimed successfully!'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 2. Validate Add Post Procedure
CREATE OR REPLACE FUNCTION validate_add_post(
    p_user_id INT,
    p_category_id INT,
    p_title VARCHAR,
    p_price NUMERIC
)
RETURNS TABLE(valid BOOLEAN, message TEXT) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RETURN QUERY SELECT FALSE, 'User not found.'::TEXT;
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id) THEN
        RETURN QUERY SELECT FALSE, 'Category not found.'::TEXT;
        RETURN;
    END IF;
    IF p_title IS NULL OR LENGTH(p_title) < 3 THEN
        RETURN QUERY SELECT FALSE, 'Title must be at least 3 characters long.'::TEXT;
        RETURN;
    END IF;
    IF p_price IS NULL OR p_price <= 0 THEN
        RETURN QUERY SELECT FALSE, 'Price must be a positive number.'::TEXT;
        RETURN;
    END IF;
    RETURN QUERY SELECT TRUE, 'Validation passed.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRODUCTION VIEWS
-- ============================================================================
CREATE OR REPLACE VIEW v_active_marketplace AS
SELECT 
    p.post_id,
    p.title,
    p.description,
    p.price,
    p.currency,
    p.condition,
    p.brand,
    p.model,
    p.images,
    p.location,
    p.latitude,
    p.longitude,
    p.views_count,
    p.likes,
    p.created_at,
    c.category_id,
    c.name AS category_name,
    s.subcategory_id,
    s.name AS subcategory_name,
    u.user_id AS seller_id,
    u.name AS seller_name,
    pr.avatar_url AS seller_avatar,
    u.trust_score,
    u.kyc_verified AS seller_verified,
    (SELECT COUNT(*) FROM offers o WHERE o.post_id = p.post_id AND o.status = 'pending') AS pending_offers
FROM posts p
JOIN categories c ON p.category_id = c.category_id
LEFT JOIN subcategories s ON p.subcategory_id = s.subcategory_id
JOIN users u ON p.user_id = u.user_id
LEFT JOIN profiles pr ON u.user_id = pr.user_id
WHERE p.status = 'active';
