-- Phase: Performance Optimization Indexes
-- Adds missing indexes identified during codebase analysis

-- Post boost active queries (high frequency)
CREATE INDEX IF NOT EXISTS idx_post_boosts_active
  ON post_boosts(post_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_post_boosts_expiry
  ON post_boosts(expires_at) WHERE status = 'active';

-- Subscription active lookups (used on every quota check)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active
  ON user_subscriptions(user_id, is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expiry
  ON user_subscriptions(expires_at) WHERE is_active = true;

-- Coin transactions user lookups
CREATE INDEX IF NOT EXISTS idx_coin_transactions_user_type
  ON coin_transactions(user_id, type, created_at DESC);

-- Posts status + expiry (used by expiry crons and all listing queries)
CREATE INDEX IF NOT EXISTS idx_posts_active_expiry
  ON posts(status, expires_at) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_posts_user_status
  ON posts(user_id, status);

-- Posts tier-based search ranking
CREATE INDEX IF NOT EXISTS idx_posts_boost_level
  ON posts(boost_level DESC, created_at DESC) WHERE status = 'active';

-- Users current plan (used in search ranking JOINs)
CREATE INDEX IF NOT EXISTS idx_users_current_plan
  ON users(current_plan) WHERE current_plan IS NOT NULL;

-- Notifications unread (used in daily digest cron)
CREATE INDEX IF NOT EXISTS idx_notifications_unread_recent
  ON notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- Inquiries seller lookups (used in seller analytics)
CREATE INDEX IF NOT EXISTS idx_inquiries_seller
  ON inquiries(seller_id);

-- Transactions seller completed (used in seller analytics)
CREATE INDEX IF NOT EXISTS idx_transactions_seller_status
  ON transactions(seller_id, status);

-- Reviews lookup by reviewee (profile page, trust score)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created
  ON reviews(reviewee_id, created_at DESC);

-- Reviews lookup by reviewer (my reviews page)
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer
  ON reviews(reviewer_id, created_at DESC);

-- Complaints SLA tracking (used in cron + admin dashboard)
CREATE INDEX IF NOT EXISTS idx_complaints_status_sla
  ON complaints(status, sla_due_at) WHERE status IN ('open', 'triage');

-- Complaints buyer lookups
CREATE INDEX IF NOT EXISTS idx_complaints_buyer_created
  ON complaints(buyer_id, created_at DESC);

-- Post metrics impression tracking
CREATE INDEX IF NOT EXISTS idx_post_metrics_post_updated
  ON post_metrics(post_id, last_updated DESC);

-- Wishlists user lookups
CREATE INDEX IF NOT EXISTS idx_wishlists_user_post
  ON wishlists(user_id, post_id);

-- Price drop alerts active lookups
CREATE INDEX IF NOT EXISTS idx_price_alerts_active
  ON price_drop_alerts(is_active, post_id) WHERE is_active = true;

-- Recently viewed user lookups
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user
  ON recently_viewed(user_id, viewed_at DESC);

-- Saved searches user lookups
CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON saved_searches(user_id, created_at DESC);

-- Login audit fraud detection (used in cron fraud batch review)
CREATE INDEX IF NOT EXISTS idx_login_audit_failed_recent
  ON login_audit(user_id, created_at DESC) WHERE success = false;

-- Offers seller lookups (used in conversion funnel)
CREATE INDEX IF NOT EXISTS idx_offers_seller
  ON offers(seller_id);

-- Post likes lookup (toggle like/unlike)
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post
  ON post_likes(user_id, post_id);
