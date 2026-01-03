-- Geo-Search Functions for MHub
-- Haversine formula for calculating distance between coordinates

-- Function to get nearby posts within a radius
CREATE OR REPLACE FUNCTION get_nearby_posts(
  user_lat FLOAT, 
  user_long FLOAT, 
  radius_km FLOAT DEFAULT 10,
  limit_count INT DEFAULT 50
)
RETURNS TABLE (
  post_id INT,
  title VARCHAR,
  price DECIMAL,
  distance_km FLOAT,
  images JSONB,
  location VARCHAR,
  category_name VARCHAR,
  user_name VARCHAR,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY 
  SELECT 
    p.post_id,
    p.title,
    p.price,
    (6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(p.latitude)) * 
      cos(radians(p.longitude) - radians(user_long)) + 
      sin(radians(user_lat)) * 
      sin(radians(p.latitude))
    )) AS dist_km,
    p.images,
    p.location,
    c.name AS cat_name,
    pr.full_name AS seller_name,
    p.created_at
  FROM posts p
  LEFT JOIN categories c ON p.category_id = c.category_id
  LEFT JOIN profiles pr ON p.user_id = pr.user_id
  WHERE p.status = 'active'
    AND p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND (6371 * acos(
      cos(radians(user_lat)) * 
      cos(radians(p.latitude)) * 
      cos(radians(p.longitude) - radians(user_long)) + 
      sin(radians(user_lat)) * 
      sin(radians(p.latitude))
    )) <= radius_km
  ORDER BY dist_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Index for faster geo queries
CREATE INDEX IF NOT EXISTS idx_posts_geo ON posts(latitude, longitude) WHERE status = 'active';

-- Function to calculate distance between two points
CREATE OR REPLACE FUNCTION haversine_distance(
  lat1 FLOAT, long1 FLOAT,
  lat2 FLOAT, long2 FLOAT
) RETURNS FLOAT AS $$
BEGIN
  RETURN 6371 * acos(
    cos(radians(lat1)) * 
    cos(radians(lat2)) * 
    cos(radians(long2) - radians(long1)) + 
    sin(radians(lat1)) * 
    sin(radians(lat2))
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;
