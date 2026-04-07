-- =====================================================
-- Migration: Production Readiness - Missing Indexes
-- Date: 2026-04-07
-- Purpose: Add indexes on foreign keys missing from initial schema
-- =====================================================

-- Referrals table: frequently queried by referrer_id and referee_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referrer_id
  ON referrals(referrer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_referrals_referee_id
  ON referrals(referee_id);

-- Buyer inquiries: queried by buyer, seller, and post
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyer_inquiries_buyer_id
  ON buyer_inquiries(buyer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyer_inquiries_seller_id
  ON buyer_inquiries(seller_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_buyer_inquiries_post_id
  ON buyer_inquiries(post_id);

-- Reviews: queried by reviewer and reviewee
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewer_id
  ON reviews(reviewer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_reviewee_id
  ON reviews(reviewee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_post_id
  ON reviews(post_id);

-- Wishlists: queried by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wishlists_user_id
  ON wishlists(user_id);

-- Recently viewed: queried by user, ordered by timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recently_viewed_user_id
  ON recently_viewed(user_id);

-- Rewards: queried by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rewards_user_id
  ON rewards(user_id);

-- Reward log: queried by user for history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reward_log_user_id
  ON reward_log(user_id);

-- Notifications: queried by user, sorted by date
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id_created
  ON notifications(user_id, created_at DESC);

-- Feedback: queried by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feedback_user_id
  ON feedback(user_id);

-- Transactions: queried by buyer and seller
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_buyer_id
  ON transactions(buyer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_seller_id
  ON transactions(seller_id);

-- Price history: queried by post
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_price_history_post_id
  ON price_history(post_id);

-- Reports: queried by reporter and reported user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_reporter_id
  ON reports(reporter_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reports_reported_user_id
  ON reports(reported_user_id);
