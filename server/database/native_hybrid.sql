-- ============================================
-- PROTOCOL: NATIVE HYBRID - Location & Contacts
-- ============================================

-- Add location columns to users (no PostGIS needed)
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ;

-- Location index for nearby queries
CREATE INDEX IF NOT EXISTS idx_users_location 
ON users(latitude, longitude) WHERE latitude IS NOT NULL;

-- ============================================
-- USER CONTACTS TABLE (Contact Sync)
-- ============================================

CREATE TABLE IF NOT EXISTS user_contacts (
    contact_id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
    is_on_platform BOOLEAN DEFAULT FALSE,
    matched_user_id INTEGER REFERENCES users(user_id),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, phone)
);

-- Index for finding contacts
CREATE INDEX IF NOT EXISTS idx_user_contacts_owner 
ON user_contacts(owner_id);

CREATE INDEX IF NOT EXISTS idx_user_contacts_phone 
ON user_contacts(phone);

-- ============================================
-- FIND FRIENDS ON PLATFORM FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION find_friends_on_platform(p_owner_id INTEGER)
RETURNS TABLE (
    contact_name VARCHAR,
    phone VARCHAR,
    user_id INTEGER,
    username VARCHAR,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uc.name AS contact_name,
        uc.phone,
        u.user_id,
        u.username,
        p.avatar_url
    FROM user_contacts uc
    JOIN users u ON u.phone = uc.phone OR u.phone = CONCAT('+91', uc.phone)
    LEFT JOIN profiles p ON p.user_id = u.user_id
    WHERE uc.owner_id = p_owner_id
        AND u.user_id != p_owner_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$ BEGIN
    RAISE NOTICE '✅ Native Hybrid Schema Applied';
    RAISE NOTICE '  - User location columns added';
    RAISE NOTICE '  - user_contacts table created';
    RAISE NOTICE '  - find_friends_on_platform function created';
END $$;
