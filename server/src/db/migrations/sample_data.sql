-- SAMPLE DATA FOR 50 USERS WITH FULL DETAILS

-- Users
INSERT INTO users (username, email, password) VALUES
-- ...repeat for 50 users...
('user1', 'user1@example.com', 'hashedpw1'),
('user2', 'user2@example.com', 'hashedpw2'),
('user3', 'user3@example.com', 'hashedpw3'),
('user4', 'user4@example.com', 'hashedpw4'),
('user5', 'user5@example.com', 'hashedpw5'),
('user6', 'user6@example.com', 'hashedpw6'),
('user7', 'user7@example.com', 'hashedpw7'),
('user8', 'user8@example.com', 'hashedpw8'),
('user9', 'user9@example.com', 'hashedpw9'),
('user10', 'user10@example.com', 'hashedpw10'),
('user11', 'user11@example.com', 'hashedpw11'),
('user12', 'user12@example.com', 'hashedpw12'),
('user13', 'user13@example.com', 'hashedpw13'),
('user14', 'user14@example.com', 'hashedpw14'),
('user15', 'user15@example.com', 'hashedpw15'),
('user16', 'user16@example.com', 'hashedpw16'),
('user17', 'user17@example.com', 'hashedpw17'),
('user18', 'user18@example.com', 'hashedpw18'),
('user19', 'user19@example.com', 'hashedpw19'),
('user20', 'user20@example.com', 'hashedpw20'),
('user21', 'user21@example.com', 'hashedpw21'),
('user22', 'user22@example.com', 'hashedpw22'),
('user23', 'user23@example.com', 'hashedpw23'),
('user24', 'user24@example.com', 'hashedpw24'),
('user25', 'user25@example.com', 'hashedpw25'),
('user26', 'user26@example.com', 'hashedpw26'),
('user27', 'user27@example.com', 'hashedpw27'),
('user28', 'user28@example.com', 'hashedpw28'),
('user29', 'user29@example.com', 'hashedpw29'),
('user30', 'user30@example.com', 'hashedpw30'),
('user31', 'user31@example.com', 'hashedpw31'),
('user32', 'user32@example.com', 'hashedpw32'),
('user33', 'user33@example.com', 'hashedpw33'),
('user34', 'user34@example.com', 'hashedpw34'),
('user35', 'user35@example.com', 'hashedpw35'),
('user36', 'user36@example.com', 'hashedpw36'),
('user37', 'user37@example.com', 'hashedpw37'),
('user38', 'user38@example.com', 'hashedpw38'),
('user39', 'user39@example.com', 'hashedpw39'),
('user40', 'user40@example.com', 'hashedpw40'),
('user41', 'user41@example.com', 'hashedpw41'),
('user42', 'user42@example.com', 'hashedpw42'),
('user43', 'user43@example.com', 'hashedpw43'),
('user44', 'user44@example.com', 'hashedpw44'),
('user45', 'user45@example.com', 'hashedpw45'),
('user46', 'user46@example.com', 'hashedpw46'),
('user47', 'user47@example.com', 'hashedpw47'),
('user48', 'user48@example.com', 'hashedpw48'),
('user49', 'user49@example.com', 'hashedpw49'),
('user50', 'user50@example.com', 'hashedpw50')
ON CONFLICT DO NOTHING;

-- Profiles, Posts, Rewards, Feedback, Complaints, Preferences, etc. for each user
-- (Repeat similar to above, referencing user_id 1-50)

-- Example for user1:
INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio) VALUES
(1, 'User One', '9000000001', 'Delhi', '/uploads/avatars/user1.png', 'Sample user 1') ON CONFLICT DO NOTHING;
INSERT INTO posts (user_id, category_id, title, description, price, status, location, image, original_price) VALUES
(1, 1, 'Sample Active Post', 'Sample description', 1000, 'active', 'Delhi', '/uploads/products/sample1.jpg', 1200),
(1, 2, 'Sample Sold Post', 'Sample description', 2000, 'sold', 'Delhi', '/uploads/products/sample2.jpg', 2200),
(1, 3, 'Sample Bought Post', 'Sample description', 1500, 'bought', 'Delhi', '/uploads/products/sample3.jpg', 1700)
ON CONFLICT DO NOTHING;
INSERT INTO rewards (user_id, points, tier) VALUES (1, 100, 'gold') ON CONFLICT DO NOTHING;
INSERT INTO feedback (user_id, message, rating) VALUES (1, 'Great app!', 5) ON CONFLICT DO NOTHING;
INSERT INTO complaints (user_id, post_id, message, status) VALUES (1, 1, 'No issue', 'closed') ON CONFLICT DO NOTHING;
INSERT INTO preferences (user_id, location, category, min_price, max_price) VALUES (1, 'Delhi', 'Electronics', 500, 5000) ON CONFLICT DO NOTHING;
-- Repeat for users 2-50

-- Expand sample data for all 50 users: profiles, posts, rewards, feedback, complaints, preferences, transactions, banners

-- Profiles
INSERT INTO profiles (user_id, full_name, phone, address, avatar_url, bio) VALUES
(2, 'User Two', '9000000002', 'Mumbai', '/uploads/avatars/user2.png', 'Sample user 2'),
(3, 'User Three', '9000000003', 'Bangalore', '/uploads/avatars/user3.png', 'Sample user 3'),
(4, 'User Four', '9000000004', 'Chennai', '/uploads/avatars/user4.png', 'Sample user 4'),
(5, 'User Five', '9000000005', 'Kolkata', '/uploads/avatars/user5.png', 'Sample user 5'),
(6, 'User Six', '9000000006', 'Delhi', '/uploads/avatars/user6.png', 'Sample user 6'),
(7, 'User Seven', '9000000007', 'Mumbai', '/uploads/avatars/user7.png', 'Sample user 7'),
(8, 'User Eight', '9000000008', 'Bangalore', '/uploads/avatars/user8.png', 'Sample user 8'),
(9, 'User Nine', '9000000009', 'Chennai', '/uploads/avatars/user9.png', 'Sample user 9'),
(10, 'User Ten', '9000000010', 'Kolkata', '/uploads/avatars/user10.png', 'Sample user 10'),
(11, 'User Eleven', '9000000011', 'Delhi', '/uploads/avatars/user11.png', 'Sample user 11'),
(12, 'User Twelve', '9000000012', 'Mumbai', '/uploads/avatars/user12.png', 'Sample user 12'),
(13, 'User Thirteen', '9000000013', 'Bangalore', '/uploads/avatars/user13.png', 'Sample user 13'),
(14, 'User Fourteen', '9000000014', 'Chennai', '/uploads/avatars/user14.png', 'Sample user 14'),
(15, 'User Fifteen', '9000000015', 'Kolkata', '/uploads/avatars/user15.png', 'Sample user 15'),
(16, 'User Sixteen', '9000000016', 'Delhi', '/uploads/avatars/user16.png', 'Sample user 16'),
(17, 'User Seventeen', '9000000017', 'Mumbai', '/uploads/avatars/user17.png', 'Sample user 17'),
(18, 'User Eighteen', '9000000018', 'Bangalore', '/uploads/avatars/user18.png', 'Sample user 18'),
(19, 'User Nineteen', '9000000019', 'Chennai', '/uploads/avatars/user19.png', 'Sample user 19'),
(20, 'User Twenty', '9000000020', 'Kolkata', '/uploads/avatars/user20.png', 'Sample user 20'),
(21, 'User Twenty One', '9000000021', 'Delhi', '/uploads/avatars/user21.png', 'Sample user 21'),
(22, 'User Twenty Two', '9000000022', 'Mumbai', '/uploads/avatars/user22.png', 'Sample user 22'),
(23, 'User Twenty Three', '9000000023', 'Bangalore', '/uploads/avatars/user23.png', 'Sample user 23'),
(24, 'User Twenty Four', '9000000024', 'Chennai', '/uploads/avatars/user24.png', 'Sample user 24'),
(25, 'User Twenty Five', '9000000025', 'Kolkata', '/uploads/avatars/user25.png', 'Sample user 25'),
(26, 'User Twenty Six', '9000000026', 'Delhi', '/uploads/avatars/user26.png', 'Sample user 26'),
(27, 'User Twenty Seven', '9000000027', 'Mumbai', '/uploads/avatars/user27.png', 'Sample user 27'),
(28, 'User Twenty Eight', '9000000028', 'Bangalore', '/uploads/avatars/user28.png', 'Sample user 28'),
(29, 'User Twenty Nine', '9000000029', 'Chennai', '/uploads/avatars/user29.png', 'Sample user 29'),
(30, 'User Thirty', '9000000030', 'Kolkata', '/uploads/avatars/user30.png', 'Sample user 30'),
(31, 'User Thirty One', '9000000031', 'Delhi', '/uploads/avatars/user31.png', 'Sample user 31'),
(32, 'User Thirty Two', '9000000032', 'Mumbai', '/uploads/avatars/user32.png', 'Sample user 32'),
(33, 'User Thirty Three', '9000000033', 'Bangalore', '/uploads/avatars/user33.png', 'Sample user 33'),
(34, 'User Thirty Four', '9000000034', 'Chennai', '/uploads/avatars/user34.png', 'Sample user 34'),
(35, 'User Thirty Five', '9000000035', 'Kolkata', '/uploads/avatars/user35.png', 'Sample user 35'),
(36, 'User Thirty Six', '9000000036', 'Delhi', '/uploads/avatars/user36.png', 'Sample user 36'),
(37, 'User Thirty Seven', '9000000037', 'Mumbai', '/uploads/avatars/user37.png', 'Sample user 37'),
(38, 'User Thirty Eight', '9000000038', 'Bangalore', '/uploads/avatars/user38.png', 'Sample user 38'),
(39, 'User Thirty Nine', '9000000039', 'Chennai', '/uploads/avatars/user39.png', 'Sample user 39'),
(40, 'User Forty', '9000000040', 'Kolkata', '/uploads/avatars/user40.png', 'Sample user 40'),
(41, 'User Forty One', '9000000041', 'Delhi', '/uploads/avatars/user41.png', 'Sample user 41'),
(42, 'User Forty Two', '9000000042', 'Mumbai', '/uploads/avatars/user42.png', 'Sample user 42'),
(43, 'User Forty Three', '9000000043', 'Bangalore', '/uploads/avatars/user43.png', 'Sample user 43'),
(44, 'User Forty Four', '9000000044', 'Chennai', '/uploads/avatars/user44.png', 'Sample user 44'),
(45, 'User Forty Five', '9000000045', 'Kolkata', '/uploads/avatars/user45.png', 'Sample user 45'),
(46, 'User Forty Six', '9000000046', 'Delhi', '/uploads/avatars/user46.png', 'Sample user 46'),
(47, 'User Forty Seven', '9000000047', 'Mumbai', '/uploads/avatars/user47.png', 'Sample user 47'),
(48, 'User Forty Eight', '9000000048', 'Bangalore', '/uploads/avatars/user48.png', 'Sample user 48'),
(49, 'User Forty Nine', '9000000049', 'Chennai', '/uploads/avatars/user49.png', 'Sample user 49'),
(50, 'User Fifty', '9000000050', 'Delhi', '/uploads/avatars/user50.png', 'Sample user 50')
ON CONFLICT DO NOTHING;

-- Posts (active, sold, bought) for each user
INSERT INTO posts (user_id, category_id, title, description, price, status, location, image, original_price) VALUES
-- User 2
(2, 1, 'Active Post 2', 'Active post description 2', 1100, 'active', 'Mumbai', '/uploads/products/sample2a.jpg', 1300),
(2, 2, 'Sold Post 2', 'Sold post description 2', 2100, 'sold', 'Mumbai', '/uploads/products/sample2b.jpg', 2300),
(2, 3, 'Bought Post 2', 'Bought post description 2', 1600, 'bought', 'Mumbai', '/uploads/products/sample2c.jpg', 1800),
-- User 3
(3, 1, 'Active Post 3', 'Active post description 3', 1200, 'active', 'Bangalore', '/uploads/products/sample3a.jpg', 1400),
(3, 2, 'Sold Post 3', 'Sold post description 3', 2200, 'sold', 'Bangalore', '/uploads/products/sample3b.jpg', 2400),
(3, 3, 'Bought Post 3', 'Bought post description 3', 1700, 'bought', 'Bangalore', '/uploads/products/sample3c.jpg', 1900),
-- User 4
(4, 1, 'Active Post 4', 'Active post description 4', 1300, 'active', 'Chennai', '/uploads/products/sample4a.jpg', 1500),
(4, 2, 'Sold Post 4', 'Sold post description 4', 2300, 'sold', 'Chennai', '/uploads/products/sample4b.jpg', 2500),
(4, 3, 'Bought Post 4', 'Bought post description 4', 1800, 'bought', 'Chennai', '/uploads/products/sample4c.jpg', 2000),
-- User 5
(5, 1, 'Active Post 5', 'Active post description 5', 1400, 'active', 'Kolkata', '/uploads/products/sample5a.jpg', 1600),
(5, 2, 'Sold Post 5', 'Sold post description 5', 2400, 'sold', 'Kolkata', '/uploads/products/sample5b.jpg', 2600),
(5, 3, 'Bought Post 5', 'Bought post description 5', 1900, 'bought', 'Kolkata', '/uploads/products/sample5c.jpg', 2100),
-- User 6
(6, 1, 'Active Post 6', 'Active post description 6', 1500, 'active', 'Delhi', '/uploads/products/sample6a.jpg', 1700),
(6, 2, 'Sold Post 6', 'Sold post description 6', 2500, 'sold', 'Delhi', '/uploads/products/sample6b.jpg', 2700),
(6, 3, 'Bought Post 6', 'Bought post description 6', 2000, 'bought', 'Delhi', '/uploads/products/sample6c.jpg', 2200),
-- User 7
(7, 1, 'Active Post 7', 'Active post description 7', 1600, 'active', 'Mumbai', '/uploads/products/sample7a.jpg', 1800),
(7, 2, 'Sold Post 7', 'Sold post description 7', 2600, 'sold', 'Mumbai', '/uploads/products/sample7b.jpg', 2800),
(7, 3, 'Bought Post 7', 'Bought post description 7', 2100, 'bought', 'Mumbai', '/uploads/products/sample7c.jpg', 2300),
-- User 8
(8, 1, 'Active Post 8', 'Active post description 8', 1700, 'active', 'Bangalore', '/uploads/products/sample8a.jpg', 1900),
(8, 2, 'Sold Post 8', 'Sold post description 8', 2700, 'sold', 'Bangalore', '/uploads/products/sample8b.jpg', 2900),
(8, 3, 'Bought Post 8', 'Bought post description 8', 2200, 'bought', 'Bangalore', '/uploads/products/sample8c.jpg', 2400),
-- User 9
(9, 1, 'Active Post 9', 'Active post description 9', 1800, 'active', 'Chennai', '/uploads/products/sample9a.jpg', 2000),
(9, 2, 'Sold Post 9', 'Sold post description 9', 2800, 'sold', 'Chennai', '/uploads/products/sample9b.jpg', 3000),
(9, 3, 'Bought Post 9', 'Bought post description 9', 2300, 'bought', 'Chennai', '/uploads/products/sample9c.jpg', 2500),
-- User 10
(10, 1, 'Active Post 10', 'Active post description 10', 1900, 'active', 'Kolkata', '/uploads/products/sample10a.jpg', 2100),
(10, 2, 'Sold Post 10', 'Sold post description 10', 2900, 'sold', 'Kolkata', '/uploads/products/sample10b.jpg', 3100),
(10, 3, 'Bought Post 10', 'Bought post description 10', 2400, 'bought', 'Kolkata', '/uploads/products/sample10c.jpg', 2600),
-- User 11
(11, 1, 'Active Post 11', 'Active post description 11', 2000, 'active', 'Delhi', '/uploads/products/sample11a.jpg', 2200),
(11, 2, 'Sold Post 11', 'Sold post description 11', 3000, 'sold', 'Delhi', '/uploads/products/sample11b.jpg', 3200),
(11, 3, 'Bought Post 11', 'Bought post description 11', 2500, 'bought', 'Delhi', '/uploads/products/sample11c.jpg', 2700),
-- User 12
(12, 1, 'Active Post 12', 'Active post description 12', 2100, 'active', 'Mumbai', '/uploads/products/sample12a.jpg', 2300),
(12, 2, 'Sold Post 12', 'Sold post description 12', 3100, 'sold', 'Mumbai', '/uploads/products/sample12b.jpg', 3300),
(12, 3, 'Bought Post 12', 'Bought post description 12', 2600, 'bought', 'Mumbai', '/uploads/products/sample12c.jpg', 2800),
-- User 13
(13, 1, 'Active Post 13', 'Active post description 13', 2200, 'active', 'Bangalore', '/uploads/products/sample13a.jpg', 2400),
(13, 2, 'Sold Post 13', 'Sold post description 13', 3200, 'sold', 'Bangalore', '/uploads/products/sample13b.jpg', 3400),
(13, 3, 'Bought Post 13', 'Bought post description 13', 2700, 'bought', 'Bangalore', '/uploads/products/sample13c.jpg', 2900),
-- User 14
(14, 1, 'Active Post 14', 'Active post description 14', 2300, 'active', 'Chennai', '/uploads/products/sample14a.jpg', 2500),
(14, 2, 'Sold Post 14', 'Sold post description 14', 3300, 'sold', 'Chennai', '/uploads/products/sample14b.jpg', 3500),
(14, 3, 'Bought Post 14', 'Bought post description 14', 2800, 'bought', 'Chennai', '/uploads/products/sample14c.jpg', 3000),
-- User 15
(15, 1, 'Active Post 15', 'Active post description 15', 2400, 'active', 'Kolkata', '/uploads/products/sample15a.jpg', 2600),
(15, 2, 'Sold Post 15', 'Sold post description 15', 3400, 'sold', 'Kolkata', '/uploads/products/sample15b.jpg', 3600),
(15, 3, 'Bought Post 15', 'Bought post description 15', 2900, 'bought', 'Kolkata', '/uploads/products/sample15c.jpg', 3100),
-- User 16
(16, 1, 'Active Post 16', 'Active post description 16', 2500, 'active', 'Delhi', '/uploads/products/sample16a.jpg', 2700),
(16, 2, 'Sold Post 16', 'Sold post description 16', 3500, 'sold', 'Delhi', '/uploads/products/sample16b.jpg', 3700),
(16, 3, 'Bought Post 16', 'Bought post description 16', 3000, 'bought', 'Delhi', '/uploads/products/sample16c.jpg', 3200),
-- User 17
(17, 1, 'Active Post 17', 'Active post description 17', 2600, 'active', 'Mumbai', '/uploads/products/sample17a.jpg', 2800),
(17, 2, 'Sold Post 17', 'Sold post description 17', 3600, 'sold', 'Mumbai', '/uploads/products/sample17b.jpg', 3800),
(17, 3, 'Bought Post 17', 'Bought post description 17', 3100, 'bought', 'Mumbai', '/uploads/products/sample17c.jpg', 3300),
-- User 18
(18, 1, 'Active Post 18', 'Active post description 18', 2700, 'active', 'Bangalore', '/uploads/products/sample18a.jpg', 2900),
(18, 2, 'Sold Post 18', 'Sold post description 18', 3700, 'sold', 'Bangalore', '/uploads/products/sample18b.jpg', 3900),
(18, 3, 'Bought Post 18', 'Bought post description 18', 3200, 'bought', 'Bangalore', '/uploads/products/sample18c.jpg', 3400),
-- User 19
(19, 1, 'Active Post 19', 'Active post description 19', 2800, 'active', 'Chennai', '/uploads/products/sample19a.jpg', 3000),
(19, 2, 'Sold Post 19', 'Sold post description 19', 3800, 'sold', 'Chennai', '/uploads/products/sample19b.jpg', 4000),
(19, 3, 'Bought Post 19', 'Bought post description 19', 3300, 'bought', 'Chennai', '/uploads/products/sample19c.jpg', 3500),
-- User 20
(20, 1, 'Active Post 20', 'Active post description 20', 2900, 'active', 'Kolkata', '/uploads/products/sample20a.jpg', 3100),
(20, 2, 'Sold Post 20', 'Sold post description 20', 3900, 'sold', 'Kolkata', '/uploads/products/sample20b.jpg', 4100),
(20, 3, 'Bought Post 20', 'Bought post description 20', 3400, 'bought', 'Kolkata', '/uploads/products/sample20c.jpg', 3600),
-- User 21
(21, 1, 'Active Post 21', 'Active post description 21', 3000, 'active', 'Delhi', '/uploads/products/sample21a.jpg', 3200),
(21, 2, 'Sold Post 21', 'Sold post description 21', 4000, 'sold', 'Delhi', '/uploads/products/sample21b.jpg', 4200),
(21, 3, 'Bought Post 21', 'Bought post description 21', 3500, 'bought', 'Delhi', '/uploads/products/sample21c.jpg', 3700),
-- User 22
(22, 1, 'Active Post 22', 'Active post description 22', 3100, 'active', 'Mumbai', '/uploads/products/sample22a.jpg', 3300),
(22, 2, 'Sold Post 22', 'Sold post description 22', 4100, 'sold', 'Mumbai', '/uploads/products/sample22b.jpg', 4300),
(22, 3, 'Bought Post 22', 'Bought post description 22', 3600, 'bought', 'Mumbai', '/uploads/products/sample22c.jpg', 3800),
-- User 23
(23, 1, 'Active Post 23', 'Active post description 23', 3200, 'active', 'Bangalore', '/uploads/products/sample23a.jpg', 3400),
(23, 2, 'Sold Post 23', 'Sold post description 23', 4200, 'sold', 'Bangalore', '/uploads/products/sample23b.jpg', 4400),
(23, 3, 'Bought Post 23', 'Bought post description 23', 3700, 'bought', 'Bangalore', '/uploads/products/sample23c.jpg', 3900),
-- User 24
(24, 1, 'Active Post 24', 'Active post description 24', 3300, 'active', 'Chennai', '/uploads/products/sample24a.jpg', 3500),
(24, 2, 'Sold Post 24', 'Sold post description 24', 4300, 'sold', 'Chennai', '/uploads/products/sample24b.jpg', 4500),
(24, 3, 'Bought Post 24', 'Bought post description 24', 3800, 'bought', 'Chennai', '/uploads/products/sample24c.jpg', 4000),
-- User 25
(25, 1, 'Active Post 25', 'Active post description 25', 3400, 'active', 'Kolkata', '/uploads/products/sample25a.jpg', 3600),
(25, 2, 'Sold Post 25', 'Sold post description 25', 4400, 'sold', 'Kolkata', '/uploads/products/sample25b.jpg', 4600),
(25, 3, 'Bought Post 25', 'Bought post description 25', 3900, 'bought', 'Kolkata', '/uploads/products/sample25c.jpg', 4100),
-- User 26
(26, 1, 'Active Post 26', 'Active post description 26', 3500, 'active', 'Delhi', '/uploads/products/sample26a.jpg', 3700),
(26, 2, 'Sold Post 26', 'Sold post description 26', 4500, 'sold', 'Delhi', '/uploads/products/sample26b.jpg', 4700),
(26, 3, 'Bought Post 26', 'Bought post description 26', 4000, 'bought', 'Delhi', '/uploads/products/sample26c.jpg', 4200),
-- User 27
(27, 1, 'Active Post 27', 'Active post description 27', 3600, 'active', 'Mumbai', '/uploads/products/sample27a.jpg', 3800),
(27, 2, 'Sold Post 27', 'Sold post description 27', 4600, 'sold', 'Mumbai', '/uploads/products/sample27b.jpg', 4800),
(27, 3, 'Bought Post 27', 'Bought post description 27', 4100, 'bought', 'Mumbai', '/uploads/products/sample27c.jpg', 4300),
-- User 28
(28, 1, 'Active Post 28', 'Active post description 28', 3700, 'active', 'Bangalore', '/uploads/products/sample28a.jpg', 3900),
(28, 2, 'Sold Post 28', 'Sold post description 28', 4700, 'sold', 'Bangalore', '/uploads/products/sample28b.jpg', 4900),
(28, 3, 'Bought Post 28', 'Bought post description 28', 4200, 'bought', 'Bangalore', '/uploads/products/sample28c.jpg', 4400),
-- User 29
(29, 1, 'Active Post 29', 'Active post description 29', 3800, 'active', 'Chennai', '/uploads/products/sample29a.jpg', 4000),
(29, 2, 'Sold Post 29', 'Sold post description 29', 4800, 'sold', 'Chennai', '/uploads/products/sample29b.jpg', 5000),
(29, 3, 'Bought Post 29', 'Bought post description 29', 4300, 'bought', 'Chennai', '/uploads/products/sample29c.jpg', 4500),
-- User 30
(30, 1, 'Active Post 30', 'Active post description 30', 3900, 'active', 'Kolkata', '/uploads/products/sample30a.jpg', 4100),
(30, 2, 'Sold Post 30', 'Sold post description 30', 4900, 'sold', 'Kolkata', '/uploads/products/sample30b.jpg', 5100),
(30, 3, 'Bought Post 30', 'Bought post description 30', 4400, 'bought', 'Kolkata', '/uploads/products/sample30c.jpg', 4600),
-- User 31
(31, 1, 'Active Post 31', 'Active post description 31', 4000, 'active', 'Delhi', '/uploads/products/sample31a.jpg', 4200),
(31, 2, 'Sold Post 31', 'Sold post description 31', 5000, 'sold', 'Delhi', '/uploads/products/sample31b.jpg', 5200),
(31, 3, 'Bought Post 31', 'Bought post description 31', 4500, 'bought', 'Delhi', '/uploads/products/sample31c.jpg', 4700),
-- User 32
(32, 1, 'Active Post 32', 'Active post description 32', 4100, 'active', 'Mumbai', '/uploads/products/sample32a.jpg', 4300),
(32, 2, 'Sold Post 32', 'Sold post description 32', 5100, 'sold', 'Mumbai', '/uploads/products/sample32b.jpg', 5300),
(32, 3, 'Bought Post 32', 'Bought post description 32', 4600, 'bought', 'Mumbai', '/uploads/products/sample32c.jpg', 4800),
-- User 33
(33, 1, 'Active Post 33', 'Active post description 33', 4200, 'active', 'Bangalore', '/uploads/products/sample33a.jpg', 4400),
(33, 2, 'Sold Post 33', 'Sold post description 33', 5200, 'sold', 'Bangalore', '/uploads/products/sample33b.jpg', 5400),
(33, 3, 'Bought Post 33', 'Bought post description 33', 4700, 'bought', 'Bangalore', '/uploads/products/sample33c.jpg', 4900),
-- User 34
(34, 1, 'Active Post 34', 'Active post description 34', 4300, 'active', 'Chennai', '/uploads/products/sample34a.jpg', 4500),
(34, 2, 'Sold Post 34', 'Sold post description 34', 5300, 'sold', 'Chennai', '/uploads/products/sample34b.jpg', 5500),
(34, 3, 'Bought Post 34', 'Bought post description 34', 4800, 'bought', 'Chennai', '/uploads/products/sample34c.jpg', 5000),
-- User 35
(35, 1, 'Active Post 35', 'Active post description 35', 4400, 'active', 'Kolkata', '/uploads/products/sample35a.jpg', 4600),
(35, 2, 'Sold Post 35', 'Sold post description 35', 5400, 'sold', 'Kolkata', '/uploads/products/sample35b.jpg', 5600),
(35, 3, 'Bought Post 35', 'Bought post description 35', 4900, 'bought', 'Kolkata', '/uploads/products/sample35c.jpg', 5100),
-- User 36
(36, 1, 'Active Post 36', 'Active post description 36', 4500, 'active', 'Delhi', '/uploads/products/sample36a.jpg', 4700),
(36, 2, 'Sold Post 36', 'Sold post description 36', 5500, 'sold', 'Delhi', '/uploads/products/sample36b.jpg', 5700),
(36, 3, 'Bought Post 36', 'Bought post description 36', 5000, 'bought', 'Delhi', '/uploads/products/sample36c.jpg', 5200),
-- User 37
(37, 1, 'Active Post 37', 'Active post description 37', 4600, 'active', 'Mumbai', '/uploads/products/sample37a.jpg', 4800),
(37, 2, 'Sold Post 37', 'Sold post description 37', 5600, 'sold', 'Mumbai', '/uploads/products/sample37b.jpg', 5800),
(37, 3, 'Bought Post 37', 'Bought post description 37', 5100, 'bought', 'Mumbai', '/uploads/products/sample37c.jpg', 5300),
-- User 38
(38, 1, 'Active Post 38', 'Active post description 38', 4700, 'active', 'Bangalore', '/uploads/products/sample38a.jpg', 4900),
(38, 2, 'Sold Post 38', 'Sold post description 38', 5700, 'sold', 'Bangalore', '/uploads/products/sample38b.jpg', 5900),
(38, 3, 'Bought Post 38', 'Bought post description 38', 5200, 'bought', 'Bangalore', '/uploads/products/sample38c.jpg', 5400),
-- User 39
(39, 1, 'Active Post 39', 'Active post description 39', 4800, 'active', 'Chennai', '/uploads/products/sample39a.jpg', 5000),
(39, 2, 'Sold Post 39', 'Sold post description 39', 5800, 'sold', 'Chennai', '/uploads/products/sample39b.jpg', 6000),
(39, 3, 'Bought Post 39', 'Bought post description 39', 5300, 'bought', 'Chennai', '/uploads/products/sample39c.jpg', 5500),
-- User 40
(40, 1, 'Active Post 40', 'Active post description 40', 4900, 'active', 'Kolkata', '/uploads/products/sample40a.jpg', 5100),
(40, 2, 'Sold Post 40', 'Sold post description 40', 5900, 'sold', 'Kolkata', '/uploads/products/sample40b.jpg', 6100),
(40, 3, 'Bought Post 40', 'Bought post description 40', 5400, 'bought', 'Kolkata', '/uploads/products/sample40c.jpg', 5600),
-- User 41
(41, 1, 'Active Post 41', 'Active post description 41', 5000, 'active', 'Delhi', '/uploads/products/sample41a.jpg', 5200),
(41, 2, 'Sold Post 41', 'Sold post description 41', 6000, 'sold', 'Delhi', '/uploads/products/sample41b.jpg', 6200),
(41, 3, 'Bought Post 41', 'Bought post description 41', 5500, 'bought', 'Delhi', '/uploads/products/sample41c.jpg', 5700),
-- User 42
(42, 1, 'Active Post 42', 'Active post description 42', 5100, 'active', 'Mumbai', '/uploads/products/sample42a.jpg', 5300),
(42, 2, 'Sold Post 42', 'Sold post description 42', 6100, 'sold', 'Mumbai', '/uploads/products/sample42b.jpg', 6300),
(42, 3, 'Bought Post 42', 'Bought post description 42', 5600, 'bought', 'Mumbai', '/uploads/products/sample42c.jpg', 5800),
-- User 43
(43, 1, 'Active Post 43', 'Active post description 43', 5200, 'active', 'Bangalore', '/uploads/products/sample43a.jpg', 5400),
(43, 2, 'Sold Post 43', 'Sold post description 43', 6200, 'sold', 'Bangalore', '/uploads/products/sample43b.jpg', 6400),
(43, 3, 'Bought Post 43', 'Bought post description 43', 5700, 'bought', 'Bangalore', '/uploads/products/sample43c.jpg', 5900),
-- User 44
(44, 1, 'Active Post 44', 'Active post description 44', 5300, 'active', 'Chennai', '/uploads/products/sample44a.jpg', 5500),
(44, 2, 'Sold Post 44', 'Sold post description 44', 6300, 'sold', 'Chennai', '/uploads/products/sample44b.jpg', 6500),
(44, 3, 'Bought Post 44', 'Bought post description 44', 5800, 'bought', 'Chennai', '/uploads/products/sample44c.jpg', 6000),
-- User 45
(45, 1, 'Active Post 45', 'Active post description 45', 5400, 'active', 'Kolkata', '/uploads/products/sample45a.jpg', 5600),
(45, 2, 'Sold Post 45', 'Sold post description 45', 6400, 'sold', 'Kolkata', '/uploads/products/sample45b.jpg', 6600),
(45, 3, 'Bought Post 45', 'Bought post description 45', 5900, 'bought', 'Kolkata', '/uploads/products/sample45c.jpg', 6100),
-- User 46
(46, 1, 'Active Post 46', 'Active post description 46', 5500, 'active', 'Delhi', '/uploads/products/sample46a.jpg', 5700),
(46, 2, 'Sold Post 46', 'Sold post description 46', 6500, 'sold', 'Delhi', '/uploads/products/sample46b.jpg', 6700),
(46, 3, 'Bought Post 46', 'Bought post description 46', 6000, 'bought', 'Delhi', '/uploads/products/sample46c.jpg', 6200),
-- User 47
(47, 1, 'Active Post 47', 'Active post description 47', 5600, 'active', 'Mumbai', '/uploads/products/sample47a.jpg', 5800),
(47, 2, 'Sold Post 47', 'Sold post description 47', 6600, 'sold', 'Mumbai', '/uploads/products/sample47b.jpg', 6800),
(47, 3, 'Bought Post 47', 'Bought post description 47', 6100, 'bought', 'Mumbai', '/uploads/products/sample47c.jpg', 6300),
-- User 48
(48, 1, 'Active Post 48', 'Active post description 48', 5700, 'active', 'Bangalore', '/uploads/products/sample48a.jpg', 5900),
(48, 2, 'Sold Post 48', 'Sold post description 48', 6700, 'sold', 'Bangalore', '/uploads/products/sample48b.jpg', 6900),
(48, 3, 'Bought Post 48', 'Bought post description 48', 6200, 'bought', 'Bangalore', '/uploads/products/sample48c.jpg', 6400),
-- User 49
(49, 1, 'Active Post 49', 'Active post description 49', 5800, 'active', 'Chennai', '/uploads/products/sample49a.jpg', 6000),
(49, 2, 'Sold Post 49', 'Sold post description 49', 6700, 'sold', 'Chennai', '/uploads/products/sample49b.jpg', 6900),
(49, 3, 'Bought Post 49', 'Bought post description 49', 6300, 'bought', 'Chennai', '/uploads/products/sample49c.jpg', 6500),
-- User 50
(50, 1, 'Active Post 50', 'Active post description 50', 5000, 'active', 'Delhi', '/uploads/products/sample50a.jpg', 5200),
(50, 2, 'Sold Post 50', 'Sold post description 50', 6000, 'sold', 'Delhi', '/uploads/products/sample50b.jpg', 6200),
(50, 3, 'Bought Post 50', 'Bought post description 50', 7000, 'bought', 'Delhi', '/uploads/products/sample50c.jpg', 7200)
ON CONFLICT DO NOTHING;

-- Rewards
INSERT INTO rewards (user_id, points, tier) VALUES
(2, 120, 'silver'), (3, 130, 'gold'), (4, 140, 'bronze'), (5, 150, 'gold'),
(6, 160, 'silver'), (7, 170, 'gold'), (8, 180, 'bronze'), (9, 190, 'gold'),
(10, 200, 'silver'), (11, 210, 'gold'), (12, 220, 'bronze'), (13, 230, 'gold'),
(14, 240, 'silver'), (15, 250, 'gold'), (16, 260, 'bronze'), (17, 270, 'gold'),
(18, 280, 'silver'), (19, 290, 'gold'), (20, 300, 'bronze'), (21, 310, 'gold'),
(22, 320, 'silver'), (23, 330, 'gold'), (24, 340, 'bronze'), (25, 350, 'gold'),
(26, 360, 'silver'), (27, 370, 'gold'), (28, 380, 'bronze'), (29, 390, 'gold'),
(30, 400, 'silver'), (31, 410, 'gold'), (32, 420, 'bronze'), (33, 430, 'gold'),
(34, 440, 'silver'), (35, 450, 'gold'), (36, 460, 'bronze'), (37, 470, 'gold'),
(38, 480, 'silver'), (39, 490, 'gold'), (40, 500, 'bronze'), (41, 510, 'gold'),
(42, 520, 'silver'), (43, 530, 'gold'), (44, 540, 'bronze'), (45, 550, 'gold'),
(46, 560, 'silver'), (47, 570, 'gold'), (48, 580, 'bronze'), (49, 590, 'gold'),
(50, 600, 'platinum')
ON CONFLICT DO NOTHING;

-- Feedback
INSERT INTO feedback (user_id, message, rating) VALUES
(2, 'Great app!', 5), (3, 'Very useful', 4), (4, 'Good experience', 5), (5, 'Nice UI', 4),
(6, 'Loved it!', 5), (7, 'Will recommend', 4), (8, 'Satisfactory', 3), (9, 'Could be better', 2),
(10, 'Excellent!', 5), (11, 'Pretty good', 4), (12, 'Not bad', 3), (13, 'Awesome', 5),
(14, 'Fantastic', 5), (15, 'Superb', 4), (16, 'Mediocre', 3), (17, 'Impressive', 5),
(18, 'Remarkable', 5), (19, 'Nice features', 4), (20, 'Decent', 3), (21, 'Outstanding', 5),
(22, 'Exceptional', 5), (23, 'Very helpful', 4), (24, 'Average', 3), (25, 'Above average', 4),
(26, 'Noteworthy', 5), (27, 'Commendable', 4), (28, 'Fair', 3), (29, 'Good value', 4),
(30, 'Wonderful', 5), (31, 'Pleasant', 4), (32, 'Acceptable', 3), (33, 'Extraordinary', 5),
(34, 'Astounding', 5), (35, 'Admirable', 4), (36, 'Passable', 3), (37, 'Striking', 5),
(38, 'Stunning', 5), (39, 'Noteworthy', 4), (40, 'Satisfactory', 3), (41, 'Exceptional', 5),
(42, 'Incredible', 5), (43, 'Very good', 4), (44, 'Fair', 3), (45, 'Remarkable', 5),
(46, 'Impressive', 5), (47, 'Nice app', 4), (48, 'Could be improved', 3), (49, 'Great job', 5),
(50, 'Excellent work', 5)
ON CONFLICT DO NOTHING;

-- Complaints
INSERT INTO complaints (user_id, post_id, message, status) VALUES
(2, 2, 'No issue', 'closed'), (3, 3, 'Minor issue', 'open'), (4, 4, 'Resolved', 'closed'), (5, 5, 'Pending', 'open'),
(6, 6, 'No complaints', 'closed'), (7, 7, 'Issue fixed', 'closed'), (8, 8, 'Not resolved', 'open'), (9, 9, 'Waiting for response', 'open'),
(10, 10, 'No issue', 'closed'), (11, 11, 'Quick response', 'closed'), (12, 12, 'Satisfactory resolution', 'closed'), (13, 13, 'Issue resolved', 'closed'),
(14, 14, 'No complaints', 'closed'), (15, 15, 'Resolved quickly', 'closed'), (16, 16, 'Not satisfied', 'open'), (17, 17, 'Excellent support', 'closed'),
(18, 18, 'Very responsive', 'closed'), (19, 19, 'Average support', 'open'), (20, 20, 'No complaints', 'closed'), (21, 21, 'Quick resolution', 'closed'),
(22, 22, 'No issue', 'closed'), (23, 23, 'Minor delay', 'open'), (24, 24, 'Resolved', 'closed'), (25, 25, 'Pending', 'open'),
(26, 26, 'No complaints', 'closed'), (27, 27, 'Issue fixed', 'closed'), (28, 28, 'Not resolved', 'open'), (29, 29, 'Waiting for response', 'open'),
(30, 30, 'No issue', 'closed'), (31, 31, 'Quick response', 'closed'), (32, 32, 'Satisfactory resolution', 'closed'), (33, 33, 'Issue resolved', 'closed'),
(34, 34, 'No complaints', 'closed'), (35, 35, 'Resolved quickly', 'closed'), (36, 36, 'Not satisfied', 'open'), (37, 37, 'Excellent support', 'closed'),
(38, 38, 'Very responsive', 'closed'), (39, 39, 'Average support', 'open'), (40, 40, 'No complaints', 'closed'), (41, 41, 'Quick resolution', 'closed'),
(42, 42, 'No issue', 'closed'), (43, 43, 'Minor delay', 'open'), (44, 44, 'Resolved', 'closed'), (45, 45, 'Pending', 'open'),
(46, 46, 'No complaints', 'closed'), (47, 47, 'Issue fixed', 'closed'), (48, 48, 'Not resolved', 'open'), (49, 49, 'Waiting for response', 'open'),
(50, 50, 'No complaints', 'closed')
ON CONFLICT DO NOTHING;

-- Preferences
INSERT INTO preferences (user_id, location, category, min_price, max_price) VALUES
(2, 'Mumbai', 'Electronics', 1000, 10000), (3, 'Bangalore', 'Fashion', 500, 5000), (4, 'Chennai', 'Home', 800, 8000), (5, 'Kolkata', 'Mobile', 1200, 12000),
(6, 'Delhi', 'Books', 300, 3000), (7, 'Mumbai', 'Fashion', 700, 7000), (8, 'Bangalore', 'Electronics', 900, 9000), (9, 'Chennai', 'Home', 1100, 11000),
(10, 'Kolkata', 'Mobile', 1300, 13000), (11, 'Delhi', 'Books', 350, 3500), (12, 'Mumbai', 'Fashion', 750, 7500), (13, 'Bangalore', 'Electronics', 950, 9500),
(14, 'Chennai', 'Home', 1150, 11500), (15, 'Kolkata', 'Mobile', 1350, 13500), (16, 'Delhi', 'Books', 400, 4000), (17, 'Mumbai', 'Fashion', 800, 8000),
(18, 'Bangalore', 'Electronics', 1000, 10000), (19, 'Chennai', 'Home', 1200, 12000), (20, 'Kolkata', 'Mobile', 1400, 14000), (21, 'Delhi', 'Books', 450, 4500),
(22, 'Mumbai', 'Fashion', 850, 8500), (23, 'Bangalore', 'Electronics', 1050, 10500), (24, 'Chennai', 'Home', 1250, 12500), (25, 'Kolkata', 'Mobile', 1450, 14500),
(26, 'Delhi', 'Books', 500, 5000), (27, 'Mumbai', 'Fashion', 900, 9000), (28, 'Bangalore', 'Electronics', 1100, 11000), (29, 'Chennai', 'Home', 1300, 13000),
(30, 'Kolkata', 'Mobile', 1500, 15000), (31, 'Delhi', 'Books', 550, 5500), (32, 'Mumbai', 'Fashion', 950, 9500), (33, 'Bangalore', 'Electronics', 1150, 11500),
(34, 'Chennai', 'Home', 1350, 13500), (35, 'Kolkata', 'Mobile', 1550, 15500), (36, 'Delhi', 'Books', 600, 6000), (37, 'Mumbai', 'Fashion', 1000, 10000),
(38, 'Bangalore', 'Electronics', 1200, 12000), (39, 'Chennai', 'Home', 1400, 14000), (40, 'Kolkata', 'Mobile', 1600, 16000), (41, 'Delhi', 'Books', 650, 6500),
(42, 'Mumbai', 'Fashion', 1050, 10500), (43, 'Bangalore', 'Electronics', 1250, 12500), (44, 'Chennai', 'Home', 1450, 14500), (45, 'Kolkata', 'Mobile', 1650, 16500),
(46, 'Delhi', 'Books', 700, 7000), (47, 'Mumbai', 'Fashion', 1100, 11000), (48, 'Bangalore', 'Electronics', 1300, 13000), (49, 'Chennai', 'Home', 1500, 15000),
(50, 'Delhi', 'Electronics', 2000, 20000)
ON CONFLICT DO NOTHING;

-- SaleDone & SaleUndone (transactions)
INSERT INTO transactions (post_id, buyer_id, seller_id, status, amount) VALUES
(2, 3, 2, 'done', 2100), (3, 4, 3, 'done', 2200), (4, 5, 4, 'undone', 2300), (5, 6, 5, 'done', 2400),
(6, 7, 6, 'done', 2500), (7, 8, 7, 'undone', 2600), (8, 9, 8, 'done', 2700), (9, 10, 9, 'done', 2800),
(10, 11, 10, 'undone', 2900), (11, 12, 11, 'done', 3000), (12, 13, 12, 'done', 3100), (13, 14, 13, 'undone', 3200),
(14, 15, 14, 'done', 3300), (15, 16, 15, 'done', 3400), (16, 17, 16, 'undone', 3500), (17, 18, 17, 'done', 3600),
(18, 19, 18, 'done', 3700), (19, 20, 19, 'undone', 3800), (20, 21, 20, 'done', 3900), (21, 22, 21, 'done', 4000),
(22, 23, 22, 'undone', 4100), (23, 24, 23, 'done', 4200), (24, 25, 24, 'done', 4300), (25, 26, 25, 'undone', 4400),
(26, 27, 26, 'done', 4500), (27, 28, 27, 'done', 4600), (28, 29, 28, 'undone', 4700), (29, 30, 29, 'done', 4800),
(30, 31, 30, 'done', 4900), (31, 32, 31, 'undone', 5000), (32, 33, 32, 'done', 5100), (33, 34, 33, 'done', 5200),
(34, 35, 34, 'undone', 5300), (35, 36, 35, 'done', 5400), (36, 37, 36, 'done', 5500), (37, 38, 37, 'undone', 5600),
(38, 39, 38, 'done', 5700), (39, 40, 39, 'done', 5800), (40, 41, 40, 'undone', 5900), (41, 42, 41, 'done', 6000),
(42, 43, 42, 'done', 6100), (43, 44, 43, 'undone', 6200), (44, 45, 44, 'done', 6300), (45, 46, 45, 'done', 6400),
(46, 47, 46, 'undone', 6500), (47, 48, 47, 'done', 6600), (48, 49, 48, 'done', 6700), (49, 50, 49, 'undone', 6800),
(50, 1, 50, 'done', 7000)
ON CONFLICT DO NOTHING;

-- Banner images
-- (Assume banner_url column exists in profiles)
UPDATE profiles SET banner_url = '/uploads/banners/banner1.jpg' WHERE user_id = 1;
UPDATE profiles SET banner_url = '/uploads/banners/banner2.jpg' WHERE user_id = 2;
UPDATE profiles SET banner_url = '/uploads/banners/banner3.jpg' WHERE user_id = 3;
UPDATE profiles SET banner_url = '/uploads/banners/banner4.jpg' WHERE user_id = 4;
UPDATE profiles SET banner_url = '/uploads/banners/banner5.jpg' WHERE user_id = 5;
UPDATE profiles SET banner_url = '/uploads/banners/banner6.jpg' WHERE user_id = 6;
UPDATE profiles SET banner_url = '/uploads/banners/banner7.jpg' WHERE user_id = 7;
UPDATE profiles SET banner_url = '/uploads/banners/banner8.jpg' WHERE user_id = 8;
UPDATE profiles SET banner_url = '/uploads/banners/banner9.jpg' WHERE user_id = 9;
UPDATE profiles SET banner_url = '/uploads/banners/banner10.jpg' WHERE user_id = 10;
UPDATE profiles SET banner_url = '/uploads/banners/banner11.jpg' WHERE user_id = 11;
UPDATE profiles SET banner_url = '/uploads/banners/banner12.jpg' WHERE user_id = 12;
UPDATE profiles SET banner_url = '/uploads/banners/banner13.jpg' WHERE user_id = 13;
UPDATE profiles SET banner_url = '/uploads/banners/banner14.jpg' WHERE user_id = 14;
UPDATE profiles SET banner_url = '/uploads/banners/banner15.jpg' WHERE user_id = 15;
UPDATE profiles SET banner_url = '/uploads/banners/banner16.jpg' WHERE user_id = 16;
UPDATE profiles SET banner_url = '/uploads/banners/banner17.jpg' WHERE user_id = 17;
UPDATE profiles SET banner_url = '/uploads/banners/banner18.jpg' WHERE user_id = 18;
UPDATE profiles SET banner_url = '/uploads/banners/banner19.jpg' WHERE user_id = 19;
UPDATE profiles SET banner_url = '/uploads/banners/banner20.jpg' WHERE user_id = 20;
UPDATE profiles SET banner_url = '/uploads/banners/banner21.jpg' WHERE user_id = 21;
UPDATE profiles SET banner_url = '/uploads/banners/banner22.jpg' WHERE user_id = 22;
UPDATE profiles SET banner_url = '/uploads/banners/banner23.jpg' WHERE user_id = 23;
UPDATE profiles SET banner_url = '/uploads/banners/banner24.jpg' WHERE user_id = 24;
UPDATE profiles SET banner_url = '/uploads/banners/banner25.jpg' WHERE user_id = 25;
UPDATE profiles SET banner_url = '/uploads/banners/banner26.jpg' WHERE user_id = 26;
UPDATE profiles SET banner_url = '/uploads/banners/banner27.jpg' WHERE user_id = 27;
UPDATE profiles SET banner_url = '/uploads/banners/banner28.jpg' WHERE user_id = 28;
UPDATE profiles SET banner_url = '/uploads/banners/banner29.jpg' WHERE user_id = 29;
UPDATE profiles SET banner_url = '/uploads/banners/banner30.jpg' WHERE user_id = 30;
UPDATE profiles SET banner_url = '/uploads/banners/banner31.jpg' WHERE user_id = 31;
UPDATE profiles SET banner_url = '/uploads/banners/banner32.jpg' WHERE user_id = 32;
UPDATE profiles SET banner_url = '/uploads/banners/banner33.jpg' WHERE user_id = 33;
UPDATE profiles SET banner_url = '/uploads/banners/banner34.jpg' WHERE user_id = 34;
UPDATE profiles SET banner_url = '/uploads/banners/banner35.jpg' WHERE user_id = 35;
UPDATE profiles SET banner_url = '/uploads/banners/banner36.jpg' WHERE user_id = 36;
UPDATE profiles SET banner_url = '/uploads/banners/banner37.jpg' WHERE user_id = 37;
UPDATE profiles SET banner_url = '/uploads/banners/banner38.jpg' WHERE user_id = 38;
UPDATE profiles SET banner_url = '/uploads/banners/banner39.jpg' WHERE user_id = 39;
UPDATE profiles SET banner_url = '/uploads/banners/banner40.jpg' WHERE user_id = 40;
UPDATE profiles SET banner_url = '/uploads/banners/banner41.jpg' WHERE user_id = 41;
UPDATE profiles SET banner_url = '/uploads/banners/banner42.jpg' WHERE user_id = 42;
UPDATE profiles SET banner_url = '/uploads/banners/banner43.jpg' WHERE user_id = 43;
UPDATE profiles SET banner_url = '/uploads/banners/banner44.jpg' WHERE user_id = 44;
UPDATE profiles SET banner_url = '/uploads/banners/banner45.jpg' WHERE user_id = 45;
UPDATE profiles SET banner_url = '/uploads/banners/banner46.jpg' WHERE user_id = 46;
UPDATE profiles SET banner_url = '/uploads/banners/banner47.jpg' WHERE user_id = 47;
UPDATE profiles SET banner_url = '/uploads/banners/banner48.jpg' WHERE user_id = 48;
UPDATE profiles SET banner_url = '/uploads/banners/banner49.jpg' WHERE user_id = 49;
UPDATE profiles SET banner_url = '/uploads/banners/banner50.jpg' WHERE user_id = 50;

-- Each user now has: profile, posts (active, sold, bought), rewards, feedback, complaints, preferences, banner, SaleDone/Undone, images.