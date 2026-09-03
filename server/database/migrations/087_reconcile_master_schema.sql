-- ============================================================================
-- RECONCILIATION MIGRATION 087: Master Schema Alignment
-- Adds missing columns/indexes from master schema to existing database.
-- Creates any of the 36 core tables that don't already exist.
-- All operations are idempotent (safe to re-run).
-- ============================================================================

-- ============================================================================
-- TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END; $$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE MISSING TABLES (16 tables that don't exist yet)
-- ============================================================================

-- Tiers
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

-- User Verifications
CREATE TABLE IF NOT EXISTS user_verifications (
    verification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('email','phone','aadhaar','pan','driving_license','passport','bank_account')),
    verified_value VARCHAR(255), masked_value VARCHAR(100),
    document_front_url VARCHAR(500), document_back_url VARCHAR(500), selfie_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE, verification_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP, verified_at TIMESTAMP,
    verified_by INTEGER REFERENCES users(user_id), rejection_reason TEXT,
    full_name VARCHAR(150), dob DATE, gender VARCHAR(10), full_address TEXT,
    house_number VARCHAR(100), street VARCHAR(255), locality VARCHAR(255),
    district VARCHAR(100), state VARCHAR(100), pincode VARCHAR(10),
    kyc_ref_token VARCHAR(100), metadata JSONB DEFAULT '{}'::jsonb, expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, verification_type)
);

-- Referrals
CREATE TABLE IF NOT EXISTS referrals (
    referral_id SERIAL PRIMARY KEY,
    referrer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    referee_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', bonus_awarded DECIMAL(10,2) DEFAULT 0,
    depth INTEGER DEFAULT 1, created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(referrer_id, referee_id)
);

-- Push Tokens
CREATE TABLE IF NOT EXISTS push_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_token VARCHAR(500) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios','android','web')),
    device_name VARCHAR(100), device_model VARCHAR(100),
    app_version VARCHAR(20), os_version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE, last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, device_token)
);

-- Wishlists
CREATE TABLE IF NOT EXISTS wishlists (
    wishlist_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    notes TEXT, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, post_id)
);

-- Recently Viewed
CREATE TABLE IF NOT EXISTS recently_viewed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    source VARCHAR(20) DEFAULT 'allposts', view_count INTEGER DEFAULT 1,
    viewed_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, post_id)
);

-- Saved Searches
CREATE TABLE IF NOT EXISTS saved_searches (
    search_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    search_name VARCHAR(100), search_query VARCHAR(255),
    category_id TEXT,
    min_price DECIMAL(12,2), max_price DECIMAL(12,2),
    location VARCHAR(100), condition VARCHAR(20), filters JSONB,
    notification_enabled BOOLEAN DEFAULT TRUE, email_alert BOOLEAN DEFAULT FALSE,
    push_alert BOOLEAN DEFAULT TRUE, last_notified_at TIMESTAMP,
    matches_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
);

-- Buyer Inquiries
CREATE TABLE IF NOT EXISTS buyer_inquiries (
    inquiry_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    buyer_name VARCHAR(150), phone VARCHAR(20), address TEXT,
    message TEXT, status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW()
);

-- Price History
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    old_price DECIMAL(12,2) NOT NULL, new_price DECIMAL(12,2) NOT NULL,
    percentage_change DECIMAL(5,2), changed_by INTEGER REFERENCES users(user_id),
    reason VARCHAR(100), changed_at TIMESTAMP DEFAULT NOW()
);

-- Price Drop Alerts
CREATE TABLE IF NOT EXISTS price_drop_alerts (
    alert_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    target_price DECIMAL(12,2), percentage_threshold DECIMAL(5,2) DEFAULT 10.0,
    is_active BOOLEAN DEFAULT TRUE, last_notified_at TIMESTAMP,
    notification_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), UNIQUE(user_id, post_id)
);

-- Promoted Posts
CREATE TABLE IF NOT EXISTS promoted_posts (
    promotion_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    promotion_type VARCHAR(50) NOT NULL CHECK (promotion_type IN ('featured','spotlight','boost','premium','homepage')),
    start_date TIMESTAMP NOT NULL DEFAULT NOW(), end_date TIMESTAMP NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL, payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'completed',
    views_earned INTEGER DEFAULT 0, clicks_earned INTEGER DEFAULT 0, inquiries_earned INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT NOW()
);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
    report_id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reported_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    reported_post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('spam','fraud','inappropriate','fake','harassment','other')),
    subject VARCHAR(200), reason VARCHAR(200) NOT NULL, description TEXT, evidence_urls JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','under_review','resolved','rejected','escalated')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
    admin_notes TEXT, resolved_by INTEGER REFERENCES users(user_id), resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Channel Posts
CREATE TABLE IF NOT EXISTS channel_posts (
    post_id SERIAL PRIMARY KEY,
    channel_id TEXT NOT NULL,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    description TEXT, image_url TEXT, video_url TEXT, created_at TIMESTAMP DEFAULT NOW()
);

-- Feed Posts
CREATE TABLE IF NOT EXISTS feed_posts (
    feed_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT, images TEXT[] DEFAULT '{}',
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    source VARCHAR(20) DEFAULT 'feed', type VARCHAR(20) DEFAULT 'text',
    like_count INTEGER DEFAULT 0, comment_count INTEGER DEFAULT 0, view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Follows
CREATE TABLE IF NOT EXISTS user_follows (
    follower_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(), PRIMARY KEY (follower_id, following_id)
);

-- User Locations
CREATE TABLE IF NOT EXISTS user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    latitude DECIMAL(10,8), longitude DECIMAL(11,8), accuracy DECIMAL(10,2),
    city VARCHAR(100), country VARCHAR(100), permission_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Users
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payout_methods JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- User Sessions
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS refresh_token_hash VARCHAR(255);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_info VARCHAR(255);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_name VARCHAR(100);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_revoked BOOLEAN DEFAULT FALSE;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NOW();

-- Categories
ALTER TABLE categories ADD COLUMN IF NOT EXISTS banner_url VARCHAR(255);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- Subcategories
ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- User Subscriptions
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS tier_id INTEGER REFERENCES tiers(tier_id);
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMP DEFAULT NOW();

-- Posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS currency VARCHAR(5) DEFAULT 'INR';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS condition VARCHAR(20) DEFAULT 'good';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS model VARCHAR(100);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS warranty_status VARCHAR(50);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS age_months INTEGER;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_flash_sale BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5,2) DEFAULT 0;

-- Referrals
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 1;

-- Rewards
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS total_earned INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS xp_current INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS xp_required INTEGER DEFAULT 100;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS visit_streak INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS post_streak INTEGER DEFAULT 0;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS last_spin_date DATE;
ALTER TABLE rewards ADD COLUMN IF NOT EXISTS last_checkin_date DATE;

-- Reward Log
ALTER TABLE reward_log ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0;
ALTER TABLE reward_log ADD COLUMN IF NOT EXISTS description TEXT;

-- Transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS agreed_price DECIMAL(12,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS listing_price DECIMAL(12,2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS secret_otp VARCHAR(20);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS carrier VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fraud_reason TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fraud_evidence JSONB;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS seller_rating INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS buyer_rating INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_id VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(12,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_name VARCHAR(150);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_phone VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_line1 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_line2 TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_city VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_state VARCHAR(100);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_pincode VARCHAR(10);

-- Notifications
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS channel_id VARCHAR(50) DEFAULT 'general';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deep_link TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMP;

-- Channels
ALTER TABLE channels ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS cover_url VARCHAR(500);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS location VARCHAR(100);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS post_count INTEGER DEFAULT 0;

-- Preferences
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE preferences ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- INDEXES (all IF NOT EXISTS — safe for duplicates)
-- ============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- User Sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

-- User Verifications
CREATE INDEX IF NOT EXISTS idx_verif_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verif_type ON user_verifications(verification_type);

-- Subcategories
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON subcategories(category_id);

-- User Subscriptions
CREATE INDEX IF NOT EXISTS idx_sub_user_active ON user_subscriptions(user_id);

-- Posts
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_status ON posts(category_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_user_status ON posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_fulltext ON posts USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);

-- Reward Log
CREATE INDEX IF NOT EXISTS idx_reward_log_user ON reward_log(user_id, created_at DESC);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_txn_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_txn_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_txn_status ON transactions(status);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);

-- Push Tokens
CREATE INDEX IF NOT EXISTS idx_push_user ON push_tokens(user_id);

-- Wishlists
CREATE INDEX IF NOT EXISTS idx_wish_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wish_post ON wishlists(post_id);

-- Recently Viewed
CREATE INDEX IF NOT EXISTS idx_rv_user ON recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_rv_time ON recently_viewed(viewed_at DESC);

-- Saved Searches
CREATE INDEX IF NOT EXISTS idx_ss_user ON saved_searches(user_id);

-- Reviews
DO $$ BEGIN IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='reviewee_id') THEN CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id); END IF; END $$;

-- Offers
CREATE INDEX IF NOT EXISTS idx_offers_post ON offers(post_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- Price History
CREATE INDEX IF NOT EXISTS idx_ph_post ON price_history(post_id);

-- Price Drop Alerts
CREATE INDEX IF NOT EXISTS idx_pda_user ON price_drop_alerts(user_id);

-- Feed Posts
CREATE INDEX IF NOT EXISTS idx_feed_user ON feed_posts(user_id, created_at DESC);

-- ============================================================================
-- TRIGGERS (safe — drop and recreate)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
DROP TRIGGER IF EXISTS trg_posts_updated ON posts;
CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
DROP TRIGGER IF EXISTS trg_txn_updated ON transactions;
CREATE TRIGGER trg_txn_updated BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_claim_daily_spin(p_user_id INT, p_coins INT)
RETURNS TABLE(success BOOLEAN, new_balance INT, message TEXT) AS $$
DECLARE v_last DATE; v_bal INT; v_today DATE := CURRENT_DATE;
BEGIN
    SELECT last_spin_date, points INTO v_last, v_bal FROM rewards WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        INSERT INTO rewards (user_id, points, total_earned, last_spin_date) VALUES (p_user_id, p_coins, p_coins, v_today);
        INSERT INTO reward_log (user_id, action, points, balance, description) VALUES (p_user_id, 'SPIN_WHEEL', p_coins, p_coins, 'Daily Spin Wheel');
        RETURN QUERY SELECT TRUE, p_coins, 'Spin claimed successfully!'::TEXT; RETURN;
    END IF;
    IF v_last = v_today THEN
        RETURN QUERY SELECT FALSE, v_bal, 'You have already spun the wheel today.'::TEXT; RETURN;
    END IF;
    UPDATE rewards SET points = points + p_coins, total_earned = COALESCE(total_earned,0) + p_coins, last_spin_date = v_today, last_activity = NOW() WHERE user_id = p_user_id;
    INSERT INTO reward_log (user_id, action, points, balance, description) VALUES (p_user_id, 'SPIN_WHEEL', p_coins, COALESCE(v_bal,0) + p_coins, 'Daily Spin Wheel');
    RETURN QUERY SELECT TRUE, (COALESCE(v_bal,0) + p_coins), 'Spin claimed successfully!'::TEXT;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION validate_add_post(p_user_id INT, p_category_id INT, p_title VARCHAR, p_price NUMERIC)
RETURNS TABLE(valid BOOLEAN, message TEXT) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN RETURN QUERY SELECT FALSE, 'User not found.'::TEXT; RETURN; END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id) THEN RETURN QUERY SELECT FALSE, 'Category not found.'::TEXT; RETURN; END IF;
    IF p_title IS NULL OR LENGTH(p_title) < 3 THEN RETURN QUERY SELECT FALSE, 'Title must be at least 3 characters long.'::TEXT; RETURN; END IF;
    IF p_price IS NULL OR p_price <= 0 THEN RETURN QUERY SELECT FALSE, 'Price must be a positive number.'::TEXT; RETURN; END IF;
    RETURN QUERY SELECT TRUE, 'Validation passed.'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PRODUCTION VIEW
-- ============================================================================
CREATE OR REPLACE VIEW v_active_marketplace AS
SELECT p.post_id, p.title, p.description, p.price, p.condition, p.brand, p.model,
    p.images, p.location, p.latitude, p.longitude, p.views_count, p.likes, p.created_at,
    p.category_id, NULL::text AS category_name,
    p.subcategory_id, NULL::text AS subcategory_name,
    p.user_id AS seller_id, u.name AS seller_name, NULL::text AS seller_avatar,
    50 AS trust_score, COALESCE(u.kyc_verified, false) AS seller_verified,
    0 AS pending_offers
FROM posts p
LEFT JOIN users u ON p.user_id = u.user_id
WHERE p.status = 'active';

-- ============================================================================
SELECT 'Reconciliation migration 087 completed successfully!' AS status;
