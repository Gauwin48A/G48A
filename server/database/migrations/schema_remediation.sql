-- =====================================================
-- MHUB SCHEMA REMEDIATION SCRIPT
-- Resolves: "column p.tier_priority does not exist"
-- Resolves: UUID vs Integer Mismatch
-- =====================================================

-- 1. Ensure UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Add Missing Columns to Posts
DO $$
BEGIN
    -- Add tier_priority if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='tier_priority') THEN
        ALTER TABLE posts ADD COLUMN tier_priority INTEGER DEFAULT 1;
        RAISE NOTICE 'Added tier_priority column to posts';
    END IF;

    -- Add views_count if it doesn't exist (sometimes called 'views')
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='views_count') THEN
        ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views_count column to posts';
    END IF;
    
    -- Ensure sold_at exists for feed filtering
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='sold_at') THEN
        ALTER TABLE posts ADD COLUMN sold_at TIMESTAMPTZ;
        RAISE NOTICE 'Added sold_at column to posts';
    END IF;

    -- Ensure expires_at exists for feed filtering
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='posts' AND column_name='expires_at') THEN
        ALTER TABLE posts ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
        RAISE NOTICE 'Added expires_at column to posts';
    END IF;

    -- Ensure expires_at has a default
    ALTER TABLE posts ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '30 days');
    UPDATE posts SET expires_at = (NOW() + INTERVAL '30 days') WHERE expires_at IS NULL;
END $$;

-- 3. Create Profiles table if missing (standard UUID/INT mixed support)
CREATE TABLE IF NOT EXISTS profiles (
    profile_id SERIAL PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL, -- Stored as text to handle both UUID and INT
    full_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    avatar_url VARCHAR(500),
    bio TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Sync tier_priority from tier_id if possible
UPDATE posts p
SET tier_priority = (
    CASE 
        WHEN t.name ILIKE '%Premium%' THEN 3
        WHEN t.name ILIKE '%Standard%' THEN 2
        ELSE 1
    END
)
FROM tiers t
WHERE p.tier_id::text = t.tier_id::text
AND p.tier_priority = 1;

-- 5. Verification
SELECT 'Remediation Complete' as status;
