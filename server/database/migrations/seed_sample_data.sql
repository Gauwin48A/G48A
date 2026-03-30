-- ============================================================
-- Migration: Seed Sample Data with Categories & Subcategories
-- Description: Comprehensive sample data for all categories
-- Run after: add_subcategories.sql
-- ============================================================

-- Ensure we have the core categories with proper structure
INSERT INTO categories (name, description) VALUES
  ('Electronics', 'Gadgets, computers, and electronic devices'),
  ('Vehicles', 'Cars, bikes, and automotive'),
  ('Real Estate', 'Properties, rentals, and land'),
  ('Jobs', 'Job listings and opportunities'),
  ('Services', 'Professional and personal services'),
  ('Fashion', 'Clothing, footwear, and accessories'),
  ('Home & Living', 'Furniture, decor, and home essentials'),
  ('Home Appliances', 'Kitchen and home appliances'),
  ('Books', 'Educational, fiction, and reference books'),
  ('Sports', 'Sports equipment and fitness gear'),
  ('Kids & Baby', 'Toys, games, and baby essentials'),
  ('Agriculture', 'Farming tools, seeds, and supplies'),
  ('Food & Grocery', 'Fresh produce and daily essentials'),
  ('Hobbies & Collectibles', 'Art, antiques, and collectibles')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- ============================================================
-- Add subcategories for ALL categories
-- ============================================================

-- Electronics subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Mobiles', 'Smartphones and feature phones', 1),
    ('Laptops', 'Notebooks and ultrabooks', 2),
    ('Tablets', 'Tablets and e-readers', 3),
    ('Accessories', 'Cables, chargers, cases', 4),
    ('Cameras', 'DSLR, mirrorless, and action cameras', 5),
    ('Audio', 'Headphones, speakers, earbuds', 6),
    ('Gaming', 'Consoles, controllers, games', 7),
    ('Wearables', 'Smartwatches and fitness bands', 8),
    ('TVs', 'Smart TVs and monitors', 9),
    ('Computer Parts', 'GPUs, RAM, storage', 10)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'electronics'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Fashion subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Men', 'Men clothing and accessories', 1),
    ('Women', 'Women clothing and accessories', 2),
    ('Kids Fashion', 'Children clothing', 3),
    ('Footwear', 'Shoes, sandals, boots', 4),
    ('Bags', 'Handbags, backpacks, luggage', 5),
    ('Jewellery', 'Jewelry and ornaments', 6),
    ('Watches', 'Wristwatches and smart watches', 7),
    ('Ethnic Wear', 'Traditional Indian clothing', 8)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'fashion'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Vehicles subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Cars', 'Used and new cars', 1),
    ('Bikes', 'Motorcycles', 2),
    ('Scooters', 'Scooters and mopeds', 3),
    ('Bicycles', 'Cycles and e-bikes', 4),
    ('Trucks', 'Commercial vehicles', 5),
    ('Auto Parts', 'Spare parts and accessories', 6),
    ('Electric Vehicles', 'EVs and hybrids', 7)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'vehicles'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Real Estate subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Houses', 'Independent houses and villas', 1),
    ('Flats', 'Apartments and flats', 2),
    ('Lands', 'Plots and agricultural land', 3),
    ('Commercial', 'Shops, offices, warehouses', 4),
    ('PG / Hostels', 'Paying guests and hostels', 5),
    ('Rentals', 'Rental properties', 6)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'real estate'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Jobs subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('IT Jobs', 'Software and tech jobs', 1),
    ('Part Time', 'Part-time opportunities', 2),
    ('Full Time', 'Full-time positions', 3),
    ('Freelance', 'Freelance and contract work', 4),
    ('Internship', 'Internship opportunities', 5),
    ('Work From Home', 'Remote work positions', 6),
    ('Government', 'Government job vacancies', 7)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'jobs'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Services subcategories (includes Beauty as subcategory!)
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Electrician', 'Electrical repair and installation', 1),
    ('Plumber', 'Plumbing services', 2),
    ('Carpenter', 'Woodwork and furniture repair', 3),
    ('Cleaning', 'Home and office cleaning', 4),
    ('Tutoring', 'Private tuition and coaching', 5),
    ('Repair', 'Device and appliance repair', 6),
    ('Delivery', 'Courier and delivery services', 7),
    ('Beauty', 'Salon, spa, makeup artists', 8),
    ('Photography', 'Event and portrait photography', 9),
    ('Catering', 'Food and event catering', 10)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'services'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Home Appliances subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Kitchen Appliances', 'Mixers, ovens, cookers', 1),
    ('Large Appliances', 'Refrigerators, washing machines', 2),
    ('Small Appliances', 'Irons, kettles, toasters', 3),
    ('Air Conditioners', 'ACs and coolers', 4),
    ('Water Purifiers', 'RO and UV purifiers', 5),
    ('Vacuum Cleaners', 'Robotic and manual vacuums', 6)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'home appliances'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Home & Living subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Living Room', 'Sofas, tables, TV units', 1),
    ('Bedroom', 'Beds, wardrobes, dressers', 2),
    ('Dining', 'Dining tables and chairs', 3),
    ('Office', 'Desks, chairs, storage', 4),
    ('Outdoor', 'Garden and patio furniture', 5),
    ('Storage', 'Shelves, cabinets, organizers', 6)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'home & living'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Kids & Baby subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Toys', 'Educational and play toys', 1),
    ('Games', 'Board games and puzzles', 2),
    ('Baby Care', 'Strollers, cribs, monitors', 3),
    ('School Supplies', 'Bags, stationery, uniforms', 4),
    ('Kids Furniture', 'Study tables, beds', 5)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'kids & baby'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Sports subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Cricket', 'Cricket bats, balls, gear', 1),
    ('Football', 'Footballs and gear', 2),
    ('Badminton', 'Rackets and shuttles', 3),
    ('Tennis', 'Tennis equipment', 4),
    ('Gym Equipment', 'Weights, machines, mats', 5),
    ('Cycling', 'Cycling gear and accessories', 6),
    ('Swimming', 'Swimwear and accessories', 7)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'sports'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Books subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Academic', 'Textbooks and study materials', 1),
    ('Fiction', 'Novels and stories', 2),
    ('Non-Fiction', 'Biographies, self-help', 3),
    ('Competitive Exams', 'UPSC, JEE, NEET prep', 4),
    ('Children Books', 'Kids stories and learning', 5),
    ('Comics', 'Comics and graphic novels', 6)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'books'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Agriculture subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Seeds', 'Seeds and saplings', 1),
    ('Fertilizers', 'Organic and chemical fertilizers', 2),
    ('Farm Equipment', 'Tools and machinery', 3),
    ('Irrigation', 'Pipes, pumps, and irrigation tools', 4),
    ('Livestock', 'Animal feed and livestock', 5)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'agriculture'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Food & Grocery subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Fruits', 'Fresh fruits', 1),
    ('Vegetables', 'Fresh vegetables', 2),
    ('Dairy', 'Milk, cheese, and dairy', 3),
    ('Snacks', 'Snacks and packaged foods', 4),
    ('Beverages', 'Juices and drinks', 5)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'food & grocery'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Hobbies & Collectibles subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Art & Craft', 'Painting, art materials, craft kits', 1),
    ('Antiques', 'Vintage and antique items', 2),
    ('Collectibles', 'Coins, stamps, and memorabilia', 3),
    ('Musical Instruments', 'Guitars, keyboards, and more', 4),
    ('Photography', 'Cameras and accessories', 5)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'hobbies & collectibles'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- Mobiles subcategories
INSERT INTO subcategories (category_id, name, description, display_order) 
SELECT c.category_id, sub.name, sub.descr, sub.ord
FROM categories c
CROSS JOIN (VALUES 
    ('Smartphones', 'Android and iOS phones', 1),
    ('Feature Phones', 'Basic mobile phones', 2),
    ('Mobile Accessories', 'Cases, chargers, cables', 3),
    ('Tablets', 'iPads and Android tablets', 4),
    ('Smartwatches', 'Wearable devices', 5)
) AS sub(name, descr, ord)
WHERE LOWER(c.name) = 'mobiles'
ON CONFLICT (category_id, name) DO UPDATE SET description = EXCLUDED.description;

-- ============================================================
-- Create sample user if not exists
-- ============================================================
INSERT INTO users (username, name, email, password_hash, role, referral_code, preferred_language, rating, email_verified, trust_score)
VALUES (
    'demo_user',
    'Demo User',
    'demo@mhub.com',
    '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', -- Password123!
    'user',
    'DEMO001',
    'en',
    4.5,
    TRUE,
    80
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- Create sample posts for EACH category with subcategories
-- ============================================================

-- Helper function to get random subcategory
DO $$
DECLARE
    v_user_id INTEGER;
    v_cat RECORD;
    v_sub RECORD;
    v_tier_id INTEGER;
    v_post_count INTEGER := 0;
    v_locations TEXT[] := ARRAY['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Kochi'];
    v_conditions TEXT[] := ARRAY['new', 'like_new', 'good', 'fair'];
BEGIN
    -- Get demo user ID
    SELECT user_id INTO v_user_id FROM users WHERE email = 'demo@mhub.com';
    IF v_user_id IS NULL THEN
        SELECT user_id INTO v_user_id FROM users LIMIT 1;
    END IF;
    
    -- Get free tier
    SELECT tier_id INTO v_tier_id FROM tiers WHERE name = 'Free' LIMIT 1;
    IF v_tier_id IS NULL THEN v_tier_id := 1; END IF;

    -- Loop through each category
    FOR v_cat IN SELECT category_id, name FROM categories LOOP
        -- Loop through each subcategory of this category
        FOR v_sub IN SELECT subcategory_id, name FROM subcategories WHERE category_id = v_cat.category_id LOOP
            -- Create 3-5 posts per subcategory
            FOR i IN 1..GREATEST(3, LEAST(5, FLOOR(RANDOM() * 5 + 3)::INT)) LOOP
                v_post_count := v_post_count + 1;
                
                INSERT INTO posts (
                    user_id, category_id, subcategory_id, tier_id, 
                    title, description, price, location, 
                    latitude, longitude, status, condition, 
                    views_count, created_at
                )
                VALUES (
                    COALESCE((SELECT user_id FROM users ORDER BY RANDOM() LIMIT 1), v_user_id),
                    v_cat.category_id,
                    v_sub.subcategory_id,
                    v_tier_id,
                    v_sub.name || ' - ' || 
                        CASE FLOOR(RANDOM() * 5)::INT
                            WHEN 0 THEN 'Premium Quality'
                            WHEN 1 THEN 'Best Deal'
                            WHEN 2 THEN 'Like New'
                            WHEN 3 THEN 'Urgent Sale'
                            ELSE 'Great Condition'
                        END,
                    'High-quality ' || LOWER(v_sub.name) || ' in ' || v_cat.name || ' category. ' ||
                        CASE FLOOR(RANDOM() * 4)::INT
                            WHEN 0 THEN 'Barely used, excellent condition. All original accessories included.'
                            WHEN 1 THEN 'Well-maintained with care. Perfect for budget-conscious buyers.'
                            WHEN 2 THEN 'Premium item at unbeatable price. Grab it before its gone!'
                            ELSE 'Genuine product with warranty. Contact for more details.'
                        END ||
                        ' Located in ' || v_locations[(FLOOR(RANDOM() * 10) + 1)::INT] || '. ' ||
                        'Price negotiable for serious buyers. Quick sale preferred.',
                    FLOOR(RANDOM() * 50000 + 500)::INT,
                    v_locations[(FLOOR(RANDOM() * 10) + 1)::INT],
                    17.38 + (RANDOM() * 0.2 - 0.1),
                    78.48 + (RANDOM() * 0.2 - 0.1),
                    'active',
                    v_conditions[(FLOOR(RANDOM() * 4) + 1)::INT],
                    FLOOR(RANDOM() * 500)::INT,
                    NOW() - (RANDOM() * 30 || ' days')::INTERVAL
                )
                ON CONFLICT DO NOTHING;
            END LOOP;
        END LOOP;
        
        -- Also create some posts without subcategory for backward compatibility
        INSERT INTO posts (
            user_id, category_id, tier_id, 
            title, description, price, location, 
            status, condition, views_count, created_at
        )
        VALUES (
            v_user_id,
            v_cat.category_id,
            v_tier_id,
            v_cat.name || ' - General Listing',
            'General listing in ' || v_cat.name || ' category. Contact for details.',
            FLOOR(RANDOM() * 20000 + 1000)::INT,
            v_locations[(FLOOR(RANDOM() * 10) + 1)::INT],
            'active',
            'good',
            FLOOR(RANDOM() * 100)::INT,
            NOW() - (RANDOM() * 15 || ' days')::INTERVAL
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created approximately % posts across all categories and subcategories', v_post_count;
END $$;

-- ============================================================
-- Add sample images to posts (using placeholder pattern)
-- Handle both TEXT[] and JSONB column types
-- ============================================================
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type 
  FROM information_schema.columns 
  WHERE table_name = 'posts' AND column_name = 'images';
  
  -- Use ROW_NUMBER() to compute a 1-10 bucket that works with UUID post_ids
  IF col_type = 'ARRAY' OR col_type LIKE '%[]%' THEN
    -- TEXT[] type
    UPDATE posts p
    SET images = ARRAY[
        '/uploads/sample_' || ((rn.rn % 10) + 1) || '_1.jpg',
        '/uploads/sample_' || ((rn.rn % 10) + 1) || '_2.jpg'
    ]::TEXT[]
    FROM (
      SELECT post_id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM posts
      WHERE images IS NULL OR cardinality(images) = 0
    ) rn
    WHERE p.post_id = rn.post_id;
  ELSIF col_type = 'jsonb' OR col_type = 'json' THEN
    -- JSONB type
    UPDATE posts p
    SET images = jsonb_build_array(
        '/uploads/sample_' || ((rn.rn % 10) + 1) || '_1.jpg',
        '/uploads/sample_' || ((rn.rn % 10) + 1) || '_2.jpg'
    )
    FROM (
      SELECT post_id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
      FROM posts
      WHERE images IS NULL OR images = '[]'::jsonb OR jsonb_array_length(images) = 0
    ) rn
    WHERE p.post_id = rn.post_id;
  ELSE
    RAISE NOTICE 'Images column type % not handled, skipping image seed', col_type;
  END IF;
END $$;

-- ============================================================
-- Update post counts on subcategories for accurate display
-- ============================================================
-- This is handled automatically by the controller query, but we can cache it
UPDATE subcategories s
SET description = COALESCE(s.description, '') || ''
WHERE EXISTS (SELECT 1 FROM posts p WHERE p.subcategory_id = s.subcategory_id AND p.status = 'active');

-- ============================================================
-- Summary
-- ============================================================
DO $$
DECLARE
    cat_count INTEGER;
    sub_count INTEGER;
    post_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cat_count FROM categories;
    SELECT COUNT(*) INTO sub_count FROM subcategories WHERE is_active = TRUE;
    SELECT COUNT(*) INTO post_count FROM posts WHERE status = 'active';
    
    RAISE NOTICE '=== Sample Data Seed Complete ===';
    RAISE NOTICE 'Categories: %', cat_count;
    RAISE NOTICE 'Subcategories: %', sub_count;
    RAISE NOTICE 'Active Posts: %', post_count;
END $$;
