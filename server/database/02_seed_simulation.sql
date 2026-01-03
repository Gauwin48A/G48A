-- =====================================================
-- SEED SIMULATION - Operation Ironclad
-- Adds test users and posts for SaleDone/SaleUndone testing
-- Idempotent: Uses ON CONFLICT DO NOTHING
-- =====================================================

-- 1. ENSURE ADMIN, SELLER, BUYER TEST USERS EXIST
-- Password hash for 'password123'
INSERT INTO users (username, email, password_hash, role, isAadhaarVerified, is_active)
VALUES 
    ('admin', 'admin@mhub.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', true, true),
    ('goldSeller', 'seller@mhub.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'premium', true, true),
    ('testBuyer', 'buyer@mhub.com', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'user', false, true)
ON CONFLICT (email) DO NOTHING;

-- 2. CREATE PROFILES FOR TEST USERS
INSERT INTO profiles (user_id, full_name, phone, address, verified)
SELECT user_id, 'System Administrator', '9999999999', 'MHub HQ', true
FROM users WHERE email = 'admin@mhub.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, full_name, phone, address, verified)
SELECT user_id, 'Vikram Electronics (Gold Seller)', '9876543210', 'Electronic City, Bangalore', true
FROM users WHERE email = 'seller@mhub.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO profiles (user_id, full_name, phone, address, verified)
SELECT user_id, 'Rahul Test Buyer', '9123456789', 'Koramangala, Bangalore', false
FROM users WHERE email = 'buyer@mhub.com'
ON CONFLICT (user_id) DO NOTHING;

-- 3. ADD GOLD TIER REWARDS FOR SELLER
INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 1800, 'Gold'
FROM users WHERE email = 'seller@mhub.com'
ON CONFLICT (user_id) DO UPDATE SET points = 1800, tier = 'Gold';

-- 4. ADD BANGALORE-CLUSTERED POSTS FOR TESTING
-- Get seller and category IDs
DO $$
DECLARE
    v_seller_id INT;
    v_electronics_cat INT;
    v_furniture_cat INT;
BEGIN
    SELECT user_id INTO v_seller_id FROM users WHERE email = 'seller@mhub.com';
    SELECT category_id INTO v_electronics_cat FROM categories WHERE name = 'Electronics';
    SELECT category_id INTO v_furniture_cat FROM categories WHERE name = 'Furniture';
    
    IF v_seller_id IS NOT NULL AND v_electronics_cat IS NOT NULL THEN
        -- Bangalore coordinates: 12.9716, 77.5946
        INSERT INTO posts (user_id, category_id, title, description, price, location, latitude, longitude, status, condition)
        VALUES 
            (v_seller_id, v_electronics_cat, 'iPhone 14 Pro Max 256GB', 'Mint condition, 1 year old, all accessories included. AppleCare+ until 2025.', 85000, 'Koramangala, Bangalore', 12.9352, 77.6245, 'active', 'like_new'),
            (v_seller_id, v_electronics_cat, 'Samsung Gaming Monitor 27" 144Hz', 'Perfect for gaming, minimal usage, no dead pixels. Box and warranty card available.', 18000, 'HSR Layout, Bangalore', 12.9116, 77.6389, 'active', 'good'),
            (v_seller_id, v_electronics_cat, 'MacBook Pro M2 14"', 'Space Gray, 16GB RAM, 512GB SSD. Comes with original charger and box.', 145000, 'Indiranagar, Bangalore', 12.9784, 77.6408, 'active', 'new'),
            (v_seller_id, v_electronics_cat, 'Sony WH-1000XM5 Headphones', 'Noise cancelling, excellent condition. Includes case and charging cable.', 22000, 'Whitefield, Bangalore', 12.9698, 77.7500, 'active', 'like_new'),
            (v_seller_id, v_electronics_cat, 'iPad Pro 12.9" M2 WiFi', 'Like new, with Magic Keyboard and Apple Pencil 2nd gen. Complete setup.', 95000, 'Electronic City, Bangalore', 12.8458, 77.6712, 'active', 'like_new')
        ON CONFLICT DO NOTHING;
    END IF;
    
    IF v_seller_id IS NOT NULL AND v_furniture_cat IS NOT NULL THEN
        INSERT INTO posts (user_id, category_id, title, description, price, location, latitude, longitude, status, condition)
        VALUES 
            (v_seller_id, v_furniture_cat, 'Herman Miller Aeron Chair', 'Size B, fully loaded with all adjustments. 3 years old but excellent condition.', 45000, 'MG Road, Bangalore', 12.9757, 77.6068, 'active', 'good'),
            (v_seller_id, v_furniture_cat, 'Standing Desk Electric 60x30', 'Height adjustable, solid wood top, excellent motor. Supports 70kg load.', 28000, 'Jayanagar, Bangalore', 12.9308, 77.5838, 'active', 'good'),
            (v_seller_id, v_furniture_cat, 'L-Shaped Gaming Desk', 'Carbon fiber texture, RGB underglow, cable management. Perfect for WFH.', 15000, 'BTM Layout, Bangalore', 12.9166, 77.6101, 'active', 'like_new')
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 5. CREATE SAMPLE SOLD POSTS AND TRANSACTIONS
-- Mark some posts as sold and create transactions
DO $$
DECLARE
    v_seller_id INT;
    v_buyer_id INT;
    v_post_id INT;
BEGIN
    SELECT user_id INTO v_seller_id FROM users WHERE email = 'seller@mhub.com';
    SELECT user_id INTO v_buyer_id FROM users WHERE email = 'buyer@mhub.com';
    
    IF v_seller_id IS NOT NULL AND v_buyer_id IS NOT NULL THEN
        -- Get a post to mark as sold
        SELECT post_id INTO v_post_id FROM posts 
        WHERE user_id = v_seller_id AND status = 'active' 
        LIMIT 1;
        
        IF v_post_id IS NOT NULL THEN
            -- Mark post as sold
            UPDATE posts SET status = 'sold' WHERE post_id = v_post_id;
            
            -- Create transaction
            INSERT INTO transactions (buyer_id, seller_id, post_id, amount, status, payment_method, completed_at)
            SELECT v_buyer_id, v_seller_id, v_post_id, price, 'completed', 'UPI', NOW()
            FROM posts WHERE post_id = v_post_id
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;

-- 6. VERIFY SEED DATA
SELECT 'Seed Simulation Complete' as status;
SELECT 
    u.email,
    p.full_name,
    COALESCE(r.tier, 'Bronze') as tier,
    COALESCE(r.points, 0) as points,
    (SELECT COUNT(*) FROM posts WHERE user_id = u.user_id) as post_count
FROM users u
LEFT JOIN profiles p ON u.user_id = p.user_id
LEFT JOIN rewards r ON u.user_id = r.user_id
WHERE u.email IN ('admin@mhub.com', 'seller@mhub.com', 'buyer@mhub.com');
