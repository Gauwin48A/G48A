-- =====================================================
-- SQL Script: Add Sold & Bought Posts for SaleDone Testing
-- Run this in your PostgreSQL database (mhub)
-- =====================================================

-- STEP 1: Update existing posts to 'sold' status for various users
-- This will mark some posts as sold so they show in the "Sold" tab

-- Mark 3 posts as SOLD for User 1 (Rahul Sharma)
UPDATE posts SET status = 'sold' 
WHERE user_id = 1 AND status = 'active' 
AND post_id IN (SELECT post_id FROM posts WHERE user_id = 1 AND status = 'active' LIMIT 3);

-- Mark 2 posts as SOLD for User 2
UPDATE posts SET status = 'sold' 
WHERE user_id = 2 AND status = 'active' 
AND post_id IN (SELECT post_id FROM posts WHERE user_id = 2 AND status = 'active' LIMIT 2);

-- Mark 2 posts as SOLD for User 3
UPDATE posts SET status = 'sold' 
WHERE user_id = 3 AND status = 'active' 
AND post_id IN (SELECT post_id FROM posts WHERE user_id = 3 AND status = 'active' LIMIT 2);

-- Mark 1 post as SOLD for User 4
UPDATE posts SET status = 'sold' 
WHERE user_id = 4 AND status = 'active' 
AND post_id IN (SELECT post_id FROM posts WHERE user_id = 4 AND status = 'active' LIMIT 1);

-- Mark 1 post as SOLD for User 5
UPDATE posts SET status = 'sold' 
WHERE user_id = 5 AND status = 'active' 
AND post_id IN (SELECT post_id FROM posts WHERE user_id = 5 AND status = 'active' LIMIT 1);

-- =====================================================
-- STEP 2: Create COMPLETED transactions for sold posts
-- This links buyers to the sold posts
-- =====================================================

-- Clear old transactions to avoid conflicts
DELETE FROM transactions WHERE status = 'completed';

-- Insert transactions where different users bought posts
DO $$
DECLARE
    sold_posts INTEGER[];
    i INTEGER;
BEGIN
    -- Get all sold posts
    SELECT ARRAY_AGG(post_id ORDER BY post_id) INTO sold_posts 
    FROM posts WHERE status = 'sold';
    
    IF array_length(sold_posts, 1) > 0 THEN
        -- Create transactions for each sold post
        FOR i IN 1..LEAST(array_length(sold_posts, 1), 10) LOOP
            INSERT INTO transactions (
                buyer_id, 
                seller_id, 
                post_id, 
                amount, 
                status, 
                payment_method, 
                completed_at, 
                created_at
            )
            SELECT 
                -- Buyer is a different user (cycle through users 1-10)
                CASE WHEN p.user_id <= 5 THEN p.user_id + 5 ELSE p.user_id - 4 END,
                p.user_id,  -- Seller is the post owner
                p.post_id,
                p.price,
                'completed',
                CASE (i % 3) WHEN 0 THEN 'UPI' WHEN 1 THEN 'Cash' ELSE 'Bank Transfer' END,
                NOW() - (i || ' days')::INTERVAL,
                NOW() - ((i + 2) || ' days')::INTERVAL
            FROM posts p
            WHERE p.post_id = sold_posts[i]
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;

-- =====================================================
-- STEP 3: Verify the data
-- =====================================================

-- Show sold posts count per user
SELECT 
    u.user_id, 
    u.username,
    COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_posts,
    COUNT(CASE WHEN p.status = 'sold' THEN 1 END) as sold_posts
FROM users u
LEFT JOIN posts p ON u.user_id = p.user_id
WHERE u.user_id <= 10
GROUP BY u.user_id, u.username
ORDER BY u.user_id;

-- Show transactions (bought items) per user
SELECT 
    t.buyer_id,
    (SELECT username FROM users WHERE user_id = t.buyer_id) as buyer_name,
    COUNT(*) as items_bought,
    SUM(t.amount) as total_spent
FROM transactions t
WHERE t.status = 'completed'
GROUP BY t.buyer_id
ORDER BY t.buyer_id;

-- Final summary
SELECT 
    'Summary' as report,
    (SELECT COUNT(*) FROM posts WHERE status = 'active') as active_posts,
    (SELECT COUNT(*) FROM posts WHERE status = 'sold') as sold_posts,
    (SELECT COUNT(*) FROM transactions WHERE status = 'completed') as completed_transactions;
