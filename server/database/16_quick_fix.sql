-- =====================================================
-- QUICK FIX: Preferences Table + Data
-- Run this SQL in your PostgreSQL client to fix recommendations
-- =====================================================

-- 1. Create preferences table if not exists
CREATE TABLE IF NOT EXISTS preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    location VARCHAR(100),
    min_price DECIMAL(10,2) DEFAULT 0,
    max_price DECIMAL(10,2) DEFAULT 100000,
    categories JSONB,
    notification_enabled BOOLEAN DEFAULT TRUE,
    date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preferences_user ON preferences(user_id);

-- 2. Insert preferences for all existing users that don't have one
INSERT INTO preferences (user_id, location, min_price, max_price, categories, notification_enabled)
SELECT 
    user_id, 
    CASE (user_id % 10)
        WHEN 0 THEN 'Mumbai'
        WHEN 1 THEN 'Hyderabad'
        WHEN 2 THEN 'Bangalore'
        WHEN 3 THEN 'Delhi'
        WHEN 4 THEN 'Chennai'
        WHEN 5 THEN 'Kolkata'
        WHEN 6 THEN 'Pune'
        WHEN 7 THEN 'Ahmedabad'
        WHEN 8 THEN 'Jaipur'
        ELSE 'Kochi'
    END,
    0, 
    100000,
    '["Electronics", "Mobiles"]'::jsonb,
    TRUE
FROM users
WHERE user_id NOT IN (SELECT user_id FROM preferences)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Verify
SELECT 'Preferences created: ' || COUNT(*)::text as status FROM preferences;
