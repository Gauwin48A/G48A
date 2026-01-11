-- ============================================================================
-- MHUB SECURITY FORTRESS - COMPLETE CLEAN SCRIPT (UUID VERSION)
-- Drops duplicates and recreates everything cleanly with UUIDs
-- ============================================================================

-- ============================================================================
-- PHASE 0: CLEAN UP DUPLICATE FUNCTIONS (CRITICAL!)
-- ============================================================================

-- Drop ALL versions of potentially duplicated functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Drop all search_posts functions
    FOR func_record IN 
        SELECT oid::regprocedure::text as func_sig
        FROM pg_proc 
        WHERE proname = 'search_posts'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
        RAISE NOTICE 'Dropped: %', func_record.func_sig;
    END LOOP;
    
    -- Drop all get_nearby_posts functions
    FOR func_record IN 
        SELECT oid::regprocedure::text as func_sig
        FROM pg_proc 
        WHERE proname = 'get_nearby_posts'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
        RAISE NOTICE 'Dropped: %', func_record.func_sig;
    END LOOP;
    
    -- Drop all get_or_create_chat functions
    FOR func_record IN 
        SELECT oid::regprocedure::text as func_sig
        FROM pg_proc 
        WHERE proname = 'get_or_create_chat'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
        RAISE NOTICE 'Dropped: %', func_record.func_sig;
    END LOOP;

    -- Drop all v2 searching functions (legacy integer versions)
    EXECUTE 'DROP FUNCTION IF EXISTS search_posts_v2(text, double precision, double precision, integer, integer, numeric, numeric, integer, integer) CASCADE';
    EXECUTE 'DROP FUNCTION IF EXISTS get_nearby_posts_v2(double precision, double precision, integer, integer, integer) CASCADE';
    EXECUTE 'DROP FUNCTION IF EXISTS get_or_create_chat_v2(integer, integer, integer) CASCADE';
    
    -- Drop all haversine_distance functions
    FOR func_record IN 
        SELECT oid::regprocedure::text as func_sig
        FROM pg_proc 
        WHERE proname = 'haversine_distance'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
        RAISE NOTICE 'Dropped: %', func_record.func_sig;
    END LOOP;
    
    -- Drop cleanup_expired_data
    FOR func_record IN 
        SELECT oid::regprocedure::text as func_sig
        FROM pg_proc 
        WHERE proname = 'cleanup_expired_data'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_sig || ' CASCADE';
        RAISE NOTICE 'Dropped: %', func_record.func_sig;
    END LOOP;
    
    RAISE NOTICE 'All duplicate functions cleaned up!';
END $$;

-- ============================================================================
-- PHASE 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- ============================================================================
-- PHASE 2: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- 2.1 Add 2FA and security columns to users table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_secret') THEN
        ALTER TABLE users ADD COLUMN two_factor_secret TEXT;
        RAISE NOTICE 'Added two_factor_secret to users';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added two_factor_enabled to users';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'backup_codes') THEN
        ALTER TABLE users ADD COLUMN backup_codes TEXT[];
        RAISE NOTICE 'Added backup_codes to users';
    END IF;
END $$;

-- 2.2 Add search vector and metrics to posts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'search_vector') THEN
        ALTER TABLE posts ADD COLUMN search_vector TSVECTOR;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'is_featured') THEN
        ALTER TABLE posts ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'is_negotiable') THEN
        ALTER TABLE posts ADD COLUMN is_negotiable BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'expires_at') THEN
        ALTER TABLE posts ADD COLUMN expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');
    END IF;
END $$;

-- ============================================================================
-- PHASE 3: CREATE NEW SECURITY TABLES (UUID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chats (
    chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    buyer_unread_count INTEGER DEFAULT 0,
    seller_unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, seller_id, post_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    attempt_count INTEGER DEFAULT 1,
    locked_until TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- PHASE 4: PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm ON posts USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_description_trgm ON posts USING GIN(description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_lat_lng ON posts(lat, long) WHERE lat IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chats_buyer ON chats(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_seller ON chats(seller_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_post ON chats(post_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(chat_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);

-- ============================================================================
-- PHASE 5: HELPER FUNCTIONS
-- ============================================================================

-- Haversine distance calculation
CREATE OR REPLACE FUNCTION haversine_distance(
    p_lat1 DOUBLE PRECISION,
    p_lng1 DOUBLE PRECISION,
    p_lat2 DOUBLE PRECISION,
    p_lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
    earth_radius DOUBLE PRECISION := 6371;
    dlat DOUBLE PRECISION;
    dlng DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    IF p_lat1 IS NULL OR p_lng1 IS NULL OR p_lat2 IS NULL OR p_lng2 IS NULL THEN
        RETURN NULL;
    END IF;
    dlat := radians(p_lat2 - p_lat1);
    dlng := radians(p_lng2 - p_lng1);
    a := sin(dlat/2) * sin(dlat/2) + cos(radians(p_lat1)) * cos(radians(p_lat2)) * sin(dlng/2) * sin(dlng/2);
    c := 2 * asin(sqrt(a));
    RETURN earth_radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- PHASE 6: SEARCH FUNCTIONS (UUID VERSION)
-- ============================================================================

-- Full-text + location search
CREATE OR REPLACE FUNCTION search_posts_v2(
    p_query TEXT DEFAULT NULL,
    p_lat DOUBLE PRECISION DEFAULT NULL,
    p_lng DOUBLE PRECISION DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 50,
    p_category_id UUID DEFAULT NULL,
    p_min_price NUMERIC DEFAULT NULL,
    p_max_price NUMERIC DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    post_id UUID,
    title VARCHAR(150),
    description TEXT,
    price NUMERIC,
    images JSONB,
    location TEXT,
    distance_km DOUBLE PRECISION,
    relevance REAL,
    created_at TIMESTAMPTZ,
    user_id UUID,
    full_name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.post_id,
        p.title,
        p.description,
        p.price,
        p.images,
        p.location,
        haversine_distance(p_lat, p_lng, CAST(p.lat AS float), CAST(p.long AS float)),
        CASE 
            WHEN p_query IS NOT NULL AND p_query != '' AND p.search_vector IS NOT NULL
            THEN ts_rank(p.search_vector, plainto_tsquery('english', p_query))
            ELSE 1.0::REAL
        END as rel,
        p.created_at,
        u.user_id,
        u.full_name
    FROM posts p
    LEFT JOIN users u ON p.user_id = u.user_id
    WHERE 
        p.status = 'active'
        AND (p_query IS NULL OR p_query = '' OR p.search_vector @@ plainto_tsquery('english', p_query) OR p.title ILIKE '%' || p_query || '%')
        AND (p_lat IS NULL OR p_lng IS NULL OR p.lat IS NULL OR haversine_distance(p_lat, p_lng, CAST(p.lat AS float), CAST(p.long AS float)) <= p_radius_km)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        AND (p_max_price IS NULL OR p.price <= p_max_price)
    ORDER BY rel DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get nearby posts
CREATE OR REPLACE FUNCTION get_nearby_posts_v2(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_km INTEGER DEFAULT 25,
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    post_id UUID,
    title VARCHAR(150),
    price NUMERIC,
    location TEXT,
    distance_km DOUBLE PRECISION
) AS $$
DECLARE
    lat_delta DOUBLE PRECISION := p_radius_km / 111.0;
    lng_delta DOUBLE PRECISION := p_radius_km / (111.0 * cos(radians(p_lat)));
BEGIN
    RETURN QUERY
    SELECT 
        p.post_id,
        p.title,
        p.price,
        p.location,
        haversine_distance(p_lat, p_lng, CAST(p.lat AS float), CAST(p.long AS float))
    FROM posts p
    WHERE 
        p.status = 'active'
        AND p.lat IS NOT NULL AND p.long IS NOT NULL
        AND p.lat BETWEEN (p_lat - lat_delta) AND (p_lat + lat_delta)
        AND p.long BETWEEN (p_lng - lng_delta) AND (p_lng + lng_delta)
        AND haversine_distance(p_lat, p_lng, CAST(p.lat AS float), CAST(p.long AS float)) <= p_radius_km
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get or create chat
CREATE OR REPLACE FUNCTION get_or_create_chat_v2(
    p_buyer_id UUID,
    p_seller_id UUID,
    p_post_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_chat_id UUID;
BEGIN
    SELECT chat_id INTO v_chat_id FROM chats
    WHERE buyer_id = p_buyer_id AND seller_id = p_seller_id AND post_id = p_post_id;
    IF v_chat_id IS NULL THEN
        INSERT INTO chats (buyer_id, seller_id, post_id)
        VALUES (p_buyer_id, p_seller_id, p_post_id)
        RETURNING chat_id INTO v_chat_id;
    END IF;
    RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired data
CREATE OR REPLACE FUNCTION cleanup_expired_data_v2()
RETURNS void AS $$
BEGIN
    UPDATE posts SET status = 'expired' WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < NOW();
    UPDATE login_attempts SET attempt_count = 0, locked_until = NULL WHERE locked_until IS NOT NULL AND locked_until < NOW();
    DELETE FROM login_attempts WHERE locked_until IS NULL AND last_attempt_at < NOW() - INTERVAL '24 hours';
    DELETE FROM user_sessions WHERE expires_at < NOW();
    RAISE NOTICE 'Cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;
