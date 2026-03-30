-- 1. EXTENSIONS (The Engines)
-- Attempt to create, but assume they might exist or fail gracefully in Pure SQL environments
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- For Search
-- Note: PostGIS extension creation is skipped here to respect pure SQL environment constraints 
-- unless explicitly managed by admin.

-- 2. USERS TABLE HARDENING
ALTER TABLE users ADD COLUMN IF NOT EXISTS aadhaar_status VARCHAR(20) DEFAULT 'PENDING'; -- PENDING, VERIFIED, REJECTED
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

-- 3. POSTS TABLE HARDENING
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tier_priority INT DEFAULT 1; -- 1=Basic, 2=Silver, 3=Premium
ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INT DEFAULT 0;

-- 4. TRANSACTIONS (The Audit Trail - MANDATORY for Fraud Prevention)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY, -- Using SERIAL for consistency with existing schema, though UUID is requested
    user_id INTEGER REFERENCES users(user_id),
    amount DECIMAL(10, 2) NOT NULL,
    type VARCHAR(50), -- 'subscription_silver', 'buy_credit'
    status VARCHAR(20) DEFAULT 'success',
    gateway_id VARCHAR(100), -- UPI Ref ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INDEXES (Speed & Security)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
-- Note: idx_posts_location is managed by pure SQL logic or add_postgis.sql if active
CREATE INDEX IF NOT EXISTS idx_posts_search_trigram ON posts USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));
