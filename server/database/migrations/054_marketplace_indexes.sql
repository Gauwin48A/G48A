-- =============================================================
-- 054_marketplace_indexes.sql
-- Query indexes for the marketplace (posts is the hottest table).
-- Consolidates indexes declared in performance_indexes.sql and
-- 004_performance_indexes.sql that were never applied to this DB.
-- =============================================================

BEGIN;

-- Category browse + feed ordering
CREATE INDEX IF NOT EXISTS idx_posts_category_status
  ON posts(category_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_status_created
  ON posts(status, created_at DESC);

-- Seller profile / "my posts"
CREATE INDEX IF NOT EXISTS idx_posts_user_status
  ON posts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_posts_user_created
  ON posts(user_id, created_at DESC);

-- Subcategory browse
CREATE INDEX IF NOT EXISTS idx_posts_subcategory
  ON posts(subcategory_id);

-- Price sort / filter
CREATE INDEX IF NOT EXISTS idx_posts_price
  ON posts(price);

-- Expiry cron sweep (active posts that expire)
CREATE INDEX IF NOT EXISTS idx_posts_active_expiry
  ON posts(status, expires_at) WHERE status = 'active';

COMMIT;
