-- ============================================================================
-- SEARCH RANKING UPDATE (Tier Priority + Boost Level)
-- Adds compatibility columns and updates search/nearby functions ordering.
-- ============================================================================

-- Ensure location + ranking columns exist for compatibility
ALTER TABLE posts ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS long DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tier_priority INT DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS boost_level INT DEFAULT 0;

-- Full-text + location search (tier-prioritized)
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
        calculate_distance(p_lat, p_lng, p.effective_lat, p.effective_lng) AS distance_km,
        CASE
            WHEN p_query IS NOT NULL AND p_query != '' AND p.search_vector IS NOT NULL
            THEN ts_rank(p.search_vector, plainto_tsquery('english', p_query))
            ELSE 1.0::REAL
        END AS relevance,
        p.created_at,
        u.user_id,
        u.full_name
    FROM (
        SELECT
            p.*,
            CAST(COALESCE(p.latitude, p.lat) AS DOUBLE PRECISION) AS effective_lat,
            CAST(COALESCE(p.longitude, p.long) AS DOUBLE PRECISION) AS effective_lng
        FROM posts p
    ) p
    LEFT JOIN users u ON p.user_id = u.user_id
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
    WHERE
        p.status = 'active'
        AND (
            p_query IS NULL
            OR p_query = ''
            OR p.search_vector @@ plainto_tsquery('english', p_query)
            OR p.title ILIKE '%' || p_query || '%'
            OR p.description ILIKE '%' || p_query || '%'
            OR p.location ILIKE '%' || p_query || '%'
            OR c.name ILIKE '%' || p_query || '%'
            OR sc.name ILIKE '%' || p_query || '%'
            OR u.full_name ILIKE '%' || p_query || '%'
            OR (to_jsonb(u)->>'username') ILIKE '%' || p_query || '%'
            OR (to_jsonb(u)->>'name') ILIKE '%' || p_query || '%'
            OR (to_jsonb(p)->>'brand') ILIKE '%' || p_query || '%'
            OR (to_jsonb(p)->>'model') ILIKE '%' || p_query || '%'
        )
        AND (p_lat IS NULL OR p_lng IS NULL OR p.effective_lat IS NULL OR calculate_distance(p_lat, p_lng, p.effective_lat, p.effective_lng) <= p_radius_km)
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        AND (p_max_price IS NULL OR p.price <= p_max_price)
    ORDER BY
        (COALESCE(p.tier_priority, 0) * 10 + COALESCE(p.boost_level, 0)) DESC,
        relevance DESC,
        p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Nearby posts (tier-prioritized, then distance)
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
        calculate_distance(p_lat, p_lng, p.effective_lat, p.effective_lng) AS distance_km
    FROM (
        SELECT
            p.*,
            CAST(COALESCE(p.latitude, p.lat) AS DOUBLE PRECISION) AS effective_lat,
            CAST(COALESCE(p.longitude, p.long) AS DOUBLE PRECISION) AS effective_lng
        FROM posts p
    ) p
    WHERE
        p.status = 'active'
        AND p.effective_lat IS NOT NULL AND p.effective_lng IS NOT NULL
        AND p.effective_lat BETWEEN (p_lat - lat_delta) AND (p_lat + lat_delta)
        AND p.effective_lng BETWEEN (p_lng - lng_delta) AND (p_lng + lng_delta)
        AND calculate_distance(p_lat, p_lng, p.effective_lat, p.effective_lng) <= p_radius_km
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
    ORDER BY
        (COALESCE(p.tier_priority, 0) * 10 + COALESCE(p.boost_level, 0)) DESC,
        distance_km ASC,
        p.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
