-- Phase 4H: Rewards Engagement Features
-- Daily check-in, spin wheel, scratch cards, reward store redemptions

DO $$
DECLARE
  user_id_udt text;
  user_id_type text;
BEGIN
  SELECT udt_name
    INTO user_id_udt
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'users'
     AND column_name = 'user_id';

  user_id_type := COALESCE(user_id_udt, 'text');

  IF user_id_type NOT IN ('uuid', 'int4', 'int8', 'text', 'varchar') THEN
    user_id_type := 'text';
  END IF;

  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS reward_daily_checkins (
      user_id %s PRIMARY KEY REFERENCES users(user_id),
      last_checkin_date DATE NOT NULL,
      streak INTEGER NOT NULL DEFAULT 1,
      best_streak INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  $sql$, user_id_type);

  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS reward_spin_history (
      id SERIAL PRIMARY KEY,
      user_id %s NOT NULL REFERENCES users(user_id),
      spin_date DATE NOT NULL,
      reward_amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, spin_date)
    )
  $sql$, user_id_type);

  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS reward_scratch_claims (
      id SERIAL PRIMARY KEY,
      user_id %s NOT NULL REFERENCES users(user_id),
      referral_user_id %s NOT NULL REFERENCES users(user_id),
      reward_amount DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, referral_user_id)
    )
  $sql$, user_id_type, user_id_type);

  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS reward_redemptions (
      id SERIAL PRIMARY KEY,
      user_id %s NOT NULL REFERENCES users(user_id),
      reward_type VARCHAR(40) NOT NULL,
      post_id TEXT,
      cost DECIMAL(10,2) NOT NULL,
      metadata JSONB,
      status VARCHAR(20) DEFAULT 'redeemed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  $sql$, user_id_type);
END $$;

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user
  ON reward_redemptions(user_id, created_at DESC);

-- Optional badge column for rewards-based profile badges
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_badge VARCHAR(30);
