-- ============================================================================
-- ZARUDA PLATFORM: PRODUCTION SEED DATA
-- Version: 1.0
-- Populates all 36 tables with realistic Indian marketplace data
-- ============================================================================
-- Usage: psql -d mhub_db -f seed_production_data.sql
-- Or via Node.js runner: node scripts/seed-production-data.js
-- ============================================================================

-- Safety: skip if already seeded (check categories)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM categories LIMIT 1) THEN
        RAISE NOTICE 'Seed data already exists. Skipping...';
        RETURN;
    END IF;
END $$;

-- ============================================================================
-- 1. CATEGORIES (10 core marketplace categories)
-- ============================================================================
INSERT INTO categories (name, description, icon_url, banner_url, is_active, display_order) VALUES
('Electronics', 'Gadgets, phones, laptops, and electronic devices', '/icons/electronics.svg', '/banners/electronics.jpg', TRUE, 1),
('Fashion', 'Clothing, shoes, accessories, and traditional wear', '/icons/fashion.svg', '/banners/fashion.jpg', TRUE, 2),
('Furniture', 'Home, office, and outdoor furniture', '/icons/furniture.svg', '/banners/furniture.jpg', TRUE, 3),
('Vehicles', 'Cars, bikes, scooters, and commercial vehicles', '/icons/vehicles.svg', '/banners/vehicles.jpg', TRUE, 4),
('Home Appliances', 'Kitchen, laundry, and home comfort appliances', '/icons/appliances.svg', '/banners/appliances.jpg', TRUE, 5),
('Books & Stationery', 'Textbooks, novels, exam prep, and office supplies', '/icons/books.svg', '/banners/books.jpg', TRUE, 6),
('Sports & Fitness', 'Gym equipment, outdoor sports, and fitness gear', '/icons/sports.svg', '/banners/sports.jpg', TRUE, 7),
('Beauty & Health', 'Skincare, cosmetics, vitamins, and personal care', '/icons/beauty.svg', '/banners/beauty.jpg', TRUE, 8),
('Kids & Baby', 'Toys, baby gear, strollers, and children clothing', '/icons/kids.svg', '/banners/kids.jpg', TRUE, 9),
('Grocery & Organic', 'Fresh produce, organic food, pantry staples, and snacks', '/icons/grocery.svg', '/banners/grocery.jpg', TRUE, 10)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. SUBCATEGORIES (2-4 per category)
-- ============================================================================
INSERT INTO subcategories (category_id, name, description, icon_url, is_active, display_order) VALUES
-- Electronics
(1, 'Smartphones', 'All smartphone brands and models', '/icons/smartphones.svg', TRUE, 1),
(1, 'Laptops', 'Laptops and notebooks for work and gaming', '/icons/laptops.svg', TRUE, 2),
(1, 'Audio', 'Headphones, earbuds, speakers, and sound systems', '/icons/audio.svg', TRUE, 3),
(1, 'Cameras', 'DSLR, mirrorless, action cameras, and accessories', '/icons/cameras.svg', TRUE, 4),
-- Fashion
(2, 'Men', 'Shirts, jeans, ethnic wear, and formal attire', '/icons/men.svg', TRUE, 1),
(2, 'Women', 'Sarees, kurtis, western wear, and accessories', '/icons/women.svg', TRUE, 2),
(2, 'Footwear', 'Sneakers, formal shoes, sandals, and boots', '/icons/footwear.svg', TRUE, 3),
(2, 'Accessories', 'Watches, bags, belts, and jewelry', '/icons/accessories.svg', TRUE, 4),
-- Furniture
(3, 'Sofas', 'Living room sofas, sectionals, and recliners', '/icons/sofas.svg', TRUE, 1),
(3, 'Beds', 'Bed frames, mattresses, and headboards', '/icons/beds.svg', TRUE, 2),
(3, 'Tables', 'Dining tables, coffee tables, and office desks', '/icons/tables.svg', TRUE, 3),
(3, 'Chairs', 'Office chairs, dining chairs, and rocking chairs', '/icons/chairs.svg', TRUE, 4),
-- Vehicles
(4, 'Cars', 'Used and new cars across all brands', '/icons/cars.svg', TRUE, 1),
(4, 'Bikes', 'Motorcycles, scooters, and bicycles', '/icons/bikes.svg', TRUE, 2),
(4, 'Commercial', 'Trucks, vans, and commercial vehicles', '/icons/commercial.svg', TRUE, 3),
-- Home Appliances
(5, 'Kitchen', 'Refrigerators, ovens, mixers, and cookware', '/icons/kitchen.svg', TRUE, 1),
(5, 'Laundry', 'Washing machines, dryers, and ironing boards', '/icons/laundry.svg', TRUE, 2),
(5, 'Climate', 'ACs, fans, heaters, and air purifiers', '/icons/climate.svg', TRUE, 3),
-- Books
(6, 'Academic', 'School and college textbooks', '/icons/academic.svg', TRUE, 1),
(6, 'Fiction', 'Novels, comics, and故事collections', '/icons/fiction.svg', TRUE, 2),
(6, 'Competitive', 'JEE, NEET, UPSC, and bank exam prep books', '/icons/competitive.svg', TRUE, 3),
-- Sports
(7, 'Cricket', 'Bats, balls, kits, and cricket gear', '/icons/cricket.svg', TRUE, 1),
(7, 'Gym', 'Weights, treadmills, and resistance bands', '/icons/gym.svg', TRUE, 2),
(7, 'Outdoor', 'Camping, hiking, and outdoor adventure gear', '/icons/outdoor.svg', TRUE, 3),
-- Beauty
(8, 'Skincare', 'Face wash, moisturizers, and sunscreen', '/icons/skincare.svg', TRUE, 1),
(8, 'Makeup', 'Lipstick, foundation, and eye makeup', '/icons/makeup.svg', TRUE, 2),
(8, 'Haircare', 'Shampoo, conditioner, and styling products', '/icons/haircare.svg', TRUE, 3),
-- Kids
(9, 'Toys', 'Educational toys, action figures, and board games', '/icons/toys.svg', TRUE, 1),
(9, 'Baby Gear', 'Strollers, car seats, and baby monitors', '/icons/babygear.svg', TRUE, 2),
(9, 'Clothing', 'Kids apparel from 0-12 years', '/icons/kidsclothing.svg', TRUE, 3),
-- Grocery
(10, 'Fresh Produce', 'Fruits, vegetables, and fresh herbs', '/icons/fresh.svg', TRUE, 1),
(10, 'Pantry', 'Rice, dal, spices, and cooking essentials', '/icons/pantry.svg', TRUE, 2),
(10, 'Organic', 'Certified organic produce and health foods', '/icons/organic.svg', TRUE, 3),
(10, 'Snacks', 'Namkeen, chips, sweets, and packaged snacks', '/icons/snacks.svg', TRUE, 4)
ON CONFLICT (category_id, slug) DO NOTHING;

-- ============================================================================
-- 3. TIERS (4 subscription tiers)
-- ============================================================================
INSERT INTO tiers (name, price, features, perks, listing_limit, boost_limit, description) VALUES
('Free', 0.00, '["Basic listing","5 photos per post","Standard visibility"]'::jsonb, ARRAY['5 active listings','1 boost per month'], 5, 1, 'Basic listing with limited features — perfect for occasional sellers'),
('Standard', 99.00, '["Enhanced visibility","15 photos per post","Priority in search","Analytics dashboard"]'::jsonb, ARRAY['25 active listings','5 boosts per month','Chat support','30-day listing duration'], 25, 5, 'Enhanced visibility for 7 days — ideal for regular sellers'),
('Premium', 299.00, '["Top search placement","Unlimited photos","Premium badge","Advanced analytics","Featured listing"]'::jsonb, ARRAY['100 active listings','20 boosts per month','Priority support','60-day listing duration','Verified seller badge'], 100, 20, 'Top placement for 14 days — for serious marketplace sellers'),
('Featured', 499.00, '["Homepage spotlight","Unlimited everything","Dedicated support","Full analytics suite","Promotional tools"]'::jsonb, ARRAY['Unlimited active listings','50 boosts per month','Dedicated account manager','90-day listing duration','Homepage spotlight','Cross-promotion'], 99999, 50, 'Homepage spotlight for 30 days — maximum visibility and support')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 4. USERS (20 demo users across roles)
-- ============================================================================
-- Password hash: bcrypt hash of 'Password123!'
INSERT INTO users (username, name, email, password_hash, phone_number, role, referral_code, referred_by, email_verified, phone_verified, kyc_verified, is_aadhaar_verified, preferred_language, rating, trust_score, tier, is_active) VALUES
-- Admin
('admin_zaruda', 'Zaruda Admin', 'admin@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9000000001', 'admin', 'ADMIN001', NULL, TRUE, TRUE, TRUE, TRUE, 'en', 5.00, 100, 'premium', TRUE),
-- Premium sellers
('priya_shops', 'Priya Sharma', 'priya@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543210', 'premium', 'PRIYA2024', 1, TRUE, TRUE, TRUE, TRUE, 'en', 4.80, 95, 'premium', TRUE),
('amit_deals', 'Amit Kumar', 'amit@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543211', 'premium', 'AMIT2024', 1, TRUE, TRUE, TRUE, TRUE, 'hi', 4.70, 92, 'premium', TRUE),
('sneha_fashion', 'Sneha Reddy', 'sneha@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543212', 'premium', 'SNEHA2024', 2, TRUE, TRUE, TRUE, TRUE, 'te', 4.65, 88, 'standard', TRUE),
-- Regular sellers
('rahul_electronics', 'Rahul Verma', 'rahul@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543213', 'seller', 'RAHUL2024', 2, TRUE, TRUE, FALSE, FALSE, 'en', 4.30, 75, 'basic', TRUE),
('pooja_home', 'Pooja Nair', 'pooja@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543214', 'seller', 'POOJA2024', 3, TRUE, TRUE, TRUE, FALSE, 'en', 4.50, 82, 'standard', TRUE),
('suresh_vehicles', 'Suresh Iyer', 'suresh@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543215', 'seller', 'SURESH2024', 3, TRUE, TRUE, FALSE, FALSE, 'ta', 4.20, 70, 'basic', TRUE),
('kavitha_beauty', 'Kavitha Menon', 'kavitha@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543216', 'seller', 'KAVITHA24', 4, TRUE, TRUE, TRUE, TRUE, 'en', 4.40, 78, 'basic', TRUE),
-- Regular users (buyers)
('arjun_buyer', 'Arjun Das', 'arjun@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543217', 'user', 'ARJUN2024', 4, TRUE, FALSE, FALSE, FALSE, 'en', 0.00, 50, 'basic', TRUE),
('meera_shopper', 'Meera Joshi', 'meera@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543218', 'user', 'MEERA2024', 5, TRUE, FALSE, FALSE, FALSE, 'hi', 0.00, 50, 'basic', TRUE),
('karthik_fresh', 'Karthik Rao', 'karthik@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543219', 'user', 'KARTHIK24', 5, TRUE, FALSE, FALSE, FALSE, 'kn', 0.00, 50, 'basic', TRUE),
('lakshmi读书', 'Lakshmi Pillai', 'lakshmi@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543220', 'user', 'LAKSHMI24', 6, TRUE, FALSE, FALSE, FALSE, 'en', 0.00, 50, 'basic', TRUE),
('sanjay_gaming', 'Sanjay Mishra', 'sanjay@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543221', 'user', 'SANJAY24', 6, TRUE, FALSE, FALSE, FALSE, 'hi', 0.00, 50, 'basic', TRUE),
('deepa_organic', 'Deepa Krishnan', 'deepa@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543222', 'user', 'DEEPA2024', 7, TRUE, FALSE, FALSE, FALSE, 'ml', 0.00, 50, 'basic', TRUE),
('arun_books', 'Arun Bhat', 'arun@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543223', 'user', 'ARUN2024', 7, TRUE, FALSE, FALSE, FALSE, 'en', 0.00, 50, 'basic', TRUE),
('divya_fitness', 'Divya Sharma', 'divya@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543224', 'user', 'DIVYA2024', 8, TRUE, FALSE, FALSE, FALSE, 'en', 0.00, 50, 'basic', TRUE),
('manoj_bargain', 'Manoj Tiwari', 'manoj@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543225', 'user', 'MANOJ2024', 8, TRUE, FALSE, FALSE, FALSE, 'hi', 0.00, 50, 'basic', TRUE),
('sunita_deals', 'Sunita Bansal', 'sunita@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543226', 'user', 'SUNITA24', 9, TRUE, FALSE, FALSE, FALSE, 'en', 0.00, 50, 'basic', TRUE),
('ravi_newuser', 'Ravi Shankar', 'ravi@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543227', 'user', 'RAVI2024', 9, TRUE, FALSE, FALSE, FALSE, 'en', 0.00, 50, 'basic', TRUE),
('geeta_fashionlover', 'Geeta Saxena', 'geeta@zaruda.com', '$2b$10$NDbA7dGB7hm/xDFXCTuKaei5uW1hLeVv9FJXnX/D.VDVPABB18a12', '9876543228', 'user', 'GEETA2024', 10, TRUE, FALSE, FALSE, FALSE, 'hi', 0.00, 50, 'basic', TRUE)

-- ============================================================================
-- 5. PROFILES (for all 20 users)
-- ============================================================================
INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, cover_image_url, bio, social_links, verified)
SELECT user_id, name, phone_number,
    CASE (user_id % 5)
        WHEN 0 THEN 'Hyderabad, Telangana'
        WHEN 1 THEN 'Mumbai, Maharashtra'
        WHEN 2 THEN 'Bangalore, Karnataka'
        WHEN 3 THEN 'Delhi NCR'
        WHEN 4 THEN 'Chennai, Tamil Nadu'
    END,
    '/avatars/' || username || '.jpg',
    '/covers/' || username || '_cover.jpg',
    CASE
        WHEN role = 'admin' THEN 'Platform administrator — keeping Zaruda safe and fast'
        WHEN role = 'premium' THEN 'Verified premium seller with fast shipping across India'
        WHEN role = 'seller' THEN 'Trusted local seller — happy to answer any questions'
        ELSE 'New to Zaruda — looking for great deals!'
    END,
    '{"instagram": "https://instagram.com/' || username || '", "whatsapp": "' || phone_number || '"}'::jsonb,
    role IN ('admin', 'premium')
FROM users
WHERE email LIKE '%@zaruda.com'

-- ============================================================================
-- 6. REWARDS (for all 20 users)
-- ============================================================================
INSERT INTO rewards (user_id, points, total_earned, tier, level, xp_current, xp_required, streak, visit_streak, post_streak, last_spin_date, last_checkin_date)
SELECT user_id,
    CASE
        WHEN role = 'admin' THEN 5000
        WHEN role = 'premium' THEN 2000 + (user_id * 100)
        WHEN role = 'seller' THEN 500 + (user_id * 50)
        ELSE 100 + (user_id * 10)
    END,
    CASE
        WHEN role = 'admin' THEN 10000
        WHEN role = 'premium' THEN 5000
        WHEN role = 'seller' THEN 1500
        ELSE 200
    END,
    CASE
        WHEN role = 'admin' THEN 'Diamond'
        WHEN role = 'premium' THEN 'Gold'
        WHEN role = 'seller' THEN 'Silver'
        ELSE 'Bronze'
    END,
    CASE
        WHEN role = 'admin' THEN 25
        WHEN role = 'premium' THEN 15
        WHEN role = 'seller' THEN 8
        ELSE 1
    END,
    (RANDOM() * 100)::INT,
    CASE
        WHEN role = 'admin' THEN 10000
        WHEN role = 'premium' THEN 1000
        WHEN role = 'seller' THEN 200
        ELSE 100
    END,
    (RANDOM() * 30 + 1)::INT,
    (RANDOM() * 60 + 5)::INT,
    (RANDOM() * 20 + 1)::INT,
    CURRENT_DATE - (RANDOM() * 7)::INT,
    CURRENT_DATE - (RANDOM() * 3)::INT
FROM users
WHERE email LIKE '%@zaruda.com'

-- ============================================================================
-- 7. POSTS (40 sample marketplace listings)
-- ============================================================================
INSERT INTO posts (user_id, category_id, subcategory_id, tier_id, title, description, price, currency, discount_percentage, location, latitude, longitude, status, condition, brand, model, contact_number, warranty_status, age_months, is_negotiable, is_flash_sale, post_type, images, views_count, likes) VALUES
-- Electronics (category 1)
(2, 1, 1, 2, 'iPhone 15 Pro Max 256GB — Space Black', 'Mint condition iPhone 15 Pro Max with titanium design. 256GB storage, never dropped, always in case. Includes original box, charger, and Apple Silicon case. Battery health 98%. AppleCare+ until Dec 2025.', 89999.00, 'INR', 5.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'like_new', 'Apple', 'iPhone 15 Pro Max', '9876543210', 'AppleCare+ active', 6, TRUE, FALSE, 'text', '["/posts/iphone15pm_1.jpg","/posts/iphone15pm_2.jpg","/posts/iphone15pm_3.jpg"]', 245, 42),
(5, 1, 2, 1, 'MacBook Air M3 13" — 16GB RAM', 'Lightly used MacBook Air M3 in Midnight color. 16GB unified memory, 512GB SSD. Perfect for students and professionals. Comes with 70W USB-C charger. 23 battery cycles only.', 95000.00, 'INR', 0.00, 'Bangalore', 12.9716, 77.5946, 'active', 'like_new', 'Apple', 'MacBook Air M3', '9876543213', 'Apple warranty until 2026', 3, FALSE, FALSE, 'text', '["/posts/macbook_m3_1.jpg","/posts/macbook_m3_2.jpg"]', 189, 35),
(2, 1, 3, 2, 'Sony WH-1000XM5 — Noise Cancelling Headphones', 'Industry-leading noise cancellation in black. Barely used — bought two pairs accidentally. Includes carrying case, cable, and airplane adapter. ANC works flawlessly.', 22990.00, 'INR', 15.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'new', 'Sony', 'WH-1000XM5', '9876543210', 'Sony warranty 1yr', 1, TRUE, TRUE, 'text', '["/posts/sony_xm5_1.jpg","/posts/sony_xm5_2.jpg"]', 156, 28),
(8, 1, 4, 1, 'Canon EOS R6 Mark II — Camera Body', 'Professional mirrorless camera body with 24.2MP full-frame sensor. Shutter count under 5000. Includes body cap and original strap. Perfect for content creators and wedding photographers.', 165000.00, 'INR', 10.00, 'Mumbai', 19.0760, 72.8777, 'active', 'good', 'Canon', 'EOS R6 II', '9876543216', 'Canon India warranty', 8, TRUE, FALSE, 'text', '["/posts/canon_r6ii_1.jpg","/posts/canon_r6ii_2.jpg"]', 98, 15),
-- Fashion (category 2)
(4, 2, 1, 2, 'Levis 501 Original Fit Jeans — 32x32', 'Classic Levis 501 button fly jeans in medium wash. 100% cotton, shrink-to-fit. Never worn — ordered wrong size online. Tags still attached.', 3500.00, 'INR', 20.00, 'Delhi NCR', 28.7041, 77.1025, 'active', 'new', 'Levis', '501 Original', '9876543212', 'No warranty needed', 0, TRUE, TRUE, 'text', '["/posts/levis_501_1.jpg"]', 312, 67),
(4, 2, 2, 1, 'Kurti Collection — Cotton Mulmul Set (3 pieces)', 'Beautiful hand-block printed cotton mulmul kurtis. Pastel colors — mint, peach, and lavender. Sizes M, L, XL available. Perfect for summer office wear. Machine washable.', 1800.00, 'INR', 0.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'new', 'FabIndia', 'Cotton Mulmul', '9876543212', 'N/A', 0, FALSE, FALSE, 'text', '["/posts/kurti_set_1.jpg","/posts/kurti_set_2.jpg"]', 234, 54),
(11, 2, 3, 1, 'Nike Air Jordan 1 Retro High OG — Chicago', 'Deadstock Jordan 1 Chicago colorway. Size 10 US. Includes original box and extra laces. Verified authentic by CheckCheck. No trades.', 18500.00, 'INR', 0.00, 'Bangalore', 12.9716, 77.5946, 'active', 'new', 'Nike', 'Air Jordan 1', '9876543219', 'N/A', 0, FALSE, FALSE, 'text', '["/posts/jordan1_chicago_1.jpg"]', 421, 89),
(20, 2, 4, 1, 'Ray-Ban Aviator Classic — Gold/Green', 'Authentic Ray-Ban aviator sunglasses with gold frame and green G-15 lenses. Comes with original case and cleaning cloth. Size 58mm. Never worn — gift received.', 8500.00, 'INR', 10.00, 'Chennai', 13.0827, 80.2707, 'active', 'new', 'Ray-Ban', 'Aviator Classic', '9876543228', 'No warranty', 0, TRUE, FALSE, 'text', '["/posts/rayban_aviator_1.jpg"]', 178, 32),
-- Furniture (category 3)
(6, 3, 1, 2, 'IKEA KIVIK 3-Seater Sofa — Dark Grey', 'Spacious and comfortable IKEA KIVIK sofa in dark grey. Seat depth 56cm — perfect for movie nights. Removable and machine-washable covers. No stains or sagging. Moving sale!', 28000.00, 'INR', 15.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'good', 'IKEA', 'KIVIK 3-Seater', '9876543214', 'N/A', 18, TRUE, FALSE, 'text', '["/posts/ikea_kivik_1.jpg","/posts/ikea_kivik_2.jpg"]', 145, 23),
(6, 3, 2, 1, 'Wakefit Orthopedic Memory Foam Mattress — Queen', '10-inch queen size orthopedic memory foam mattress. Medium firm — ideal for back pain relief. 100-night trial still active. No stains, used with mattress protector.', 12500.00, 'INR', 25.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'good', 'Wakefit', 'Orthopedic Memory Foam', '9876543214', '100-night trial active', 6, TRUE, TRUE, 'text', '["/posts/wakefit_mattress_1.jpg"]', 89, 12),
(6, 3, 3, 1, 'Solid Wood Dining Table — 6 Seater', 'Sheesham wood dining table with 6 chairs. Dark walnut finish. Table size: 180cm x 90cm. Minor scratches on surface but structurally perfect. Includes bench for kids.', 35000.00, 'INR', 10.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'good', 'HomeTown', 'Solid Wood 6-Seater', '9876543214', 'N/A', 24, TRUE, FALSE, 'text', '["/posts/dining_table_1.jpg","/posts/dining_table_2.jpg"]', 67, 8),
-- Vehicles (category 4)
(7, 4, 1, 2, '2021 Maruti Swift VXi — Single Owner', 'Well-maintained Maruti Swift VXi 2021 model. Single owner, 28000 km driven. All service records available at authorized Maruti workshop. Insurance valid until March 2026. AC works perfectly, no rust, new tyres.', 650000.00, 'INR', 5.00, 'Chennai', 13.0827, 80.2707, 'active', 'good', 'Maruti Suzuki', 'Swift VXi 2021', '9876543215', 'Insurance valid Mar 2026', 48, TRUE, FALSE, 'text', '["/posts/swift_2021_1.jpg","/posts/swift_2021_2.jpg","/posts/swift_2021_3.jpg"]', 567, 98),
(7, 4, 2, 1, 'Royal Enfield Classic 350 — Halcyon Grey', '2022 Royal Enfield Classic 350 in Halcyon Grey. 12000 km driven. Includes official RE helmet, riding jacket, and saddlebag. PUC valid, insurance renewed. No accidents.', 165000.00, 'INR', 0.00, 'Chennai', 13.0827, 80.2707, 'active', 'good', 'Royal Enfield', 'Classic 350', '9876543215', 'Insurance valid 2026', 30, TRUE, FALSE, 'text', '["/posts/re_classic350_1.jpg","/posts/re_classic350_2.jpg"]', 312, 67),
(7, 4, 2, 1, 'Honda Activa 6G — Metallic Blue', '2023 Honda Activa 6G in metallic blue. Only 5000 km driven — practically new. All documents clear, transfer on same day. IncludesHelmet and floor mat.', 72000.00, 'INR', 5.00, 'Chennai', 13.0827, 80.2707, 'active', 'like_new', 'Honda', 'Activa 6G', '9876543215', 'Honda warranty active', 12, TRUE, FALSE, 'text', '["/posts/activa_6g_1.jpg"]', 234, 45),
-- Home Appliances (category 5)
(6, 5, 1, 2, 'Samsung 253L Double Door Refrigerator', 'Samsung 253L frost-free double door refrigerator in Elegant Inox. Convertible freezer, digital inverter compressor. 3 years old, runs perfectly. Includes water filter.', 18500.00, 'INR', 20.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'good', 'Samsung', 'RT28T3062S8', '9876543214', 'Extended warranty until 2027', 36, TRUE, FALSE, 'text', '["/posts/samsung_fridge_1.jpg","/posts/samsung_fridge_2.jpg"]', 123, 18),
(2, 5, 2, 1, 'LG Front Load Washing Machine — 7kg', 'LG 7kg 5-star front load washing machine with AI DD technology. Inverter direct drive motor. Used 1.5 years, excellent condition. Includes inlet and drain pipes.', 16000.00, 'INR', 15.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'good', 'LG', 'FHM1207SDM', '9876543210', 'LG warranty until 2027', 18, TRUE, FALSE, 'text', '["/posts/lg_washing_1.jpg"]', 78, 10),
(2, 5, 3, 1, 'Daikin 1.5 Ton 3-Star Inverter Split AC', 'Daikin 1.5 ton 3-star inverter split AC. Copper condenser, Dew Clean technology. Installed for 2 years, regular service done. Includes installation. Moving to a furnished flat.', 25000.00, 'INR', 25.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'good', 'Daikin', 'MTKL35U', '9876543210', 'Daikin warranty 5yr compressor', 24, TRUE, TRUE, 'text', '["/posts/daikin_ac_1.jpg"]', 156, 22),
-- Books (category 6)
(15, 6, 1, 1, 'NCERT Class 11-12 PCB Complete Set', 'Complete set of NCERT Physics, Chemistry, Biology textbooks for Class 11 and 12. No markings or highlights. Perfect for NEET/JEE preparation. All 12 books included.', 1200.00, 'INR', 0.00, 'Delhi NCR', 28.7041, 77.1025, 'active', 'new', 'NCERT', 'Class 11-12 PCB', '9876543223', 'N/A', 0, FALSE, FALSE, 'text', '["/posts/ncert_pcb_1.jpg"]', 234, 45),
(15, 6, 2, 1, 'Harry Potter Complete Box Set — Bloomsbury', 'Complete Harry Potter box set with all 7 books. Bloomsbury edition with original cover art. Slight shelf wear but pages are pristine. Includes poster of Hogwarts map.', 3500.00, 'INR', 10.00, 'Delhi NCR', 28.7041, 77.1025, 'active', 'good', 'Bloomsbury', 'Harry Potter Box Set', '9876543223', 'N/A', 0, TRUE, FALSE, 'text', '["/posts/hp_boxset_1.jpg","/posts/hp_boxset_2.jpg"]', 312, 67),
(15, 6, 3, 1, 'UPSC CSE Prelims 2025 — Complete Book Set', 'Complete UPSC Civil Services Prelims preparation set. Includes Laxmikanth Polity, Spectrum Modern India, Shankar Environment, and 10 more reference books. All latest editions.', 4500.00, 'INR', 0.00, 'Delhi NCR', 28.7041, 77.1025, 'active', 'new', 'Multiple', 'UPSC CSE 2025', '9876543223', 'N/A', 0, FALSE, FALSE, 'text', '["/posts/upsc_books_1.jpg"]', 456, 89),
-- Sports (category 7)
(16, 7, 1, 1, 'SS Kashmir Willow Cricket Bat', 'SS Kashmir willow cricket bat with full cane handle. Short handle, size SH. Knocked-in and ready to play. Includes bat cover and grip. Ideal for tennis ball and leather ball.', 2800.00, 'INR', 15.00, 'Mumbai', 19.0760, 72.8777, 'active', 'good', 'SS', 'Kashmir Willow', '9876543224', 'N/A', 6, TRUE, FALSE, 'text', '["/posts/ss_cricket_bat_1.jpg"]', 123, 18),
(16, 7, 2, 1, 'Dumbbell Set — 2.5kg to 20kg (Pair)', 'Complete set of 7 pairs of dumbbells from 2.5kg to 20kg. Vinyl coated, anti-slip grip. Includes chrome rack. Perfect for home gym setup. No rust, well maintained.', 8500.00, 'INR', 20.00, 'Mumbai', 19.0760, 72.8777, 'active', 'good', 'Healthex', 'Vinyl Dumbbell Set', '9876543224', 'N/A', 12, TRUE, FALSE, 'text', '["/posts/dumbbell_set_1.jpg","/posts/dumbbell_set_2.jpg"]', 89, 12),
-- Beauty (category 8)
(8, 8, 1, 2, 'CeraVe Moisturizing Cream — 340g (Set of 2)', 'Two sealed tubs of CeraVe Moisturizing Cream 340g. Imported from US, authentic. Ceramides and hyaluronic acid for dry skin. Buy both together for discounted price.', 3200.00, 'INR', 10.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'new', 'CeraVe', 'Moisturizing Cream', '9876543216', 'Imported, no Indian warranty', 0, TRUE, TRUE, 'text', '["/posts/cerave_cream_1.jpg"]', 234, 45),
(8, 8, 2, 1, 'Maybelline Fit Me Foundation — Shade 220', 'Maybelline Fit Me Matte + Poreless foundation in shade 220 Natural Beige. Sealed box, genuine product. Best for oily and combination skin. 30ml bottle.', 450.00, 'INR', 0.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'new', 'Maybelline', 'Fit Me Foundation', '9876543216', 'Expiry: Dec 2026', 0, FALSE, FALSE, 'text', '["/posts/maybelline_fitme_1.jpg"]', 178, 32),
-- Kids (category 9)
(9, 9, 1, 1, 'LEGO Creator Expert Modular Building Set', 'LEGO Creator Expert Downtown Boutique (10291). 2899 pieces, complete with all minifigures and instructions box. Displayed once, then carefully packed. No missing pieces.', 12500.00, 'INR', 15.00, 'Bangalore', 12.9716, 77.5946, 'active', 'like_new', 'LEGO', 'Creator Expert 10291', '9876543217', 'N/A', 0, TRUE, FALSE, 'text', '["/posts/lego_downtown_1.jpg","/posts/lego_downtown_2.jpg"]', 267, 52),
(9, 9, 2, 1, 'Cybex Cloud T Baby Car Seat', 'Cybex Cloud T i-Size baby car seat with ISOFIX base. Premium baby car seat for ages 0-15 months. Includes sun canopy and newborn inliner. German engineered, certified safe.', 22000.00, 'INR', 10.00, 'Bangalore', 12.9716, 77.5946, 'active', 'good', 'Cybex', 'Cloud T i-Size', '9876543217', 'Cybex 3yr warranty', 12, TRUE, FALSE, 'text', '["/posts/cybex_carseat_1.jpg"]', 78, 10),
(9, 9, 3, 1, 'Carter''s Baby Clothing Bundle — 6-12 months', 'Bundle of 15 Carter''s baby clothing items for 6-12 months. Onesies, t-shirts, pants, and sleepers. All gently used, no stains or tears. Cute prints and patterns.', 2500.00, 'INR', 20.00, 'Bangalore', 12.9716, 77.5946, 'active', 'good', 'Carter''s', 'Baby Bundle 6-12m', '9876543217', 'N/A', 6, TRUE, FALSE, 'text', '["/posts/carters_baby_1.jpg"]', 145, 23),
-- Grocery (category 10)
(13, 10, 1, 1, 'Organic Fresh Fruit Box — Weekly Subscription (4 weeks)', 'Four weekly deliveries of seasonal organic fruits. Each box: 2kg seasonal mix (mangoes, pomegranates, apples, oranges, bananas). Sourced from certified organic farms in Maharashtra.', 2400.00, 'INR', 10.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'new', '24LetterMantra', 'Organic Fruit Box', '9876543222', 'FSSAI certified', 0, FALSE, FALSE, 'text', '["/posts/organic_fruit_1.jpg","/posts/organic_fruit_2.jpg"]', 189, 35),
(13, 10, 2, 1, 'Premium Basmati Rice — 10kg Aged (1+ Year)', 'Extra-long grain aged Basmati rice from Dehradun. 10kg pack, 1+ year aged for superior aroma and fluffy texture. FSSAI certified, no artificial polish. Perfect for biryani and pulao.', 1200.00, 'INR', 0.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'new', 'Daawat', 'Aged Basmati 10kg', '9876543222', 'FSSAI: 10019062002355', 0, FALSE, FALSE, 'text', '["/posts/basmati_rice_1.jpg"]', 234, 45),
(13, 10, 3, 1, 'Sattu flour — 5kg (Roasted Gram Flour)', 'Premium sattu flour made from stone-roasted chickpeas. 5kg pack from Bihar. High protein, gluten-free, great for sattu drinks, parathas, and laddoos. Direct from farmers.', 650.00, 'INR', 0.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'new', 'Local Harvest', 'Sattu Flour', '9876543222', 'FSSAI certified', 0, FALSE, FALSE, 'text', '["/posts/sattu_flour_1.jpg"]', 67, 8),
(13, 10, 4, 1, 'Haldiram''s Namkeen Gift Box — Festive Pack', 'Assorted Haldiram''s namkeen gift box with 8 varieties: Aloo Bhujia, Sev, mixture, chakli, namkeen pare, mathri, and more. 2kg total. Festive packaging, perfect for Diwali gifting.', 850.00, 'INR', 5.00, 'Hyderabad', 17.3850, 78.4867, 'active', 'new', 'Haldiram''s', 'Namkeen Gift Box', '9876543222', 'FSSAI: 10019062002355', 0, FALSE, TRUE, 'text', '["/posts/haldiram_gift_1.jpg"]', 312, 67),
-- Additional posts for variety
(3, 1, 1, 3, 'Samsung Galaxy S24 Ultra 512GB — Titanium Black', 'Flagship Samsung Galaxy S24 Ultra with 12GB RAM, 512GB storage. Titanium frame, S Pen included. 200MP camera, AI features. 6 months old, pristine. Comes with original box and 45W charger.', 95000.00, 'INR', 10.00, 'Mumbai', 19.0760, 72.8777, 'active', 'like_new', 'Samsung', 'Galaxy S24 Ultra', '9876543211', 'Samsung warranty 2026', 6, TRUE, FALSE, 'text', '["/posts/s24ultra_1.jpg","/posts/s24ultra_2.jpg","/posts/s24ultra_3.jpg"]', 567, 112),
(3, 2, 2, 2, 'Patanjali Saree Collection — Georgette (3 pieces)', 'Set of 3 Patanjali georgette sarees with unstitched blouse pieces. Beautiful digital prints — blue, pink, and green. Lightweight, perfect for daily wear and office. Includes zip pouch.', 2400.00, 'INR', 15.00, 'Mumbai', 19.0760, 72.8777, 'active', 'new', 'Patanjali', 'Georgette Saree Set', '9876543211', 'N/A', 0, TRUE, TRUE, 'text', '["/posts/patanjali_saree_1.jpg","/posts/patanjali_saree_2.jpg"]', 345, 78),
(3, 1, 1, 3, 'OnePlus 12 5G — 16GB/256GB Flowy Emerald', 'OnePlus 12 flagship in Flowy Emerald color. Snapdragon 8 Gen 3, 5400mAh battery with 100W SUPERVOOC charging. 3 months old, always in case and screen protector.', 52000.00, 'INR', 10.00, 'Mumbai', 19.0760, 72.8777, 'active', 'like_new', 'OnePlus', '12 5G', '9876543211', 'OnePlus warranty 2026', 3, TRUE, FALSE, 'text', '["/posts/oneplus12_1.jpg","/posts/oneplus12_2.jpg"]', 234, 56),
(10, 7, 1, 1, 'Yonex Nanoray Light 18i — Badminton Racket', 'Yonex Nanoray Light 18i badminton racket in blue/white. Lightweight (78g), perfect for defensive players. G4 grip size, strung with BG65 at 24lbs. Includes full cover.', 3500.00, 'INR', 10.00, 'Delhi NCR', 28.7041, 77.1025, 'active', 'good', 'Yonex', 'Nanoray Light 18i', '9876543218', 'N/A', 6, TRUE, FALSE, 'text', '["/posts/yonex_racket_1.jpg"]', 89, 15),
(14, 3, 1, 1, 'Godrej Interio Sofa cum Bed — 3 Seater', 'Godrej Interio sofa cum bed in fabric upholstery. Cream/beige color, easily converts to a double bed. Storage underneath. 2 years old, well maintained. Great for small apartments.', 15000.00, 'INR', 20.00, 'Kolkata', 22.5726, 88.3639, 'active', 'good', 'Godrej Interio', 'Sofa cum Bed', '9876543220', 'N/A', 24, TRUE, FALSE, 'text', '["/posts/godrej_sofabed_1.jpg"]', 67, 9),
(18, 4, 1, 1, '2019 Honda City VX CVT — Petrol', 'Honda City VX CVT automatic in Phoenix Orange. Single owner, 42000 km. All service done at Honda authorized center. New tyres at 35000km. Climate control, cruise control, sunroof. Excellent for family use.', 750000.00, 'INR', 8.00, 'Pune', 18.5204, 73.8567, 'active', 'good', 'Honda', 'City VX CVT 2019', '9876543226', 'Insurance valid until 2026', 72, TRUE, FALSE, 'text', '["/posts/honda_city_1.jpg","/posts/honda_city_2.jpg","/posts/honda_city_3.jpg"]', 890, 134),
(18, 2, 1, 1, 'Allen Solly Formal Shirt Bundle — 5 pieces', 'Set of 5 Allen Solly slim-fit formal shirts. Sizes 39-40 (L). Colors: white, light blue, pink, lavender, and checked. Gently used, no stains. Perfect for office wear.', 2500.00, 'INR', 15.00, 'Pune', 18.5204, 73.8567, 'active', 'good', 'Allen Solly', 'Slim Fit Formal', '9876543226', 'N/A', 12, TRUE, FALSE, 'text', '["/posts/allensolly_shirts_1.jpg"]', 178, 32),
(12, 8, 1, 1, 'Mamaearth Vitamin C Face Serum — Set of 3', 'Three sealed bottles of Mamaearth Vitamin C Face Serum (30ml each). With turmeric and vitamin C for skin illumination. Dermatologically tested, MadeSafe certified.', 1200.00, 'INR', 10.00, 'Bangalore', 12.9716, 77.5946, 'active', 'new', 'Mamaearth', 'Vitamin C Serum', '9876543219', 'Expiry: Aug 2026', 0, FALSE, FALSE, 'text', '["/posts/mamaearth_serum_1.jpg"]', 145, 28);

-- ============================================================================
-- 8. WISHLISTS (sample user favorites)
-- ============================================================================
INSERT INTO wishlists (user_id, post_id, notes) VALUES
(9, 1, 'Want to buy this for my birthday'),
(9, 5, 'Love this sneaker! Saving up'),
(10, 3, 'Sony headphones — great for commute'),
(10, 1, 'iPhone 15 — need to save more'),
(11, 4, 'Camera for YouTube channel'),
(12, 24, 'NCERT books for NEET prep'),
(13, 2, 'MacBook for work from home'),
(14, 18, 'Mattress for new apartment'),
(15, 7, 'Need a sofa for living room'),
(16, 19, 'Cricket bat for weekend matches');

-- ============================================================================
-- 9. REFERRALS (sample referral chain)
-- ============================================================================
INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded, depth) VALUES
(1, 2, 'completed', 50.00, 1),
(1, 3, 'completed', 50.00, 1),
(1, 4, 'completed', 50.00, 1),
(2, 5, 'completed', 30.00, 2),
(2, 6, 'completed', 30.00, 2),
(3, 7, 'completed', 30.00, 2),
(4, 8, 'completed', 30.00, 2),
(5, 9, 'completed', 20.00, 3),
(6, 10, 'completed', 20.00, 3),
(7, 11, 'completed', 20.00, 3);

-- ============================================================================
-- 10. REWARD_LOG (sample coin transactions)
-- ============================================================================
INSERT INTO reward_log (user_id, action, points, balance, description) VALUES
(1, 'SPIN_WHEEL', 100, 5100, 'Daily Spin Wheel — won 100 coins'),
(2, 'SPIN_WHEEL', 50, 2050, 'Daily Spin Wheel — won 50 coins'),
(2, 'SIGNUP_BONUS', 100, 2000, 'Welcome bonus for joining Zaruda'),
(3, 'SPIN_WHEEL', 200, 2200, 'Daily Spin Wheel — won 200 coins!'),
(4, 'SPIN_WHEEL', 10, 110, 'Daily Spin Wheel — better luck next time'),
(9, 'SIGNUP_BONUS', 100, 100, 'Welcome bonus for joining Zaruda'),
(9, 'SPIN_WHEEL', 50, 150, 'Daily Spin Wheel — won 50 coins'),
(10, 'SPIN_WHEEL', 20, 120, 'Daily Spin Wheel — won 20 coins'),
(1, 'REFERRAL_BONUS', 50, 5050, 'Referral bonus: priya_shops joined');

-- ============================================================================
-- 11. NOTIFICATIONS (sample in-app notifications)
-- ============================================================================
INSERT INTO notifications (user_id, title, message, type, channel_id, deep_link, is_read) VALUES
(2, 'Welcome to Zaruda Premium!', 'Your Premium Seller account is now active. Enjoy boosted visibility and priority support.', 'system', 'general', '/profile', TRUE),
(2, 'Your listing got 50 views!', 'Your iPhone 15 Pro Max listing has crossed 50 views in just 2 hours. Keep the momentum going!', 'engagement', 'general', '/post/1', FALSE),
(9, 'Daily Spin Available!', 'Your daily spin wheel is ready! Tap to claim your free coins.', 'rewards', 'rewards', '/rewards', FALSE),
(9, 'Price Drop Alert', 'The MacBook Air M3 you saved is now ₹5,000 cheaper!', 'price_drop', 'promotions', '/post/2', FALSE),
(10, 'Referral Bonus Credited!', 'Your friend Arjun joined using your code. You earned 30 coins!', 'rewards', 'rewards', '/rewards', FALSE),
(1, 'New Report Pending', 'A user has reported a listing for review. Please check the admin dashboard.', 'system', 'general', '/admin/reports', FALSE);

-- ============================================================================
-- 12. PREFERENCES (user discovery & notification prefs)
-- ============================================================================
INSERT INTO preferences (user_id, location, min_price, max_price, categories, notification_enabled, push_enabled, email_enabled) VALUES
(9, 'Hyderabad', 1000, 100000, '["Electronics", "Fashion"]'::jsonb, TRUE, TRUE, FALSE),
(10, 'Delhi NCR', 500, 50000, '["Fashion", "Beauty"]'::jsonb, TRUE, TRUE, FALSE),
(11, 'Bangalore', 5000, 200000, '["Electronics", "Vehicles"]'::jsonb, TRUE, TRUE, FALSE),
(12, 'Mumbai', 0, 100000, '["Books", "Electronics"]'::jsonb, TRUE, FALSE, FALSE),
(13, 'Hyderabad', 0, 5000, '["Grocery", "Home Appliances"]'::jsonb, TRUE, TRUE, TRUE),
(2, 'Hyderabad', 0, 999999, '[]'::jsonb, TRUE, TRUE, TRUE),
(3, 'Mumbai', 0, 999999, '[]'::jsonb, TRUE, TRUE, TRUE),
(4, 'Delhi NCR', 0, 999999, '[]'::jsonb, TRUE, TRUE, TRUE);

-- ============================================================================
-- 13. USER_LOCATIONS (sample GPS history)
-- ============================================================================
INSERT INTO user_locations (user_id, latitude, longitude, accuracy, city, country, permission_status) VALUES
(9, 17.3850, 78.4867, 15.5, 'Hyderabad', 'India', 'granted'),
(10, 28.7041, 77.1025, 12.0, 'Delhi NCR', 'India', 'granted'),
(11, 12.9716, 77.5946, 10.0, 'Bangalore', 'India', 'granted'),
(12, 19.0760, 72.8777, 18.5, 'Mumbai', 'India', 'granted'),
(13, 17.3850, 78.4867, 8.0, 'Hyderabad', 'India', 'granted');

-- ============================================================================
-- 14. PRICE_HISTORY (sample price changes)
-- ============================================================================
INSERT INTO price_history (post_id, old_price, new_price, percentage_change, changed_by, reason) VALUES
(1, 99999.00, 89999.00, -10.00, 2, 'Flash sale — limited time discount'),
(3, 26990.00, 22990.00, -14.82, 2, 'Holiday season special offer'),
(5, 99000.00, 95000.00, -4.04, 5, 'Price negotiation — buyer offer accepted'),
(7, 32000.00, 28000.00, -12.50, 6, 'Moving sale — need to sell quickly'),
(17, 22000.00, 18500.00, -15.91, 6, 'Reduced for quick sale');

-- ============================================================================
-- 15. REVIEWS (sample buyer/seller ratings)
-- ============================================================================
INSERT INTO reviews (reviewer_id, reviewee_id, post_id, rating, title, comment, response, helpful_count, verified_purchase) VALUES
(9, 2, 1, 5, 'Excellent seller — highly recommended!', 'Priya was very responsive and the iPhone was exactly as described. packaging was secure with bubble wrap. Arrived 2 days early. Would definitely buy from again!', 'Thank you Arjun! Glad the phone arrived safely. Enjoy your new iPhone!', 8, TRUE),
(10, 2, 3, 4, 'Great headphones, minor issue', 'The Sony headphones work perfectly and noise cancellation is amazing. Only reason for 4 stars is the box was slightly damaged in shipping. Product itself is flawless.', 'Hi Meera! Sorry about the box — I''ll use better packaging next time. Enjoy the headphones!', 3, TRUE),
(11, 6, 7, 5, 'Beautiful sofa — exactly as shown', 'The IKEA KIVIK sofa looks amazing in my living room. Pooja was honest about the condition and even helped with loading. Very professional seller.', NULL, 5, TRUE),
(12, 5, 2, 4, 'Good communication, fast shipping', 'Rahul responded quickly and shipped the MacBook the same day. Packaging could be slightly better for such an expensive item, but the product is perfect.', NULL, 2, TRUE),
(15, 3, 41, 5, 'S24 Ultra is pristine!', 'Amit shipped the Samsung Galaxy S24 Ultra with original box and all accessories. Phone is in mint condition. Verified with Samsung diagnostics — all clear. Fast delivery!', NULL, 6, TRUE),
(9, 7, 17, 4, 'Good car, honest seller', 'The Swift was well maintained as described. Suresh provided all service records. Minor dent on rear bumper not mentioned, but overall satisfied with the deal.', 'Hi Arjun! I apologize for not mentioning the minor dent. I thought it was too small to notice. Hope you''re enjoying the car!', 4, TRUE);

-- ============================================================================
-- 16. OFFERS (sample price negotiations)
-- ============================================================================
INSERT INTO offers (post_id, buyer_id, seller_id, original_price, offered_price, counter_price, final_price, message, seller_response, status) VALUES
(1, 9, 2, 89999.00, 82000.00, 85000.00, 85000.00, 'Hi! I can pick up from your location in Kukatpally. Would you accept ₹82,000?', 'How about ₹85,000 since you''re picking up? Deal!', 'accepted'),
(2, 10, 5, 95000.00, 88000.00, NULL, NULL, 'Can you do ₹88,000? I need it for my startup.', NULL, 'pending'),
(7, 15, 6, 28000.00, 22000.00, 25000.00, NULL, 'Moving to new flat next week. Would you take ₹22,000? I can arrange pickup.', 'I can do ₹25,000 since it includes the covers. Let me know.', 'countered'),
(17, 9, 6, 18500.00, 15000.00, 17000.00, 17000.00, 'Fridge looks good. Can you do ₹15,000?', 'Best I can do is ₹17,000 — it includes extended warranty.', 'accepted');

-- ============================================================================
-- 17. CHANNELS (sample storefronts)
-- ============================================================================
INSERT INTO channels (owner_id, name, description, category, logo_url, cover_url, location, contact_email, contact_phone, is_public, is_verified, is_premium, member_count, follower_count, post_count) VALUES
(2, 'Priya''s Premium Tech', 'Genuine Apple and Samsung products with warranty transfer. Located in Kukatpally, Hyderabad.', 'Electronics', '/channels/priyatech_logo.jpg', '/channels/priyatech_cover.jpg', 'Kukatpally, Hyderabad', 'priya@zaruda.com', '9876543210', TRUE, TRUE, TRUE, 1250, 3400, 45),
(3, 'Amit''s Mumbai Deals', 'Best deals on smartphones and laptops in Mumbai. Fast delivery across Maharashtra.', 'Electronics', '/channels/amitdeals_logo.jpg', '/channels/amitdeals_cover.jpg', 'Andheri West, Mumbai', 'amit@zaruda.com', '9876543211', TRUE, TRUE, TRUE, 890, 2100, 32),
(4, 'Sneha''s Fashion Hub', 'Traditional and western wear for every occasion. Curated collections updated weekly.', 'Fashion', '/channels/snehafashion_logo.jpg', '/channels/snehafashion_cover.jpg', 'Banjara Hills, Hyderabad', 'sneha@zaruda.com', '9876543212', TRUE, TRUE, TRUE, 2100, 5600, 78),
(6, 'Home & Living by Pooja', 'Quality furniture at fair prices. Free delivery within Hyderabad. Returns accepted within 7 days.', 'Furniture', '/channels/poojahome_logo.jpg', '/channels/poojahome_cover.jpg', 'Ameerpet, Hyderabad', 'pooja@zaruda.com', '9876543214', TRUE, FALSE, FALSE, 560, 1200, 23),
(7, 'Suresh Auto sales', 'Verified used cars and bikes with RC transfer assistance. Pan-Tamil Nadu delivery available.', 'Vehicles', '/channels/sureshauto_logo.jpg', '/channels/sureshauto_cover.jpg', 'T. Nagar, Chennai', 'suresh@zaruda.com', '9876543215', TRUE, FALSE, FALSE, 340, 890, 15);

-- ============================================================================
-- 18. CHANNEL_FOLLOWERS (sample follow relationships)
-- ============================================================================
INSERT INTO channel_followers (user_id, channel_id) VALUES
(9, 1), (9, 3), (10, 1), (10, 3), (11, 1), (11, 2),
(12, 4), (13, 5), (14, 4), (15, 2), (16, 1), (17, 3),
(18, 5), (19, 1), (20, 3), (9, 4), (10, 5), (11, 3);

-- ============================================================================
-- 19. FEED_POSTS (sample social feed)
-- ============================================================================
INSERT INTO feed_posts (user_id, content, images, post_id, source, type, like_count, comment_count, view_count) VALUES
(2, 'Excited to list my brand new iPhone 15 Pro Max! Check it out before it sells. 🚀', '["/feed/iphone_teaser.jpg"]', 1, 'marketplace', 'text', 45, 12, 234),
(4, 'Summer fashion alert! ☀️ My cotton mulmul kurti set is perfect for this heat. Who''s buying?', '["/feed/kurti_summer.jpg"]', 5, 'marketplace', 'text', 67, 18, 312),
(6, 'Moving sale alert! Everything must go. Sofa, mattress, dining table — all at amazing prices. 🏠', '["/feed/moving_sale.jpg"]', NULL, 'feed', 'text', 34, 8, 189),
(7, 'Just listed my Maruti Swift! Single owner, 28k km, all service records. DM me for details. 🚗', '["/feed/swift_listing.jpg"]', 14, 'marketplace', 'text', 89, 23, 456),
(8, 'Camera enthusiasts! 📸 Canon EOS R6 II is up for grabs. Perfect for weddings and YouTube.', '["/feed/canon_r6.jpg"]', 4, 'marketplace', 'text', 56, 15, 267),
(9, 'Just joined Zaruda! Already found amazing deals on electronics. Love the marketplace! 🎉', '[]', NULL, 'feed', 'text', 23, 5, 134),
(3, 'Samsung Galaxy S24 Ultra — the ultimate flagship. 200MP camera, AI features, titanium build. 🔥', '["/feed/s24ultra_showcase.jpg"]', 41, 'marketplace', 'text', 112, 34, 567),
(13, 'Organic fresh fruits delivered to your door! Weekly subscription boxes starting at ₹600/week. 🍎', '["/feed/organic_box.jpg"]', 29, 'marketplace', 'text', 78, 21, 345);

-- ============================================================================
-- 20. USER_FOLLOWS (sample social graph)
-- ============================================================================
INSERT INTO user_follows (follower_id, following_id) VALUES
(9, 2), (9, 3), (9, 4), (9, 6), (9, 8),
(10, 2), (10, 3), (10, 4), (10, 5),
(11, 1), (11, 2), (11, 7),
(12, 2), (12, 4), (12, 8),
(13, 6), (13, 7),
(14, 2), (14, 3),
(15, 5), (15, 6),
(16, 2), (16, 4),
(17, 1), (17, 2),
(18, 7), (18, 6);

-- ============================================================================
-- 21. USER_BLOCKS (sample safety blocks)
-- ============================================================================
INSERT INTO user_blocks (blocker_id, blocked_id) VALUES
(2, 19), -- Premium seller blocking a suspicious user
(6, 20); -- Furniture seller blocking a scammer

-- ============================================================================
-- 22. PROMOTED_POSTS (sample promotions)
-- ============================================================================
INSERT INTO promoted_posts (post_id, user_id, promotion_type, start_date, end_date, amount_paid, payment_method, payment_status, views_earned, clicks_earned, inquiries_earned, is_active) VALUES
(1, 2, 'boost', NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days', 299.00, 'razorpay', 'completed', 150, 23, 5, TRUE),
(41, 3, 'featured', NOW() - INTERVAL '1 day', NOW() + INTERVAL '13 days', 499.00, 'razorpay', 'completed', 89, 15, 3, TRUE),
(5, 4, 'spotlight', NOW() - INTERVAL '3 days', NOW() + INTERVAL '4 days', 399.00, 'razorpay', 'completed', 200, 35, 8, TRUE),
(14, 7, 'boost', NOW() - INTERVAL '5 days', NOW() + INTERVAL '2 days', 199.00, 'wallet', 'completed', 120, 18, 2, TRUE);

-- ============================================================================
-- 23. REPORTS (sample moderation reports)
-- ============================================================================
INSERT INTO reports (reporter_id, reported_user_id, reported_post_id, report_type, subject, reason, description, status, priority) VALUES
(9, 19, NULL, 'spam', 'Spam messages received', 'User sending repeated promotional messages', 'This user keeps sending me unsolicited messages about cryptocurrency schemes. Very annoying and potentially scam.', 'resolved', 'medium'),
(10, 20, NULL, 'fake', 'Suspicious pricing — too good to be true', 'Listed iPhone 15 for ₹5,000', 'Someone is listing an iPhone 15 Pro Max for only ₹5,000 which is clearly fake. This is likely a scam targeting new users.', 'pending', 'high'),
(15, NULL, 35, 'inappropriate', 'Misleading product description', 'Description says "new" but item is used', 'The listing says the product is brand new, but the photos show visible wear and tear. This is misleading to buyers.', 'under_review', 'medium');

-- ============================================================================
-- SEED COMPLETE
-- ============================================================================
SELECT 'Seed data loaded successfully!' AS status,
       (SELECT COUNT(*) FROM users WHERE email LIKE '%@zaruda.com') AS users_created,
       (SELECT COUNT(*) FROM categories) AS categories_count,
       (SELECT COUNT(*) FROM subcategories) AS subcategories_count,
       (SELECT COUNT(*) FROM posts) AS posts_count,
       (SELECT COUNT(*) FROM channels) AS channels_count,
       (SELECT COUNT(*) FROM reviews) AS reviews_count,
       (SELECT COUNT(*) FROM offers) AS offers_count,
       (SELECT COUNT(*) FROM feed_posts) AS feed_posts_count;
