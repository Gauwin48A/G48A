-- server/database/migrations/migration_security.sql

-- 1. Add tracking columns to users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS login_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS lock_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_login_ip INET,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP DEFAULT NOW();

-- 2. Create Security Audit Log
CREATE TABLE IF NOT EXISTS security_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id), -- Changed to INT to match integer primary key
    event_type VARCHAR(50) NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGE'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sec_logs_user') THEN
        CREATE INDEX idx_sec_logs_user ON security_logs(user_id);
    END IF;
END $$;
