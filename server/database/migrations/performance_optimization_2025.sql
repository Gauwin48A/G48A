-- ============================================================================
-- AG>MHUB DATABASE PERFORMANCE OPTIMIZATION MIGRATION
-- ============================================================================
-- This migration addresses critical performance bottlenecks:
-- 1. Missing indexes on frequently joined/filtered columns
-- 2. Composite indexes for common WHERE clause combinations
-- 3. Proper VACUUM strategy to prevent bloat
-- ============================================================================

-- ============================================================================
-- SECTION 1: MISSING FOREIGN KEY INDEXES
-- ============================================================================
-- These indexes significantly improve JOIN performance

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_id
  ON posts(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id
  ON profiles(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_buyer_id
  ON transactions(buyer_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_seller_id
  ON transactions(seller_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_preferences_user_id
  ON preferences(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_post_id
  ON comments(post_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_likes_post_id
  ON likes(post_id);

-- ============================================================================
-- SECTION 2: COMPOSITE INDEXES FOR COMMON FILTER COMBINATIONS
-- ============================================================================
-- These optimize queries that filter on multiple columns simultaneously

-- For feed queries: filter by status and created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_status_created
  ON posts(status, created_at DESC)
  WHERE status = 'active';

-- For category-based feeds: status + category + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_category_status_created
  ON posts(category_id, status, created_at DESC)
  WHERE status = 'active';

-- For expiry checks in cron jobs
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_expires_at
  ON posts(expires_at)
  WHERE status = 'active';

-- For user posts listing
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_user_created
  ON posts(user_id, created_at DESC);

-- For price range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_price
  ON posts(price)
  WHERE status = 'active';

-- ============================================================================
-- SECTION 3: NOTIFICATION QUERIES
-- ============================================================================
-- Optimize notification retrieval (common operation)

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read_created
  ON notifications(user_id, is_read, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);

-- ============================================================================
-- SECTION 4: PAYMENT AND TRANSACTION QUERIES
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status_user
  ON payments(status, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_created
  ON payments(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_buyer_created
  ON transactions(buyer_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_seller_created
  ON transactions(seller_id, created_at DESC);

-- ============================================================================
-- SECTION 5: GEOLOCATION INDEXES
-- ============================================================================
-- Note: If using PostGIS, use GIST index instead
-- For now, basic indexes on latitude/longitude for haversine calculations

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_latitude_longitude
  ON posts(latitude, longitude)
  WHERE status = 'active';

-- ============================================================================
-- SECTION 6: AUDIT AND LOGIN TRACKING
-- ============================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action
  ON audit_logs(user_id, action, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_active
  ON user_sessions(user_id, is_active);

-- ============================================================================
-- SECTION 7: SEARCH AND TEXT QUERIES
-- ============================================================================
-- If using full-text search, ensure GIN index exists

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_title_search
  ON posts USING gin(to_tsvector('english', title));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_description_search
  ON posts USING gin(to_tsvector('english', description));

-- ============================================================================
-- SECTION 8: CONFIGURE AUTOVACUUM FOR HIGH-WRITE TABLES
-- ============================================================================
-- Aggressive VACUUM for frequently updated tables prevents bloat

ALTER TABLE posts SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005,
  autovacuum_vacuum_cost_delay = 2
);

ALTER TABLE transactions SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005
);

ALTER TABLE notifications SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.005
);

ALTER TABLE audit_logs SET (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_analyze_scale_factor = 0.01
);

-- ============================================================================
-- SECTION 9: STATISTICS AND ANALYSIS
-- ============================================================================
-- Update table statistics for query optimizer

ANALYZE posts;
ANALYZE users;
ANALYZE transactions;
ANALYZE notifications;
ANALYZE profiles;
ANALYZE preferences;

-- ============================================================================
-- SECTION 10: PERFORMANCE VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify index effectiveness after migration:

-- Check if indexes are being used:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;

-- Check table bloat:
-- SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'."'||tablename||'"'))
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY pg_total_relation_size(schemaname||'."'||tablename||'"') DESC;

-- Check missing indexes:
-- SELECT schemaname, tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename NOT IN (SELECT tablename FROM pg_indexes WHERE schemaname = 'public');

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

COMMENT ON INDEX idx_posts_user_id IS 'Improves JOIN performance on posts.user_id for user profile queries';
COMMENT ON INDEX idx_posts_status_created IS 'Optimizes feed queries filtering by status and creation date';
COMMENT ON INDEX idx_notifications_user_read_created IS 'Accelerates notification retrieval by user and read status';
COMMENT ON INDEX idx_posts_expires_at IS 'Enables efficient post expiry cleanup in cron jobs';
