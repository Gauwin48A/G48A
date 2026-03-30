-- Rewards + Referral Hierarchy Schema (idempotent)
-- Supports:
-- 1) Direct referral relationships
-- 2) Tree/ancestor hierarchy queries
-- 3) Reward activity ledger analytics

BEGIN;

CREATE TABLE IF NOT EXISTS referral_relationships (
  relationship_id BIGSERIAL PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,
  referee_user_id TEXT NOT NULL UNIQUE,
  parent_user_id TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 1 CHECK (depth >= 1),
  chain_path TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer
  ON referral_relationships(referrer_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_relationships_parent
  ON referral_relationships(parent_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_relationships_depth
  ON referral_relationships(depth);

CREATE TABLE IF NOT EXISTS referral_closure (
  ancestor_user_id TEXT NOT NULL,
  descendant_user_id TEXT NOT NULL,
  depth INTEGER NOT NULL CHECK (depth >= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ancestor_user_id, descendant_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_closure_descendant
  ON referral_closure(descendant_user_id);

CREATE INDEX IF NOT EXISTS idx_referral_closure_depth
  ON referral_closure(depth);

CREATE TABLE IF NOT EXISTS reward_activity (
  activity_id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  related_user_id TEXT,
  referral_relationship_id BIGINT REFERENCES referral_relationships(relationship_id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  points_delta INTEGER NOT NULL,
  points_after INTEGER,
  idempotency_key TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_reward_activity_user_idempotency
  ON reward_activity(user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reward_activity_user_time
  ON reward_activity(user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_reward_activity_type_time
  ON reward_activity(activity_type, occurred_at DESC);

-- Backfill direct relationships from users.referred_by (safe re-run)
INSERT INTO referral_relationships (
  referrer_user_id,
  referee_user_id,
  parent_user_id,
  depth,
  chain_path,
  status,
  updated_at
)
SELECT
  u.referred_by::text,
  u.user_id::text,
  u.referred_by::text,
  1,
  ARRAY[u.referred_by::text, u.user_id::text],
  'active',
  NOW()
FROM users u
WHERE u.referred_by IS NOT NULL
ON CONFLICT (referee_user_id) DO UPDATE
SET
  referrer_user_id = EXCLUDED.referrer_user_id,
  parent_user_id = EXCLUDED.parent_user_id,
  depth = EXCLUDED.depth,
  chain_path = EXCLUDED.chain_path,
  status = EXCLUDED.status,
  updated_at = NOW();

-- Backfill ancestor-descendant closure table (safe re-run)
WITH RECURSIVE closure AS (
  SELECT
    u.referred_by::text AS ancestor_user_id,
    u.user_id::text AS descendant_user_id,
    1 AS depth
  FROM users u
  WHERE u.referred_by IS NOT NULL

  UNION ALL

  SELECT
    parent.referred_by::text AS ancestor_user_id,
    c.descendant_user_id,
    c.depth + 1 AS depth
  FROM closure c
  JOIN users parent
    ON parent.user_id::text = c.ancestor_user_id
  WHERE parent.referred_by IS NOT NULL
    AND c.depth < 12
)
INSERT INTO referral_closure (
  ancestor_user_id,
  descendant_user_id,
  depth,
  created_at
)
SELECT
  ancestor_user_id,
  descendant_user_id,
  depth,
  NOW()
FROM closure
ON CONFLICT (ancestor_user_id, descendant_user_id) DO UPDATE
SET depth = LEAST(referral_closure.depth, EXCLUDED.depth);

-- Backfill reward activity from existing reward_log (safe re-run)
INSERT INTO reward_activity (
  user_id,
  activity_type,
  points_delta,
  metadata,
  occurred_at,
  created_at
)
SELECT
  rl.user_id::text,
  COALESCE(NULLIF(rl.action, ''), 'adjustment'),
  COALESCE(rl.points, 0),
  jsonb_build_object(
    'source', 'reward_log_backfill',
    'description', COALESCE(rl.description, '')
  ),
  COALESCE(rl.created_at, NOW()),
  NOW()
FROM reward_log rl
WHERE NOT EXISTS (
  SELECT 1
  FROM reward_activity ra
  WHERE ra.user_id = rl.user_id::text
    AND ra.activity_type = COALESCE(NULLIF(rl.action, ''), 'adjustment')
    AND ra.points_delta = COALESCE(rl.points, 0)
    AND ra.occurred_at = COALESCE(rl.created_at, NOW())
);

COMMIT;
