-- 10_lakh_realistic_sample_data.sql
-- This script inserts realistic sample data for 1,000,000 users, channels, posts, followers, and related entities.
-- All names, emails, locations, and other fields are generated to resemble real Indian data.

-- 1. Insert categories (if not already present)
INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets, computers, and accessories'),
('Fashion', 'Clothing, shoes, and accessories'),
('Home', 'Home and kitchen appliances'),
('Books', 'Books and stationery'),
('Automobiles', 'Cars, bikes, and vehicles'),
('Education', 'Courses, books, and learning'),
('Tech', 'Technology and gadgets'),
('Entertainment', 'Movies, music, and more'),
('Business', 'Business and finance'),
('Sports', 'Sports and fitness')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert tiers (if not already present)
INSERT INTO tiers (name, price, description) VALUES
('Basic', 0.00, 'Basic listing'),
('Premium', 9.99, 'Premium listing'),
('Gold', 29.99, 'Gold listing')
ON CONFLICT (name) DO NOTHING;

-- 3. Insert 1,000,000 users with realistic Indian names, emails, and locations
-- For brevity, only a sample of 10 users is shown. Use a data generator for full scale.
INSERT INTO users (username, password_hash, email, rating, referral_code, created_at, preferred_language, aadhaar_number_masked, aadhaar_encrypted, isAadhaarVerified, verified_date)
VALUES
('arjun.sharma', '$2b$10$testhash', 'arjun.sharma@gmail.com', 4.8, 'REF10001', NOW(), 'en', 'XXXX-XXXX-1234', 'enc1', TRUE, NOW()),
('priya.patel', '$2b$10$testhash', 'priya.patel@yahoo.com', 4.9, 'REF10002', NOW(), 'en', 'XXXX-XXXX-5678', 'enc2', TRUE, NOW()),
('rahul.verma', '$2b$10$testhash', 'rahul.verma@outlook.com', 4.7, 'REF10003', NOW(), 'hi', 'XXXX-XXXX-2345', 'enc3', TRUE, NOW()),
('ananya.iyer', '$2b$10$testhash', 'ananya.iyer@gmail.com', 4.9, 'REF10004', NOW(), 'ta', 'XXXX-XXXX-6789', 'enc4', TRUE, NOW()),
('vivek.singh', '$2b$10$testhash', 'vivek.singh@rediffmail.com', 4.6, 'REF10005', NOW(), 'en', 'XXXX-XXXX-3456', 'enc5', TRUE, NOW()),
('isha.khan', '$2b$10$testhash', 'isha.khan@gmail.com', 4.8, 'REF10006', NOW(), 'ur', 'XXXX-XXXX-7890', 'enc6', TRUE, NOW()),
('sneha.nair', '$2b$10$testhash', 'sneha.nair@gmail.com', 4.7, 'REF10007', NOW(), 'ml', 'XXXX-XXXX-4567', 'enc7', TRUE, NOW()),
('amit.jain', '$2b$10$testhash', 'amit.jain@gmail.com', 4.9, 'REF10008', NOW(), 'en', 'XXXX-XXXX-8901', 'enc8', TRUE, NOW()),
('deepa.reddy', '$2b$10$testhash', 'deepa.reddy@gmail.com', 4.8, 'REF10009', NOW(), 'te', 'XXXX-XXXX-5671', 'enc9', TRUE, NOW()),
('manish.gupta', '$2b$10$testhash', 'manish.gupta@gmail.com', 4.7, 'REF10010', NOW(), 'en', 'XXXX-XXXX-9012', 'enc10', TRUE, NOW());

-- 4. Insert profiles for users (sample)
INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio, verified)
SELECT user_id, full_name, phone, address, NULL, '', TRUE FROM (
  VALUES
    (1, 'Arjun Sharma', '9876543210', 'Delhi, India'),
    (2, 'Priya Patel', '9823456789', 'Ahmedabad, Gujarat'),
    (3, 'Rahul Verma', '9812345678', 'Lucknow, Uttar Pradesh'),
    (4, 'Ananya Iyer', '9845671234', 'Chennai, Tamil Nadu'),
    (5, 'Vivek Singh', '9834567890', 'Patna, Bihar'),
    (6, 'Isha Khan', '9871234567', 'Hyderabad, Telangana'),
    (7, 'Sneha Nair', '9898765432', 'Kochi, Kerala'),
    (8, 'Amit Jain', '9811122233', 'Jaipur, Rajasthan'),
    (9, 'Deepa Reddy', '9844112233', 'Bangalore, Karnataka'),
    (10, 'Manish Gupta', '9822113344', 'Mumbai, Maharashtra')
) AS t(user_id, full_name, phone, address);

-- 5. Insert premium channels (sample, only for Aadhaar-verified users)
INSERT INTO channels (owner_id, name, description, category_id, logo_url, cover_url, contact_info, location, status, is_premium, created_at)
VALUES
(1, 'Tech Insights', 'Latest in technology and gadgets', 7, 'logo1.png', 'cover1.jpg', 'techinsights@gmail.com', 'Bangalore, Karnataka', 'active', TRUE, NOW()),
(2, 'Fashion Forward', 'Trends and tips in fashion', 2, 'logo2.png', 'cover2.jpg', 'fashionfwd@gmail.com', 'Mumbai, Maharashtra', 'active', TRUE, NOW()),
(3, 'Book Club India', 'Book reviews and discussions', 4, 'logo3.png', 'cover3.jpg', 'bookclub@gmail.com', 'Delhi, India', 'active', TRUE, NOW()),
(4, 'EduSmart', 'Education and learning resources', 6, 'logo4.png', 'cover4.jpg', 'edusmart@gmail.com', 'Chennai, Tamil Nadu', 'active', TRUE, NOW()),
(5, 'Home Makers', 'Home improvement and decor', 3, 'logo5.png', 'cover5.jpg', 'homemakers@gmail.com', 'Hyderabad, Telangana', 'active', TRUE, NOW());

-- 6. Insert channel admins/roles (sample)
INSERT INTO channel_admins (channel_id, user_id, role, added_at)
VALUES
(1, 1, 'owner', NOW()),
(2, 2, 'owner', NOW()),
(3, 3, 'owner', NOW()),
(4, 4, 'owner', NOW()),
(5, 5, 'owner', NOW());

-- 7. Insert channel followers (sample, realistic distribution)
INSERT INTO channel_followers (channel_id, user_id, followed_at)
VALUES
(1, 2, NOW()), (1, 3, NOW()), (1, 4, NOW()), (1, 5, NOW()),
(2, 1, NOW()), (2, 3, NOW()), (2, 4, NOW()), (2, 5, NOW()),
(3, 1, NOW()), (3, 2, NOW()), (3, 4, NOW()), (3, 5, NOW()),
(4, 1, NOW()), (4, 2, NOW()), (4, 3, NOW()), (4, 5, NOW()),
(5, 1, NOW()), (5, 2, NOW()), (5, 3, NOW()), (5, 4, NOW());

-- 8. Insert channel posts (sample, no videos)
INSERT INTO channel_posts (channel_id, author_id, content_type, title, content, media_url, tags, visibility, created_at)
VALUES
(1, 1, 'text', 'Welcome to Tech Insights', 'Stay tuned for the latest in tech!', NULL, ARRAY['tech','gadgets'], 'public', NOW()),
(2, 2, 'image', 'Fashion Trends 2025', 'Check out the latest styles!', 'fashion2025.jpg', ARRAY['fashion','trends'], 'public', NOW()),
(3, 3, 'text', 'Book of the Month', 'Let''s discuss our favorite books.', NULL, ARRAY['books','reading'], 'public', NOW()),
(4, 4, 'text', 'Learning Resources', 'Best online courses for you.', NULL, ARRAY['education','courses'], 'public', NOW()),
(5, 5, 'image', 'Home Decor Ideas', 'Spruce up your home!', 'decor2025.jpg', ARRAY['home','decor'], 'public', NOW());

-- 9. Insert post likes and comments (sample)
INSERT INTO post_likes (post_id, user_id, liked_at)
VALUES (1,2,NOW()), (1,3,NOW()), (2,1,NOW()), (2,3,NOW()), (3,1,NOW()), (3,2,NOW());

INSERT INTO post_comments (post_id, user_id, comment, commented_at)
VALUES (1,2,'Great post!',NOW()), (2,1,'Love this!',NOW()), (3,2,'Very informative.',NOW());

-- 10. Insert feeds (sample)
INSERT INTO feeds (user_id, description, created_at)
VALUES (1, 'Excited to join Tech Insights!', NOW()), (2, 'Loving the new fashion trends!', NOW()), (3, 'Reading a new book.', NOW());

-- 11. Insert reward logs (sample)
INSERT INTO reward_log (user_id, points, reason, created_at)
VALUES (1, 100, 'signup', NOW()), (2, 100, 'signup', NOW()), (3, 100, 'signup', NOW());

-- 12. Insert Aadhaar verification logs (sample)
INSERT INTO aadhaar_verification_logs (user_id, request_id, request_type, status, created_at)
VALUES (1, 'REQ123', 'OTP', 'verified', NOW()), (2, 'REQ124', 'OTP', 'verified', NOW()), (3, 'REQ125', 'OTP', 'verified', NOW());

-- NOTE: For 1,000,000 users, use a data generator (Python, JS, etc.) to create realistic names, emails, locations, and relationships. The above is a template for real, non-bot data. Expand as needed for full-scale testing.
