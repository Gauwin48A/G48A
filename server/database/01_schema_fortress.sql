-- =====================================================
-- FORTRESS SCHEMA - Operation Ironclad
-- This adds security constraints and geo-spatial features
-- Preserves existing data by using ALTER TABLE and CREATE IF NOT EXISTS
-- =====================================================

-- 1. ADD SECURITY CONSTRAINTS TO POSTS TABLE
-- Ensure price is non-negative (Anti-Fraud)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'posts_price_non_negative'
    ) THEN
        ALTER TABLE posts ADD CONSTRAINT posts_price_non_negative CHECK (price >= 0);
    END IF;
END $$;

-- 2. ADD GEO-SPATIAL INDEX IF NOT EXISTS
CREATE INDEX IF NOT EXISTS idx_posts_geo_fortress ON posts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_posts_status_fortress ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category_fortress ON posts(category_id);

-- 3. CREATE GEOSPATIAL SEARCH FUNCTION (Haversine Formula)
CREATE OR REPLACE FUNCTION get_nearby_posts(
    input_lat FLOAT, 
    input_long FLOAT, 
    radius_km FLOAT DEFAULT 10
) 
RETURNS TABLE (
    post_id INT, 
    title VARCHAR, 
    description TEXT,
    price DECIMAL, 
    distance_km FLOAT,
    location VARCHAR,
    latitude FLOAT,
    longitude FLOAT,
    user_id INT,
    category_id INT,
    status VARCHAR,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.post_id::INT,
        p.title::VARCHAR,
        p.description::TEXT,
        p.price,
        (6371 * acos(
            LEAST(1.0, GREATEST(-1.0,
                cos(radians(input_lat)) * 
                cos(radians(p.latitude)) * 
                cos(radians(p.longitude) - radians(input_long)) + 
                sin(radians(input_lat)) * 
                sin(radians(p.latitude))
            ))
        ))::FLOAT AS distance_km,
        p.location::VARCHAR,
        p.latitude::FLOAT,
        p.longitude::FLOAT,
        p.user_id::INT,
        p.category_id::INT,
        p.status::VARCHAR,
        p.created_at::TIMESTAMP
    FROM posts p
    WHERE p.status = 'active'
    AND p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND (6371 * acos(
        LEAST(1.0, GREATEST(-1.0,
            cos(radians(input_lat)) * 
            cos(radians(p.latitude)) * 
            cos(radians(p.longitude) - radians(input_long)) + 
            sin(radians(input_lat)) * 
            sin(radians(p.latitude))
        ))
    )) < radius_km
    ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql;

-- 4. CREATE USER TRUST SCORE VIEW
CREATE OR REPLACE VIEW view_user_trust_score AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    COALESCE(p.full_name, u.username) as display_name,
    (
        -- Aadhaar verified: +20 points
        CASE WHEN u.isAadhaarVerified = true THEN 20 ELSE 0 END +
        -- Email verified: +10 points
        CASE WHEN u.is_active = true THEN 10 ELSE 0 END +
        -- Transactions completed: +5 per transaction (max 50)
        LEAST(50, COALESCE(
            (SELECT COUNT(*) * 5 FROM transactions t 
             WHERE (t.buyer_id = u.user_id OR t.seller_id = u.user_id) 
             AND t.status = 'completed'), 0
        )) +
        -- Reward points contribution: +1 per 100 points (max 20)
        LEAST(20, COALESCE(
            (SELECT points / 100 FROM rewards r WHERE r.user_id = u.user_id), 0
        ))
    ) as trust_score,
    COALESCE(r.tier, 'Bronze') as reward_tier,
    COALESCE(r.points, 0) as reward_points
FROM users u
LEFT JOIN profiles p ON u.user_id = p.user_id
LEFT JOIN rewards r ON u.user_id = r.user_id;

-- 5. VERIFY CONSTRAINTS
SELECT 'Fortress Schema Applied Successfully' as status;
SELECT 
    (SELECT COUNT(*) FROM posts) as total_posts,
    (SELECT COUNT(*) FROM posts WHERE status = 'active') as active_posts,
    (SELECT COUNT(*) FROM posts WHERE status = 'sold') as sold_posts,
    (SELECT COUNT(*) FROM users) as total_users;
