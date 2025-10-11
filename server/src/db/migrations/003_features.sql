-- Audit Table for live location tracking
CREATE TABLE IF NOT EXISTS audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    event_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Login Audit Table
CREATE TABLE IF NOT EXISTS login_audit (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    ip_address VARCHAR(45)
);

-- Recommendations Table
CREATE TABLE IF NOT EXISTS recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    post_id INTEGER REFERENCES posts(post_id),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DML: Insert sample data for all features
INSERT INTO audit (user_id, latitude, longitude, event_type) VALUES
(1, 28.6139, 77.2090, 'location'),
(2, 19.0760, 72.8777, 'location');

INSERT INTO login_audit (user_id, latitude, longitude, ip_address) VALUES
(1, 28.6139, 77.2090, '127.0.0.1'),
(2, 19.0760, 72.8777, '127.0.0.2');

INSERT INTO recommendations (user_id, post_id, reason) VALUES
(1, 1, 'Based on your interests'),
(2, 2, 'Popular in your area');

-- Expand audit, login_audit, recommendations, and add DML for all users

-- Audit (location event for all users)
INSERT INTO audit (user_id, latitude, longitude, event_type) VALUES
(3, 12.9716, 77.5946, 'location'),
(4, 13.0827, 80.2707, 'location'),
(5, 22.5726, 88.3639, 'location'),
(6, 37.7749, -122.4194, 'location'),
(7, 34.0522, -118.2437, 'location'),
(8, 40.7128, -74.0060, 'location'),
(9, 51.5074, -0.1278, 'location'),
(10, 35.6895, 139.6917, 'location'),
(11, -33.8688, 151.2093, 'location'),
(12, 55.7558, 37.6173, 'location'),
(13, 52.5200, 13.4050, 'location'),
(14, 48.8566, 2.3522, 'location'),
(15, 41.9028, 12.4964, 'location'),
(16, 59.9342, 30.3351, 'location'),
(17, 52.3676, 4.9041, 'location'),
(18, 60.1695, 24.9354, 'location'),
(19, 35.6895, 139.6917, 'location'),
(20, -34.6037, -58.3816, 'location'),
(21, 55.7558, 37.6173, 'location'),
(22, 52.5200, 13.4050, 'location'),
(23, 48.8566, 2.3522, 'location'),
(24, 41.9028, 12.4964, 'location'),
(25, 37.7749, -122.4194, 'location'),
(26, 34.0522, -118.2437, 'location'),
(27, 40.7128, -74.0060, 'location'),
(28, 51.5074, -0.1278, 'location'),
(29, 12.9716, 77.5946, 'location'),
(30, 13.0827, 80.2707, 'location'),
(31, 22.5726, 88.3639, 'location'),
(32, 28.6139, 77.2090, 'location'),
(33, 19.0760, 72.8777, 'location'),
(34, 37.7749, -122.4194, 'location'),
(35, 34.0522, -118.2437, 'location'),
(36, 40.7128, -74.0060, 'location'),
(37, 51.5074, -0.1278, 'location'),
(38, 35.6895, 139.6917, 'location'),
(39, -33.8688, 151.2093, 'location'),
(40, 55.7558, 37.6173, 'location'),
(41, 52.5200, 13.4050, 'location'),
(42, 48.8566, 2.3522, 'location'),
(43, 41.9028, 12.4964, 'location'),
(44, 59.9342, 30.3351, 'location'),
(45, 52.3676, 4.9041, 'location'),
(46, 60.1695, 24.9354, 'location'),
(47, 35.6895, 139.6917, 'location'),
(48, -34.6037, -58.3816, 'location'),
(49, 55.7558, 37.6173, 'location'),
(50, 28.7041, 77.1025, 'location')
ON CONFLICT DO NOTHING;

-- Login Audit (all users)
INSERT INTO login_audit (user_id, latitude, longitude, ip_address) VALUES
(3, 12.9716, 77.5946, '127.0.0.3'),
(4, 13.0827, 80.2707, '127.0.0.4'),
(5, 22.5726, 88.3639, '127.0.0.5'),
(6, 37.7749, -122.4194, '127.0.0.6'),
(7, 34.0522, -118.2437, '127.0.0.7'),
(8, 40.7128, -74.0060, '127.0.0.8'),
(9, 51.5074, -0.1278, '127.0.0.9'),
(10, 35.6895, 139.6917, '127.0.0.10'),
(11, -33.8688, 151.2093, '127.0.0.11'),
(12, 55.7558, 37.6173, '127.0.0.12'),
(13, 52.5200, 13.4050, '127.0.0.13'),
(14, 48.8566, 2.3522, '127.0.0.14'),
(15, 41.9028, 12.4964, '127.0.0.15'),
(16, 59.9342, 30.3351, '127.0.0.16'),
(17, 52.3676, 4.9041, '127.0.0.17'),
(18, 60.1695, 24.9354, '127.0.0.18'),
(19, 35.6895, 139.6917, '127.0.0.19'),
(20, -34.6037, -58.3816, '127.0.0.20'),
(21, 55.7558, 37.6173, '127.0.0.21'),
(22, 52.5200, 13.4050, '127.0.0.22'),
(23, 48.8566, 2.3522, '127.0.0.23'),
(24, 41.9028, 12.4964, '127.0.0.24'),
(25, 37.7749, -122.4194, '127.0.0.25'),
(26, 34.0522, -118.2437, '127.0.0.26'),
(27, 40.7128, -74.0060, '127.0.0.27'),
(28, 51.5074, -0.1278, '127.0.0.28'),
(29, 12.9716, 77.5946, '127.0.0.29'),
(30, 13.0827, 80.2707, '127.0.0.30'),
(31, 22.5726, 88.3639, '127.0.0.31'),
(32, 28.6139, 77.2090, '127.0.0.32'),
(33, 19.0760, 72.8777, '127.0.0.33'),
(34, 37.7749, -122.4194, '127.0.0.34'),
(35, 34.0522, -118.2437, '127.0.0.35'),
(36, 40.7128, -74.0060, '127.0.0.36'),
(37, 51.5074, -0.1278, '127.0.0.37'),
(38, 35.6895, 139.6917, '127.0.0.38'),
(39, -33.8688, 151.2093, '127.0.0.39'),
(40, 55.7558, 37.6173, '127.0.0.40'),
(41, 52.5200, 13.4050, '127.0.0.41'),
(42, 48.8566, 2.3522, '127.0.0.42'),
(43, 41.9028, 12.4964, '127.0.0.43'),
(44, 59.9342, 30.3351, '127.0.0.44'),
(45, 52.3676, 4.9041, '127.0.0.45'),
(46, 60.1695, 24.9354, '127.0.0.46'),
(47, 35.6895, 139.6917, '127.0.0.47'),
(48, -34.6037, -58.3816, '127.0.0.48'),
(49, 55.7558, 37.6173, '127.0.0.49'),
(50, 28.7041, 77.1025, '127.0.0.50')
ON CONFLICT DO NOTHING;

-- Recommendations (all users)
INSERT INTO recommendations (user_id, post_id, reason) VALUES
(3, 3, 'Based on your interests'),
(4, 4, 'Popular in your area'),
(5, 5, 'Trending now'),
(6, 6, 'Recommended for you'),
(7, 7, 'Because you liked similar posts'),
(8, 8, 'Based on your profile activity'),
(9, 9, 'Curated just for you'),
(10, 10, 'We think you will like this'),
(11, 11, 'Based on your interests'),
(12, 12, 'Popular in your area'),
(13, 13, 'Trending now'),
(14, 14, 'Recommended for you'),
(15, 15, 'Because you liked similar posts'),
(16, 16, 'Based on your profile activity'),
(17, 17, 'Curated just for you'),
(18, 18, 'We think you will like this'),
(19, 19, 'Based on your interests'),
(20, 20, 'Popular in your area'),
(21, 21, 'Trending now'),
(22, 22, 'Recommended for you'),
(23, 23, 'Because you liked similar posts'),
(24, 24, 'Based on your profile activity'),
(25, 25, 'Curated just for you'),
(26, 26, 'We think you will like this'),
(27, 27, 'Based on your interests'),
(28, 28, 'Popular in your area'),
(29, 29, 'Trending now'),
(30, 30, 'Recommended for you'),
(31, 31, 'Because you liked similar posts'),
(32, 32, 'Based on your profile activity'),
(33, 33, 'Curated just for you'),
(34, 34, 'We think you will like this'),
(35, 35, 'Based on your interests'),
(36, 36, 'Popular in your area'),
(37, 37, 'Trending now'),
(38, 38, 'Recommended for you'),
(39, 39, 'Because you liked similar posts'),
(40, 40, 'Based on your profile activity'),
(41, 41, 'Curated just for you'),
(42, 42, 'We think you will like this'),
(43, 43, 'Based on your interests'),
(44, 44, 'Popular in your area'),
(45, 45, 'Trending now'),
(46, 46, 'Recommended for you'),
(47, 47, 'Because you liked similar posts'),
(48, 48, 'Based on your profile activity'),
(49, 49, 'Curated just for you'),
(50, 50, 'We think you will like this')
ON CONFLICT DO NOTHING;

-- Add more DML for feedback, complaints, notifications, categories, rewards, posts, etc. for all users as needed
