-- =============================================
-- Geo-Spatial Queries for MHub (NO PostGIS Required)
-- Uses Haversine formula in pure SQL
-- =============================================

-- 1. Ensure lat/long columns exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE posts ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);

-- 2. Create index for lat/long queries
CREATE INDEX IF NOT EXISTS idx_posts_lat_long ON posts(latitude, longitude);

-- 3. Drop existing function if exists (fixes parameter name conflict)
DROP FUNCTION IF EXISTS haversine_distance(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

-- 4. Haversine distance function (returns distance in km)
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  R DOUBLE PRECISION := 6371; -- Earth radius in km
  dLat DOUBLE PRECISION;
  dLon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  a := sin(dLat/2) * sin(dLat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dLon/2) * sin(dLon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Fast geo-query function (find posts within X km)
CREATE OR REPLACE FUNCTION find_nearby_posts(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE(
  post_id INTEGER,
  title VARCHAR,
  price DECIMAL,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.post_id,
    p.title,
    p.price,
    ROUND(haversine_distance(user_lat, user_lng, p.latitude::DOUBLE PRECISION, p.longitude::DOUBLE PRECISION)::numeric, 2)::DOUBLE PRECISION as distance_km
  FROM posts p
  WHERE p.status = 'active'
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    -- Bounding box pre-filter for performance (approximate)
    AND p.latitude BETWEEN user_lat - (radius_km / 111.0) AND user_lat + (radius_km / 111.0)
    AND p.longitude BETWEEN user_lng - (radius_km / (111.0 * cos(radians(user_lat)))) 
                        AND user_lng + (radius_km / (111.0 * cos(radians(user_lat))))
    -- Exact distance filter
    AND haversine_distance(user_lat, user_lng, p.latitude::DOUBLE PRECISION, p.longitude::DOUBLE PRECISION) <= radius_km
  ORDER BY distance_km ASC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 5. Test query (Bangalore coordinates, 5km radius)
-- SELECT * FROM find_nearby_posts(12.9716, 77.5946, 5, 20);

SELECT '✅ Geo-spatial queries enabled (No PostGIS required)' as status;
