-- ============================================================
-- Referral Chain Rewards + Wallet Enhancements (idempotent)
-- ============================================================

BEGIN;

-- 1) Extend coin_transactions with referral context
ALTER TABLE coin_transactions
  ADD COLUMN IF NOT EXISTS source_user_id TEXT,
  ADD COLUMN IF NOT EXISTS level INTEGER,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_coin_source_user
  ON coin_transactions(source_user_id);

CREATE INDEX IF NOT EXISTS idx_coin_level
  ON coin_transactions(level);

-- 2) Referral reward ledger (per reward event)
CREATE TABLE IF NOT EXISTS referral_rewards (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level >= 1),
  reward_coins NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_referral_rewards_unique
  ON referral_rewards(referrer_id, referred_user_id, level);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referred
  ON referral_rewards(referred_user_id, created_at DESC);

-- 3) Relax depth constraints to allow configurable chain depth
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
    WHERE pg_class.relname = 'referral_relationships'
      AND pg_constraint.contype = 'c'
      AND pg_get_constraintdef(pg_constraint.oid) ILIKE '%depth%'
  LOOP
    EXECUTE format('ALTER TABLE referral_relationships DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referral_relationships_depth_check'
  ) THEN
    ALTER TABLE referral_relationships
      ADD CONSTRAINT referral_relationships_depth_check CHECK (depth >= 1);
  END IF;
END $$;

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
    WHERE pg_class.relname = 'referral_closure'
      AND pg_constraint.contype = 'c'
      AND pg_get_constraintdef(pg_constraint.oid) ILIKE '%depth%'
  LOOP
    EXECUTE format('ALTER TABLE referral_closure DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'referral_closure_depth_check'
  ) THEN
    ALTER TABLE referral_closure
      ADD CONSTRAINT referral_closure_depth_check CHECK (depth >= 1);
  END IF;
END $$;

-- 4) Wallet view (reads from users.coins)
CREATE OR REPLACE VIEW wallets AS
SELECT
  user_id,
  COALESCE(coins, 0) AS total_coins,
  updated_at
FROM users;

COMMIT;

SELECT 'Migration 016 complete - referral chain rewards + wallet enhancements' AS status;
