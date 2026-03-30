-- ============================================================================
-- User Subscriptions UUID Fix
-- Ensures user_subscriptions.user_id uses UUID and references users(user_id).
-- ============================================================================

DO $$
DECLARE current_type text;
BEGIN
  SELECT data_type INTO current_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_subscriptions'
    AND column_name = 'user_id';

  IF current_type IS NULL THEN
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
  ELSIF current_type <> 'uuid' THEN
    BEGIN
      ALTER TABLE user_subscriptions
        ALTER COLUMN user_id TYPE UUID USING user_id::uuid;
    EXCEPTION WHEN others THEN
      ALTER TABLE user_subscriptions RENAME TO user_subscriptions_legacy;
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
      INSERT INTO user_subscriptions (
        id, user_id, plan_name, started_at, expires_at, is_active, payment_id,
        boost_used_this_month, featured_used_this_month, spotlight_used_this_month,
        quota_reset_at, listings_count, created_at
      )
      SELECT
        id,
        NULLIF(user_id::text, '')::uuid,
        plan_name,
        started_at,
        expires_at,
        is_active,
        payment_id,
        boost_used_this_month,
        featured_used_this_month,
        spotlight_used_this_month,
        quota_reset_at,
        listings_count,
        created_at
      FROM user_subscriptions_legacy
      WHERE user_id::text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
    END;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_sub_active ON user_subscriptions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sub_expires ON user_subscriptions(expires_at) WHERE is_active = true;
