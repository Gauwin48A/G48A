-- ============================================================
-- 020: Complete Rewards Chain Infrastructure (idempotent)
-- Missing tables: referral_rewards, user_streaks,
--   referral_closure, referral_relationships
-- Missing columns: users.xp, users.level
-- ============================================================

BEGIN;

-- 1) Add missing XP and Level columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

-- 2) referral_relationships table
CREATE TABLE IF NOT EXISTS referral_relationships (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_id TEXT NOT NULL,
  depth INTEGER NOT NULL CHECK (depth >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referrer_id, referred_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_rel_referrer
  ON referral_relationships(referrer_id);

CREATE INDEX IF NOT EXISTS idx_referral_rel_referred
  ON referral_relationships(referred_id);

-- 3) referral_closure table (transitive closure for fast chain lookups)
CREATE TABLE IF NOT EXISTS referral_closure (
  id BIGSERIAL PRIMARY KEY,
  ancestor_user_id TEXT NOT NULL,
  descendant_user_id TEXT NOT NULL,
  depth INTEGER NOT NULL CHECK (depth >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ancestor_user_id, descendant_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_closure_desc
  ON referral_closure(descendant_user_id, depth);

CREATE INDEX IF NOT EXISTS idx_referral_closure_anc
  ON referral_closure(ancestor_user_id, depth);

-- 4) referral_rewards table (if not already created by 016)
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

CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer_date
  ON referral_rewards(referrer_id, created_at DESC);

-- 5) user_streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id TEXT PRIMARY KEY,
  visit_streak INTEGER NOT NULL DEFAULT 0,
  post_streak INTEGER NOT NULL DEFAULT 0,
  last_visit_date DATE,
  last_post_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6) Trigger to maintain referral_closure automatically
CREATE OR REPLACE FUNCTION maintain_referral_closure()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert direct relationship
  INSERT INTO referral_closure (ancestor_user_id, descendant_user_id, depth)
  VALUES (NEW.referrer_id, NEW.referred_id, 1)
  ON CONFLICT (ancestor_user_id, descendant_user_id) DO NOTHING;

  -- Insert transitive ancestors
  INSERT INTO referral_closure (ancestor_user_id, descendant_user_id, depth)
  SELECT c.ancestor_user_id, NEW.referred_id, c.depth + 1
  FROM referral_closure c
  WHERE c.descendant_user_id = NEW.referrer_id
  ON CONFLICT (ancestor_user_id, descendant_user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_referral_closure ON referral_relationships;

CREATE TRIGGER trg_referral_closure
  AFTER INSERT ON referral_relationships
  FOR EACH ROW
  EXECUTE FUNCTION maintain_referral_closure();

-- 7) Populate referral_relationships from users.referred_by where missing
INSERT INTO referral_relationships (referrer_id, referred_id, depth)
SELECT
  u.referred_by::text,
  u.user_id::text,
  1
FROM users u
WHERE u.referred_by IS NOT NULL
  AND u.referred_by::text <> ''
ON CONFLICT (referrer_id, referred_id) DO NOTHING;

COMMIT;

SELECT 'Migration 020 complete - rewards chain infrastructure' AS status;
