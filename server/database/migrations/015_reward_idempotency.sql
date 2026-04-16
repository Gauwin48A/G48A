-- Phase 4J: Rewards idempotency ledger
-- Moves reward_idempotency table creation from runtime into migrations.

CREATE TABLE IF NOT EXISTS reward_idempotency (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  action TEXT NOT NULL,
  points_delta INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_reward_idempotency_user_created
  ON reward_idempotency(user_id, created_at DESC);
