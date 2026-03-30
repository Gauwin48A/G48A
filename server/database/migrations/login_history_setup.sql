-- =====================================================
-- VELOCITY & RISK DEFENSE SYSTEM: LOGIN HISTORY
-- =====================================================

-- 1. Create the Login History Table
-- Using INTEGER REFERENCES users(user_id) to match MHUB_ULTIMATE.sql schema
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    login_time TIMESTAMP DEFAULT NOW()
);

-- 2. Create an Index for fast speed calculations
CREATE INDEX IF NOT EXISTS idx_login_history_user_time ON login_history (user_id, login_time DESC);

-- 3. Verification
SELECT 'Login History Setup Complete' as status;
