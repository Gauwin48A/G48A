-- Migration 021: Schema Migrations Tracking
-- Adds a table to track which migrations have been applied

CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum VARCHAR(64),
    execution_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename
    ON schema_migrations(filename);

-- Backfill: record all previously applied migrations as already run
INSERT INTO schema_migrations (filename, applied_at)
VALUES
    ('001_location_village_colony.sql', NOW()),
    ('002_subscription_plans.sql', NOW()),
    ('003_coin_economy.sql', NOW()),
    ('004_performance_indexes.sql', NOW()),
    ('005_search_ranking.sql', NOW()),
    ('006_coin_transactions_uuid_fix.sql', NOW()),
    ('007_user_subscriptions_uuid_fix.sql', NOW()),
    ('008_feature_consolidation.sql', NOW()),
    ('009_composite_indexes.sql', NOW()),
    ('010_subscription_plan_quotas.sql', NOW()),
    ('011_webauthn_passkeys.sql', NOW()),
    ('012_rewards_engagement.sql', NOW()),
    ('013_subscription_rewards_foundation.sql', NOW()),
    ('014_missing_tables_20260319.sql', NOW()),
    ('015_reward_idempotency.sql', NOW()),
    ('016_referral_chain_rewards.sql', NOW()),
    ('017_notifications_cart_recently_viewed.sql', NOW()),
    ('018_cart_tables_legacy_int.sql', NOW()),
    ('019_user_rating_count_and_aadhaar_flag.sql', NOW()),
    ('020_rewards_chain_complete.sql', NOW()),
    ('021_schema_migrations_tracking.sql', NOW())
ON CONFLICT (filename) DO NOTHING;
