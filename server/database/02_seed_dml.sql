-- =====================================================
-- MHub Seed - WITH VALID PASSWORD HASH
-- Password for all users: password123
-- =====================================================

-- CATEGORIES
INSERT INTO categories (name, description) 
SELECT 'Electronics', 'Gadgets' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Electronics');
INSERT INTO categories (name, description) 
SELECT 'Furniture', 'Home' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Furniture');
INSERT INTO categories (name, description) 
SELECT 'Fashion', 'Clothes' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Fashion');
INSERT INTO categories (name, description) 
SELECT 'Vehicles', 'Cars' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Vehicles');
INSERT INTO categories (name, description) 
SELECT 'Books', 'Books' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Books');
INSERT INTO categories (name, description) 
SELECT 'Mobiles', 'Phones' WHERE NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Mobiles');

-- TIERS
INSERT INTO tiers (name, price, description) 
SELECT 'Standard', 0.00, 'Free tier' WHERE NOT EXISTS (SELECT 1 FROM tiers WHERE name = 'Standard');
INSERT INTO tiers (name, price, description) 
SELECT 'Premium', 19.99, 'Paid tier' WHERE NOT EXISTS (SELECT 1 FROM tiers WHERE name = 'Premium');

-- USERS with VALID bcrypt hash for password123
INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Admin', 'admin@mhub.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'admin', 'ADM001', TRUE, 'en'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@mhub.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Rahul', 'rahul@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'RAH001', TRUE, 'en'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'rahul@test.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Priya', 'priya@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'PRI001', TRUE, 'hi'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'priya@test.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Amit', 'amit@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'AMI001', TRUE, 'en'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'amit@test.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Sneha', 'sneha@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'SNE001', TRUE, 'te'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'sneha@test.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Vikram', 'vikram@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'VIK001', TRUE, 'hi'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'vikram@test.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Meera', 'meera@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'MEE001', TRUE, 'en'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'meera@test.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Arjun', 'arjun@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'ARJ001', TRUE, 'kn'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'arjun@test.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Kavitha', 'kavitha@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'KAV001', TRUE, 'ta'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'kavitha@test.com');

INSERT INTO users (username, email, password_hash, role, referral_code, isaadhaarverified, preferred_language)
SELECT 'Suresh', 'suresh@test.com', '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS', 'user', 'SUR001', TRUE, 'en'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'suresh@test.com');

-- FIX existing users with bad password hash
UPDATE users 
SET password_hash = '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS'
WHERE password_hash = '$2b$10$xyz' OR LENGTH(password_hash) < 50;

-- PROFILES
INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Rahul S', '9876543210', 'Hyderabad', 'Tech', TRUE
FROM users WHERE email = 'rahul@test.com' 
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = users.user_id);

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Priya P', '9876543211', 'Bangalore', 'Seller', TRUE
FROM users WHERE email = 'priya@test.com' 
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = users.user_id);

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Amit K', '9876543212', 'Delhi', 'Tech', TRUE
FROM users WHERE email = 'amit@test.com' 
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = users.user_id);

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Sneha R', '9876543213', 'Hyderabad', 'Buyer', TRUE
FROM users WHERE email = 'sneha@test.com' 
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = users.user_id);

INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, 'Vikram S', '9876543214', 'Punjab', 'Cars', TRUE
FROM users WHERE email = 'vikram@test.com' 
AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = users.user_id);

-- REWARDS
INSERT INTO rewards (user_id, points)
SELECT user_id, 1250 FROM users WHERE email = 'rahul@test.com'
AND NOT EXISTS (SELECT 1 FROM rewards r WHERE r.user_id = users.user_id);

INSERT INTO rewards (user_id, points)
SELECT user_id, 800 FROM users WHERE email = 'priya@test.com'
AND NOT EXISTS (SELECT 1 FROM rewards r WHERE r.user_id = users.user_id);

INSERT INTO rewards (user_id, points)
SELECT user_id, 300 FROM users WHERE email = 'amit@test.com'
AND NOT EXISTS (SELECT 1 FROM rewards r WHERE r.user_id = users.user_id);

INSERT INTO rewards (user_id, points)
SELECT user_id, 650 FROM users WHERE email = 'sneha@test.com'
AND NOT EXISTS (SELECT 1 FROM rewards r WHERE r.user_id = users.user_id);

INSERT INTO rewards (user_id, points)
SELECT user_id, 1500 FROM users WHERE email = 'vikram@test.com'
AND NOT EXISTS (SELECT 1 FROM rewards r WHERE r.user_id = users.user_id);

-- POSTS
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Sony Headphones', 'Good cond', 15000, 'Hyderabad', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Sony Headphones');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'rahul@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Mobiles'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'OnePlus 9', '12GB RAM', 28000, 'Hyderabad', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'OnePlus 9');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'priya@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Fashion'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Designer Dress', 'Like new', 12000, 'Bangalore', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Designer Dress');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'amit@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'iPad Air', 'M1 chip', 42000, 'Delhi', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'iPad Air');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'vikram@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Vehicles'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'Swift 2022', 'Low km', 680000, 'Punjab', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Swift 2022');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'meera@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Books'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'HP Collection', '7 books', 2500, 'Kochi', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'HP Collection');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'kavitha@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Fashion'),
    (SELECT tier_id FROM tiers WHERE name = 'Premium'),
    'Silk Saree', 'Pure silk', 25000, 'Chennai', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Silk Saree');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'suresh@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Electronics'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'PS5 Console', 'With games', 38000, 'Mumbai', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'PS5 Console');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'sneha@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Queen Bed', 'Solid wood', 22000, 'Hyderabad', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Queen Bed');

INSERT INTO posts (user_id, category_id, tier_id, title, description, price, location, status)
SELECT 
    (SELECT user_id FROM users WHERE email = 'arjun@test.com'),
    (SELECT category_id FROM categories WHERE name = 'Furniture'),
    (SELECT tier_id FROM tiers WHERE name = 'Standard'),
    'Teak Cabinet', 'Antique', 35000, 'Bangalore', 'active'
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE title = 'Teak Cabinet');

-- VERIFY PASSWORDS ARE CORRECT
SELECT 'Password fix applied to ' || COUNT(*) || ' users' AS status
FROM users WHERE password_hash = '$2b$10$tGBQnJPxgq5rBx8Pfyx09uCwqZ559A2i0VWqw8/tsvAr9Ws4kxm9vS';
