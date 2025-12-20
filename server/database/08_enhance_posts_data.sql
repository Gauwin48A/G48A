-- =====================================================
-- MHub Enhanced Sample Data - FIXED VERSION
-- This script handles missing columns gracefully
-- =====================================================

-- First, add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add discount_percentage if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'discount_percentage') THEN
        ALTER TABLE posts ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;
    
    -- Add views_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'views_count') THEN
        ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add images if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'images') THEN
        ALTER TABLE posts ADD COLUMN images JSONB;
    END IF;
END $$;

-- Now update existing posts with rich data
UPDATE posts SET 
    description = 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones. Excellent condition, 6 months old, with original box and accessories. Crystal clear sound quality.',
    views_count = 45
WHERE title = 'Sony Headphones';

UPDATE posts SET 
    description = 'OnePlus 9 Pro 5G Smartphone - 12GB RAM, 256GB Storage. Includes original charger, box, and screen protector. No scratches, mint condition.',
    views_count = 78
WHERE title = 'OnePlus 9';

UPDATE posts SET 
    description = 'Elegant designer party wear dress. Size M, worn only once for a wedding. Premium fabric, beautiful embroidery work. Perfect for special occasions.',
    views_count = 35
WHERE title = 'Designer Dress';

UPDATE posts SET 
    description = 'Apple iPad Air 2022 with M1 chip. 256GB WiFi model. Space Grey color. Includes Apple Pencil 2nd gen and Magic Keyboard. Like new condition.',
    views_count = 92
WHERE title = 'iPad Air';

UPDATE posts SET 
    description = 'Maruti Swift 2022 VXi Model. Only 15000 KM driven. Single owner, fully serviced, new tyres. Fuel efficient. All documents ready for transfer.',
    views_count = 156
WHERE title = 'Swift 2022';

UPDATE posts SET 
    description = 'Complete Harry Potter Book Collection - All 7 books. Hardcover edition in excellent condition. Perfect gift for any Potterhead. Original Bloomsbury publication.',
    views_count = 28
WHERE title = 'HP Collection';

UPDATE posts SET 
    description = 'Pure Kanchipuram Silk Saree with gold zari work. Traditional design, perfect for weddings and festivals. Comes with matching blouse piece. Dry cleaned.',
    views_count = 67
WHERE title = 'Silk Saree';

UPDATE posts SET 
    description = 'PlayStation 5 Disc Edition with 2 controllers. Bundle includes FIFA 24, Spider-Man 2, and Gran Turismo 7. Excellent condition, no issues.',
    views_count = 120
WHERE title = 'PS5 Console';

UPDATE posts SET 
    description = 'King Size Wooden Bed Frame - Solid Sheesham Wood. Includes memory foam mattress. Elegant design, very sturdy. Minimal wear, 2 years old.',
    views_count = 43
WHERE title = 'Queen Bed';

UPDATE posts SET 
    description = 'Antique Teak Wood Cabinet - Handcrafted with intricate carvings. Perfect for living room. Over 50 years old, collector piece. Excellent preservation.',
    views_count = 31
WHERE title = 'Teak Cabinet';

-- =====================================================
-- ADD MORE POSTS WITH DIVERSE DATA
-- =====================================================

-- Electronics Posts
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'MacBook Pro M2',
    'Apple MacBook Pro 14-inch with M2 Pro chip. 16GB RAM, 512GB SSD. Space Grey. AppleCare+ until 2025. Includes original charger and box.',
    125000,
    'Mumbai',
    'active',
    89
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'MacBook Pro M2');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Samsung 55" Smart TV',
    'Samsung Crystal 4K UHD Smart LED TV. 55-inch display. Built-in Netflix, Prime Video. Wall mount included. Perfect for home theatre setup.',
    42000,
    'Delhi',
    'active',
    65
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Samsung 55" Smart TV');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'priya@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Canon DSLR Camera',
    'Canon EOS 200D II DSLR with 18-55mm lens kit. Perfect for beginners and vloggers. Includes camera bag and 32GB SD card. Barely used.',
    38000,
    'Bangalore',
    'active',
    48
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Canon DSLR Camera');

-- Mobiles Posts
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Mobiles'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'iPhone 14 Pro Max',
    'Apple iPhone 14 Pro Max 256GB Deep Purple. Under warranty, with MagSafe charger and original accessories. No scratches, tempered glass applied.',
    95000,
    'Hyderabad',
    'active',
    178
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'iPhone 14 Pro Max');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'vikram@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Mobiles'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Samsung Galaxy S23',
    'Samsung Galaxy S23 Ultra 12GB/256GB Cream color. Dual SIM, 200MP camera. With original box, charger, S-Pen. Extended warranty available.',
    78000,
    'Punjab',
    'active',
    134
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Samsung Galaxy S23');

-- Furniture Posts
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'meera@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Office Desk Setup',
    'Complete office desk setup - L-shaped desk with drawer, ergonomic mesh chair, and desk lamp. Perfect for work from home. Minimal use.',
    18000,
    'Kochi',
    'active',
    56
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Office Desk Setup');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'kavitha@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'Leather Sofa Set',
    'Premium Italian leather 5-seater sofa set with center table. Chocolate brown color. Stain-resistant coating. Perfect for modern living room.',
    95000,
    'Chennai',
    'active',
    72
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Leather Sofa Set');

-- Fashion Posts
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'suresh@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Fashion'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Nike Air Max Collection',
    'Nike Air Max 90 and Air Max 97 - Size UK 9. Both pairs in excellent condition. Original boxes included. Perfect for sneaker collectors.',
    12000,
    'Mumbai',
    'active',
    88
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Nike Air Max Collection');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'arjun@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Fashion'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Leather Jacket',
    'Genuine leather jacket - Black color, Size L. Classic biker style. Worn only a few times. Excellent quality, comfortable fit.',
    8500,
    'Bangalore',
    'active',
    41
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Leather Jacket');

-- Vehicles Posts
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Vehicles'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'Royal Enfield Classic 350',
    'Royal Enfield Classic 350 Signals Edition. 2021 model, 8000 KM driven. Dual channel ABS. All documents clear. Well maintained with service history.',
    155000,
    'Hyderabad',
    'active',
    198
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Royal Enfield Classic 350');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Vehicles'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Hero Splendor Plus',
    'Hero Splendor Plus 2023 - Brand new condition. Only 2000 KM driven. Best mileage 75km/l. Perfect for daily commute. First owner selling.',
    55000,
    'Delhi',
    'active',
    67
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Hero Splendor Plus');

-- Books Posts
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'priya@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Books'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'UPSC Preparation Books',
    'Complete UPSC preparation set - NCERTs, Laxmikanth Polity, Spectrum History, and more. All latest editions. Highlighted and noted for quick revision.',
    4500,
    'Bangalore',
    'active',
    156
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'UPSC Preparation Books');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Books'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Programming Books Bundle',
    'Collection of tech books - Clean Code, Design Patterns, JavaScript: The Good Parts, Python Crash Course. Perfect for developers. Mint condition.',
    2800,
    'Hyderabad',
    'active',
    89
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Programming Books Bundle');

-- VERIFY: Show count
SELECT 'Posts updated/added. Total active posts: ' || COUNT(*) AS status FROM posts WHERE status = 'active';
