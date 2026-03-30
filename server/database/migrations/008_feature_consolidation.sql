-- Migration 008: Feature consolidation
-- Covers: referral depth rewards, subscription plan seed update, listing expiry,
-- search ranking, coin welcome bonus tracking, seller analytics enrichment

-- ============================================================
-- 1. Update subscription_plans with correct Bronze quotas
-- ============================================================
UPDATE subscription_plans SET
  boost_quota_monthly = 0,
  featured_quota_monthly = 0,
  spotlight_quota_monthly = 0
WHERE name = 'bronze';

-- Also update Silver to 5/5/5 per 6 months (stored as monthly, controller handles period)
UPDATE subscription_plans SET
  boost_quota_monthly = 5,
  featured_quota_monthly = 5,
  spotlight_quota_monthly = 5
WHERE name = 'silver';

UPDATE subscription_plans SET
  boost_quota_monthly = 5,
  featured_quota_monthly = 5,
  spotlight_quota_monthly = 5
WHERE name = 'premium';

-- ============================================================
-- 2. Posts: add tier_priority, expires_at, is_featured columns if missing
-- ============================================================
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tier_priority INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS boost_level INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_spotlight BOOLEAN DEFAULT FALSE;

-- Index for tier-based search ranking
CREATE INDEX IF NOT EXISTS idx_posts_tier_priority_created
  ON posts(tier_priority DESC, boost_level DESC, created_at DESC)
  WHERE status = 'active';

-- Index for expired listing cleanup
CREATE INDEX IF NOT EXISTS idx_posts_expires_active
  ON posts(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;

-- ============================================================
-- 3. Users: ensure all plan-related columns exist
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS coins DECIMAL(10,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_bonus_claimed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;

-- ============================================================
-- 4. Referral chain depth tracking (ensure referral_relationships has correct schema)
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_relationships (
  relationship_id BIGSERIAL PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,
  referee_user_id TEXT NOT NULL UNIQUE,
  parent_user_id TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 1 CHECK (depth >= 1 AND depth <= 3),
  chain_path TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer
  ON referral_relationships(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_depth
  ON referral_relationships(depth);

-- Closure table for ancestor lookups
CREATE TABLE IF NOT EXISTS referral_closure (
  ancestor_user_id TEXT NOT NULL,
  descendant_user_id TEXT NOT NULL,
  depth INTEGER NOT NULL CHECK (depth >= 1 AND depth <= 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ancestor_user_id, descendant_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_closure_descendant
  ON referral_closure(descendant_user_id);

-- ============================================================
-- 5. Coin transactions table (robust version)
-- ============================================================
CREATE TABLE IF NOT EXISTS coin_transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(30) NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_user ON coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_reference ON coin_transactions(reference_id);

-- ============================================================
-- 6. Post boosts table
-- ============================================================
CREATE TABLE IF NOT EXISTS post_boosts (
  boost_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  boost_type TEXT NOT NULL CHECK (boost_type IN ('boost', 'featured', 'spotlight')),
  source TEXT DEFAULT 'plan' CHECK (source IN ('plan', 'coins', 'admin')),
  amount_inr DECIMAL(10,2) DEFAULT 0,
  payment_reference TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  starts_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_boosts_post ON post_boosts(post_id);
CREATE INDEX IF NOT EXISTS idx_post_boosts_active
  ON post_boosts(status, expires_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_post_boosts_user ON post_boosts(user_id);

-- ============================================================
-- 7. Seller analytics: post impressions log
-- ============================================================
CREATE TABLE IF NOT EXISTS post_impressions (
  id BIGSERIAL PRIMARY KEY,
  post_id TEXT NOT NULL,
  viewer_user_id TEXT,
  source TEXT DEFAULT 'feed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_impressions_post
  ON post_impressions(post_id, created_at DESC);

-- ============================================================
-- 8. User location columns for village/colony
-- ============================================================
ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS colony TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_village TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_colony TEXT;

-- ============================================================
-- 9. Reward activity table
-- ============================================================
CREATE TABLE IF NOT EXISTS reward_activity (
  activity_id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  related_user_id TEXT,
  referral_relationship_id BIGINT,
  activity_type TEXT NOT NULL,
  points_delta INTEGER NOT NULL,
  points_after INTEGER,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_reward_activity_idempotency
  ON reward_activity(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- ============================================================
-- 10. User subscriptions table (if not already created by 002)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_name VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  payment_id TEXT,
  boost_used_this_month INTEGER DEFAULT 0,
  featured_used_this_month INTEGER DEFAULT 0,
  spotlight_used_this_month INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ DEFAULT NOW(),
  listings_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_user_sub_active ON user_subscriptions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sub_expires ON user_subscriptions(expires_at) WHERE is_active = true;

SELECT 'Migration 008 complete — feature consolidation applied' AS status;
