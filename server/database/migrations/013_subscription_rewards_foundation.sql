-- Phase 4I: Subscription + rewards foundation hardening
-- Aligns subscription history storage and ensures the rewards ledger exists.

CREATE TABLE IF NOT EXISTS reward_log (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action VARCHAR(80) NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_log_user_created
  ON reward_log(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
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
  is_trial BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_user_id_fkey;

ALTER TABLE user_subscriptions
  ALTER COLUMN user_id TYPE TEXT
  USING user_id::text;

ALTER TABLE user_subscriptions
  ALTER COLUMN payment_id TYPE TEXT
  USING payment_id::text;

ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS boost_used_this_month INTEGER DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS featured_used_this_month INTEGER DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS spotlight_used_this_month INTEGER DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS quota_reset_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS listings_count INTEGER DEFAULT 0;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT FALSE;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
ALTER TABLE user_subscriptions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_user_sub_active
  ON user_subscriptions(user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_user_sub_expires
  ON user_subscriptions(expires_at)
  WHERE is_active = true;
