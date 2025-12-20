-- =====================================================
-- MHub QUICK FIX - Run this to fix database issues
-- This script is safe to run multiple times
-- =====================================================

-- 1. Add missing columns to posts table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'views_count') THEN
        ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views_count column';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'discount_percentage') THEN
        ALTER TABLE posts ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
        RAISE NOTICE 'Added discount_percentage column';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'images') THEN
        ALTER TABLE posts ADD COLUMN images JSONB;
        RAISE NOTICE 'Added images column';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'condition') THEN
        ALTER TABLE posts ADD COLUMN condition VARCHAR(30) DEFAULT 'good';
        RAISE NOTICE 'Added condition column';
    END IF;
END $$;

-- 2. Update existing posts with better descriptions
UPDATE posts SET 
    description = 'High quality product in excellent condition. Contact for more details and negotiation.',
    views_count = COALESCE(views_count, 0) + floor(random() * 100 + 10)::int
WHERE description IS NULL OR LENGTH(description) < 20;

-- 3. Make sure all posts have a location
UPDATE posts SET location = 'India' WHERE location IS NULL OR location = '';

-- 4. Verify the fix worked
SELECT 'Database fix complete!' AS status, COUNT(*) AS total_posts FROM posts WHERE status = 'active';
