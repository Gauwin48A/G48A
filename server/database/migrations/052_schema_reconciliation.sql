-- =============================================================
-- 052_schema_reconciliation.sql
-- Reconciles this UUID-based DB with src/database/init.sql (the
-- canonical schema run by SchemaGuard at startup) and with the
-- columns the controllers actually query. Safe to re-run.
-- =============================================================

BEGIN;

-- -------------------------------
-- categories: add init.sql columns so its indexes apply
-- -------------------------------
ALTER TABLE categories ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES categories(category_id) ON DELETE SET NULL;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);

-- -------------------------------
-- device_tokens: add token_id/device_id + fcm_token uniqueness
-- (the app's ON CONFLICT (fcm_token) upsert requires this index)
-- -------------------------------
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS token_id UUID DEFAULT gen_random_uuid();
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS device_id TEXT REFERENCES user_devices(device_id);

DELETE FROM device_tokens a USING device_tokens b
  WHERE a.token_id > b.token_id AND a.fcm_token = b.fcm_token;
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_fcm_token ON device_tokens(fcm_token);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_tokens(user_id);

-- -------------------------------
-- notifications: add init.sql legacy columns
-- -------------------------------
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_sent BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
-- legacy inserters (saleController, cronJobs) reference sale/post ids here
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_unsent ON notifications(is_sent) WHERE is_sent = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id, created_at DESC) WHERE receiver_id IS NOT NULL;

-- -------------------------------
-- reviews: add the post-based columns reviewsController uses
-- -------------------------------
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewee_id TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS post_id TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT false;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS review_type VARCHAR(20) DEFAULT 'post';
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS communication_rating INT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS quality_rating INT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS value_rating INT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS shipping_rating INT;

CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created ON reviews(reviewee_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id, created_at DESC);
-- arbiter for ON CONFLICT (reviewer_id, reviewee_id, post_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_reviewer_reviewee_post
  ON reviews(reviewer_id, reviewee_id, post_id);

-- -------------------------------
-- user_sessions: add the columns authController writes/reads
-- -------------------------------
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS token_hash VARCHAR(255);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(255);
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();

-- -------------------------------
-- user_risk_states: used by riskStateService + trustBadgeService
-- -------------------------------
CREATE TABLE IF NOT EXISTS user_risk_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  status VARCHAR(30) NOT NULL DEFAULT 'normal',
  score INTEGER DEFAULT 0,
  reason TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  last_device_fingerprint TEXT,
  last_ip_address VARCHAR(45),
  last_verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_risk_states_status ON user_risk_states(status);

-- -------------------------------
-- coupon_redemptions: fix INTEGER->UUID FK drift (users.user_id is UUID)
-- -------------------------------
DROP TABLE IF EXISTS coupon_redemptions;
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  redemption_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES influencer_coupons(coupon_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  razorpay_order_id VARCHAR(100),
  discount_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMIT;
