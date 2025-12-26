-- =====================================================
-- MHUB ENHANCEMENT TABLES - Phase 2
-- Run AFTER 00_master_setup.sql and 11_complete_sample_data.sql
-- Run: \i 'C:/Users/laksh/GITHUB/AG/Mhub/server/database/12_enhancement_tables.sql'
-- =====================================================

-- ===========================================
-- 1. WISHLIST TABLE - Save favorite posts
-- ===========================================
CREATE TABLE IF NOT EXISTS wishlists (x 
    wishlist_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_post ON wishlists(post_id);

-- Sample wishlists
DO $$
DECLARE
  v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 15) sq;
  
  IF array_length(v_post_ids, 1) >= 10 THEN
    INSERT INTO wishlists (user_id, post_id, notes, created_at) VALUES
    (1, v_post_ids[5], 'Want to buy for birthday gift', NOW() - INTERVAL '2 days'),
    (1, v_post_ids[8], NULL, NOW() - INTERVAL '1 day'),
    (2, v_post_ids[3], 'Compare with other options', NOW() - INTERVAL '3 days'),
    (2, v_post_ids[7], 'Great price, might buy next week', NOW() - INTERVAL '5 hours'),
    (3, v_post_ids[1], NULL, NOW() - INTERVAL '1 week'),
    (3, v_post_ids[4], 'Ask about warranty', NOW() - INTERVAL '2 days'),
    (4, v_post_ids[9], NULL, NOW() - INTERVAL '4 hours'),
    (5, v_post_ids[2], 'Need to sell mine first', NOW() - INTERVAL '6 days'),
    (5, v_post_ids[6], NULL, NOW() - INTERVAL '3 days'),
    (6, v_post_ids[10], 'Perfect for my daughter', NOW() - INTERVAL '1 day')
    ON CONFLICT (user_id, post_id) DO NOTHING;
    RAISE NOTICE 'Created sample wishlists';
  END IF;
END $$;

-- ===========================================
-- 2. RECENTLY VIEWED TABLE - Track browsing history
-- ===========================================
CREATE TABLE IF NOT EXISTS recently_viewed (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    view_count INTEGER DEFAULT 1,
    viewed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_time ON recently_viewed(viewed_at DESC);

-- Sample recently viewed
DO $$
DECLARE
  v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 20) sq;
  
  IF array_length(v_post_ids, 1) >= 15 THEN
    INSERT INTO recently_viewed (user_id, post_id, view_count, viewed_at) VALUES
    (1, v_post_ids[1], 3, NOW() - INTERVAL '30 minutes'),
    (1, v_post_ids[3], 1, NOW() - INTERVAL '1 hour'),
    (1, v_post_ids[5], 2, NOW() - INTERVAL '2 hours'),
    (1, v_post_ids[8], 1, NOW() - INTERVAL '5 hours'),
    (2, v_post_ids[2], 5, NOW() - INTERVAL '15 minutes'),
    (2, v_post_ids[4], 2, NOW() - INTERVAL '45 minutes'),
    (2, v_post_ids[7], 1, NOW() - INTERVAL '3 hours'),
    (3, v_post_ids[1], 1, NOW() - INTERVAL '20 minutes'),
    (3, v_post_ids[6], 3, NOW() - INTERVAL '1 hour'),
    (3, v_post_ids[9], 1, NOW() - INTERVAL '4 hours'),
    (4, v_post_ids[10], 2, NOW() - INTERVAL '10 minutes'),
    (4, v_post_ids[12], 1, NOW() - INTERVAL '2 hours'),
    (5, v_post_ids[3], 4, NOW() - INTERVAL '5 minutes'),
    (5, v_post_ids[11], 1, NOW() - INTERVAL '3 hours'),
    (5, v_post_ids[14], 2, NOW() - INTERVAL '6 hours')
    ON CONFLICT (user_id, post_id) DO UPDATE SET 
      view_count = recently_viewed.view_count + 1,
      viewed_at = NOW();
    RAISE NOTICE 'Created recently viewed entries';
  END IF;
END $$;

-- ===========================================
-- 3. SAVED SEARCHES TABLE - Alerts for matching items
-- ===========================================
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
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);

-- Sample saved searches
INSERT INTO saved_searches (user_id, search_name, search_query, category_id, min_price, max_price, location, condition, filters, notification_enabled, email_alert, push_alert, matches_count, created_at) VALUES
(1, 'Cheap iPhones', 'iPhone', 2, 20000, 50000, 'Hyderabad', NULL, '{"brand": "Apple"}', true, true, true, 12, NOW() - INTERVAL '2 weeks'),
(1, 'Gaming Laptops', 'gaming laptop', 1, 50000, 150000, NULL, 'like_new', '{"ram": "16GB+"}', true, false, true, 5, NOW() - INTERVAL '1 week'),
(2, 'Affordable Furniture', 'desk OR chair', 4, 5000, 30000, 'Mumbai', NULL, NULL, true, true, true, 8, NOW() - INTERVAL '3 days'),
(3, 'Royal Enfield Bikes', 'Royal Enfield', 5, 100000, 250000, 'Delhi', 'good', '{"year": "2020+"}', true, false, true, 3, NOW() - INTERVAL '5 days'),
(4, 'Samsung Phones', 'Samsung Galaxy', 2, 30000, 80000, 'Bangalore', NULL, NULL, true, true, true, 15, NOW() - INTERVAL '1 week'),
(5, 'Kids Toys', 'LEGO OR toys', 10, 1000, 20000, NULL, 'new', NULL, true, false, true, 7, NOW() - INTERVAL '4 days'),
(6, 'AC Under 40K', 'AC OR Air Conditioner', 8, 25000, 40000, 'Chennai', NULL, '{"tonnage": "1.5", "star": "5"}', true, true, true, 4, NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ===========================================
-- 4. PRICE HISTORY TABLE - Price drop notifications
-- ===========================================
CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    old_price DECIMAL(12,2) NOT NULL,
    new_price DECIMAL(12,2) NOT NULL,
    price_change DECIMAL(12,2) GENERATED ALWAYS AS (new_price - old_price) STORED,
    percentage_change DECIMAL(5,2),
    changed_by INTEGER REFERENCES users(user_id),
    reason VARCHAR(100),
    changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_history_post ON price_history(post_id);
CREATE INDEX IF NOT EXISTS idx_price_history_time ON price_history(changed_at DESC);

-- Sample price history
DO $$
DECLARE
  v_post_ids INTEGER[];
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
    RAISE NOTICE 'Created price history entries';
  END IF;
END $$;

-- ===========================================
-- 5. REPORTS TABLE - Flag inappropriate content
-- ===========================================
CREATE TABLE IF NOT EXISTS reports (
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
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);

-- Sample reports
DO $$
DECLARE
  v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts LIMIT 10) sq;
  
  IF array_length(v_post_ids, 1) >= 5 THEN
    INSERT INTO reports (reporter_id, reported_user_id, reported_post_id, report_type, reason, description, status, priority, admin_notes, created_at) VALUES
    (5, 15, v_post_ids[3], 'fake', 'Product images are stock photos', 'The images used in this listing are clearly from Google. The actual product might be different or non-existent.', 'under_review', 'high', 'Checking with seller for original photos', NOW() - INTERVAL '2 days'),
    (6, 20, NULL, 'spam', 'Posting duplicate listings', 'This user has posted the same item 5 times with different titles. Please take action.', 'resolved', 'medium', 'Removed duplicate posts, warned user', NOW() - INTERVAL '1 week'),
    (7, NULL, v_post_ids[5], 'inappropriate', 'Misleading price', 'Price shown is for a part only, not the complete product. Very misleading.', 'pending', 'medium', NULL, NOW() - INTERVAL '3 hours'),
    (8, 25, NULL, 'fraud', 'Seller took money and disappeared', 'Paid advance but seller is not responding. Phone switched off.', 'escalated', 'critical', 'Escalated to legal team', NOW() - INTERVAL '1 day'),
    (9, NULL, v_post_ids[2], 'other', 'Wrong category', 'This is listed in Mobiles but its actually an accessory.', 'resolved', 'low', 'Category corrected', NOW() - INTERVAL '5 days')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Created sample reports';
  END IF;
END $$;

-- ===========================================
-- 6. PROMOTED POSTS TABLE - Monetization feature
-- ===========================================
CREATE TABLE IF NOT EXISTS promoted_posts (
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
CREATE INDEX IF NOT EXISTS idx_promoted_active ON promoted_posts(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_promoted_type ON promoted_posts(promotion_type);

-- Sample promoted posts
DO $$
DECLARE
  v_post_ids INTEGER[];
BEGIN
  SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO v_post_ids FROM (SELECT post_id FROM posts WHERE status = 'active' LIMIT 10) sq;
  
  IF array_length(v_post_ids, 1) >= 5 THEN
    INSERT INTO promoted_posts (post_id, user_id, promotion_type, start_date, end_date, amount_paid, payment_method, views_earned, clicks_earned, inquiries_earned, is_active, created_at) VALUES
    (v_post_ids[1], 1, 'featured', NOW() - INTERVAL '5 days', NOW() + INTERVAL '9 days', 299.00, 'UPI', 1250, 89, 12, true, NOW() - INTERVAL '5 days'),
    (v_post_ids[2], 2, 'spotlight', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 499.00, 'Card', 2100, 156, 23, true, NOW() - INTERVAL '3 days'),
    (v_post_ids[3], 3, 'boost', NOW() - INTERVAL '7 days', NOW() - INTERVAL '1 day', 99.00, 'UPI', 890, 45, 5, false, NOW() - INTERVAL '7 days'),
    (v_post_ids[4], 4, 'premium', NOW() - INTERVAL '2 days', NOW() + INTERVAL '12 days', 599.00, 'Net Banking', 450, 32, 8, true, NOW() - INTERVAL '2 days'),
    (v_post_ids[5], 5, 'homepage', NOW() - INTERVAL '1 day', NOW() + INTERVAL '29 days', 999.00, 'UPI', 3500, 210, 35, true, NOW() - INTERVAL '1 day')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Created promoted posts';
  END IF;
END $$;

-- ===========================================
-- 7. USER VERIFICATION TABLE - Aadhaar, PAN, Phone
-- ===========================================
CREATE TABLE IF NOT EXISTS user_verifications (
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
CREATE INDEX IF NOT EXISTS idx_verification_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_type ON user_verifications(verification_type);

-- Sample user verifications
INSERT INTO user_verifications (user_id, verification_type, verified_value, masked_value, is_verified, verification_attempts, verified_at, created_at) VALUES
(1, 'email', 'rahul.sharma@mhub.com', 'r***@mhub.com', true, 1, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(1, 'phone', '9876543210', '98****3210', true, 1, NOW() - INTERVAL '3 months', NOW() - INTERVAL '3 months'),
(1, 'aadhaar', '1234-5678-9012', 'XXXX-XXXX-9012', true, 1, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(2, 'email', 'priya.patel@mhub.com', 'p***@mhub.com', true, 1, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(2, 'phone', '9876543211', '98****3211', true, 1, NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
(3, 'email', 'amit.kumar@mhub.com', 'a***@mhub.com', true, 1, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
(3, 'phone', '9876543212', '98****3212', true, 2, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
(3, 'pan', 'ABCDE1234F', 'XXXXX1234X', true, 1, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '3 weeks'),
(4, 'email', 'sneha.reddy@mhub.com', 's***@mhub.com', true, 1, NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
(4, 'phone', '9876543213', '98****3213', false, 3, NULL, NOW() - INTERVAL '1 month'),
(5, 'email', 'vikram.singh@mhub.com', 'v***@mhub.com', true, 1, NOW() - INTERVAL '3 weeks', NOW() - INTERVAL '3 weeks'),
(5, 'aadhaar', '2345-6789-0123', 'XXXX-XXXX-0123', true, 1, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks'),
(6, 'email', 'anita.gupta@mhub.com', 'a***@mhub.com', true, 1, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 weeks')
ON CONFLICT (user_id, verification_type) DO NOTHING;

-- ===========================================
-- 8. PUSH TOKENS TABLE - For push notifications
-- ===========================================
CREATE TABLE IF NOT EXISTS push_tokens (
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
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active);

-- Sample push tokens
INSERT INTO push_tokens (user_id, device_token, device_type, device_name, device_model, app_version, os_version, is_active, last_used_at, created_at) VALUES
(1, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx1]', 'android', 'Rahul''s Phone', 'Samsung Galaxy S23', '2.5.0', 'Android 14', true, NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '3 months'),
(1, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx2]', 'web', 'Chrome Browser', NULL, '2.5.0', 'Windows 11', true, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 month'),
(2, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx3]', 'ios', 'Priya''s iPhone', 'iPhone 15 Pro', '2.5.0', 'iOS 17.2', true, NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '2 months'),
(3, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx4]', 'android', 'Amit''s OnePlus', 'OnePlus 12', '2.4.0', 'Android 14', true, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 month'),
(4, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx5]', 'ios', 'Sneha''s iPad', 'iPad Pro 12.9', '2.5.0', 'iPadOS 17', false, NOW() - INTERVAL '2 weeks', NOW() - INTERVAL '2 months'),
(5, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx6]', 'android', 'Vikram''s Pixel', 'Google Pixel 8', '2.5.0', 'Android 14', true, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '3 weeks'),
(6, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx7]', 'web', 'Firefox Browser', NULL, '2.5.0', 'macOS Sonoma', true, NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 weeks'),
(7, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx8]', 'android', 'Rajesh''s Phone', 'Xiaomi 14', '2.4.0', 'Android 14', true, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '1 month'),
(8, 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx9]', 'ios', 'Pooja''s iPhone', 'iPhone 14', '2.5.0', 'iOS 17.1', true, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '6 weeks')
ON CONFLICT (user_id, device_token) DO NOTHING;

-- ===========================================
-- 9. OFFERS TABLE - Price bargaining system
-- ===========================================
CREATE TABLE IF NOT EXISTS offers (
    offer_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    original_price DECIMAL(12,2) NOT NULL,
    offered_price DECIMAL(12,2) NOT NULL,
    counter_price DECIMAL(12,2),
    final_price DECIMAL(12,2),
    discount_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE WHEN original_price > 0 THEN ((original_price - offered_price) / original_price * 100) ELSE 0 END
    ) STORED,
    message TEXT,
    seller_response TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'expired', 'withdrawn')),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '48 hours'),
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(post_id, buyer_id, created_at)
);
CREATE INDEX IF NOT EXISTS idx_offers_post ON offers(post_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- Sample offers
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
    (v_post_ids[1], 5, v_post_users[1], v_post_prices[1], v_post_prices[1] * 0.85, v_post_prices[1] * 0.92, v_post_prices[1] * 0.90, 'Hi, can you give me a discount? I am a genuine buyer.', 'I can do 10% off max. Final offer.', 'accepted', NOW() - INTERVAL '1 day', NOW() - INTERVAL '2 days'),
    (v_post_ids[2], 6, v_post_users[2], v_post_prices[2], v_post_prices[2] * 0.80, NULL, NULL, 'Is the price negotiable? 20% off would be great.', 'Sorry, price is firm for this item.', 'rejected', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '1 day'),
    (v_post_ids[3], 7, v_post_users[3], v_post_prices[3], v_post_prices[3] * 0.88, v_post_prices[3] * 0.93, NULL, 'Great product! Can we settle at 88%?', 'How about 93%? Meet me halfway.', 'countered', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '6 hours'),
    (v_post_ids[4], 8, v_post_users[4], v_post_prices[4], v_post_prices[4] * 0.90, NULL, NULL, 'Interested in this. 10% discount possible?', NULL, 'pending', NULL, NOW() - INTERVAL '2 hours'),
    (v_post_ids[5], 9, v_post_users[5], v_post_prices[5], v_post_prices[5] * 0.75, NULL, NULL, 'This is listed for too long. 25% off?', 'That''s too low. Best I can do is 15%.', 'rejected', NOW() - INTERVAL '2 days', NOW() - INTERVAL '3 days'),
    (v_post_ids[6], 10, v_post_users[6], v_post_prices[6], v_post_prices[6] * 0.95, NULL, v_post_prices[6] * 0.95, 'Just 5% off and I will buy right now!', 'Done! Let''s close the deal.', 'accepted', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '8 hours'),
    (v_post_ids[7], 11, v_post_users[7], v_post_prices[7], v_post_prices[7] * 0.82, NULL, NULL, 'Budget is tight. Help me out?', NULL, 'expired', NULL, NOW() - INTERVAL '5 days')
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Created sample offers';
  END IF;
END $$;

-- ===========================================
-- 10. PRICE DROP ALERTS TABLE - User subscriptions
-- ===========================================
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
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_drop_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_drop_alerts(is_active);

-- Sample price drop alerts
DO $$
DECLARE
  v_post_ids INTEGER[];
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
    RAISE NOTICE 'Created price drop alerts';
  END IF;
END $$;

-- ===========================================
-- VERIFICATION
-- ===========================================
SELECT '✅ ENHANCEMENT TABLES CREATED SUCCESSFULLY!' as status;
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

-- ===========================================
-- USEFUL QUERIES FOR FRONTEND
-- ===========================================
/*
-- Get user's wishlist with post details
SELECT w.*, p.title, p.price, p.images, p.status
FROM wishlists w
JOIN posts p ON w.post_id = p.post_id
WHERE w.user_id = :userId
ORDER BY w.created_at DESC;

-- Get recently viewed posts
SELECT rv.*, p.title, p.price, p.images
FROM recently_viewed rv
JOIN posts p ON rv.post_id = p.post_id
WHERE rv.user_id = :userId
ORDER BY rv.viewed_at DESC
LIMIT 20;

-- Get price history for a post
SELECT * FROM price_history
WHERE post_id = :postId
ORDER BY changed_at DESC;

-- Get active offers for a seller
SELECT o.*, p.title, u.username as buyer_name
FROM offers o
JOIN posts p ON o.post_id = p.post_id
JOIN users u ON o.buyer_id = u.user_id
WHERE o.seller_id = :sellerId AND o.status IN ('pending', 'countered')
ORDER BY o.created_at DESC;

-- Get promoted posts for homepage
SELECT pp.*, p.*, u.username
FROM promoted_posts pp
JOIN posts p ON pp.post_id = p.post_id
JOIN users u ON p.user_id = u.user_id
WHERE pp.is_active = true AND pp.end_date > NOW()
ORDER BY pp.promotion_type DESC, pp.created_at DESC;

-- Check user verification status
SELECT * FROM user_verifications
WHERE user_id = :userId;
*/
