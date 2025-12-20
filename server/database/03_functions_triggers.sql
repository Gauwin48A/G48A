-- Functions, triggers, and procedures for Mhub

-- Function: Validate new post
CREATE OR REPLACE FUNCTION validate_add_post(
    p_user_id INT,
    p_category_id INT,
    p_tier_id INT,
    p_title VARCHAR,
    p_price NUMERIC,
    p_latitude NUMERIC,
    p_longitude NUMERIC
)
RETURNS TABLE(valid BOOLEAN, message TEXT, field TEXT) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
        RETURN QUERY SELECT FALSE, 'User not found.', 'user_id';
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM categories WHERE category_id = p_category_id) THEN
        RETURN QUERY SELECT FALSE, 'Category not found.', 'category_id';
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM tiers WHERE tier_id = p_tier_id) THEN
        RETURN QUERY SELECT FALSE, 'Tier not found.', 'tier_id';
        RETURN;
    END IF;
    IF p_title IS NULL OR LENGTH(p_title) < 3 THEN
        RETURN QUERY SELECT FALSE, 'Title must be at least 3 characters long.', 'title';
        RETURN;
    END IF;
    IF p_price IS NULL OR p_price <= 0 THEN
        RETURN QUERY SELECT FALSE, 'Price must be a positive number.', 'price';
        RETURN;
    END IF;
    RETURN QUERY SELECT TRUE, 'Validation successful.', NULL;
END;
$$ LANGUAGE plpgsql;


-- ==================================================================
-- STORED PROCEDURE: View Count Prioritization
-- This procedure is designed to run every 6 hours to prioritize
-- posts with lower view counts by boosting their visibility
-- ==================================================================

-- Function to calculate view priority score
-- Lower views get higher priority scores
CREATE OR REPLACE FUNCTION calculate_view_priority_score(view_count INT)
RETURNS NUMERIC AS $$
BEGIN
    -- Posts with 0 views get highest priority
    IF view_count = 0 THEN
        RETURN 1000.0;
    END IF;
    
    -- Inverse relationship: fewer views = higher score
    -- Formula: 1000 / (views + 1) to prevent division by zero
    RETURN 1000.0 / (view_count + 1.0);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main stored procedure: Refresh post priority scores
CREATE OR REPLACE PROCEDURE refresh_post_view_priority()
LANGUAGE plpgsql
AS $$
BEGIN
    -- Add priority_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'posts' AND column_name = 'priority_score'
    ) THEN
        ALTER TABLE posts ADD COLUMN priority_score NUMERIC DEFAULT 0;
    END IF;
    
    -- Add last_priority_update column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'posts' AND column_name = 'last_priority_update'
    ) THEN
        ALTER TABLE posts ADD COLUMN last_priority_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
    
    -- Update priority scores for all active posts
    UPDATE posts
    SET 
        priority_score = calculate_view_priority_score(views),
        last_priority_update = CURRENT_TIMESTAMP
    WHERE status = 'active';
    
    -- Log the refresh
    RAISE NOTICE 'View priority refresh completed at %', CURRENT_TIMESTAMP;
END;
$$;

-- Function to get posts ordered by priority (for API use)
CREATE OR REPLACE FUNCTION get_prioritized_posts(
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0,
    p_category_id INT DEFAULT NULL,
    p_min_price NUMERIC DEFAULT NULL,
    p_max_price NUMERIC DEFAULT NULL
)
RETURNS TABLE(
    post_id INT,
    user_id INT,
    category_id INT,
    tier_id INT,
    title VARCHAR(255),
    description TEXT,
    price NUMERIC(10,2),
    original_price NUMERIC(10,2),
    condition VARCHAR(20),
    age VARCHAR(20),
    location VARCHAR(100),
    status VARCHAR(20),
    views INT,
    latitude NUMERIC,
    longitude NUMERIC,
    created_at TIMESTAMP,
    post_type VARCHAR(20),
    priority_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.post_id,
        p.user_id,
        p.category_id,
        p.tier_id,
        p.title,
        p.description,
        p.price,
        p.original_price,
        p.condition,
        p.age,
        p.location,
        p.status,
        p.views,
        p.latitude,
        p.longitude,
        p.created_at,
        p.post_type,
        COALESCE(p.priority_score, calculate_view_priority_score(p.views)) as priority_score
    FROM posts p
    WHERE 
        p.status = 'active'
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        AND (p_max_price IS NULL OR p.price <= p_max_price)
    ORDER BY 
        COALESCE(p.priority_score, calculate_view_priority_score(p.views)) DESC,
        p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_posts_priority_score ON posts(priority_score DESC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_views ON posts(views ASC) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_posts_category_price ON posts(category_id, price) WHERE status = 'active';

-- Add other functions, triggers, and procedures as needed
-- Add other functions, triggers, and procedures as needed
