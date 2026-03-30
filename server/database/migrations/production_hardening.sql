-- =============================================================
-- MHUB PRODUCTION HARDENING MIGRATION (NO POSTGIS VERSION)
-- The Defender's 100% Completion Script - Universal Compatibility
-- =============================================================
-- Run this in your PostgreSQL/Supabase SQL Editor
-- This creates all missing tables and indexes for production
-- =============================================================

-- =============================================================
-- SECTION 1: USER SUBSCRIPTIONS (Track Premium Status)
-- =============================================================

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('basic', 'silver', 'premium')),
    start_date TIMESTAMPTZ DEFAULT NOW(),
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    payment_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_active ON user_subscriptions(is_active, end_date);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan ON user_subscriptions(plan_type);

COMMENT ON TABLE user_subscriptions IS 'Protocol: Value Hierarchy - Track user subscription status and expiry';

-- =============================================================
-- SECTION 2: PAYMENTS TABLE (Audit Trail for Transactions)
-- =============================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    currency TEXT DEFAULT 'INR',
    payment_method TEXT DEFAULT 'upi' CHECK (payment_method IN ('upi', 'card', 'netbanking', 'wallet', 'manual')),
    transaction_id TEXT,
    upi_id TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'refunded', 'expired')),
    plan_purchased TEXT CHECK (plan_purchased IN ('basic', 'silver', 'premium')),
    credits_purchased INT DEFAULT 0,
    admin_notes TEXT,
    verified_by UUID REFERENCES users(user_id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_pending ON payments(status) WHERE status = 'pending';

COMMENT ON TABLE payments IS 'Zero-Cost Payment System - Manual UPI verification with audit trail';

-- =============================================================
-- SECTION 3: NOTIFICATIONS TABLE (If not exists)
-- =============================================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    message TEXT,
    reference_id UUID,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- =============================================================
-- SECTION 4: CHAT ENHANCEMENTS (Unread Count Support)
-- =============================================================

-- Add last_read_at for tracking unread messages per user
ALTER TABLE chats ADD COLUMN IF NOT EXISTS last_read_at JSONB DEFAULT '{}';

-- =============================================================
-- SECTION 5: POSTS ENHANCEMENTS (Pure SQL)
-- =============================================================

-- Add search_vector for full-text search (if not exists)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add sold_at timestamp
ALTER TABLE posts ADD COLUMN IF NOT EXISTS sold_at TIMESTAMPTZ;

-- Add latitude/longitude (standard format) - IF NOT ALREADY FROM DEFENDER_SCHEMA
ALTER TABLE posts ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_lat_lng ON posts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_posts_status_active ON posts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_sold ON posts(sold_at) WHERE sold_at IS NOT NULL;

-- =============================================================
-- SECTION 6: USER ENHANCEMENTS
-- =============================================================

-- Add latitude/longitude for users
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Ensure tier columns exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS post_credits INT DEFAULT 1;

-- =============================================================
-- SECTION 7: FULL-TEXT SEARCH TRIGGER
-- =============================================================

CREATE OR REPLACE FUNCTION update_posts_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_posts_search_vector ON posts;
CREATE TRIGGER trg_posts_search_vector
    BEFORE INSERT OR UPDATE OF title, description, location ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_posts_search_vector();

UPDATE posts SET search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(location, '')), 'C')
WHERE search_vector IS NULL;

-- =============================================================
-- SECTION 8: GEO HELPER FUNCTION (Haversine Formula)
-- No PostGIS required! Pure math using Earth's radius (6371km)
-- =============================================================

CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
    R float := 6371; -- Earth radius in km
    dLat float;
    dLon float;
    a float;
    c float;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;
    
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    lat1 := radians(lat1);
    lat2 := radians(lat2);
    
    a := sin(dLat/2)^2 + cos(lat1) * cos(lat2) * sin(dLon/2)^2;
    c := 2 * asin(sqrt(a));
    
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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
    -- Bounding box approximation (1 deg lat ~= 111km)
    lat_range float;
    lon_range float;
BEGIN
    lat_range := radius_km / 111.0;
    -- longitude varies with latitude, simplified safely
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
      -- First filter by bounding box (uses index)
      AND p.lat BETWEEN user_lat - lat_range AND user_lat + lat_range
      AND p.long BETWEEN user_lng - lon_range AND user_lng + lon_range
      -- Then verify precise distance
      AND calculate_distance(user_lat, user_lng, CAST(p.lat AS float), CAST(p.long AS float)) <= radius_km
    ORDER BY distance_km ASC, p.tier_priority DESC, p.created_at DESC
    LIMIT post_limit;
END;
$$ LANGUAGE plpgsql;

-- =============================================================
-- SECTION 9: HELPER FUNCTIONS & VIEWS
-- =============================================================

CREATE OR REPLACE FUNCTION check_user_subscription(check_user_id UUID)
RETURNS TABLE (
    has_active_sub BOOLEAN,
    plan_type TEXT,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.is_active AND s.end_date > NOW() AS has_active_sub,
        s.plan_type,
        EXTRACT(DAY FROM (s.end_date - NOW()))::INTEGER AS days_remaining
    FROM user_subscriptions s
    WHERE s.user_id = check_user_id
        AND s.is_active = true
        AND s.end_date > NOW()
    ORDER BY s.end_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW v_active_posts AS
SELECT p.*, 
       COALESCE(u.full_name, 'Seller') as seller_name,
       c.name as category_name
FROM posts p
LEFT JOIN users u ON p.user_id = u.user_id
LEFT JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'active'
  AND (p.expires_at IS NULL OR p.expires_at > NOW())
  AND p.sold_at IS NULL;

CREATE OR REPLACE VIEW v_pending_payments AS
SELECT p.*, 
       u.email as user_email,
       u.full_name as user_name,
       u.phone_number as user_phone
FROM payments p
LEFT JOIN users u ON p.user_id = u.user_id
WHERE p.status = 'pending'
ORDER BY p.created_at ASC;

COMMENT ON FUNCTION get_posts_near_me IS 'Geo-search (NO POSTGIS): Returns posts within X km using Haversine formula';
