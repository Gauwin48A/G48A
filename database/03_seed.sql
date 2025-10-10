-- 03_seed.sql
-- This script populates the database with initial data.

-- Insert sample users
INSERT INTO users (username, password_hash, email) VALUES
('johndoe', '$2b$10$f/s.G...your_hash_here...', 'johndoe@example.com'),
('janedoe', '$2b$10$f/s.G...your_hash_here...', 'janedoe@example.com');

-- Insert sample categories
INSERT INTO categories (name, description) VALUES
('Electronics', 'Gadgets, computers, and accessories'),
('Furniture', 'Home and office furniture'),
('Cars', 'Used and new cars');

-- Insert sample tiers
INSERT INTO tiers (name, price, description) VALUES
('Basic', 0.00, 'A free listing with basic visibility'),
('Premium', 9.99, 'Enhanced visibility and promotion'),
('Gold', 29.99, 'Top placement and maximum exposure');

-- Insert sample posts
INSERT INTO posts (user_id, category_id, tier_id, title, description, price, status, latitude, longitude) VALUES
(1, 1, 2, 'Slightly Used Laptop', 'A great laptop for students and professionals.', 750.00, 'active', 34.052235, -118.243683),
(2, 2, 1, 'Vintage Wooden Chair', 'A beautiful chair to complement your living room.', 120.00, 'active', 40.712776, -74.005974);

-- Insert a sample sale
INSERT INTO sales (post_id, buyer_id, sale_status) VALUES
(1, 2, 'pending');