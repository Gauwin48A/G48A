-- 03_seed.sql
-- This script populates the database with initial data for 500 users, posts, referrals, sales, and rewards.

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets, computers, and accessories'),
('Furniture', 'Home and office furniture'),
('Cars', 'Used and new cars'),
('Clothing', 'Men''s and women''s fashion'),
('Books', 'New and used books')
ON CONFLICT (name) DO NOTHING;

-- Insert sample tiers
INSERT INTO tiers (name, price, description) VALUES
('Basic', 0.00, 'A free listing with basic visibility'),
('Premium', 9.99, 'Enhanced visibility and promotion'),
('Gold', 29.99, 'Top placement and maximum exposure')
ON CONFLICT (name) DO NOTHING;

-- Insert 500 users with referral chains
DO $$
DECLARE
    i INT;
    ref_code TEXT;
BEGIN
    FOR i IN 1..500 LOOP
        ref_code := 'REF' || LPAD(i::TEXT, 5, '0');
        INSERT INTO users (username, password_hash, email, referral_code, referred_by)
        VALUES (
            'user' || i,
            '$2b$10$f/s.G...your_hash_here...',
            'user' || i || '@example.com',
            ref_code,
            CASE WHEN i = 1 THEN NULL ELSE i - 1 END
        );
    END LOOP;
END $$;

-- Insert 10 posts per user (5000 posts), with mixed statuses
DO $$
DECLARE
    u INT;
    p INT;
    status_arr TEXT[] := ARRAY['active','sold','inactive','active','sold','inactive','active','sold','inactive','active'];
    cat INT;
    tier INT;
BEGIN
    FOR u IN 1..500 LOOP
        FOR p IN 1..10 LOOP
            cat := ((u + p) % 5) + 1;
            tier := ((u + p) % 3) + 1;
            INSERT INTO posts (user_id, category_id, tier_id, title, description, price, original_price, condition, age, location, status, views, latitude, longitude)
            VALUES (
                u, cat, tier,
                'Post ' || p || ' by user' || u,
                'Sample description for post ' || p || ' by user' || u,
                100 + p,
                120 + p,
                'Used',
                (p % 5 + 1) || ' years old',
                'City ' || ((u + p) % 10 + 1),
                status_arr[p],
                (p * 10),
                10.0 + u,
                20.0 + p
            );
        END LOOP;
    END LOOP;
END $$;

-- Insert sales for sold posts
INSERT INTO sales (post_id, buyer_id, sale_status, created_at)
SELECT post_id, ((user_id + 1) % 500) + 1, 'completed', NOW()
FROM posts WHERE status = 'sold';

-- Insert reward_log for referrals and post creation
DO $$
DECLARE
    u INT;
    ref_by INT;
    p INT;
    points INT;
    ancestor INT;
    level INT;
BEGIN
    -- Referral rewards: up to 5 levels
    FOR u IN 2..500 LOOP
        ref_by := u - 1;
        points := 100;
        ancestor := ref_by;
        level := 1;
        WHILE ancestor IS NOT NULL AND level <= 5 LOOP
            INSERT INTO reward_log (user_id, points, reason, related_user_id)
            VALUES (ancestor, points, CASE WHEN level = 1 THEN 'direct_referral' ELSE 'indirect_referral' END, u);
            SELECT referred_by INTO ancestor FROM users WHERE user_id = ancestor;
            points := points / 2;
            level := level + 1;
        END LOOP;
    END LOOP;
    -- Post creation rewards
    FOR u IN 1..500 LOOP
        FOR p IN 1..10 LOOP
            INSERT INTO reward_log (user_id, points, reason)
            VALUES (u, 10, 'post_creation');
        END LOOP;
    END LOOP;
END $$;

-- Insert 1000 feed posts (2 per user for 500 users)
DO $$
DECLARE
    u INT;
    f INT;
BEGIN
    FOR u IN 1..500 LOOP
        FOR f IN 1..2 LOOP
            INSERT INTO feeds (user_id, description)
            VALUES (
                u,
                'Feed post #' || f || ' by user' || u || ': Sharing is caring!'
            );
        END LOOP;
    END LOOP;
END $$;

-- Insert 50 channels (one for each premium user, e.g., user_id 1 to 50)
DO $$
DECLARE
    c INT;
BEGIN
    FOR c IN 1..50 LOOP
        INSERT INTO channels (owner_id, name, description, is_premium)
        VALUES (
            c,
            'Channel ' || c,
            'This is the official channel/page for user' || c,
            TRUE
        );
    END LOOP;
END $$;

-- Insert 5 followers per channel (users 51-500 follow channels 1-50)
DO $$
DECLARE
    ch INT;
    u INT;
BEGIN
    FOR ch IN 1..50 LOOP
        FOR u IN (ch*10+1)..(ch*10+5) LOOP
            IF u <= 500 THEN
                INSERT INTO channel_followers (channel_id, user_id)
                VALUES (ch, u);
            END IF;
        END LOOP;
    END LOOP;
END $$;

-- Insert 5 posts per channel (with images, some with videos)
DO $$
DECLARE
    ch INT;
    p INT;
BEGIN
    FOR ch IN 1..50 LOOP
        FOR p IN 1..5 LOOP
            INSERT INTO channel_posts (channel_id, owner_id, description, image_url, video_url)
            VALUES (
                ch,
                ch,
                'Channel post #' || p || ' in Channel ' || ch,
                CASE WHEN p % 2 = 0 THEN 'https://example.com/image' || p || '.jpg' ELSE NULL END,
                CASE WHEN p = 5 THEN 'https://example.com/video' || p || '.mp4' ELSE NULL END
            );
        END LOOP;
    END LOOP;
END $$;

-- Update seed for language fields
UPDATE users SET preferred_language = 'en';
UPDATE posts SET language = 'en';
UPDATE feeds SET language = 'en';
UPDATE channel_posts SET language = 'en';