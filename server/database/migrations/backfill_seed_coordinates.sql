-- ============================================================
-- Backfill correct city coordinates for seed posts
-- Fixes: I-07 — All seed posts cluster in Hyderabad (17.38-17.48, 78.48-78.57)
--        despite having city names like Pune, Delhi, Jaipur, etc.
--
-- Root cause: original seed_sample_data.sql used Hyderabad coords
--   for all posts regardless of the city listed in post text.
--
-- This migration assigns geographically correct coordinates to
-- seed posts using city name pattern matching.
--
-- Safe to run multiple times (WHERE conditions are idempotent).
-- ============================================================

DO $$
DECLARE
  v_count INTEGER := 0;
BEGIN

  -- Pune posts: 18.5204, 73.8567
  UPDATE posts
  SET latitude  = 18.5204 + (random() * 0.04 - 0.02),
      longitude = 73.8567 + (random() * 0.04 - 0.02)
  WHERE (
    LOWER(title) LIKE '%pune%'
    OR LOWER(description) LIKE '%pune%'
    OR location_text ILIKE '%pune%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Pune: updated % posts', v_count;

  -- Delhi posts: 28.6139, 77.2090
  UPDATE posts
  SET latitude  = 28.6139 + (random() * 0.06 - 0.03),
      longitude = 77.2090 + (random() * 0.06 - 0.03)
  WHERE (
    LOWER(title) LIKE '%delhi%'
    OR LOWER(description) LIKE '%delhi%'
    OR location_text ILIKE '%delhi%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Delhi: updated % posts', v_count;

  -- Mumbai posts: 19.0760, 72.8777
  UPDATE posts
  SET latitude  = 19.0760 + (random() * 0.04 - 0.02),
      longitude = 72.8777 + (random() * 0.04 - 0.02)
  WHERE (
    LOWER(title) LIKE '%mumbai%'
    OR LOWER(description) LIKE '%mumbai%'
    OR location_text ILIKE '%mumbai%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Mumbai: updated % posts', v_count;

  -- Bangalore / Bengaluru posts: 12.9716, 77.5946
  UPDATE posts
  SET latitude  = 12.9716 + (random() * 0.04 - 0.02),
      longitude = 77.5946 + (random() * 0.04 - 0.02)
  WHERE (
    LOWER(title) LIKE '%bangalore%'
    OR LOWER(title) LIKE '%bengaluru%'
    OR LOWER(description) LIKE '%bangalore%'
    OR LOWER(description) LIKE '%bengaluru%'
    OR location_text ILIKE '%bangalore%'
    OR location_text ILIKE '%bengaluru%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Bangalore/Bengaluru: updated % posts', v_count;

  -- Chennai posts: 13.0827, 80.2707
  UPDATE posts
  SET latitude  = 13.0827 + (random() * 0.04 - 0.02),
      longitude = 80.2707 + (random() * 0.04 - 0.02)
  WHERE (
    LOWER(title) LIKE '%chennai%'
    OR LOWER(description) LIKE '%chennai%'
    OR location_text ILIKE '%chennai%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Chennai: updated % posts', v_count;

  -- Jaipur posts: 26.9124, 75.7873
  UPDATE posts
  SET latitude  = 26.9124 + (random() * 0.04 - 0.02),
      longitude = 75.7873 + (random() * 0.04 - 0.02)
  WHERE (
    LOWER(title) LIKE '%jaipur%'
    OR LOWER(description) LIKE '%jaipur%'
    OR location_text ILIKE '%jaipur%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Jaipur: updated % posts', v_count;

  -- Kolkata posts: 22.5726, 88.3639
  UPDATE posts
  SET latitude  = 22.5726 + (random() * 0.04 - 0.02),
      longitude = 88.3639 + (random() * 0.04 - 0.02)
  WHERE (
    LOWER(title) LIKE '%kolkata%'
    OR LOWER(description) LIKE '%kolkata%'
    OR location_text ILIKE '%kolkata%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Kolkata: updated % posts', v_count;

  -- Ahmedabad posts: 23.0225, 72.5714
  UPDATE posts
  SET latitude  = 23.0225 + (random() * 0.04 - 0.02),
      longitude = 72.5714 + (random() * 0.04 - 0.02)
  WHERE (
    LOWER(title) LIKE '%ahmedabad%'
    OR LOWER(description) LIKE '%ahmedabad%'
    OR location_text ILIKE '%ahmedabad%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Ahmedabad: updated % posts', v_count;

  -- Lucknow posts: 26.8467, 80.9462
  UPDATE posts
  SET latitude  = 26.8467 + (random() * 0.04 - 0.02),
      longitude = 80.9462 + (random() * 0.04 - 0.02)
  WHERE (
    LOWER(title) LIKE '%lucknow%'
    OR LOWER(description) LIKE '%lucknow%'
    OR location_text ILIKE '%lucknow%'
  )
  AND latitude BETWEEN 17.30 AND 17.55
  AND longitude BETWEEN 78.40 AND 78.60;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Lucknow: updated % posts', v_count;

  RAISE NOTICE 'Coordinate backfill complete.';

END $$;
