-- ============================================================
-- Backfill sample images for seed posts that have no images
-- Fixes: H1 — 99% of post images returning 404
--
-- Root cause: the original seed_sample_data.sql used `post_id % 10`
-- which fails on UUID post_ids. This migration assigns sample image
-- paths using ROW_NUMBER() so it works with UUID primary keys.
--
-- Safe to run multiple times (WHERE clause skips posts with images).
-- ============================================================
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'posts' AND column_name = 'images';

  IF col_type = 'ARRAY' OR col_type LIKE '%[]%' THEN
    -- TEXT[] column type
    UPDATE posts p
    SET images = ARRAY[
        '/uploads/sample_' || ((rn.rn % 10) + 1) || '_1.jpg',
        '/uploads/sample_' || ((rn.rn % 10) + 1) || '_2.jpg'
    ]::TEXT[]
    FROM (
      SELECT post_id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM posts
      WHERE images IS NULL OR cardinality(images) = 0
    ) rn
    WHERE p.post_id = rn.post_id;

    RAISE NOTICE 'Backfilled TEXT[] images for % posts',
      (SELECT COUNT(*) FROM posts WHERE cardinality(images) > 0);

  ELSIF col_type = 'jsonb' OR col_type = 'json' THEN
    -- JSONB column type
    UPDATE posts p
    SET images = jsonb_build_array(
        '/uploads/sample_' || ((rn.rn % 10) + 1) || '_1.jpg',
        '/uploads/sample_' || ((rn.rn % 10) + 1) || '_2.jpg'
    )
    FROM (
      SELECT post_id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM posts
      WHERE images IS NULL OR images = '[]'::jsonb OR jsonb_array_length(images) = 0
    ) rn
    WHERE p.post_id = rn.post_id;

    RAISE NOTICE 'Backfilled JSONB images for seed posts';

  ELSE
    RAISE NOTICE 'Images column type % not handled, skipping backfill', col_type;
  END IF;
END $$;
