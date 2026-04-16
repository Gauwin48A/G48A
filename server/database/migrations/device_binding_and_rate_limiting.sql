-- ============================================================
-- Device Binding & Rate Limiting Tables
-- Restricts one account per device, prevents login/logout abuse
-- ============================================================

-- Device bindings: maps a device fingerprint to exactly one user
CREATE TABLE IF NOT EXISTS device_bindings (
    id SERIAL PRIMARY KEY,
    device_fingerprint VARCHAR(512) NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    device_info JSONB DEFAULT '{}',
    ip_address VARCHAR(50),
    bound_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    revoked_at TIMESTAMP,
    revoke_reason VARCHAR(255),
    UNIQUE(device_fingerprint, user_id)
);

CREATE INDEX IF NOT EXISTS idx_device_bindings_fingerprint ON device_bindings(device_fingerprint) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_device_bindings_user ON device_bindings(user_id) WHERE is_active = true;

-- Login/logout activity log for abuse detection
CREATE TABLE IF NOT EXISTS auth_activity_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(512),
    action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'signup', 'token_refresh'
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_activity_user_action ON auth_activity_log(user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_activity_device ON auth_activity_log(device_fingerprint, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_activity_ip ON auth_activity_log(ip_address, action, created_at DESC);

-- Cleanup old activity logs (keep 30 days)
-- Run periodically via cron: DELETE FROM auth_activity_log WHERE created_at < NOW() - INTERVAL '30 days';

-- Add device_fingerprint column to users table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'bound_device_fingerprint'
    ) THEN
        ALTER TABLE users ADD COLUMN bound_device_fingerprint VARCHAR(512);
    END IF;
END $$;
