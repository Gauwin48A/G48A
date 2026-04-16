-- ============================================================
-- Backfill realistic engagement counts for seed posts (I-09)
-- Fixes: All seed posts have 0 likes and 0 shares
--        This makes the marketplace appear completely dead.
--
-- Strategy: assign pseudo-random but consistent engagement values
--   based on ROW_NUMBER() so results are reproducible across re-runs.
--   Older posts (lower row number) get more engagement (they've had more time).
--
-- Safe to run multiple times — WHERE 0 = 0 only updates posts
--   that currently have zero engagement.
-- ============================================================

DO $$
DECLARE
  v_likes_col   TEXT;
  v_shares_col  TEXT;
  v_views_col   TEXT;
  v_count       INTEGER := 0;
BEGIN

  -- Detect column names (different schemas may use different names)
  SELECT column_name INTO v_likes_col  FROM information_schema.columns WHERE table_name = 'posts' AND column_name IN ('likes_count', 'likes', 'like_count') LIMIT 1;
  SELECT column_name INTO v_shares_col FROM information_schema.columns WHERE table_name = 'posts' AND column_name IN ('shares_count', 'shares', 'share_count') LIMIT 1;
  SELECT column_name INTO v_views_col  FROM information_schema.columns WHERE table_name = 'posts' AND column_name IN ('views_count', 'views', 'view_count') LIMIT 1;

  -- Backfill likes
  IF v_likes_col IS NOT NULL THEN
    EXECUTE format('
      UPDATE posts p
      SET %I = CASE
        WHEN rn.rn <= 10 THEN (150 + (rn.rn * 37) %% 351)   -- top 10: 150-500 likes
        WHEN rn.rn <= 30 THEN (50  + (rn.rn * 23) %% 101)   -- next 20: 50-150 likes
        ELSE                   (10  + (rn.rn * 11) %% 41)    -- rest: 10-50 likes
      END
      FROM (
        SELECT post_id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
        FROM posts
        WHERE %I = 0 OR %I IS NULL
      ) rn
      WHERE p.post_id = rn.post_id
    ', v_likes_col, v_likes_col, v_likes_col);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled likes for % posts', v_count;
  ELSE
    RAISE NOTICE 'No likes column found (checked: likes_count, likes, like_count) — skipping';
  END IF;

  -- Backfill shares
  IF v_shares_col IS NOT NULL THEN
    EXECUTE format('
      UPDATE posts p
      SET %I = CASE
        WHEN rn.rn <= 10 THEN (30 + (rn.rn * 17) %% 71)    -- top 10: 30-100 shares
        WHEN rn.rn <= 30 THEN (10 + (rn.rn * 7)  %% 21)    -- next 20: 10-30 shares
        ELSE                   (2  + (rn.rn * 3)  %% 9)     -- rest: 2-10 shares
      END
      FROM (
        SELECT post_id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
        FROM posts
        WHERE %I = 0 OR %I IS NULL
      ) rn
      WHERE p.post_id = rn.post_id
    ', v_shares_col, v_shares_col, v_shares_col);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled shares for % posts', v_count;
  ELSE
    RAISE NOTICE 'No shares column found (checked: shares_count, shares, share_count) — skipping';
  END IF;

  -- Backfill views
  IF v_views_col IS NOT NULL THEN
    EXECUTE format('
      UPDATE posts p
      SET %I = CASE
        WHEN rn.rn <= 10 THEN (500  + (rn.rn * 137) %% 1501)  -- top 10: 500-2000 views
        WHEN rn.rn <= 30 THEN (100  + (rn.rn * 73)  %% 401)   -- next 20: 100-500 views
        ELSE                   (20   + (rn.rn * 31)  %% 81)    -- rest: 20-100 views
      END
      FROM (
        SELECT post_id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
        FROM posts
        WHERE %I = 0 OR %I IS NULL
      ) rn
      WHERE p.post_id = rn.post_id
    ', v_views_col, v_views_col, v_views_col);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE 'Backfilled views for % posts', v_count;
  ELSE
    RAISE NOTICE 'No views column found (checked: views_count, views, view_count) — skipping';
  END IF;

  RAISE NOTICE 'Engagement backfill complete.';

END $$;
