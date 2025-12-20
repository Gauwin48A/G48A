-- =====================================================
-- MHub COMPLETE DATABASE SETUP - MASTER SCRIPT
-- Version: 2.0 (Full Enterprise)
-- Execute this ONCE to set up complete architecture
-- =====================================================

-- =====================================================
-- SECTION 1: ADD MISSING COLUMNS (Safe for existing DBs)
-- =====================================================
DO $$ 
BEGIN
    -- Posts table additions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'discount_percentage') THEN
        ALTER TABLE posts ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'views_count') THEN
        ALTER TABLE posts ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'images') THEN
        ALTER TABLE posts ADD COLUMN images JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'condition') THEN
        ALTER TABLE posts ADD COLUMN condition VARCHAR(30) DEFAULT 'good';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'buyer_id') THEN
        ALTER TABLE posts ADD COLUMN buyer_id INTEGER REFERENCES users(user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'sold_at') THEN
        ALTER TABLE posts ADD COLUMN sold_at TIMESTAMP;
    END IF;
    
    -- Tiers table additions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiers' AND column_name = 'features') THEN
        ALTER TABLE tiers ADD COLUMN features JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tiers' AND column_name = 'description') THEN
        ALTER TABLE tiers ADD COLUMN description TEXT;
    END IF;
    
    -- Categories table additions  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'icon_url') THEN
        ALTER TABLE categories ADD COLUMN icon_url VARCHAR(255);
    END IF;
END $$;

-- =====================================================
-- SECTION 2: CREATE MISSING TABLES
-- =====================================================

-- Preferences table (for user recommendation preferences)
CREATE TABLE IF NOT EXISTS preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location VARCHAR(100),
    min_price DECIMAL(12,2),
    max_price DECIMAL(12,2),
    categories JSONB,
    notification_enabled BOOLEAN DEFAULT TRUE,
    date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Complaints table
CREATE TABLE IF NOT EXISTS complaints (
    complaint_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
    against_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    type VARCHAR(50) CHECK (type IN ('fraud', 'spam', 'inappropriate', 'fake_listing', 'harassment', 'other')),
    subject VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls JSONB,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
    resolution TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

-- Buyer inquiries table (for "I'm Interested" feature)
CREATE TABLE IF NOT EXISTS buyer_inquiries (
    inquiry_id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    buyer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    buyer_name VARCHAR(100),
    buyer_email VARCHAR(255),
    buyer_phone VARCHAR(20),
    message TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'closed', 'spam')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Saved posts (wishlist)
CREATE TABLE IF NOT EXISTS saved_posts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_preferences_user ON preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_post ON buyer_inquiries(post_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user ON saved_posts(user_id);

-- =====================================================
-- SECTION 3: CATEGORIES (Core lookup data)
-- =====================================================
INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets, computers, phones, TVs, and electronic devices'),
('Furniture', 'Home and office furniture, decor items'),
('Fashion', 'Clothing, shoes, accessories, and jewelry'),
('Vehicles', 'Cars, bikes, scooters, and auto parts'),
('Books', 'Textbooks, novels, magazines, and educational material'),
('Mobiles', 'Smartphones and mobile accessories'),
('Home Appliances', 'Kitchen appliances, washing machines, ACs'),
('Sports', 'Sports equipment, gym gear, outdoor activities'),
('Real Estate', 'Property listings, rentals, PG accommodations'),
('Services', 'Professional services, repairs, tutoring')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SECTION 4: TIERS (Subscription levels - without features column)
-- =====================================================
INSERT INTO tiers (name, price) VALUES
('Standard', 0.00),
('Premium', 199.00),
('Business', 499.00)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SECTION 5: USERS (10 diverse users)
-- Password for ALL users: password123
-- =====================================================
-- Bcrypt hash for 'password123'
DO $$
DECLARE
    pwd_hash VARCHAR(255) := '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
BEGIN
    -- Admin user
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@mhub.com' OR username = 'admin') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('admin', 'admin@mhub.com', pwd_hash, 'admin', 'ADMIN001', TRUE, 'en');
    END IF;
    
    -- Premium users
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'rahul@test.com' OR username = 'rahul_sharma') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('rahul_sharma', 'rahul@test.com', pwd_hash, 'premium', 'RAH001', TRUE, 'en');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'priya@test.com' OR username = 'priya_patel') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('priya_patel', 'priya@test.com', pwd_hash, 'premium', 'PRI001', TRUE, 'hi');
    END IF;
    
    -- Regular users
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'amit@test.com' OR username = 'amit_kumar') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('amit_kumar', 'amit@test.com', pwd_hash, 'user', 'AMI001', TRUE, 'en');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'sneha@test.com' OR username = 'sneha_reddy') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('sneha_reddy', 'sneha@test.com', pwd_hash, 'user', 'SNE001', TRUE, 'te');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'vikram@test.com' OR username = 'vikram_singh') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('vikram_singh', 'vikram@test.com', pwd_hash, 'user', 'VIK001', TRUE, 'hi');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'meera@test.com' OR username = 'meera_nair') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('meera_nair', 'meera@test.com', pwd_hash, 'user', 'MEE001', TRUE, 'ml');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'arjun@test.com' OR username = 'arjun_rao') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('arjun_rao', 'arjun@test.com', pwd_hash, 'user', 'ARJ001', FALSE, 'kn');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'kavitha@test.com' OR username = 'kavitha_menon') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('kavitha_menon', 'kavitha@test.com', pwd_hash, 'user', 'KAV001', TRUE, 'ta');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'suresh@test.com' OR username = 'suresh_iyer') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('suresh_iyer', 'suresh@test.com', pwd_hash, 'user', 'SUR001', TRUE, 'en');
    END IF;
    
    -- Demo user for testing (skip if johndoe exists)
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'john@demo.com' OR username = 'johndoe') THEN
        INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
        VALUES ('johndoe', 'john@demo.com', pwd_hash, 'user', 'JOHN001', TRUE, 'en');
    END IF;
END $$;

-- =====================================================
-- SECTION 6: PROFILES (Complete data for all users)
-- =====================================================
INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Admin User', '9999999999', 'MHub HQ, Bangalore', 'Platform Administrator', TRUE
FROM users WHERE email = 'admin@mhub.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Rahul Sharma', '9876543210', 'Banjara Hills, Hyderabad, Telangana 500034', 'Tech enthusiast | Gadget lover | Verified seller with 50+ successful sales', TRUE
FROM users WHERE email = 'rahul@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Priya Patel', '9876543211', 'Koramangala, Bangalore, Karnataka 560034', 'Fashion blogger | Preloved fashion curator | Supporting sustainable shopping', TRUE
FROM users WHERE email = 'priya@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Amit Kumar', '9876543212', 'Connaught Place, New Delhi 110001', 'Software engineer | Apple fan | Looking for great deals', TRUE
FROM users WHERE email = 'amit@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Sneha Reddy', '9876543213', 'Jubilee Hills, Hyderabad, Telangana 500033', 'Interior designer | Home decor enthusiast | Quality furniture seller', TRUE
FROM users WHERE email = 'sneha@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Vikram Singh', '9876543214', 'Model Town, Ludhiana, Punjab 141002', 'Automobile dealer | Car enthusiast | Genuine vehicle sales', TRUE
FROM users WHERE email = 'vikram@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Meera Nair', '9876543215', 'Marine Drive, Kochi, Kerala 682011', 'Book collector | Literature lover | Rare finds available', TRUE
FROM users WHERE email = 'meera@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Arjun Rao', '9876543216', 'Indiranagar, Bangalore, Karnataka 560038', 'Furniture craftsman | Antique collector | Custom orders welcome', FALSE
FROM users WHERE email = 'arjun@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Kavitha Menon', '9876543217', 'T Nagar, Chennai, Tamil Nadu 600017', 'Saree collector | Traditional wear specialist | Authentic handlooms', TRUE
FROM users WHERE email = 'kavitha@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Suresh Iyer', '9876543218', 'Andheri West, Mumbai, Maharashtra 400053', 'Gaming enthusiast | Console collector | Fair prices always', TRUE
FROM users WHERE email = 'suresh@test.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name, address = EXCLUDED.address;

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'John Doe', '9876543210', 'India', 'Demo user for testing', TRUE
FROM users WHERE email = 'john@demo.com'
ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- =====================================================
-- SECTION 7: REWARDS (Points and tiers for all users)
-- =====================================================
INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 5000, 'Gold' FROM users WHERE email = 'admin@mhub.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 2500, 'Silver' FROM users WHERE email = 'rahul@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 1800, 'Silver' FROM users WHERE email = 'priya@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 750, 'Bronze' FROM users WHERE email = 'amit@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 1200, 'Bronze' FROM users WHERE email = 'sneha@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 3200, 'Gold' FROM users WHERE email = 'vikram@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 450, 'Bronze' FROM users WHERE email = 'meera@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 900, 'Bronze' FROM users WHERE email = 'arjun@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 1500, 'Silver' FROM users WHERE email = 'kavitha@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 2100, 'Silver' FROM users WHERE email = 'suresh@test.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

INSERT INTO rewards (user_id, points, tier)
SELECT user_id, 500, 'Bronze' FROM users WHERE email = 'john@demo.com'
ON CONFLICT (user_id) DO UPDATE SET points = EXCLUDED.points, tier = EXCLUDED.tier;

-- =====================================================
-- SECTION 8: REFERRALS (Network of referrals)
-- =====================================================
-- Rahul referred Amit
INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded, completed_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    'completed', 100.00, NOW() - INTERVAL '30 days'
ON CONFLICT (referrer_id, referee_id) DO NOTHING;

-- Rahul referred Sneha
INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded, completed_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    'completed', 100.00, NOW() - INTERVAL '25 days'
ON CONFLICT (referrer_id, referee_id) DO NOTHING;

-- Priya referred Kavitha
INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded, completed_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'priya@test.com'),
    (SELECT user_id FROM users WHERE email = 'kavitha@test.com'),
    'completed', 100.00, NOW() - INTERVAL '20 days'
ON CONFLICT (referrer_id, referee_id) DO NOTHING;

-- Vikram referred Arjun (pending)
INSERT INTO referrals (referrer_id, referee_id, status, bonus_awarded)
SELECT 
    (SELECT user_id FROM users WHERE email = 'vikram@test.com'),
    (SELECT user_id FROM users WHERE email = 'arjun@test.com'),
    'pending', 0
ON CONFLICT (referrer_id, referee_id) DO NOTHING;

-- =====================================================
-- SECTION 9: POSTS (Complete marketplace listings)
-- =====================================================

-- First, delete existing sample posts to avoid duplicates
DELETE FROM posts WHERE title IN (
    'Sony Headphones', 'OnePlus 9', 'Designer Dress', 'iPad Air', 'Swift 2022',
    'HP Collection', 'Silk Saree', 'PS5 Console', 'Queen Bed', 'Teak Cabinet'
);

-- ACTIVE POSTS (Currently available)
-- Post 1: Electronics - Premium
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'MacBook Pro M2 2023',
    'Apple MacBook Pro 14-inch with M2 Pro chip. 16GB RAM, 512GB SSD. Space Grey color. AppleCare+ valid until December 2025. Includes original charger, box, and cleaning kit. Used for 6 months only, in pristine condition. Perfect for developers, designers, and content creators.',
    125000.00,
    'Hyderabad',
    'active',
    156,
    'like_new',
    '["https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800"]'::jsonb,
    NOW() - INTERVAL '5 days';

-- Post 2: Mobiles
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Mobiles'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'iPhone 14 Pro Max 256GB',
    'Apple iPhone 14 Pro Max in Deep Purple. 256GB storage, dual SIM. Under official Apple warranty. Comes with MagSafe charger, original box, and premium case. Battery health 98%. No scratches, tempered glass applied since day one.',
    95000.00,
    'Hyderabad',
    'active',
    234,
    'like_new',
    '["https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=800"]'::jsonb,
    NOW() - INTERVAL '3 days';

-- Post 3: Furniture
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'arjun@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Antique Teak Wood Cabinet',
    'Handcrafted teak wood cabinet with intricate carvings. Over 50 years old, a true collectors piece. Perfect for living room or study. Dimensions: 6ft x 4ft x 2ft. Excellent preservation, no repairs needed. Can arrange delivery within Bangalore.',
    85000.00,
    'Bangalore',
    'active',
    89,
    'good',
    '["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"]'::jsonb,
    NOW() - INTERVAL '7 days';

-- Post 4: Vehicles - Premium
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'vikram@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Vehicles'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'Royal Enfield Classic 350',
    'Royal Enfield Classic 350 Signals Edition. 2021 model with only 8000 KM driven. Dual channel ABS, all documents clear. Regular servicing done at authorized center. Well maintained with complete service history. Test ride available.',
    155000.00,
    'Punjab',
    'active',
    312,
    'excellent',
    '["https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=800"]'::jsonb,
    NOW() - INTERVAL '2 days';

-- Post 5: Fashion
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'kavitha@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Fashion'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'Kanchipuram Pure Silk Saree',
    'Authentic Kanchipuram pure silk saree with real gold zari work. Traditional temple border design. Perfect for weddings and festive occasions. Comes with matching blouse piece. Dry cleaned and ready to wear. Certificate of authenticity included.',
    45000.00,
    'Chennai',
    'active',
    178,
    'like_new',
    '["https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800"]'::jsonb,
    NOW() - INTERVAL '4 days';

-- Post 6: Electronics
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'suresh@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'PlayStation 5 Disc Edition Bundle',
    'PS5 Disc Edition with 2 DualSense controllers. Bundle includes: FIFA 24, Spider-Man 2, Gran Turismo 7, and GTA V. All games have original cases. Console in excellent condition, no issues. Perfect for gaming enthusiasts.',
    42000.00,
    'Mumbai',
    'active',
    267,
    'excellent',
    '["https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=800"]'::jsonb,
    NOW() - INTERVAL '1 day';

-- Post 7: Books
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'meera@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Books'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Complete UPSC Preparation Set',
    'Complete UPSC Civil Services preparation set including: NCERTs (Class 6-12), Laxmikanth Polity, Spectrum History, Ramesh Singh Economy, Oxford Atlas, and PYQ compilations. All latest editions. Highlighted and annotated for quick revision. Best for serious aspirants.',
    5500.00,
    'Delhi',
    'active',
    445,
    'good',
    '["https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800"]'::jsonb,
    NOW() - INTERVAL '6 days';

-- Post 8: Electronics
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Samsung 55" Crystal 4K Smart TV',
    'Samsung Crystal 4K UHD 55-inch Smart LED TV (2023 model). Built-in Netflix, Prime Video, Disney+. Crystal processor 4K for stunning clarity. Includes wall mount bracket and original remote. Perfect for home theatre setup.',
    38000.00,
    'Delhi',
    'active',
    189,
    'excellent',
    '["https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=800"]'::jsonb,
    NOW() - INTERVAL '8 days';

-- Post 9: Furniture
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Premium Leather Sofa Set 5-Seater',
    'Italian leather 5-seater sofa set (3+1+1) with center table. Chocolate brown color with stain-resistant coating. Modern design perfect for contemporary living rooms. 2 years old, excellent condition. Can arrange delivery within Hyderabad.',
    75000.00,
    'Hyderabad',
    'active',
    134,
    'good',
    '["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800"]'::jsonb,
    NOW() - INTERVAL '10 days';

-- Post 10: Fashion
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'priya@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Fashion'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Nike Air Max Collection (2 Pairs)',
    'Nike Air Max 90 and Air Max 97 - Size UK 9. Both pairs in excellent condition with minimal wear. Original boxes and extra laces included. Perfect for sneaker collectors or resellers.',
    14000.00,
    'Bangalore',
    'active',
    198,
    'excellent',
    '["https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800"]'::jsonb,
    NOW() - INTERVAL '12 days';

-- Post 11: Mobiles
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'vikram@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Mobiles'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Samsung Galaxy S23 Ultra',
    'Samsung Galaxy S23 Ultra 12GB/256GB in Cream color. Dual SIM with 200MP camera. Original box, charger, S-Pen included. Extended Samsung Care+ warranty. No scratches, always used with case and tempered glass.',
    72000.00,
    'Punjab',
    'active',
    256,
    'like_new',
    '["https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800"]'::jsonb,
    NOW() - INTERVAL '4 days';

-- Post 12: Electronics
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, images, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'priya@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Canon EOS 200D II DSLR Kit',
    'Canon EOS 200D II DSLR with 18-55mm STM lens kit. Perfect entry-level camera for vloggers and beginners. Includes camera bag, 32GB SD card, and spare battery. Barely used, less than 1000 clicks.',
    42000.00,
    'Bangalore',
    'active',
    167,
    'like_new',
    '["https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800"]'::jsonb,
    NOW() - INTERVAL '9 days';

-- SOLD POSTS (Completed transactions)
-- Post 13: Sold iPhone
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, buyer_id, sold_at, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Mobiles'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'iPhone 13 Pro 128GB',
    'Apple iPhone 13 Pro in Sierra Blue. 128GB storage. Sold to verified buyer.',
    65000.00,
    'Hyderabad',
    'sold',
    345,
    'excellent',
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    NOW() - INTERVAL '15 days',
    NOW() - INTERVAL '25 days';

-- Post 14: Sold Laptop
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, buyer_id, sold_at, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Dell XPS 15 Laptop',
    'Dell XPS 15 with i7-12th Gen, 16GB RAM, 512GB SSD. Sold successfully.',
    85000.00,
    'Delhi',
    'sold',
    278,
    'good',
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '35 days';

-- Post 15: Sold Car
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, buyer_id, sold_at, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'vikram@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Vehicles'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'Maruti Swift 2021 VXi',
    'Maruti Swift 2021 VXi Model. Sold to local buyer.',
    550000.00,
    'Punjab',
    'sold',
    567,
    'excellent',
    (SELECT user_id FROM users WHERE email = 'suresh@test.com'),
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '30 days';

-- INACTIVE POSTS
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status, views_count, condition, created_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'arjun@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Office Chair - Temporarily Unavailable',
    'Ergonomic office chair. Temporarily taken down for relocation.',
    8500.00,
    'Bangalore',
    'inactive',
    45,
    'good',
    NOW() - INTERVAL '40 days';

-- =====================================================
-- SECTION 10: TRANSACTIONS (For sold items)
-- =====================================================
INSERT INTO transactions (buyer_id, seller_id, post_id, amount, status, payment_method, completed_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT post_id FROM posts WHERE title = 'iPhone 13 Pro 128GB' LIMIT 1),
    65000.00,
    'completed',
    'UPI',
    NOW() - INTERVAL '15 days'
WHERE EXISTS (SELECT 1 FROM posts WHERE title = 'iPhone 13 Pro 128GB');

INSERT INTO transactions (buyer_id, seller_id, post_id, amount, status, payment_method, completed_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT post_id FROM posts WHERE title = 'Dell XPS 15 Laptop' LIMIT 1),
    85000.00,
    'completed',
    'Bank Transfer',
    NOW() - INTERVAL '20 days'
WHERE EXISTS (SELECT 1 FROM posts WHERE title = 'Dell XPS 15 Laptop');

INSERT INTO transactions (buyer_id, seller_id, post_id, amount, status, payment_method, completed_at)
SELECT 
    (SELECT user_id FROM users WHERE email = 'suresh@test.com'),
    (SELECT user_id FROM users WHERE email = 'vikram@test.com'),
    (SELECT post_id FROM posts WHERE title = 'Maruti Swift 2021 VXi' LIMIT 1),
    550000.00,
    'completed',
    'Bank Transfer',
    NOW() - INTERVAL '10 days'
WHERE EXISTS (SELECT 1 FROM posts WHERE title = 'Maruti Swift 2021 VXi');

-- =====================================================
-- SECTION 11: BUYER INQUIRIES
-- =====================================================
INSERT INTO buyer_inquiries (post_id, buyer_id, buyer_name, buyer_email, buyer_phone, message, status)
SELECT 
    (SELECT post_id FROM posts WHERE title = 'MacBook Pro M2 2023' LIMIT 1),
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    'Amit Kumar',
    'amit@test.com',
    '9876543212',
    'Hi, I am interested in the MacBook. Is the price negotiable? Can we meet this weekend for inspection?',
    'pending'
WHERE EXISTS (SELECT 1 FROM posts WHERE title = 'MacBook Pro M2 2023');

INSERT INTO buyer_inquiries (post_id, buyer_id, buyer_name, buyer_email, buyer_phone, message, status)
SELECT 
    (SELECT post_id FROM posts WHERE title = 'iPhone 14 Pro Max 256GB' LIMIT 1),
    (SELECT user_id FROM users WHERE email = 'arjun@test.com'),
    'Arjun Rao',
    'arjun@test.com',
    '9876543216',
    'Is this phone still available? I can pay immediately if genuine.',
    'contacted'
WHERE EXISTS (SELECT 1 FROM posts WHERE title = 'iPhone 14 Pro Max 256GB');

INSERT INTO buyer_inquiries (post_id, buyer_id, buyer_name, buyer_email, buyer_phone, message, status)
SELECT 
    (SELECT post_id FROM posts WHERE title = 'Royal Enfield Classic 350' LIMIT 1),
    (SELECT user_id FROM users WHERE email = 'suresh@test.com'),
    'Suresh Iyer',
    'suresh@test.com',
    '9876543218',
    'Interested in the bike. Can you share more photos and service records?',
    'pending'
WHERE EXISTS (SELECT 1 FROM posts WHERE title = 'Royal Enfield Classic 350');

-- =====================================================
-- SECTION 12: FEEDBACK
-- =====================================================
INSERT INTO feedback (user_id, message, rating, category, status)
SELECT user_id, 
    'Great platform! Sold my old laptop within a week. Very easy to use interface.', 
    5, 'general', 'open'
FROM users WHERE email = 'rahul@test.com';

INSERT INTO feedback (user_id, message, rating, category, status)
SELECT user_id, 
    'Would love to see a chat feature for direct communication with sellers.', 
    4, 'feature_request', 'open'
FROM users WHERE email = 'amit@test.com';

INSERT INTO feedback (user_id, message, rating, category, status)
SELECT user_id, 
    'The app is good but search filters could be improved to include more options.', 
    3, 'improvement', 'open'
FROM users WHERE email = 'priya@test.com';

-- =====================================================
-- SECTION 13: COMPLAINTS
-- =====================================================
INSERT INTO complaints (user_id, post_id, against_user_id, type, subject, description, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    NULL,
    NULL,
    'spam',
    'Receiving too many promotional notifications',
    'I am getting multiple promotional notifications daily. Would like an option to control notification frequency.',
    'investigating'
WHERE NOT EXISTS (SELECT 1 FROM complaints WHERE subject = 'Receiving too many promotional notifications');

INSERT INTO complaints (user_id, post_id, against_user_id, type, subject, description, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    (SELECT post_id FROM posts WHERE title = 'Office Chair - Temporarily Unavailable' LIMIT 1),
    (SELECT user_id FROM users WHERE email = 'arjun@test.com'),
    'fake_listing',
    'Product condition different from description',
    'The chair had significant damage that was not mentioned in the listing. Seller was unresponsive.',
    'resolved'
WHERE EXISTS (SELECT 1 FROM posts WHERE title = 'Office Chair - Temporarily Unavailable');

-- =====================================================
-- SECTION 14: NOTIFICATIONS
-- =====================================================
INSERT INTO notifications (user_id, title, message, type, is_read) VALUES
((SELECT user_id FROM users WHERE email = 'rahul@test.com'), 'New inquiry received!', 'Amit Kumar is interested in your MacBook Pro M2 2023 listing.', 'inquiry', FALSE),
((SELECT user_id FROM users WHERE email = 'sneha@test.com'), 'Price drop alert!', 'A product on your wishlist has dropped in price.', 'alert', FALSE),
((SELECT user_id FROM users WHERE email = 'amit@test.com'), 'Referral bonus earned!', 'You earned 100 coins from your referral. Keep referring friends!', 'reward', TRUE),
((SELECT user_id FROM users WHERE email = 'vikram@test.com'), 'Post approved', 'Your listing "Royal Enfield Classic 350" is now live and visible to buyers.', 'system', TRUE),
((SELECT user_id FROM users WHERE email = 'priya@test.com'), 'Weekly digest', 'Check out the top trending products this week in your area.', 'marketing', FALSE);

-- =====================================================
-- SECTION 15: SAVED POSTS (Wishlists)
-- =====================================================
INSERT INTO saved_posts (user_id, post_id)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT post_id FROM posts WHERE title = 'MacBook Pro M2 2023' LIMIT 1)
ON CONFLICT (user_id, post_id) DO NOTHING;

INSERT INTO saved_posts (user_id, post_id)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT post_id FROM posts WHERE title = 'iPhone 14 Pro Max 256GB' LIMIT 1)
ON CONFLICT (user_id, post_id) DO NOTHING;

INSERT INTO saved_posts (user_id, post_id)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    (SELECT post_id FROM posts WHERE title = 'PlayStation 5 Disc Edition Bundle' LIMIT 1)
ON CONFLICT (user_id, post_id) DO NOTHING;

-- =====================================================
-- SECTION 16: PREFERENCES (User recommendation settings)
-- =====================================================
INSERT INTO preferences (user_id, location, min_price, max_price, categories, notification_enabled)
SELECT user_id, 'Hyderabad', 5000, 100000, '["Electronics", "Mobiles"]'::jsonb, TRUE
FROM users WHERE email = 'amit@test.com'
ON CONFLICT (user_id) DO UPDATE SET location = EXCLUDED.location;

INSERT INTO preferences (user_id, location, min_price, max_price, categories, notification_enabled)
SELECT user_id, 'Bangalore', 10000, 200000, '["Fashion", "Furniture"]'::jsonb, TRUE
FROM users WHERE email = 'priya@test.com'
ON CONFLICT (user_id) DO UPDATE SET location = EXCLUDED.location;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
SELECT 'Users: ' || COUNT(*) FROM users;
SELECT 'Profiles: ' || COUNT(*) FROM profiles;
SELECT 'Posts (Active): ' || COUNT(*) FROM posts WHERE status = 'active';
SELECT 'Posts (Sold): ' || COUNT(*) FROM posts WHERE status = 'sold';
SELECT 'Rewards: ' || COUNT(*) FROM rewards;
SELECT 'Referrals: ' || COUNT(*) FROM referrals;
SELECT 'Transactions: ' || COUNT(*) FROM transactions;
SELECT 'Buyer Inquiries: ' || COUNT(*) FROM buyer_inquiries;
SELECT 'Feedback: ' || COUNT(*) FROM feedback;
SELECT 'Complaints: ' || COUNT(*) FROM complaints;
SELECT 'Notifications: ' || COUNT(*) FROM notifications;

-- SUCCESS MESSAGE
SELECT '✅ MHub Database Setup Complete! All tables populated with sample data.' AS status;
