-- =====================================================
-- MHub TEST DATA for Validating Features
-- Run this to test all implemented features
-- =====================================================

-- 1. Ensure views_count column exists and has varied data
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'views_count') THEN
        ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Update posts with varied view counts (for testing least-viewed-first)
UPDATE posts SET views_count = 5 WHERE post_id = (SELECT post_id FROM posts ORDER BY post_id LIMIT 1);
UPDATE posts SET views_count = 10 WHERE post_id = (SELECT post_id FROM posts ORDER BY post_id OFFSET 1 LIMIT 1);
UPDATE posts SET views_count = 100 WHERE post_id = (SELECT post_id FROM posts ORDER BY post_id OFFSET 2 LIMIT 1);
UPDATE posts SET views_count = 3 WHERE post_id = (SELECT post_id FROM posts ORDER BY post_id OFFSET 3 LIMIT 1);
UPDATE posts SET views_count = 50 WHERE post_id = (SELECT post_id FROM posts ORDER BY post_id OFFSET 4 LIMIT 1);

-- 3. Set up referral chain for testing
-- First, find current users
DO $$
DECLARE
    user1_id INTEGER;
    user2_id INTEGER;
    user3_id INTEGER;
    user4_id INTEGER;
BEGIN
    -- Get user IDs
    SELECT user_id INTO user1_id FROM users ORDER BY user_id LIMIT 1;
    SELECT user_id INTO user2_id FROM users ORDER BY user_id OFFSET 1 LIMIT 1;
    SELECT user_id INTO user3_id FROM users ORDER BY user_id OFFSET 2 LIMIT 1;
    SELECT user_id INTO user4_id FROM users ORDER BY user_id OFFSET 3 LIMIT 1;
    
    -- Create referral chain: user1 -> user2 -> user3 -> user4
    -- This means user1 gets:
    --   - 50 pts from user2 (direct)
    --   - 10 pts from user3 (indirect, through user2)
    --   - 10 pts from user4 (indirect, through user3)
    -- Total: 70 pts for user1
    
    IF user2_id IS NOT NULL THEN
        UPDATE users SET referred_by = user1_id WHERE user_id = user2_id;
        RAISE NOTICE 'User2 (%) now referred by User1 (%)', user2_id, user1_id;
    END IF;
    
    IF user3_id IS NOT NULL THEN
        UPDATE users SET referred_by = user2_id WHERE user_id = user3_id;
        RAISE NOTICE 'User3 (%) now referred by User2 (%)', user3_id, user2_id;
    END IF;
    
    IF user4_id IS NOT NULL THEN
        UPDATE users SET referred_by = user3_id WHERE user_id = user4_id;
        RAISE NOTICE 'User4 (%) now referred by User3 (%)', user4_id, user3_id;
    END IF;
    
    -- Display the chain
    RAISE NOTICE 'Referral chain created: % -> % -> % -> %', user1_id, user2_id, user3_id, user4_id;
END $$;

-- 4. Make sure referral_code column exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
        ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE;
    END IF;
END $$;

-- 5. Verify the data
SELECT '=== POSTS VIEW COUNTS (First 10) ===' AS info;
SELECT post_id, title, views_count, location 
FROM posts 
WHERE status = 'active' 
ORDER BY COALESCE(views_count, 0) ASC
LIMIT 10;

SELECT '=== REFERRAL CHAIN ===' AS info;
SELECT u.user_id, u.username, u.referred_by, 
       (SELECT username FROM users WHERE user_id = u.referred_by) as referred_by_name
FROM users u
ORDER BY u.user_id
LIMIT 10;

SELECT '=== EXPECTED POINTS FOR USER 1 ===' AS info;
SELECT 
    (SELECT COUNT(*) FROM users WHERE referred_by = (SELECT user_id FROM users ORDER BY user_id LIMIT 1)) * 50 AS direct_points,
    'User 1 should also get 10 pts per indirect referral' AS note;

SELECT '✅ Test data ready! Refresh browser and check Rewards page.' AS status;
