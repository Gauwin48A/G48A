-- =====================================================
-- MHub SIMPLE WORKING DATA SCRIPT
-- This script adds sample data WITHOUT complex constraints
-- Safe to run multiple times
-- =====================================================

-- 1. Add missing columns first
DO $$ 
BEGIN
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
END $$;

-- 2. Update existing posts with better data
UPDATE posts SET 
    description = CASE 
        WHEN title ILIKE '%phone%' OR title ILIKE '%mobile%' OR title ILIKE '%iphone%' THEN 'Premium smartphone in excellent condition. All accessories included. No scratches, always kept in case.'
        WHEN title ILIKE '%laptop%' OR title ILIKE '%macbook%' THEN 'Powerful laptop perfect for work and entertainment. Excellent battery life, no hardware issues.'
        WHEN title ILIKE '%car%' OR title ILIKE '%bike%' OR title ILIKE '%swift%' OR title ILIKE '%enfield%' THEN 'Well-maintained vehicle with complete service history. All documents ready for transfer.'
        WHEN title ILIKE '%sofa%' OR title ILIKE '%bed%' OR title ILIKE '%furniture%' OR title ILIKE '%cabinet%' THEN 'Quality furniture in great condition. Solid construction, minimal wear. Free delivery within city.'
        WHEN title ILIKE '%book%' THEN 'Collection of books in good condition. Perfect for readers and students.'
        WHEN title ILIKE '%saree%' OR title ILIKE '%dress%' OR title ILIKE '%fashion%' THEN 'Beautiful clothing item, worn only once. Premium quality fabric.'
        ELSE 'Quality product in good condition. Contact seller for more details and negotiation.'
    END,
    views_count = COALESCE(views_count, 0) + floor(random() * 150 + 50)::int,
    condition = 'good'
WHERE description IS NULL OR LENGTH(description) < 50;

-- 3. Make sure all posts have location
UPDATE posts SET location = 'Hyderabad' WHERE location IS NULL OR location = '';

-- 4. Add sample posts if table is nearly empty (less than 10 posts)
DO $$
DECLARE
    post_count INTEGER;
    user1_id INTEGER;
    user2_id INTEGER;
    cat_electronics INTEGER;
    cat_mobiles INTEGER;
    cat_furniture INTEGER;
    tier_std INTEGER;
BEGIN
    SELECT COUNT(*) INTO post_count FROM posts WHERE status = 'active';
    
    IF post_count < 10 THEN
        -- Get first two users
        SELECT user_id INTO user1_id FROM users LIMIT 1;
        SELECT user_id INTO user2_id FROM users OFFSET 1 LIMIT 1;
        IF user2_id IS NULL THEN user2_id := user1_id; END IF;
        
        -- Get category IDs
        SELECT category_id INTO cat_electronics FROM categories WHERE name = 'Electronics' LIMIT 1;
        SELECT category_id INTO cat_mobiles FROM categories WHERE name = 'Mobiles' LIMIT 1;
        SELECT category_id INTO cat_furniture FROM categories WHERE name = 'Furniture' LIMIT 1;
        IF cat_electronics IS NULL THEN cat_electronics := 1; END IF;
        IF cat_mobiles IS NULL THEN cat_mobiles := 1; END IF;
        IF cat_furniture IS NULL THEN cat_furniture := 1; END IF;
        
        SELECT tier_id INTO tier_std FROM tiers WHERE name = 'Standard' LIMIT 1;
        IF tier_std IS NULL THEN tier_std := 1; END IF;
        
        -- Add sample posts
        INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition) VALUES
        (user1_id, cat_electronics, tier_std, 'MacBook Pro M2 2023', 'Apple MacBook Pro 14-inch with M2 Pro chip. 16GB RAM, 512GB SSD. Excellent condition with AppleCare+.', 125000, 'Hyderabad', 'active', 156, 'like_new'),
        (user2_id, cat_mobiles, tier_std, 'iPhone 14 Pro Max 256GB', 'Apple iPhone 14 Pro Max in Deep Purple. Under warranty. No scratches.', 95000, 'Mumbai', 'active', 234, 'like_new'),
        (user1_id, cat_electronics, tier_std, 'PlayStation 5 Bundle', 'PS5 Disc Edition with 2 controllers and 4 games. Perfect condition.', 42000, 'Delhi', 'active', 189, 'excellent'),
        (user2_id, cat_furniture, tier_std, 'Premium Leather Sofa Set', 'Italian leather 5-seater sofa set. Stain-resistant coating.', 75000, 'Bangalore', 'active', 145, 'good'),
        (user1_id, cat_mobiles, tier_std, 'Samsung Galaxy S23 Ultra', 'Samsung Galaxy S23 Ultra 12GB/256GB. Dual SIM, 200MP camera.', 72000, 'Chennai', 'active', 198, 'like_new'),
        (user2_id, cat_electronics, tier_std, 'Samsung 55" 4K Smart TV', 'Samsung Crystal 4K Smart TV. Built-in Netflix, Prime Video.', 38000, 'Hyderabad', 'active', 167, 'excellent'),
        (user1_id, cat_furniture, tier_std, 'Antique Teak Wood Cabinet', 'Handcrafted teak wood cabinet with intricate carvings. 50+ years old.', 85000, 'Kochi', 'active', 89, 'good'),
        (user2_id, cat_electronics, tier_std, 'Canon DSLR Camera Kit', 'Canon EOS 200D II with 18-55mm lens. Includes bag and SD card.', 42000, 'Pune', 'active', 134, 'like_new');
        
        RAISE NOTICE 'Added 8 sample posts';
    END IF;
END $$;

-- 5. Verify results
SELECT 'Total Users: ' || COUNT(*) FROM users;
SELECT 'Total Posts: ' || COUNT(*) FROM posts;
SELECT 'Active Posts: ' || COUNT(*) FROM posts WHERE status = 'active';
SELECT '✅ Database ready! Refresh browser (Ctrl+Shift+R)' AS status;
