-- =====================================================
-- COMPLETE FIX: Passwords + Preferences Table
-- Run this to fix login and recommendations
-- Password for all users: password123
-- =====================================================

-- 1. Update all user passwords with valid bcrypt hash for 'password123'
UPDATE users 
SET password_hash = '$2b$10$F9BeY4uXEqTKRF93L5LRR5u9TqRyCUaeahzn3ZUYC/9.VtQIUY.2'
WHERE password_hash IS NOT NULL;

-- 2. Create preferences table if not exists
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

-- 3. Insert preferences for all existing users that don't have one
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

-- 4. Verify counts
SELECT 'Users:' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Preferences:', COUNT(*) FROM preferences;
