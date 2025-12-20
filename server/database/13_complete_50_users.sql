-- =====================================================
-- MHub COMPLETE 50 USERS DATABASE SCRIPT
-- Version: 3.0 (Production Ready)
-- Creates 50 users with full data across all pages
-- =====================================================

-- ===========================================
-- SECTION 1: ADD MISSING COLUMNS SAFELY
-- ===========================================
DO $$ 
BEGIN
    -- Posts columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'views_count') THEN
        ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'discount_percentage') THEN
        ALTER TABLE posts ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'images') THEN
        ALTER TABLE posts ADD COLUMN images JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'condition') THEN
        ALTER TABLE posts ADD COLUMN condition VARCHAR(30) DEFAULT 'good';
    END IF;
    
    -- Users columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referral_code') THEN
        ALTER TABLE users ADD COLUMN referral_code VARCHAR(20) UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'referred_by') THEN
        ALTER TABLE users ADD COLUMN referred_by INTEGER REFERENCES users(user_id);
    END IF;
END $$;

-- ===========================================
-- SECTION 2: CREATE 50 USERS
-- Password: password123 for all users
-- ===========================================
DO $$
DECLARE
    pwd_hash VARCHAR(255) := '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    i INTEGER;
    user_names TEXT[] := ARRAY[
        'Rahul Sharma', 'Priya Patel', 'Amit Kumar', 'Sneha Reddy', 'Vikram Singh',
        'Meera Nair', 'Arjun Rao', 'Kavitha Menon', 'Suresh Iyer', 'Deepika Gupta',
        'Rajesh Verma', 'Ananya Das', 'Karthik Krishnan', 'Pooja Agarwal', 'Nikhil Joshi',
        'Swati Mishra', 'Arun Prakash', 'Divya Pillai', 'Sanjay Kapoor', 'Ritu Bansal',
        'Manish Tiwari', 'Anjali Saxena', 'Vivek Chauhan', 'Neha Malhotra', 'Gaurav Mehta',
        'Shruti Bose', 'Akash Pandey', 'Nidhi Jain', 'Rohit Khanna', 'Preeti Sharma',
        'Ashish Dubey', 'Komal Arora', 'Harsh Vardhan', 'Tanvi Singh', 'Mohit Chandra',
        'Sakshi Agnihotri', 'Vikas Rawat', 'Megha Kulkarni', 'Pranav Desai', 'Ishita Bhatt',
        'Saurabh Dutta', 'Kritika Sen', 'Aditya Yadav', 'Pallavi Nanda', 'Kunal Bhargava',
        'Ayesha Khan', 'Rishabh Goyal', 'Simran Kaur', 'Naveen Reddy', 'Tanya Oberoi'
    ];
    user_cities TEXT[] := ARRAY[
        'Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai',
        'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
        'Kochi', 'Chandigarh', 'Indore', 'Bhopal', 'Nagpur',
        'Visakhapatnam', 'Coimbatore', 'Vadodara', 'Surat', 'Patna'
    ];
    v_username TEXT;
    v_email TEXT;
    v_city TEXT;
    v_ref_code TEXT;
BEGIN
    FOR i IN 1..50 LOOP
        v_username := LOWER(REPLACE(user_names[i], ' ', '_'));
        v_email := LOWER(REPLACE(user_names[i], ' ', '.')) || '@mhub.com';
        v_city := user_cities[((i-1) % 20) + 1];
        v_ref_code := UPPER(SUBSTRING(user_names[i], 1, 3)) || LPAD(i::TEXT, 4, '0') || UPPER(SUBSTRING(MD5(user_names[i]), 1, 3));
        
        -- Insert user if not exists
        IF NOT EXISTS (SELECT 1 FROM users WHERE users.email = v_email OR users.username = v_username) THEN
            INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
            VALUES (
                v_username,
                v_email,
                pwd_hash,
                CASE 
                    WHEN i = 1 THEN 'admin'
                    WHEN i <= 5 THEN 'premium'
                    ELSE 'user'
                END,
                v_ref_code,
                i <= 30, -- First 30 users are verified
                CASE (i % 4)
                    WHEN 0 THEN 'hi'
                    WHEN 1 THEN 'en'
                    WHEN 2 THEN 'te'
                    ELSE 'ta'
                END
            );
        END IF;
    END LOOP;
    RAISE NOTICE 'Created/Updated 50 users';
END $$;

-- ===========================================
-- SECTION 3: CREATE PROFILES FOR ALL USERS
-- ===========================================
DO $$
DECLARE
    u RECORD;
    v_full_name TEXT;
    bio_templates TEXT[] := ARRAY[
        'Tech enthusiast | Verified seller',
        'Fashion lover | Quality products',
        'Gadget collector | Fair prices',
        'Home decor specialist | Free delivery',
        'Book reader | Student discounts',
        'Auto expert | Genuine parts',
        'Electronics dealer | Warranty included',
        'Vintage collector | Rare finds',
        'Sports gear | Fitness enthusiast',
        'Lifestyle blogger | Trusted seller'
    ];
    address_templates TEXT[] := ARRAY[
        'Banjara Hills', 'Koramangala', 'Connaught Place', 'Indiranagar', 'T Nagar',
        'Salt Lake', 'Kothrud', 'Navrangpura', 'Malviya Nagar', 'Gomti Nagar',
        'Marine Drive', 'Sector 17', 'Palasia', 'MP Nagar', 'Civil Lines',
        'Beach Road', 'RS Puram', 'Alkapuri', 'Ring Road', 'Patliputra'
    ];
BEGIN
    FOR u IN SELECT user_id, username FROM users LOOP
        -- Get name from username
        v_full_name := INITCAP(REPLACE(u.username, '_', ' '));
        
        -- Insert profile if not exists
        IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = u.user_id) THEN
            INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
            VALUES (
                u.user_id,
                v_full_name,
                '98765' || LPAD((43210 + u.user_id)::TEXT, 5, '0'),
                address_templates[((u.user_id - 1) % 20) + 1] || ', India - ' || (500000 + u.user_id),
                bio_templates[((u.user_id - 1) % 10) + 1],
                u.user_id <= 30
            );
        ELSE
            UPDATE profiles SET 
                full_name = v_full_name,
                phone = '98765' || LPAD((43210 + u.user_id)::TEXT, 5, '0'),
                address = address_templates[((u.user_id - 1) % 20) + 1] || ', India - ' || (500000 + u.user_id),
                bio = bio_templates[((u.user_id - 1) % 10) + 1]
            WHERE profiles.user_id = u.user_id;
        END IF;
    END LOOP;
    RAISE NOTICE 'Created/Updated profiles for all users';
END $$;

-- ===========================================
-- SECTION 4: CREATE REFERRAL CHAIN
-- User 1 refers users 2,3,4 (direct = 50 pts each)
-- User 2 refers users 5,6,7 (User 1 gets 10 pts each indirect)
-- User 3 refers users 8,9,10 (User 1 gets 10 pts each indirect)
-- ===========================================
DO $$
DECLARE
    u1_id INTEGER;
    u2_id INTEGER;
    u3_id INTEGER;
BEGIN
    -- Get first 3 user IDs
    SELECT user_id INTO u1_id FROM users ORDER BY user_id LIMIT 1;
    SELECT user_id INTO u2_id FROM users ORDER BY user_id OFFSET 1 LIMIT 1;
    SELECT user_id INTO u3_id FROM users ORDER BY user_id OFFSET 2 LIMIT 1;
    
    -- User 1's direct referrals (users 2, 3, 4)
    UPDATE users SET referred_by = u1_id WHERE user_id IN (
        SELECT user_id FROM users ORDER BY user_id OFFSET 1 LIMIT 3
    );
    
    -- User 2's referrals (users 5, 6, 7) - indirect for User 1
    UPDATE users SET referred_by = u2_id WHERE user_id IN (
        SELECT user_id FROM users ORDER BY user_id OFFSET 4 LIMIT 3
    );
    
    -- User 3's referrals (users 8, 9, 10) - indirect for User 1
    UPDATE users SET referred_by = u3_id WHERE user_id IN (
        SELECT user_id FROM users ORDER BY user_id OFFSET 7 LIMIT 3
    );
    
    -- User 5's referrals (users 11, 12) - 2nd level indirect for User 1
    UPDATE users SET referred_by = (SELECT user_id FROM users ORDER BY user_id OFFSET 4 LIMIT 1) 
    WHERE user_id IN (SELECT user_id FROM users ORDER BY user_id OFFSET 10 LIMIT 2);
    
    RAISE NOTICE 'Referral chain created: User1 has 3 direct + 8 indirect referrals = 11 total';
END $$;

-- ===========================================
-- SECTION 5: CREATE REWARDS FOR ALL USERS
-- ===========================================
-- Add tier column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rewards' AND column_name = 'tier') THEN
        ALTER TABLE rewards ADD COLUMN tier VARCHAR(20) DEFAULT 'Bronze';
    END IF;
END $$;

DO $$
DECLARE
    u RECORD;
    pts INTEGER;
    v_tier_name TEXT;
BEGIN
    FOR u IN SELECT user_id FROM users LOOP
        -- Calculate points based on user ID (older users have more points)
        pts := GREATEST(100, 5000 - (u.user_id * 80) + FLOOR(RANDOM() * 200));
        
        -- Determine tier
        v_tier_name := CASE 
            WHEN pts >= 5000 THEN 'Platinum'
            WHEN pts >= 2000 THEN 'Gold'
            WHEN pts >= 500 THEN 'Silver'
            ELSE 'Bronze'
        END;
        
        -- Insert or update rewards (without ON CONFLICT since no unique constraint)
        IF NOT EXISTS (SELECT 1 FROM rewards WHERE rewards.user_id = u.user_id) THEN
            INSERT INTO rewards (user_id, points, tier)
            VALUES (u.user_id, pts, v_tier_name);
        ELSE
            UPDATE rewards SET points = pts, tier = v_tier_name
            WHERE rewards.user_id = u.user_id;
        END IF;
    END LOOP;
    RAISE NOTICE 'Created rewards for all users';
END $$;

-- ===========================================
-- SECTION 6: CREATE 100+ POSTS FROM VARIOUS USERS
-- ===========================================
DO $$
DECLARE
    u RECORD;
    post_titles TEXT[] := ARRAY[
        'iPhone 14 Pro Max', 'MacBook Pro M2', 'Samsung Galaxy S23', 'OnePlus 11',
        'Sony PlayStation 5', 'Xbox Series X', 'Nintendo Switch OLED', 'iPad Air 5th Gen',
        'Dell XPS 15 Laptop', 'HP Spectre x360', 'Lenovo ThinkPad', 'ASUS ROG Gaming',
        'Samsung 65" 4K TV', 'LG OLED 55"', 'Sony Bravia 50"', 'TCL 43" Smart TV',
        'Royal Enfield Classic', 'Honda Activa 6G', 'TVS Jupiter', 'Bajaj Pulsar',
        'Maruti Swift 2023', 'Hyundai i20', 'Tata Nexon EV', 'Mahindra XUV700',
        'Kanchipuram Silk Saree', 'Banarasi Lehenga', 'Designer Anarkali', 'Bridal Wear',
        'Nike Air Max', 'Adidas Ultraboost', 'Puma RS-X', 'Reebok Classic',
        'Antique Teak Cabinet', 'Italian Leather Sofa', 'Queen Size Bed', 'Study Table Premium',
        'Canon EOS R5', 'Sony A7 III', 'Nikon Z6', 'GoPro Hero 11',
        'UPSC Books Set', 'JEE Preparation Kit', 'NEET Study Material', 'CAT Books Bundle',
        'Bosch Washing Machine', 'LG Refrigerator', 'Samsung AC 1.5 Ton', 'IFB Microwave',
        'Gym Equipment Set', 'Treadmill Premium', 'Exercise Bike', 'Yoga Kit Complete'
    ];
    post_descriptions TEXT[] := ARRAY[
        'Excellent condition, barely used. All accessories included. Under warranty.',
        'Like new condition. Original box and charger included. No scratches.',
        'Well maintained, regular servicing done. All documents ready for transfer.',
        'Premium quality, authentic product. Certificate included. Great deal.',
        'Perfect for professionals. Upgraded specs. Immediate sale required.',
        'Festival offer - negotiable price. Genuine buyer only. Home delivery available.',
        'Moving abroad, urgent sale. Price is final. Pickup preferred.',
        'Gift item, never used. Still in sealed box. Premium packaging.',
        'Used for 6 months only. Excellent performance. Reason: upgraded.',
        'Vintage collector item. Rare find. Serious inquiries only.'
    ];
    v_categories TEXT[] := ARRAY['Electronics', 'Mobiles', 'Vehicles', 'Fashion', 'Furniture', 'Books', 'Home Appliances', 'Sports'];
    v_locations TEXT[] := ARRAY['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi'];
    i INTEGER := 1;
    v_cat_id INTEGER;
    v_tier_id INTEGER;
BEGIN
    -- Get first tier ID
    SELECT tiers.tier_id INTO v_tier_id FROM tiers LIMIT 1;
    IF v_tier_id IS NULL THEN v_tier_id := 1; END IF;
    
    FOR u IN SELECT user_id FROM users ORDER BY user_id LIMIT 30 LOOP
        -- Each of first 30 users creates 3-4 posts
        FOR j IN 1..(3 + (u.user_id % 2)) LOOP
            -- Get category ID
            SELECT category_id INTO v_cat_id FROM categories WHERE name = v_categories[((i-1) % 8) + 1] LIMIT 1;
            IF v_cat_id IS NULL THEN v_cat_id := 1; END IF;
            
            INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, created_at)
            VALUES (
                u.user_id,
                v_cat_id,
                v_tier_id,
                post_titles[((i-1) % 48) + 1],
                post_descriptions[((i-1) % 10) + 1],
                FLOOR(1000 + RANDOM() * 150000), -- Price between 1000 and 151000
                v_locations[((i-1) % 10) + 1],
                CASE 
                    WHEN i % 10 = 0 THEN 'sold'
                    WHEN i % 15 = 0 THEN 'inactive'
                    ELSE 'active'
                END,
                FLOOR(5 + RANDOM() * 500), -- Views between 5 and 505
                CASE (i % 3)
                    WHEN 0 THEN 'like_new'
                    WHEN 1 THEN 'excellent'
                    ELSE 'good'
                END,
                NOW() - (INTERVAL '1 day' * (i % 60))
            );
            i := i + 1;
        END LOOP;
    END LOOP;
    RAISE NOTICE 'Created % posts from various users', i - 1;
END $$;

-- ===========================================
-- SECTION 7: CREATE PREFERENCES FOR RECOMMENDATIONS
-- ===========================================
-- Create preferences table if not exists
CREATE TABLE IF NOT EXISTS preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location VARCHAR(100),
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2),
    categories JSONB,
    notification_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to existing preferences table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'preferences' AND column_name = 'categories') THEN
        ALTER TABLE preferences ADD COLUMN categories JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'preferences' AND column_name = 'min_price') THEN
        ALTER TABLE preferences ADD COLUMN min_price DECIMAL(12,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'preferences' AND column_name = 'max_price') THEN
        ALTER TABLE preferences ADD COLUMN max_price DECIMAL(12,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'preferences' AND column_name = 'notification_enabled') THEN
        ALTER TABLE preferences ADD COLUMN notification_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

DO $$
DECLARE
    u RECORD;
    v_locs TEXT[] := ARRAY['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai'];
    v_cats JSONB[] := ARRAY[
        '["Electronics", "Mobiles"]'::JSONB,
        '["Fashion", "Books"]'::JSONB,
        '["Vehicles", "Sports"]'::JSONB,
        '["Furniture", "Home Appliances"]'::JSONB,
        '["Electronics", "Fashion"]'::JSONB
    ];
BEGIN
    FOR u IN SELECT user_id FROM users LIMIT 30 LOOP
        IF NOT EXISTS (SELECT 1 FROM preferences WHERE preferences.user_id = u.user_id) THEN
            INSERT INTO preferences (user_id, location, min_price, max_price, categories, notification_enabled)
            VALUES (
                u.user_id,
                v_locs[((u.user_id - 1) % 5) + 1],
                1000 + (u.user_id * 100),
                50000 + (u.user_id * 1000),
                v_cats[((u.user_id - 1) % 5) + 1],
                u.user_id % 2 = 0
            );
        END IF;
    END LOOP;
    RAISE NOTICE 'Created preferences for 30 users';
END $$;

-- ===========================================
-- SECTION 8: CREATE NOTIFICATIONS
-- ===========================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200),
    message TEXT,
    type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

DO $$
DECLARE
    u RECORD;
    notif_titles TEXT[] := ARRAY[
        'New inquiry on your post!',
        'Price drop alert!',
        'Your post is trending!',
        'Referral bonus earned!',
        'Profile verification complete',
        'Weekly digest available',
        'New match for your preferences',
        'Post approved and live',
        'Payment received successfully',
        'Special offer for you!'
    ];
BEGIN
    FOR u IN SELECT user_id FROM users LIMIT 40 LOOP
        INSERT INTO notifications (user_id, title, message, type, is_read)
        VALUES (
            u.user_id,
            notif_titles[((u.user_id - 1) % 10) + 1],
            'Check your dashboard for more details.',
            CASE (u.user_id % 4)
                WHEN 0 THEN 'inquiry'
                WHEN 1 THEN 'reward'
                WHEN 2 THEN 'system'
                ELSE 'marketing'
            END,
            u.user_id % 3 = 0
        );
    END LOOP;
    RAISE NOTICE 'Created notifications for 40 users';
END $$;

-- ===========================================
-- SECTION 9: CREATE FEEDBACK
-- ===========================================
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    category VARCHAR(50),
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW()
);

DO $$
DECLARE
    u RECORD;
    feedback_msgs TEXT[] := ARRAY[
        'Great platform! Easy to use.',
        'Love the referral system.',
        'Need more categories.',
        'Fast and reliable service.',
        'Excellent customer support.',
        'App could be faster.',
        'Best marketplace app!',
        'Very secure transactions.',
        'Nice UI design.',
        'Would recommend to friends.'
    ];
BEGIN
    FOR u IN SELECT user_id FROM users LIMIT 20 LOOP
        INSERT INTO feedback (user_id, message, rating, category, status)
        VALUES (
            u.user_id,
            feedback_msgs[((u.user_id - 1) % 10) + 1],
            3 + (u.user_id % 3), -- Rating 3-5
            CASE (u.user_id % 3)
                WHEN 0 THEN 'general'
                WHEN 1 THEN 'feature_request'
                ELSE 'improvement'
            END,
            CASE (u.user_id % 4)
                WHEN 0 THEN 'resolved'
                ELSE 'open'
            END
        );
    END LOOP;
    RAISE NOTICE 'Created feedback from 20 users';
END $$;

-- ===========================================
-- SECTION 10: CREATE TRANSACTIONS (SOLD ITEMS)
-- ===========================================
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    amount DECIMAL(12,2),
    status VARCHAR(20) DEFAULT 'pending',
    payment_method VARCHAR(50),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

DO $$
DECLARE
    sold_post RECORD;
    v_buyer_id INTEGER;
BEGIN
    FOR sold_post IN SELECT post_id, user_id, price FROM posts WHERE status = 'sold' LIMIT 10 LOOP
        -- Get a random buyer (not the seller)
        SELECT user_id INTO v_buyer_id FROM users 
        WHERE user_id != sold_post.user_id 
        ORDER BY RANDOM() LIMIT 1;
        
        IF v_buyer_id IS NOT NULL THEN
            INSERT INTO transactions (buyer_id, seller_id, post_id, amount, status, payment_method, completed_at)
            VALUES (
                v_buyer_id,
                sold_post.user_id,
                sold_post.post_id,
                sold_post.price,
                'completed',
                CASE (sold_post.post_id % 3)
                    WHEN 0 THEN 'UPI'
                    WHEN 1 THEN 'Bank Transfer'
                    ELSE 'Cash'
                END,
                NOW() - (INTERVAL '1 day' * (sold_post.post_id % 30))
            );
        END IF;
    END LOOP;
    RAISE NOTICE 'Created transactions for sold items';
END $$;

-- ===========================================
-- VERIFICATION QUERIES
-- ===========================================
SELECT '=== DATABASE SUMMARY ===' AS section;
SELECT 'Total Users: ' || COUNT(*) FROM users;
SELECT 'Total Profiles: ' || COUNT(*) FROM profiles;
SELECT 'Total Posts: ' || COUNT(*) FROM posts;
SELECT 'Active Posts: ' || COUNT(*) FROM posts WHERE status = 'active';
SELECT 'Sold Posts: ' || COUNT(*) FROM posts WHERE status = 'sold';
SELECT 'Total Rewards: ' || COUNT(*) FROM rewards;
SELECT 'Total Preferences: ' || COUNT(*) FROM preferences;
SELECT 'Total Notifications: ' || COUNT(*) FROM notifications;
SELECT 'Total Feedback: ' || COUNT(*) FROM feedback;
SELECT 'Total Transactions: ' || COUNT(*) FROM transactions;

SELECT '=== REFERRAL CHAIN (First 15 users) ===' AS section;
SELECT u.user_id, u.username, u.referred_by, 
       (SELECT username FROM users WHERE user_id = u.referred_by) as referred_by_name,
       u.referral_code
FROM users u
ORDER BY u.user_id
LIMIT 15;

SELECT '=== TOP 10 USERS BY POINTS ===' AS section;
SELECT u.user_id, u.username, r.points, r.tier
FROM users u
JOIN rewards r ON u.user_id = r.user_id
ORDER BY r.points DESC
LIMIT 10;

SELECT '✅ DATABASE SETUP COMPLETE! 50 users with full data created.' AS status;
SELECT 'Login with: rahul.sharma@mhub.com / password123' AS login_info;
