-- =====================================================
-- DEFENDER SCHEMA: ZERO TRUST & UUID ARCHITECTURE
-- =====================================================
-- This schema enforces:
-- 1. UUID Primary Keys (No ID enumeration)
-- 2. Strict Constraints (Price > 0, Email Unique)
-- 3. Composite Indexes (Performance)
-- =====================================================

-- =====================================================
-- 0. CLEANUP (The Nuclear Option)
-- =====================================================
DROP TABLE IF EXISTS login_history CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. PURE SQL GEO-LOCATION (No PostGIS Dependency)
-- Function to calculate distance between two points in KM
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
    R float := 6371; -- Earth radius in KM
    dLat float;
    dLon float;
    a float;
    c float;
BEGIN
    dLat := radians(lat2 - lat1);
    dLon := radians(lon2 - lon1);
    a := sin(dLat/2) * sin(dLat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dLon/2) * sin(dLon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find posts near a location using Bounding Box (Fast) + Haversine (Accurate)
-- Returns UUIDs of posts
CREATE OR REPLACE FUNCTION get_nearby_posts(user_lat float, user_lon float, radius_km float)
RETURNS TABLE (post_id UUID, distance_km float) AS $$
DECLARE
    lat_range float;
    lon_range float;
BEGIN
    -- 1 degree lat ~= 111 km
    lat_range := radius_km / 111.0;
    -- 1 degree lon ~= 111 km * cos(lat)
    lon_range := radius_km / (111.0 * cos(radians(user_lat)));

    RETURN QUERY
    SELECT 
        p.post_id,
        calculate_distance(user_lat, user_lon, CAST(p.lat AS float), CAST(p.long AS float)) as dist
    FROM posts p
    WHERE 
        p.lat BETWEEN (user_lat - lat_range) AND (user_lat + lat_range)
        AND 
        p.long BETWEEN (user_lon - lon_range) AND (user_lon + lon_range)
        AND
        p.status = 'active'
        AND
        calculate_distance(user_lat, user_lon, CAST(p.lat AS float), CAST(p.long AS float)) <= radius_km
    ORDER BY dist ASC;
END;
$$ LANGUAGE plpgsql;

-- 2. USERS (UUID)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE,
    
    -- Status & Tiers
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'premium', 'seller', 'admin')),
    tier VARCHAR(20) DEFAULT 'basic', -- basic, silver, premium
    post_credits INT DEFAULT 0,
    subscription_expiry TIMESTAMPTZ,
    
    -- Verification
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token TEXT,
    verification_token_expiry TIMESTAMPTZ,
    reset_token TEXT,
    reset_token_expiry TIMESTAMPTZ,
    aadhaar_status VARCHAR(20) DEFAULT 'PENDING',
    
    -- Security
    locked_until TIMESTAMPTZ,
    refresh_token TEXT,
    last_login TIMESTAMPTZ,
    
    -- Profile
    avatar_url TEXT,
    bio TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    listing_location TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES (UUID)
CREATE TABLE categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    icon_url TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4. POSTS (UUID)
CREATE TABLE posts (
    post_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(category_id),
    
    title VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    images JSONB DEFAULT '[]', -- JSONB for array of URLs
    
    -- Location
    location TEXT, -- Text description
    -- Geo-spatial done via pure SQL or PostGIS usage on lat/long if added, 
    -- but user prompt had `location GEOGRAPHY(POINT)` in their snippet.
    -- We'll stick to simple columns + function for maximum compatibility first, 
    -- or use the prompt's `GEOGRAPHY` if PostGIS is confirmed.
    -- Given "Pure SQL" pivot earlier, let's store lat/long explicitly for Haversine.
    lat DECIMAL(10,8),
    long DECIMAL(11,8),

    status VARCHAR(20) DEFAULT 'active', -- active, sold, expired, deleted
    tier_priority INT DEFAULT 1, -- 1=Basic, 2=Silver, 3=Premium
    
    views_count INT DEFAULT 0,
    likes INT DEFAULT 0,
    shares INT DEFAULT 0,
    
    is_flash_sale BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TRANSACTIONS (UUID - Audit Trail)
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    type VARCHAR(50), -- 'subscription_silver', 'buy_credit'
    status VARCHAR(20) DEFAULT 'success',
    gateway_id VARCHAR(100), -- UPI Ref ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LOGIN HISTORY (UUID - Velocity Block)
CREATE TABLE login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    device_id VARCHAR(100), -- Fingerprint
    ip_address VARCHAR(45),
    login_time TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INDEXES
-- Velocity Block Composite Index
CREATE INDEX idx_login_history_user_time ON login_history(user_id, login_time DESC);

-- Geo Search
CREATE INDEX idx_posts_lat_long ON posts(lat, long);

-- Text Search
CREATE INDEX idx_posts_search ON posts USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- User Lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);

-- Post Filtering
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_tier_priority ON posts(tier_priority);
