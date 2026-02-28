-- Admin moderation contract alignment
-- Adds schema-safe columns and audit tables used by admin moderation APIs.

ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE IF NOT EXISTS admin_bulk_action_logs (
    id BIGSERIAL PRIMARY KEY,
    request_id TEXT UNIQUE NOT NULL,
    actor_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    value TEXT,
    reason TEXT,
    target_user_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_export_logs (
    id BIGSERIAL PRIMARY KEY,
    export_id TEXT UNIQUE NOT NULL,
    actor_user_id TEXT NOT NULL,
    export_type TEXT NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_moderation_actions (
    id BIGSERIAL PRIMARY KEY,
    request_id TEXT UNIQUE NOT NULL,
    actor_user_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    action TEXT NOT NULL,
    target_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    affected_count INTEGER NOT NULL DEFAULT 0,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_bulk_action_logs_created_at
    ON admin_bulk_action_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_export_logs_requested_at
    ON admin_export_logs(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_moderation_actions_created_at
    ON admin_moderation_actions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_status_created_at
    ON posts(status, created_at DESC);
