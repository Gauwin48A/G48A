-- =====================================================
-- OPERATION POLISH: COMPLETE DATABASE INDEXING
-- =====================================================
-- Run this script to optimize ALL tables for maximum performance
-- Safe to run multiple times - uses IF NOT EXISTS
-- =====================================================

-- Clear any pending transactions first
ROLLBACK;

-- =====================================================
-- USERS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at DESC);

-- =====================================================
-- POSTS TABLE INDEXES (Most Critical)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_price ON posts(price);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views_count ASC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_category_price ON posts(category_id, price) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_location ON posts(location);
-- Composite index for feed queries
CREATE INDEX IF NOT EXISTS idx_posts_active_feed ON posts(status, created_at DESC) WHERE status = 'active';
-- Geo-spatial index
CREATE INDEX IF NOT EXISTS idx_posts_geo ON posts(latitude, longitude) WHERE latitude IS NOT NULL;

-- =====================================================
-- PROFILES TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);

-- =====================================================
-- REFERRALS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referee ON referrals(referee_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- =====================================================
-- REWARDS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_rewards_tier ON rewards(tier);
CREATE INDEX IF NOT EXISTS idx_rewards_points ON rewards(points DESC);

-- =====================================================
-- TRANSACTIONS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_seller ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_post ON transactions(post_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- =====================================================
-- NOTIFICATIONS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- =====================================================
-- FEEDBACK TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON feedback(category);

-- =====================================================
-- PREFERENCES TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_preferences_user ON preferences(user_id);

-- =====================================================
-- USER LOCATIONS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_geo ON user_locations(latitude, longitude);

-- =====================================================
-- BUYER INQUIRIES TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inquiries_post ON buyer_inquiries(post_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer ON buyer_inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_seller ON buyer_inquiries(seller_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON buyer_inquiries(status);

-- =====================================================
-- REVIEWS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_post ON reviews(post_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- =====================================================
-- WISHLISTS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_post ON wishlists(post_id);

-- =====================================================
-- RECENTLY VIEWED TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON recently_viewed(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_time ON recently_viewed(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_post ON recently_viewed(post_id);

-- =====================================================
-- SAVED SEARCHES TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_category ON saved_searches(category_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_notify ON saved_searches(notification_enabled) WHERE notification_enabled = true;

-- =====================================================
-- PRICE HISTORY TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_price_history_post ON price_history(post_id);
CREATE INDEX IF NOT EXISTS idx_price_history_time ON price_history(changed_at DESC);

-- =====================================================
-- REPORTS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_priority ON reports(priority);

-- =====================================================
-- PROMOTED POSTS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_promoted_active ON promoted_posts(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_promoted_type ON promoted_posts(promotion_type);
CREATE INDEX IF NOT EXISTS idx_promoted_post ON promoted_posts(post_id);
CREATE INDEX IF NOT EXISTS idx_promoted_user ON promoted_posts(user_id);

-- =====================================================
-- USER VERIFICATIONS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_verification_user ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_type ON user_verifications(verification_type);
CREATE INDEX IF NOT EXISTS idx_verification_verified ON user_verifications(is_verified) WHERE is_verified = true;

-- =====================================================
-- PUSH TOKENS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;

-- =====================================================
-- OFFERS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_offers_post ON offers(post_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_expires ON offers(expires_at) WHERE status = 'pending';

-- =====================================================
-- PRICE DROP ALERTS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_drop_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_drop_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_price_alerts_post ON price_drop_alerts(post_id);

-- =====================================================
-- CHANNELS TABLE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_channels_owner ON channels(owner_id);
CREATE INDEX IF NOT EXISTS idx_channels_public ON channels(is_public) WHERE is_public = true;

-- =====================================================
-- UPDATE STATISTICS FOR QUERY PLANNER
-- =====================================================
ANALYZE users;
ANALYZE profiles;
ANALYZE posts;
ANALYZE categories;
ANALYZE referrals;
ANALYZE rewards;
ANALYZE transactions;
ANALYZE notifications;
ANALYZE feedback;
ANALYZE preferences;
ANALYZE user_locations;
ANALYZE buyer_inquiries;
ANALYZE reviews;
ANALYZE wishlists;
ANALYZE recently_viewed;
ANALYZE saved_searches;
ANALYZE price_history;
ANALYZE reports;
ANALYZE promoted_posts;
ANALYZE user_verifications;
ANALYZE push_tokens;
ANALYZE offers;
ANALYZE price_drop_alerts;
ANALYZE channels;

-- =====================================================
-- VERIFICATION
-- =====================================================
SELECT 'All indexes created successfully!' AS status;

-- Show all created indexes
SELECT 
    tablename AS table_name,
    indexname AS index_name,
    indexdef AS definition
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
