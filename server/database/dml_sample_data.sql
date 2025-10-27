-- DML: Realistic sample data for all entities

-- Categories
INSERT INTO categories (name, description, icon_url) VALUES
('Electronics', 'Gadgets, computers, and accessories', 'icons/electronics.svg'),
('Fashion', 'Men and women clothing', 'icons/fashion.svg'),
('Home', 'Home and kitchen appliances', 'icons/home.svg'),
('Mobiles', 'Smartphones and accessories', 'icons/mobile.svg');

-- Tiers
INSERT INTO tiers (name, price, description) VALUES
('Basic', 0.00, 'Free listing'),
('Premium', 9.99, 'Enhanced visibility'),
('Gold', 29.99, 'Top placement');

-- Users (sample)
INSERT INTO users (username, password_hash, email, referral_code, created_at, preferred_language, role, aadhaar_number_masked, aadhaar_encrypted, isAadhaarVerified, verified_date)
VALUES
('johndoe', '$2b$10$hash1', 'john.doe@gmail.com', 'REF12345', NOW(), 'en', 'normal', 'XXXX-XXXX-1234', 'enc1', TRUE, NOW()),
('janesmith', '$2b$10$hash2', 'jane.smith@gmail.com', 'REF23456', NOW(), 'en', 'premium', 'XXXX-XXXX-5678', 'enc2', TRUE, NOW());

-- Add more sample data as needed for profiles, posts, etc.
