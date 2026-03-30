-- =============================================
-- Security Tables for Zero-Cost Persistence
-- Replaces in-memory storage with PostgreSQL
-- =============================================

-- 1. LOGIN ATTEMPTS (IP-based lockout)
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    attempt_count INT DEFAULT 1,
    locked_until TIMESTAMP,
    last_attempt_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);

-- 2. AUDIT LOGS (Immutable Security Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 3. 2FA SECRETS (Add columns to users table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT[];

-- 4. DEVICE FINGERPRINTS (Known devices per user)
CREATE TABLE IF NOT EXISTS user_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    fingerprint VARCHAR(64) NOT NULL,
    device_type VARCHAR(20),
    os VARCHAR(30),
    browser VARCHAR(30),
    ip_address VARCHAR(45),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    is_trusted BOOLEAN DEFAULT FALSE,
    UNIQUE(user_id, fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(fingerprint);

-- 5. USER LOCATIONS (Geo-tracking for alerts)
CREATE TABLE IF NOT EXISTS user_locations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    country VARCHAR(100),
    city VARCHAR(100),
    ip_address VARCHAR(45),
    first_seen TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, country, city)
);

CREATE INDEX IF NOT EXISTS idx_user_locations_user ON user_locations(user_id);

-- 6. PUSH SUBSCRIPTIONS (Web Push persistence)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

SELECT '✅ Security tables created successfully' as status;
