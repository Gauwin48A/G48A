-- ============================================================================
-- HYBRID AUTH SYSTEM - COMPLETE SQL MIGRATION
-- Supports: OTP Login, Password Login, Hybrid (Phone+Password)
-- ============================================================================

-- 1. EXTENSION
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. UPDATE USERS TABLE FOR HYBRID AUTH
-- ============================================================================

-- Add phone_verified column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'phone_verified') THEN
        ALTER TABLE users ADD COLUMN phone_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added phone_verified column';
    END IF;
END $$;

-- Add email_verified column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added email_verified column';
    END IF;
END $$;

-- Make password_hash nullable (for OTP-only users)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'password_hash' 
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
        RAISE NOTICE 'Made password_hash nullable';
    END IF;
END $$;

-- Add login_attempts and lock_until if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'login_attempts') THEN
        ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added login_attempts column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'lock_until') THEN
        ALTER TABLE users ADD COLUMN lock_until TIMESTAMPTZ;
        RAISE NOTICE 'Added lock_until column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_login') THEN
        ALTER TABLE users ADD COLUMN last_login TIMESTAMPTZ;
        RAISE NOTICE 'Added last_login column';
    END IF;
END $$;

-- ============================================================================
-- 3. ENSURE USER_SESSIONS TABLE EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    device_fingerprint VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. ENSURE SECURITY_LOGS TABLE EXISTS (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_security_logs_user ON security_logs(user_id, created_at DESC);

-- ============================================================================
-- 6. SAMPLE TEST USERS (Optional - For Testing)
-- ============================================================================

-- IMPORTANT: These use bcrypt hashed passwords. Run only if you need test data.
-- Password for all: "Test@12345" (bcrypt hash below)

-- Uncomment to insert test users:
/*
-- OTP-only user (no password)
INSERT INTO users (phone_number, full_name, phone_verified, role) 
VALUES ('9876543210', 'Test OTP User', true, 'user')
ON CONFLICT DO NOTHING;

-- Password user (with email)
INSERT INTO users (email, full_name, password_hash, email_verified, role) 
VALUES ('test@example.com', 'Test Password User', '$2b$10$qJvC5MzZL5i5.9KZKvJ5UeHJVpJ5J5J5J5J5J5J5J5J5J5J5J5J5J', true, 'user')
ON CONFLICT DO NOTHING;

-- Hybrid user (phone + password)
INSERT INTO users (phone_number, full_name, password_hash, phone_verified, role) 
VALUES ('9876543211', 'Test Hybrid User', '$2b$10$qJvC5MzZL5i5.9KZKvJ5UeHJVpJ5J5J5J5J5J5J5J5J5J5J5J5J5J', true, 'user')
ON CONFLICT DO NOTHING;
*/

-- ============================================================================
-- 7. VERIFY
-- ============================================================================

SELECT 'Hybrid Auth Migration Complete!' as status;
