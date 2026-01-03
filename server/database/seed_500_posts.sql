-- =====================================================
-- MHUB SEED 500 POSTS - High Volume Seeding Script
-- Run this to add 500+ realistic posts for testing
-- Execute in your PostgreSQL client (pgAdmin, psql, etc.)
-- =====================================================

-- ===========================================
-- PERFORMANCE INDEXES FOR HIGH SCALE
-- These are CRITICAL for 1 lakh+ concurrent users
-- ===========================================
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_active_score 
  ON posts(status, created_at DESC, views_count ASC) 
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_active_freshness 
  ON posts(created_at DESC) 
  WHERE status = 'active' AND created_at > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_posts_guaranteed_reach 
  ON posts(user_id, category_id, views_count, created_at DESC) 
  WHERE status = 'active';

-- ===========================================
-- ADD 500 REALISTIC POSTS
-- ===========================================
DO $$
DECLARE
    i INTEGER;
    v_user_id INTEGER;
    v_cat_id INTEGER;
    v_tier_id INTEGER;
    v_title TEXT;
    v_desc TEXT;
    v_price NUMERIC;
    v_location TEXT;
    v_condition TEXT;
    v_views INTEGER;
    v_created_at TIMESTAMP;
    
    -- Realistic product titles by category
    electronics_titles TEXT[] := ARRAY[
        'iPhone 15 Pro 256GB Deep Purple - Mint Condition',
        'Samsung Galaxy S24 Ultra 512GB Titanium Black',
        'MacBook Air M3 15" 16GB RAM Space Gray',
        'Sony WH-1000XM5 Wireless Headphones Silver',
        'Apple Watch Ultra 2 49mm Titanium Orange',
        'iPad Pro 12.9" M2 Chip 256GB WiFi+Cellular',
        'Dell XPS 15 OLED i9 32GB RAM 1TB SSD',
        'Bose QuietComfort Ultra Earbuds White Smoke',
        'LG C3 65" OLED 4K Smart TV with Dolby Vision',
        'Canon EOS R6 Mark II Full Frame Mirrorless',
        'DJI Mini 4 Pro Drone with RC 2 Controller',
        'Nintendo Switch OLED Model White Edition',
        'PlayStation 5 Disc Edition with Controller',
        'Xbox Series X 1TB Console Bundle',
        'Apple AirPods Pro 2nd Gen USB-C',
        'Samsung Galaxy Buds FE Graphite',
        'JBL Flip 6 Portable Bluetooth Speaker',
        'Kindle Paperwhite 11th Gen 16GB',
        'GoPro Hero 12 Black Action Camera',
        'Logitech MX Master 3S Wireless Mouse'
    ];
    
    mobiles_titles TEXT[] := ARRAY[
        'OnePlus 12 16GB RAM 512GB Storage Flowy Emerald',
        'Google Pixel 8 Pro 256GB Bay Blue',
        'Xiaomi 14 Pro 12GB RAM Ceramic White',
        'Vivo X100 Pro 16GB 512GB Asteroid Black',
        'Oppo Find X7 Ultra 16GB Photography King',
        'Realme GT 5 Pro 256GB Racing Yellow',
        'Nothing Phone 2 256GB Dark Grey',
        'Motorola Edge 50 Pro 12GB Moonlight Pearl',
        'Samsung Galaxy Z Fold5 512GB Phantom Black',
        'Samsung Galaxy Z Flip5 256GB Mint Green',
        'iPhone 14 Plus 256GB Purple - Like New',
        'iPhone SE 3rd Gen 128GB Starlight',
        'Redmi Note 13 Pro+ 5G 256GB',
        'Poco X6 Pro 12GB 512GB Yellow',
        'iQOO 12 16GB Legend Edition',
        'Honor Magic6 Pro 512GB Epic Green',
        'Asus ROG Phone 8 Pro 24GB Gaming Beast',
        'Samsung Galaxy A55 5G 256GB Awesome Navy',
        'Moto G84 5G 256GB Marshmallow Blue',
        'Infinix Zero 30 5G Vegan Leather Edition'
    ];
    
    fashion_titles TEXT[] := ARRAY[
        'Nike Air Jordan 1 Retro High OG Chicago - Size 10',
        'Adidas Ultraboost 23 Running Shoes Cloud White',
        'Levis 501 Original Fit Jeans Medium Stonewash',
        'Ray-Ban Aviator Classic Gold Frame Green Lens',
        'Gucci Marmont Small Shoulder Bag Black Leather',
        'Zara Oversized Double-Breasted Blazer Black',
        'H&M Premium Quality Linen Shirt White',
        'Fossil Grant Chronograph Watch Brown Leather',
        'Michael Kors Jet Set Travel Tote Navy Blue',
        'Tommy Hilfiger Classic Polo Shirt Navy',
        'Woodland Genuine Leather Wallet Brown',
        'Van Heusen Premium Cotton Formal Shirt',
        'Puma RS-X Toys Sneakers White Red Blue',
        'Casio G-Shock GA-2100 CasiOak Black',
        'Calvin Klein Eternity Perfume 100ml',
        'Sabyasachi Designer Saree Banarasi Silk',
        'Louis Philippe Slim Fit Formal Trousers',
        'Bata Red Label Leather Formal Shoes',
        'Fabindia Handloom Cotton Kurta Set',
        'Monte Carlo Woolen Sweater Navy Blue'
    ];
    
    furniture_titles TEXT[] := ARRAY[
        'Godrej Interio Executive Office Chair Ergonomic',
        'IKEA MALM King Size Bed Frame White Oak',
        'Urban Ladder Rhodes 3-Seater Fabric Sofa Grey',
        'Nilkamal Novella Series Plastic Chair Set of 4',
        'Wooden Street Sheesham Wood Dining Table 6-Seater',
        'Pepperfry Munich TV Unit Contemporary Design',
        'Flipkart Perfect Homes Engineered Wood Study Desk',
        'HomeTown Stylish Center Table Walnut Finish',
        'Durian Daisy Diwan Cum Bed with Storage',
        'Sleepwell Ortho Pro Spring Mattress King Size',
        'Kurlon Klassic Bonnell Spring Mattress Queen',
        'Usha Lexus Premium Ceiling Fan Ivory',
        'Symphony Diet 35i Tower Air Cooler 35L',
        'Philips Essential LED Bulb 12W Pack of 6',
        'Havells Festiva Decorative Wall Fan 400mm',
        'Godrej Aer Twist Car Perfume Fresh Lush Green',
        'Asian Paints Royale Glitz Emulsion 20L White',
        'Berger Silk Glamor Shyne Paint 4L Sky Blue',
        'Century Plywood BWP Grade 19mm 8x4',
        'Fevicol SH Synthetic Resin Adhesive 5kg'
    ];
    
    vehicles_titles TEXT[] := ARRAY[
        'Royal Enfield Classic 350 Chrome Red 2023',
        'Honda Activa 6G DLX Anniversary Edition',
        'TVS Jupiter 125 SmartXonnect Starlight Blue',
        'Bajaj Pulsar NS200 ABS Racing Red 2024',
        'KTM Duke 390 Orange Metallic First Owner',
        'Yamaha R15 V4 Monster Energy Edition',
        'Hero Splendor Plus XTEC Self Start',
        'Ola S1 Pro Electric Scooter Coral Glam',
        'Ather 450X Gen 3 Electric Scooter Space Grey',
        'Maruti Suzuki Swift ZXi AMT Sizzling Red',
        'Hyundai i20 Asta 1.0 Turbo DCT Starry Night',
        'Tata Nexon EV Max XZ+ Pristine White',
        'Mahindra XUV700 AX7 L Diesel AWD',
        'Toyota Fortuner Legender 4x4 White Pearl',
        'Honda City e:HEV ZX Hybrid 2023',
        'Kia Seltos HTX Plus Diesel Intense Red',
        'MG Hector Sharp Pro Aurora Silver',
        'Volkswagen Virtus GT Plus 1.5 TSI',
        'Skoda Slavia Style 1.5 TSI Candy White',
        'Renault Kiger RXT Turbo CVT Radiant Red'
    ];
    
    books_titles TEXT[] := ARRAY[
        'Complete NCERT Set Class 11-12 Science Stream',
        'Harry Potter Complete Collection Box Set New',
        'The Psychology of Money by Morgan Housel',
        'Atomic Habits by James Clear Hardcover',
        'Engineering Mathematics by BS Grewal Latest',
        'Gate 2024 Preparation Books Full Set CSE',
        'UPSC Civil Services Prelims Guide Complete',
        'CA Foundation Study Material Full Set',
        'Medical NEET Preparation Books Combo',
        'Sapiens by Yuval Noah Harari Paperback',
        'Rich Dad Poor Dad 25th Anniversary Edition',
        'The Alchemist by Paulo Coelho Special Edition',
        'Data Structures and Algorithms in Python',
        'Machine Learning with Python Complete Guide',
        'Complete Works of Rabindranath Tagore',
        'Bhagavad Gita As It Is Full Color Edition',
        'Chanakya Neeti Original Sanskrit with Hindi',
        'NEET Biology 33 Years Chapterwise Solved',
        'JEE Advanced 41 Years Physics Chemistry Math',
        'SSC CGL Complete Preparation Set 2024'
    ];
    
    sports_titles TEXT[] := ARRAY[
        'Yonex Astrox 99 Pro Badminton Racket Cherry',
        'MRF Grand Edition English Willow Cricket Bat',
        'Nivia Storm Football FIFA Quality Pro Size 5',
        'Cosco Dura Bounce Basketball Size 7 Official',
        'Stiga Pro Carbon Table Tennis Racket ITTF',
        'Wilson Pro Staff RF97 Tennis Racket',
        'SS Ton Cricket Kit Complete Set Adult',
        'Nike Mercurial Superfly 9 Elite Football Boots',
        'Adidas Predator Edge+ FG Soccer Cleats',
        'Decathlon Btwin Rockrider MTB Bicycle 27.5',
        'Hero Sprint Growler 26T Mountain Bike',
        'Yoga Mat 6mm Premium TPE Anti-Slip Purple',
        'Powermax Fitness Treadmill 4HP Auto Incline',
        'Dumbbell Set 30kg Chrome Steel Adjustable',
        'Pull Up Bar Doorway No Screws Required',
        'Resistance Bands Set of 5 Latex Loop',
        'Boxing Gloves Everlast Pro 12oz Black',
        'Foam Roller 45cm High Density Muscle Release',
        'Kettlebell 16kg Cast Iron Competition',
        'Swimming Goggles Speedo Fastskin Pure Focus'
    ];
    
    appliances_titles TEXT[] := ARRAY[
        'LG 1.5 Ton 5 Star AI Dual Inverter Split AC',
        'Samsung 653L Side by Side Smart Refrigerator',
        'IFB 8kg 5 Star AI Steam Front Load Washing',
        'Dyson V15 Detect Absolute Cordless Vacuum',
        'Philips 3000 Series Air Purifier HEPA Filter',
        'Havells Instanio Prime Water Heater 25L',
        'Prestige IRIS 750W Mixer Grinder 4 Jars',
        'Butterfly Smart Glass 3 Burner Gas Stove',
        'Pigeon Acer Plus Induction Cooktop 1800W',
        'Kent Supreme RO+UV+UF Water Purifier 8L',
        'Eureka Forbes Quick Clean DX Vacuum 1200W',
        'LG 32L Convection Microwave Oven Charcoal',
        'Philips Daily Collection Toaster 2 Slot',
        'Bajaj Majesty ICX 7 750W Induction Cooktop',
        'Morphy Richards OTG 52L Digital Display',
        'Usha 3 Litre Instant Water Heater',
        'Whirlpool 7.5 Kg Semi-Automatic Top Load',
        'Voltas 1.5 Ton 3 Star Window AC 2024',
        'Crompton Desert Cooler Optimus 65L',
        'Orient Electric Stand Fan 400mm Pedestal'
    ];
    
    beauty_titles TEXT[] := ARRAY[
        'Maybelline New York Fit Me Foundation 230',
        'MAC Ruby Woo Lipstick Retro Matte Red',
        'Forest Essentials Facial Ubtan Narangi Nagkesar',
        'Lakme 9to5 Primer + Matte Powder Foundation',
        'LOreal Paris Total Repair 5 Shampoo 1L',
        'The Body Shop Tea Tree Face Wash 250ml',
        'Biotique Bio Aloe Vera Face Pack 85g',
        'Nykaa Eyes On Me 4in1 Quad Eyeshadow Palette',
        'Colorbar Velvet Matte Lipstick Passion 082V',
        'Plum Green Tea Oil Free Moisturizer 50ml',
        'Mamaearth Vitamin C Face Serum 30ml',
        'WOW Skin Science Onion Hair Oil 200ml',
        'Himalaya Herbals Neem Face Wash 200ml',
        'Nivea Soft Light Moisturizer Cream 300ml',
        'Garnier Micellar Cleansing Water 125ml',
        'Philips BHH880 Hair Straightener Brush',
        'Dyson Supersonic Hair Dryer Fuchsia',
        'Braun Silk Expert Pro 5 IPL Device',
        'Park Avenue Cool Blue Deo Pack of 3',
        'Fogg Scent Intense Oud EDP for Men 100ml'
    ];
    
    kids_titles TEXT[] := ARRAY[
        'LEGO Technic Lamborghini Sían 42115',
        'Hot Wheels Ultimate Garage Plus 140 Cars',
        'Barbie Dreamhouse with Pool and Slide 2024',
        'Fisher Price Laugh & Learn Smart Stages Chair',
        'Funskool Monopoly Classic Board Game',
        'Nerf Elite 2.0 Motoblitz CS-10 Blaster',
        'Baby Shark Official Song Puppet Plush Toy',
        'VTech KidiZoom Creator Cam HD Video Camera',
        'Play-Doh Kitchen Creations Ultimate BBQ Set',
        'Chicco Bravo 3-in-1 Travel System Stroller',
        'Graco Pack n Play Portable Playard Grey',
        'Huffy 16" Kids Bike with Training Wheels',
        'Melissa & Doug Wooden Building Blocks 100pc',
        'LeapFrog LeapStart 3D Learning System',
        'Crayola Inspiration Art Case 140 Pieces',
        'Disney Frozen Elsa Magic Dress Costume',
        'Marvel Spider-Man Action Figure Collection',
        'Peppa Pig Wooden Family Home Playset',
        'Baby Einstein Take Along Tunes Musical Toy',
        'Pampers Premium Care Pants Size L 88 Count'
    ];
    
    locations TEXT[] := ARRAY[
        'Koramangala, Bangalore', 'Indiranagar, Bangalore', 'HSR Layout, Bangalore',
        'Banjara Hills, Hyderabad', 'Hitech City, Hyderabad', 'Gachibowli, Hyderabad',
        'Andheri West, Mumbai', 'Bandra West, Mumbai', 'Powai, Mumbai',
        'Connaught Place, Delhi', 'Dwarka, Delhi', 'Saket, Delhi',
        'Anna Nagar, Chennai', 'Velachery, Chennai', 'T Nagar, Chennai',
        'Salt Lake, Kolkata', 'Park Street, Kolkata', 'New Town, Kolkata',
        'Koregaon Park, Pune', 'Hinjewadi, Pune', 'Viman Nagar, Pune',
        'SG Highway, Ahmedabad', 'Vastrapur, Ahmedabad', 'Prahlad Nagar, Ahmedabad',
        'C-Scheme, Jaipur', 'Vaishali Nagar, Jaipur', 'Mansarovar, Jaipur',
        'Marine Drive, Kochi', 'Kakkanad, Kochi', 'Edapally, Kochi'
    ];
    
    conditions TEXT[] := ARRAY['new', 'like_new', 'good', 'fair'];
    descriptions_arr TEXT[] := ARRAY[
        'Excellent condition, barely used. All original accessories included with box. No scratches or dents. First owner, genuine buyer preferred.',
        'Well maintained, minor signs of use. Works perfectly. Comes with charger and original packaging. Price negotiable for quick sale.',
        'Like new condition, purchased 3 months ago. Still under warranty. All documents and bills available. Pet-free, smoke-free home.',
        'Great working condition. Some cosmetic wear. Battery health 95%+. All features working perfectly. Reason for selling: upgrade.',
        'Sparingly used, kept in cover always. Screen protector from day one. Face unlock, fingerprint all working. Genuine product with IMEI.',
        'Pristine condition with zero defects. Complete package with all original accessories. Transferable warranty valid till next year.',
        'Very good condition overall. Light scratches barely visible. All functions work flawlessly. Includes extra accessories worth ₹2000.',
        'Gently used, home environment only. No repairs ever done. Original purchase invoice available. EMI option available.',
        'Showroom-like condition. Used for 6 months only. Moving abroad hence selling urgently. All papers in place.',
        'Excellent working condition. Serviced regularly at authorized center. Complete service history available. Best in class product.'
    ];
BEGIN
    RAISE NOTICE 'Starting to seed 500 posts...';
    
    FOR i IN 1..500 LOOP
        -- Rotate through users 1-50
        v_user_id := ((i - 1) % 50) + 1;
        
        -- Assign category based on index
        v_cat_id := ((i - 1) % 10) + 1;
        
        -- Assign tier (mostly free, some premium)
        v_tier_id := CASE WHEN i % 10 = 0 THEN 3 WHEN i % 5 = 0 THEN 2 ELSE 1 END;
        
        -- Select title based on category
        v_title := CASE v_cat_id
            WHEN 1 THEN electronics_titles[((i - 1) % 20) + 1]
            WHEN 2 THEN mobiles_titles[((i - 1) % 20) + 1]
            WHEN 3 THEN fashion_titles[((i - 1) % 20) + 1]
            WHEN 4 THEN furniture_titles[((i - 1) % 20) + 1]
            WHEN 5 THEN vehicles_titles[((i - 1) % 20) + 1]
            WHEN 6 THEN books_titles[((i - 1) % 20) + 1]
            WHEN 7 THEN sports_titles[((i - 1) % 20) + 1]
            WHEN 8 THEN appliances_titles[((i - 1) % 20) + 1]
            WHEN 9 THEN beauty_titles[((i - 1) % 20) + 1]
            ELSE kids_titles[((i - 1) % 20) + 1]
        END;
        
        -- Select description
        v_desc := descriptions_arr[((i - 1) % 10) + 1];
        
        -- Generate realistic price based on category
        v_price := CASE v_cat_id
            WHEN 1 THEN 5000 + (RANDOM() * 195000)  -- Electronics: 5K - 2L
            WHEN 2 THEN 8000 + (RANDOM() * 142000)  -- Mobiles: 8K - 1.5L
            WHEN 3 THEN 500 + (RANDOM() * 49500)    -- Fashion: 500 - 50K
            WHEN 4 THEN 2000 + (RANDOM() * 98000)   -- Furniture: 2K - 1L
            WHEN 5 THEN 15000 + (RANDOM() * 985000) -- Vehicles: 15K - 10L
            WHEN 6 THEN 100 + (RANDOM() * 4900)     -- Books: 100 - 5K
            WHEN 7 THEN 500 + (RANDOM() * 29500)    -- Sports: 500 - 30K
            WHEN 8 THEN 1000 + (RANDOM() * 99000)   -- Appliances: 1K - 1L
            WHEN 9 THEN 200 + (RANDOM() * 9800)     -- Beauty: 200 - 10K
            ELSE 300 + (RANDOM() * 9700)            -- Kids: 300 - 10K
        END;
        
        -- Select location (rotate through cities)
        v_location := locations[((i - 1) % 30) + 1];
        
        -- Condition with weighted distribution (more 'good' posts)
        v_condition := CASE 
            WHEN i % 10 = 0 THEN 'new'
            WHEN i % 4 = 0 THEN 'like_new'
            WHEN i % 3 = 0 THEN 'fair'
            ELSE 'good'
        END;
        
        -- Views with realistic distribution (some viral, most normal)
        v_views := CASE 
            WHEN i % 50 = 0 THEN (RANDOM() * 5000)::INTEGER  -- Viral posts
            WHEN i % 20 = 0 THEN (RANDOM() * 1000)::INTEGER  -- Popular posts
            WHEN i % 5 = 0 THEN (RANDOM() * 300)::INTEGER    -- Normal posts
            ELSE (RANDOM() * 100)::INTEGER                   -- New posts
        END;
        
        -- Created date spread over last 30 days
        v_created_at := NOW() - ((RANDOM() * 30) || ' days')::INTERVAL - ((RANDOM() * 24) || ' hours')::INTERVAL;
        
        -- Insert the post
        INSERT INTO posts (
            user_id, category_id, tier_id, title, description, price, 
            location, latitude, longitude, status, condition, 
            views_count, views, likes, shares, created_at
        ) VALUES (
            v_user_id, v_cat_id, v_tier_id, 
            v_title || ' #' || i,  -- Add number to make unique
            v_desc || ' Contact for more details. Item ID: MH' || LPAD(i::TEXT, 5, '0'),
            ROUND(v_price::NUMERIC, 0),
            v_location,
            17.38 + (RANDOM() * 5) - 2.5,  -- Latitude variation
            78.48 + (RANDOM() * 5) - 2.5,  -- Longitude variation
            CASE WHEN i % 20 = 0 THEN 'sold' ELSE 'active' END,
            v_condition,
            v_views,
            v_views,
            (RANDOM() * 50)::INTEGER,
            (RANDOM() * 20)::INTEGER,
            v_created_at
        );
        
        -- Progress indicator every 100 posts
        IF i % 100 = 0 THEN
            RAISE NOTICE 'Created % posts...', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Successfully seeded 500 posts!';
END $$;

-- ===========================================
-- UPDATE EXISTING POSTS WITH VARIED VIEWS
-- This ensures older posts have more realistic view counts
-- ===========================================
UPDATE posts 
SET views_count = ROUND((EXTRACT(EPOCH FROM NOW() - created_at) / 3600) * (1 + RANDOM() * 0.5)),
    views = ROUND((EXTRACT(EPOCH FROM NOW() - created_at) / 3600) * (1 + RANDOM() * 0.5))
WHERE views_count = 0 AND created_at < NOW() - INTERVAL '1 day';

-- ===========================================
-- VERIFY SEEDED DATA
-- ===========================================
SELECT 
    'Posts by Category' as "Summary",
    c.name as "Category",
    COUNT(*) as "Count",
    ROUND(AVG(p.price)) as "Avg Price (₹)",
    ROUND(AVG(p.views_count)) as "Avg Views"
FROM posts p
JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'active'
GROUP BY c.name
ORDER BY COUNT(*) DESC;

SELECT 
    'Total Active Posts: ' || COUNT(*) as status
FROM posts WHERE status = 'active';

SELECT 
    'Total Users: ' || COUNT(*) as users
FROM users;

-- ===========================================
-- ADDITIONAL PERFORMANCE TIPS
-- ===========================================
-- 1. Run ANALYZE after large inserts:
ANALYZE posts;

-- 2. For 1 lakh+ concurrent users, consider:
--    - Using read replicas for SELECT queries
--    - Implementing Redis caching for hot data
--    - Using connection pooling (PgBouncer)
--    - Enabling query result caching

SELECT 'Database seeding complete! You now have 500+ realistic posts.' as message;
