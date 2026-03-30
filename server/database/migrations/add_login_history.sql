-- 1. Create a Login History Log
CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    device_id VARCHAR(100), -- Unique ID for the phone/browser
    ip_address VARCHAR(45),
    login_time TIMESTAMP DEFAULT NOW()
);

-- 2. Index for speed (we query this on every login)
CREATE INDEX IF NOT EXISTS idx_login_history_user_time ON login_history (user_id, login_time DESC);

-- 3. Add locked_until column to users if not exists (for blocking)
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
