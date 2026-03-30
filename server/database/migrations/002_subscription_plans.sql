-- Migration 002: 4-Tier Subscription Plans & User Subscriptions
-- Phase 2C: New pricing model (Basic/Bronze/Silver/Premium)

-- Subscription plans reference table
CREATE TABLE IF NOT EXISTS subscription_plans (
  plan_id SERIAL PRIMARY KEY,
  name VARCHAR(20) NOT NULL UNIQUE,
  display_name VARCHAR(50) NOT NULL,
  price_inr DECIMAL(10,2) NOT NULL,
  duration_months INTEGER,
  max_listings INTEGER,
  visibility_days INTEGER NOT NULL,
  boost_quota_monthly INTEGER DEFAULT 0,
  featured_quota_monthly INTEGER DEFAULT 0,
  spotlight_quota_monthly INTEGER DEFAULT 0,
  badge_type VARCHAR(20),
  has_analytics BOOLEAN DEFAULT FALSE,
  has_priority_search BOOLEAN DEFAULT FALSE,
  has_priority_support BOOLEAN DEFAULT FALSE,
  search_priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 4 tiers
INSERT INTO subscription_plans (name, display_name, price_inr, duration_months, max_listings, visibility_days, boost_quota_monthly, featured_quota_monthly, spotlight_quota_monthly, badge_type, has_analytics, has_priority_search, has_priority_support, search_priority)
VALUES
  ('basic', 'Basic', 500, NULL, 1, 15, 0, 0, 0, NULL, false, false, false, 0),
  ('bronze', 'Bronze', 850, 3, 100, 30, 0, 0, 0, 'seller', true, false, false, 1),
  ('silver', 'Silver Seller', 1200, 6, 200, 30, 5, 5, 5, 'verified', true, true, false, 2),
  ('premium', 'Premium God Mode', 1500, 12, NULL, 45, 5, 5, 5, 'crown', true, true, true, 3)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  price_inr = EXCLUDED.price_inr,
  duration_months = EXCLUDED.duration_months,
  max_listings = EXCLUDED.max_listings,
  visibility_days = EXCLUDED.visibility_days,
  boost_quota_monthly = EXCLUDED.boost_quota_monthly,
  featured_quota_monthly = EXCLUDED.featured_quota_monthly,
  spotlight_quota_monthly = EXCLUDED.spotlight_quota_monthly,
  badge_type = EXCLUDED.badge_type,
  has_analytics = EXCLUDED.has_analytics,
  has_priority_search = EXCLUDED.has_priority_search,
  has_priority_support = EXCLUDED.has_priority_support,
  search_priority = EXCLUDED.search_priority;

-- User subscriptions tracking
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id),
  plan_name VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  payment_id INTEGER,
  boost_used_this_month INTEGER DEFAULT 0,
  featured_used_this_month INTEGER DEFAULT 0,
  spotlight_used_this_month INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ DEFAULT NOW(),
  listings_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sub_active ON user_subscriptions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sub_expires ON user_subscriptions(expires_at) WHERE is_active = true;

-- Quick-access columns on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_current_plan ON users(current_plan);
