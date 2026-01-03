-- ============================================
-- High-Performance Feed Indexes
-- MHub Stratified Feed Distribution System
-- ============================================

-- IMPORTANT: Run these indexes during low-traffic periods
-- They are created CONCURRENTLY to avoid locking

-- 1. Main Feed Index (Covering Index for Status + Recency)
-- Covers the most common feed query pattern
DROP INDEX IF EXISTS idx_posts_feed_main;
CREATE INDEX CONCURRENTLY idx_posts_feed_main 
ON posts (status, created_at DESC, user_id)
INCLUDE (category_id, title, price, images, location, views_count, likes_count, condition, tier)
WHERE status = 'active';

-- 2. Engagement Score Index (For Exploitation Phase)
DROP INDEX IF EXISTS idx_posts_engagement_score;
CREATE INDEX CONCURRENTLY idx_posts_engagement_score 
ON posts ((COALESCE(likes_count, 0) * 10 + COALESCE(views_count, 0)) DESC)
WHERE status = 'active';

-- 3. Category Distribution Index (For Diversity)
DROP INDEX IF EXISTS idx_posts_category_active;
CREATE INDEX CONCURRENTLY idx_posts_category_active 
ON posts (category_id, created_at DESC)
WHERE status = 'active';

-- 4. Author Posts Index (For 1-per-author constraint)
DROP INDEX IF EXISTS idx_posts_user_recent;
CREATE INDEX CONCURRENTLY idx_posts_user_recent 
ON posts (user_id, created_at DESC)
WHERE status = 'active';

-- 5. Location-based Index (For geo-diversity)
DROP INDEX IF EXISTS idx_posts_location;
CREATE INDEX CONCURRENTLY idx_posts_location 
ON posts (location, created_at DESC)
WHERE status = 'active' AND location IS NOT NULL;

-- 6. Composite Feed Performance Index
DROP INDEX IF EXISTS idx_posts_feed_composite;
CREATE INDEX CONCURRENTLY idx_posts_feed_composite
ON posts (status, created_at DESC, category_id, user_id)
INCLUDE (title, price, images, location, views_count, likes_count)
WHERE status = 'active';

-- ============================================
-- Feed Analytics Table (Lightweight)
-- Tracks post performance for exploitation scoring
-- ============================================

CREATE TABLE IF NOT EXISTS post_metrics (
    post_id INTEGER PRIMARY KEY REFERENCES posts(post_id) ON DELETE CASCADE,
    impression_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0,
    exploration_complete BOOLEAN DEFAULT FALSE,
    promoted_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Index for promoted posts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_post_metrics_promoted 
ON post_metrics (promoted_at DESC)
WHERE exploration_complete = TRUE;

-- ============================================
-- Function: Calculate Engagement Rate
-- ============================================

CREATE OR REPLACE FUNCTION update_post_engagement()
RETURNS TRIGGER AS $$
BEGIN
    -- Update engagement rate when views/likes change
    UPDATE post_metrics 
    SET 
        engagement_rate = CASE 
            WHEN NEW.views_count > 0 
            THEN ROUND((COALESCE(NEW.likes_count, 0)::decimal / NEW.views_count), 4)
            ELSE 0 
        END,
        last_updated = NOW(),
        exploration_complete = CASE 
            WHEN NEW.views_count >= 20 THEN TRUE 
            ELSE exploration_complete 
        END
    WHERE post_id = NEW.post_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update metrics
DROP TRIGGER IF EXISTS trg_update_engagement ON posts;
CREATE TRIGGER trg_update_engagement
AFTER UPDATE OF views_count, likes_count ON posts
FOR EACH ROW
EXECUTE FUNCTION update_post_engagement();

-- ============================================
-- Initialize metrics for existing posts
-- ============================================

INSERT INTO post_metrics (post_id, impression_count, click_count, engagement_rate, exploration_complete)
SELECT 
    post_id,
    COALESCE(views_count, 0),
    COALESCE(likes_count, 0),
    CASE WHEN COALESCE(views_count, 0) > 0 
         THEN ROUND((COALESCE(likes_count, 0)::decimal / views_count), 4)
         ELSE 0 
    END,
    COALESCE(views_count, 0) >= 20
FROM posts
WHERE status = 'active'
ON CONFLICT (post_id) DO NOTHING;

-- ============================================
-- Performance Analysis Query
-- Run this to verify index usage
-- ============================================

-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM posts WHERE status = 'active' ORDER BY created_at DESC LIMIT 20;

SELECT 'Feed indexes created successfully!' AS status;
