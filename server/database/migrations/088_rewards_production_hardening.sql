-- ============================================================================
-- MIGRATION 088: Rewards & Coins Production Hardening
-- Indexes, milestone tracking, daily code redemption, and store fulfillment metadata.
-- Idempotent and safe to run on any environment.
-- ============================================================================

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

  -- 1. Daily Code claims tracking
  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS reward_daily_code_claims (
      id SERIAL PRIMARY KEY,
      user_id %s NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      code_claimed VARCHAR(50) NOT NULL,
      claim_date DATE NOT NULL,
      reward_amount NUMERIC(10,2) NOT NULL DEFAULT 15.00,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, claim_date)
    )
  $sql$, user_id_type);

  -- 2. Referral Milestone claims tracking
  EXECUTE format($sql$
    CREATE TABLE IF NOT EXISTS referral_milestone_claims (
      id SERIAL PRIMARY KEY,
      user_id %s NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      milestone_count INTEGER NOT NULL,
      reward_amount NUMERIC(10,2) NOT NULL,
      claimed_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, milestone_count)
    )
  $sql$, user_id_type);

END $$;

-- 3. Optimized indexes for high concurrency & history ledger queries
CREATE INDEX IF NOT EXISTS idx_coin_tx_user_created ON coin_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_reference ON coin_transactions(reference_id);
CREATE INDEX IF NOT EXISTS idx_coin_tx_user_type ON coin_transactions(user_id, type);

-- 4. Store redemptions metadata support
ALTER TABLE reward_redemptions ADD COLUMN IF NOT EXISTS metadata JSONB;
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions(user_id, created_at DESC);
