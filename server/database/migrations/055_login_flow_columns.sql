-- 055_login_flow_columns.sql
-- Reconciliation for the real login flow (verified by server/_auth_e2e.sh):
--   1) users.last_login / users.last_login_ip (authController login success path)
--   2) auth_activity_log.user_id INTEGER -> TEXT (login sends UUID user ids)
--   3) device_bindings.user_id INTEGER -> TEXT (UUID users)
--   4) risk_decision_events table (riskTelemetryService persists events here)
-- Idempotent: safe to re-run.

-- 1) users.last_login + last_login_ip
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- 2) auth_activity_log.user_id INTEGER -> TEXT
ALTER TABLE auth_activity_log
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 3) device_bindings.user_id INTEGER -> TEXT
ALTER TABLE device_bindings
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- 4) risk_decision_events (used by riskTelemetryService)
-- NOTE: no FK on user_id on purpose — riskTelemetryService only disables DB
-- persistence on missing-table errors (42P01); an FK violation (23503) on a
-- syntactically-valid but non-existent user would keep failing every insert
-- instead of falling back to in-memory. Keep the index only. If a previous
-- run created the table WITH the FK, drop it so re-runs converge.
ALTER TABLE IF EXISTS risk_decision_events
  DROP CONSTRAINT IF EXISTS risk_decision_events_user_id_fkey;
CREATE TABLE IF NOT EXISTS risk_decision_events (
  event_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id           UUID,
  flow              VARCHAR(50),
  enabled           BOOLEAN DEFAULT FALSE,
  score             INTEGER DEFAULT 0,
  recommended_action VARCHAR(30),
  should_challenge  BOOLEAN DEFAULT FALSE,
  should_enforce    BOOLEAN DEFAULT FALSE,
  shadow_mode       BOOLEAN DEFAULT TRUE,
  flag_reason       TEXT,
  model_version     VARCHAR(50),
  explainability_count INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_risk_decision_events_user_time
  ON risk_decision_events(user_id, event_timestamp DESC);
