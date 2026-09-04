-- Migration 093: Auth Security & 2FA Consolidation
-- Hardens 2FA storage on users, provisions fallback table, and creates user_sessions table.

DO $$
BEGIN
    -- Ensure 2FA columns on users table (both modern and legacy naming)
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_secret TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_backup_codes JSONB;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT;

    -- Ensure fallback 2FA settings table exists
    CREATE TABLE IF NOT EXISTS user_two_factor_settings (
        user_id INTEGER PRIMARY KEY,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_secret TEXT,
        backup_codes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Ensure user_sessions table exists for multi-device session management
    CREATE TABLE IF NOT EXISTS user_sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        refresh_token_hash TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        device_fingerprint TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        last_activity TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
    );

    -- Performance indexes on user_sessions
    CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active ON user_sessions (user_id, is_active, last_activity DESC);
    CREATE INDEX IF NOT EXISTS idx_user_sessions_device ON user_sessions (device_fingerprint, user_id);

END $$;
