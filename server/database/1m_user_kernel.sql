-- ============================================
-- DEFENDER: 1 MILLION USER DATABASE KERNEL
-- Scale: 1M users, 10M posts
-- Target: Sub-10ms query times
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Fuzzy search
CREATE EXTENSION IF NOT EXISTS btree_gin;    -- GIN for B-tree types

-- ============================================
-- PERFORMANCE ENHANCEMENT: Posts Indexes
-- ============================================

-- Composite index for common filtering patterns
CREATE INDEX IF NOT EXISTS idx_posts_category_price_status 
ON posts(category_id, price, status) WHERE status = 'active';

-- Composite index for location + category queries
CREATE INDEX IF NOT EXISTS idx_posts_location_category 
ON posts(latitude, longitude, category_id) WHERE status = 'active' AND latitude IS NOT NULL;

-- Time-based partitioning support index
CREATE INDEX IF NOT EXISTS idx_posts_created_status 
ON posts(created_at DESC, status) WHERE status = 'active';

-- User activity index
CREATE INDEX IF NOT EXISTS idx_posts_user_status_created 
ON posts(user_id, status, created_at DESC);

-- ============================================
-- FULL-TEXT SEARCH OPTIMIZATION
-- ============================================

-- Trigram index for fuzzy title search
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm 
ON posts USING GIN(title gin_trgm_ops);

-- Trigram index for fuzzy description search  
CREATE INDEX IF NOT EXISTS idx_posts_description_trgm 
ON posts USING GIN(description gin_trgm_ops);

-- ============================================
-- OPTIONAL INDEXES (Skip if table doesn't exist)
-- ============================================

DO $$ 
BEGIN
    -- Messages indexes (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        BEGIN
            CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
            ON messages(conversation_id, created_at DESC);
            
            CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
            ON messages(receiver_id, is_read) WHERE is_read = false;
            
            RAISE NOTICE 'Messages indexes created';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping messages indexes: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Skipping messages indexes (table does not exist)';
    END IF;
    
    -- Audit logs indexes (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
        BEGIN
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action 
            ON audit_logs(user_id, action, created_at DESC);
            
            RAISE NOTICE 'Audit logs indexes created';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping audit_logs indexes: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Skipping audit_logs indexes (table does not exist)';
    END IF;
    
    -- Login attempts indexes (if table exists and has required columns)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'login_attempts') THEN
        BEGIN
            -- Check if columns exist before creating index
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'login_attempts' AND column_name = 'created_at'
            ) THEN
                CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created 
                ON login_attempts(ip_address, created_at DESC);
                RAISE NOTICE 'Login attempts indexes created';
            ELSE
                RAISE NOTICE 'Skipping login_attempts index (created_at column missing)';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping login_attempts indexes: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Skipping login_attempts indexes (table does not exist)';
    END IF;
END $$;

-- ============================================
-- TRANSLATION QUEUE (Prompt 5 Support)
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
-- VERIFICATION DOCUMENTS (Gap 4 Support)
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

CREATE INDEX IF NOT EXISTS idx_verification_docs_user 
ON verification_documents(user_id, status);

CREATE INDEX IF NOT EXISTS idx_verification_docs_pending 
ON verification_documents(status, created_at) WHERE status = 'pending';

-- ============================================
-- ADD translated_title COLUMN IF MISSING
-- ============================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'translated_title'
    ) THEN
        ALTER TABLE posts ADD COLUMN translated_title TEXT;
        RAISE NOTICE 'Added translated_title column to posts';
    END IF;
END $$;

-- ============================================
-- OPTIMIZED QUERY FUNCTIONS
-- ============================================

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
        p.post_id,
        p.title,
        p.price,
        p.images,
        p.latitude,
        p.longitude,
        (6371 * acos(
            cos(radians(p_lat)) * cos(radians(p.latitude)) *
            cos(radians(p.longitude) - radians(p_lng)) +
            sin(radians(p_lat)) * sin(radians(p.latitude))
        )) AS distance_km,
        p.created_at
    FROM posts p
    WHERE p.status = 'active'
        AND p.latitude IS NOT NULL
        AND p.longitude IS NOT NULL
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

CREATE OR REPLACE FUNCTION search_posts_optimized(
    p_query TEXT,
    p_category_id INTEGER DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_id INTEGER,
    title VARCHAR,
    price DECIMAL,
    images TEXT[],
    rank REAL,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.post_id,
        p.title,
        p.price,
        p.images,
        ts_rank(p.search_vector, websearch_to_tsquery('english', p_query)) AS rank,
        p.created_at
    FROM posts p
    WHERE p.status = 'active'
        AND (p_query IS NULL OR p.search_vector @@ websearch_to_tsquery('english', p_query))
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        AND (p_max_price IS NULL OR p.price <= p_max_price)
    ORDER BY rank DESC, p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- ANALYZE TABLES (only existing ones)
-- ============================================

ANALYZE posts;
ANALYZE users;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'messages') THEN
        ANALYZE messages;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        ANALYZE notifications;
    END IF;
END $$;

-- ============================================
-- VERIFICATION NOTICES
-- ============================================

DO $$ BEGIN
    RAISE NOTICE '✅ 1M User Database Kernel Applied';
    RAISE NOTICE '  - Composite indexes for filtering';
    RAISE NOTICE '  - GIN indexes for full-text search';
    RAISE NOTICE '  - Trigram indexes for fuzzy search';
    RAISE NOTICE '  - Translation queue table';
    RAISE NOTICE '  - Verification documents table';
    RAISE NOTICE '  - Optimized search functions';
END $$;
