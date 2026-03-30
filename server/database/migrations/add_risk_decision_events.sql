-- Risk telemetry persistence for fraud scoring decisions.
-- Safe to rerun.

CREATE TABLE IF NOT EXISTS risk_decision_events (
    id BIGSERIAL PRIMARY KEY,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NULL,
    flow TEXT NOT NULL DEFAULT 'auth_login',
    enabled BOOLEAN NOT NULL DEFAULT false,
    score NUMERIC(6,2) NULL,
    recommended_action TEXT NOT NULL DEFAULT 'SKIP',
    should_challenge BOOLEAN NOT NULL DEFAULT false,
    should_enforce BOOLEAN NOT NULL DEFAULT false,
    shadow_mode BOOLEAN NOT NULL DEFAULT true,
    flag_reason TEXT NULL,
    model_version TEXT NULL,
    explainability_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_risk_decision_events_timestamp
    ON risk_decision_events (event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_risk_decision_events_flow_timestamp
    ON risk_decision_events (flow, event_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_risk_decision_events_action_timestamp
    ON risk_decision_events (recommended_action, event_timestamp DESC);
