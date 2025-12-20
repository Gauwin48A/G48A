-- Create preferences table if not exists
CREATE TABLE IF NOT EXISTS preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location VARCHAR(100),
    min_price DECIMAL(10,2) DEFAULT 0,
    max_price DECIMAL(10,2) DEFAULT 100000,
    date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert profiles for all users that don't have one
INSERT INTO profiles (user_id, full_name, phone, address, bio, verified)
SELECT user_id, username, '9876543210', 'India', 'MHub User', true
FROM users
WHERE user_id NOT IN (SELECT user_id FROM profiles);

-- Insert preferences for all users that don't have one
INSERT INTO preferences (user_id, location, min_price, max_price)
SELECT user_id, 'Mumbai', 0, 100000
FROM users
WHERE user_id NOT IN (SELECT user_id FROM preferences);

-- Verify
SELECT 'Profiles:' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Preferences:', COUNT(*) FROM preferences
UNION ALL
SELECT 'Users:', COUNT(*) FROM users;
