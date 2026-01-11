-- ============================================
-- MHUB: COMPLETE DATABASE SETUP SCRIPT
-- Run this ONCE to set up all required tables and indexes
-- ============================================

-- ============================================
-- SECTION 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Fuzzy search
CREATE EXTENSION IF NOT EXISTS btree_gin;    -- GIN for B-tree types

-- ============================================
-- SECTION 2: PERFORMANCE INDEXES
-- ============================================

-- Posts filtering
CREATE INDEX IF NOT EXISTS idx_posts_category_price_status 
ON posts(category_id, price, status) WHERE status = 'active';

-- Location queries
CREATE INDEX IF NOT EXISTS idx_posts_location_category 
ON posts(latitude, longitude, category_id) WHERE status = 'active' AND latitude IS NOT NULL;

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_posts_created_status 
ON posts(created_at DESC, status) WHERE status = 'active';

-- User activity
CREATE INDEX IF NOT EXISTS idx_posts_user_status_created 
ON posts(user_id, status, created_at DESC);

-- ============================================
-- SECTION 3: FULL-TEXT SEARCH
-- ============================================

-- Fuzzy title search
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm 
ON posts USING GIN(title gin_trgm_ops);

-- Fuzzy description search
CREATE INDEX IF NOT EXISTS idx_posts_description_trgm 
ON posts USING GIN(description gin_trgm_ops);

-- ============================================
-- SECTION 4: NATIVE HYBRID (Location & Contacts)
-- ============================================

-- Add location to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;

-- Add 2FA columns to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_fa_backup_codes TEXT;

-- Add presence tracking column
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_users_location 
ON users(latitude, longitude) WHERE latitude IS NOT NULL;

-- Index for "Who is online?" queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_active 
ON users(last_active_at);

-- Contact sync table
CREATE TABLE IF NOT EXISTS user_contacts (
    contact_id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    is_on_platform BOOLEAN DEFAULT FALSE,
    matched_user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_user_contacts_owner ON user_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_phone ON user_contacts(phone);

-- ============================================
-- SECTION 5: TRANSLATION QUEUE
-- ============================================

CREATE TABLE IF NOT EXISTS translation_queue (
    queue_id SERIAL PRIMARY KEY,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE CASCADE,
    source_text TEXT NOT NULL,
    source_lang VARCHAR(10) DEFAULT 'en',
    target_lang VARCHAR(10) DEFAULT 'hi',
    translated_text TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_translation_queue_status 
ON translation_queue(status, created_at) WHERE status = 'pending';

-- ============================================
-- SECTION 6: VERIFICATION DOCUMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS verification_documents (
    document_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    file_size INTEGER,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by INTEGER REFERENCES users(user_id),
    review_notes TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_docs_user ON verification_documents(user_id, status);
CREATE INDEX IF NOT EXISTS idx_verification_docs_pending ON verification_documents(status, created_at) WHERE status = 'pending';

-- ============================================
-- SECTION 7: ADD TRANSLATED TITLE COLUMN
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'translated_title'
    ) THEN
        ALTER TABLE posts ADD COLUMN translated_title TEXT;
    END IF;
END $$;

-- ============================================
-- SECTION 8: OPTIMIZED FUNCTIONS
-- ============================================

-- Nearby posts function
CREATE OR REPLACE FUNCTION get_posts_nearby_optimized(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 50,
    p_category_id INTEGER DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    post_id INTEGER,
    title VARCHAR,
    price DECIMAL,
    images TEXT[],
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    distance_km DOUBLE PRECISION,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.post_id, p.title, p.price, p.images, p.latitude, p.longitude,
        (6371 * acos(
            cos(radians(p_lat)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(p.latitude))
        )) AS distance_km,
        p.created_at
    FROM posts p
    WHERE p.status = 'active'
        AND p.latitude IS NOT NULL
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (6371 * acos(
            cos(radians(p_lat)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(p.latitude))
        )) <= p_radius_km
    ORDER BY distance_km
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Find friends on platform
CREATE OR REPLACE FUNCTION find_friends_on_platform(p_owner_id INTEGER)
RETURNS TABLE (
    contact_name VARCHAR,
    phone VARCHAR,
    user_id INTEGER,
    username VARCHAR,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.name AS contact_name, uc.phone, u.user_id, u.username, p.avatar_url
    FROM user_contacts uc
    JOIN users u ON u.phone = uc.phone OR u.phone = CONCAT('+91', uc.phone)
    LEFT JOIN profiles p ON p.user_id = u.user_id
    WHERE uc.owner_id = p_owner_id AND u.user_id != p_owner_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- SECTION 9: ANALYZE TABLES
-- ============================================

ANALYZE posts;
ANALYZE users;

-- ============================================
-- COMPLETION NOTICE
-- ============================================

DO $$ BEGIN
    RAISE NOTICE '✅ MHub Database Setup Complete';
    RAISE NOTICE '  - Performance indexes created';
    RAISE NOTICE '  - Full-text search enabled';
    RAISE NOTICE '  - Native hybrid (location/contacts) ready';
    RAISE NOTICE '  - Translation queue table added';
    RAISE NOTICE '  - Verification documents table added';
    RAISE NOTICE '  - Optimized functions created';
END $$;
