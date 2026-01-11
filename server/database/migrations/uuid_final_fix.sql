-- =============================================================
-- MHUB FINAL UUID RESTORATION SCRIPT (REFINED)
-- Resolves all "operator does not exist: uuid = integer" errors
-- =============================================================

-- 0. DROP LEGACY FUNCTIONS FIRST (Signatures changed, so REPLACE won't work)
DROP FUNCTION IF EXISTS search_posts_v2(text, double precision, double precision, integer, integer, numeric, numeric, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS get_nearby_posts_v2(double precision, double precision, integer, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS get_posts_near_me(double precision, double precision, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS get_or_create_chat_v2(integer, integer, integer) CASCADE;

-- Also drop generic names from older schemas
DROP FUNCTION IF EXISTS search_posts(text, double precision, double precision, double precision, double precision, double precision, double precision, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS get_nearby_posts(double precision, double precision, double precision) CASCADE;

-- 1. DROP LEGACY TABLES (CASCADE to clean dependencies)
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;

-- 2. RECREATE TABLES WITH UUID ARCHITECTURE

-- TRANSACTIONS (Audit Trail)
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(50), -- 'subscription_silver', 'buy_credit'
    status VARCHAR(20) DEFAULT 'success',
    gateway_id VARCHAR(100), -- UPI Ref ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CHATS (Direct Messaging)
CREATE TABLE chats (
    chat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    buyer_unread_count INTEGER DEFAULT 0,
    seller_unread_count INTEGER DEFAULT 0,
    last_read_at JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, seller_id, post_id)
);

-- CHAT MESSAGES
CREATE TABLE chat_messages (
    message_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(chat_id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- AUDIT LOGS
CREATE TABLE audit_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER SESSIONS
CREATE TABLE user_sessions (
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

-- 3. RECREATE FUNCTIONS WITH UUID

-- New search_posts_v2
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
        calculate_distance(p_lat, p_lng, CAST(p.lat AS float), CAST(p.long AS float)),
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
        AND (p_lat IS NULL OR p_lng IS NULL OR p.lat IS NULL OR calculate_distance(p_lat, p_lng, CAST(p.lat AS float), CAST(p.long AS float)) <= p_radius_km)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        AND (p_max_price IS NULL OR p.price <= p_max_price)
    ORDER BY rel DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- New get_nearby_posts_v2
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
        calculate_distance(p_lat, p_lng, CAST(p.lat AS float), CAST(p.long AS float))
    FROM posts p
    WHERE 
        p.status = 'active'
        AND p.lat IS NOT NULL AND p.long IS NOT NULL
        AND p.lat BETWEEN (p_lat - lat_delta) AND (p_lat + lat_delta)
        AND p.long BETWEEN (p_lng - lng_delta) AND (p_lng + lng_delta)
        AND calculate_distance(p_lat, p_lng, CAST(p.lat AS float), CAST(p.long AS float)) <= p_radius_km
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
    ORDER BY distance_km ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- New get_posts_near_me
CREATE OR REPLACE FUNCTION get_posts_near_me(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km INTEGER DEFAULT 10,
    post_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    post_id UUID,
    title VARCHAR(150),
    description TEXT,
    price NUMERIC,
    images JSONB,
    location TEXT,
    distance_km DOUBLE PRECISION,
    user_id UUID,
    created_at TIMESTAMPTZ
) AS $$
DECLARE
    lat_range float;
    lon_range float;
BEGIN
    lat_range := radius_km / 111.0;
    lon_range := radius_km / (111.0 * cos(radians(user_lat))); 

    RETURN QUERY
    SELECT 
        p.post_id,
        p.title,
        p.description,
        p.price,
        p.images,
        p.location,
        calculate_distance(user_lat, user_lng, CAST(p.lat AS float), CAST(p.long AS float)) AS distance_km,
        p.user_id,
        p.created_at
    FROM posts p
    WHERE p.status = 'active'
      AND p.lat IS NOT NULL 
      AND p.long IS NOT NULL
      AND (p.expires_at IS NULL OR p.expires_at > NOW())
      AND p.lat BETWEEN user_lat - lat_range AND user_lat + lat_range
      AND p.long BETWEEN user_lng - lon_range AND user_lng + lon_range
      AND calculate_distance(user_lat, user_lng, CAST(p.lat AS float), CAST(p.long AS float)) <= radius_km
    ORDER BY distance_km ASC, p.tier_priority DESC, p.created_at DESC
    LIMIT post_limit;
END;
$$ LANGUAGE plpgsql;

-- New get_or_create_chat_v2
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
