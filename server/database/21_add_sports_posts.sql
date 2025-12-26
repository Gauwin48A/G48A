-- =====================================================
-- MHub Add Sports Category Posts
-- Run this to add sample posts for the Sports category
-- =====================================================

-- First, ensure Sports category exists
INSERT INTO categories (name, description) 
SELECT 'Sports', 'Sports equipment and gear'
WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Sports');

-- Get the Sports category ID and add posts
DO $$
DECLARE
  v_sports_cat_id INTEGER;
  v_user_id INTEGER;
  v_tier_id INTEGER;
BEGIN
  -- Get category ID
  SELECT category_id INTO v_sports_cat_id FROM categories WHERE name = 'Sports';
  
  -- Get a valid user ID
  SELECT user_id INTO v_user_id FROM users WHERE role = 'user' LIMIT 1;
  
  -- Get tier ID
  SELECT tier_id INTO v_tier_id FROM tiers WHERE name = 'Standard' LIMIT 1;
  
  IF v_sports_cat_id IS NOT NULL AND v_user_id IS NOT NULL THEN
    -- Add Sports posts if they don't exist
    INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
    SELECT v_user_id, v_sports_cat_id, v_tier_id, 
           'Yonex Badminton Racket Pro', 
           'Professional-grade badminton racket used by Olympic players. Perfect for attacking gameplay. Strung with BG80 at 28lbs. Includes cover and extra grip. Great condition.',
           12500, 'Bangalore', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Yonex Badminton Racket Pro');
    
    INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
    SELECT v_user_id, v_sports_cat_id, v_tier_id,
           'Complete Cricket Kit - SS Ton',
           'Full cricket kit for adults. SS Ton bat, MRF pads, SG gloves, helmet, abdominal guard, kit bag. Used for one season. Great for club-level cricketers.',
           15000, 'Chennai', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Complete Cricket Kit - SS Ton');
    
    INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
    SELECT v_user_id, v_sports_cat_id, v_tier_id,
           'Football Nike Merlin Size 5',
           'Official match ball. FIFA approved quality. Used only twice in indoor games. Perfect for practice and matches. Original packaging included.',
           3500, 'Mumbai', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Football Nike Merlin Size 5');
    
    INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
    SELECT v_user_id, v_sports_cat_id, v_tier_id,
           'Gym Dumbbells Set 20kg',
           'Adjustable dumbbell set with weight plates. Perfect for home workout. Chrome finish, anti-slip grip. Includes stand and case.',
           8000, 'Hyderabad', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Gym Dumbbells Set 20kg');
    
    INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
    SELECT v_user_id, v_sports_cat_id, v_tier_id,
           'Yoga Mat Premium Cork',
           'Eco-friendly cork yoga mat. Non-slip surface, perfect grip. 6mm thickness for comfort. Includes carrying strap. Used twice.',
           2500, 'Delhi', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Yoga Mat Premium Cork');
    
    INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
    SELECT v_user_id, v_sports_cat_id, v_tier_id,
           'Swimming Goggles Arena',
           'Competition swimming goggles. Anti-fog coating, UV protection. Adjustable strap. Barely used, like new condition.',
           1800, 'Pune', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Swimming Goggles Arena');
    
    RAISE NOTICE 'Added Sports category posts. Category ID: %', v_sports_cat_id;
  ELSE
    RAISE NOTICE 'Could not find Sports category or users';
  END IF;
END $$;

-- Verify
SELECT 'Sports posts added. Total: ' || COUNT(*) as status 
FROM posts p 
JOIN categories c ON p.category_id = c.category_id 
WHERE c.name = 'Sports' AND p.status = 'active';
