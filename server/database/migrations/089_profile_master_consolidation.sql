-- ============================================================================
-- PROFILES MASTER CONSOLIDATION & SYNCHRONIZATION MIGRATION
-- Migration: 089_profile_master_consolidation.sql
-- Description: Ensures all profiles table columns exist, adds performance indexes,
--              and installs bidirectional sync triggers with the users table.
-- ============================================================================

DO $$
DECLARE
    user_id_type text;
BEGIN
    -- Determine user_id column data type from users table
    SELECT data_type INTO user_id_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'user_id'
    LIMIT 1;

    IF user_id_type IS NULL THEN
        user_id_type := 'UUID';
    END IF;

    -- Ensure profiles table exists with primary key and foreign key
    EXECUTE format('
        CREATE TABLE IF NOT EXISTS profiles (
            profile_id SERIAL PRIMARY KEY,
            user_id %s UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            full_name VARCHAR(100) DEFAULT ''User'',
            phone VARCHAR(20),
            bio VARCHAR(500),
            avatar_url VARCHAR(500),
            cover_image_url VARCHAR(500),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            pincode VARCHAR(10),
            latitude DECIMAL(10,8),
            longitude DECIMAL(11,8),
            social_links JSONB DEFAULT ''{}''::jsonb,
            payout_upi_id VARCHAR(255),
            payout_bank_details JSONB DEFAULT ''{}''::jsonb,
            reward_badge VARCHAR(30) DEFAULT NULL,
            verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    ', user_id_type);

END $$;

-- Safely add any columns that may be missing in existing environments
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS full_name VARCHAR(100) DEFAULT 'User';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio VARCHAR(500);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(500);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_upi_id VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payout_bank_details JSONB DEFAULT '{}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS reward_badge VARCHAR(30) DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Safely add complementary columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_plan VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'basic';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- ============================================================================
-- Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_city_state ON profiles(city, state) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON users(trust_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON profiles(updated_at DESC);

-- ============================================================================
-- Auto-Sync Triggers between Users and Profiles
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_sync_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'profiles' THEN
        -- Sync profile updates to users table
        UPDATE users
        SET name = COALESCE(NULLIF(NEW.full_name, ''), name),
            phone_number = COALESCE(NULLIF(NEW.phone, ''), phone_number),
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    ELSIF TG_TABLE_NAME = 'users' THEN
        -- Auto-provision or update profile when a user row is inserted/updated
        INSERT INTO profiles (user_id, full_name, phone)
        VALUES (NEW.user_id, COALESCE(NULLIF(NEW.name, ''), 'User'), NEW.phone_number)
        ON CONFLICT (user_id) DO UPDATE
        SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
            phone = COALESCE(NULLIF(EXCLUDED.phone, ''), profiles.phone),
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profiles_to_users ON profiles;
CREATE TRIGGER trg_sync_profiles_to_users
    AFTER UPDATE OF full_name, phone ON profiles
    FOR EACH ROW EXECUTE FUNCTION fn_sync_user_profile();

DROP TRIGGER IF EXISTS trg_sync_users_to_profiles ON users;
CREATE TRIGGER trg_sync_users_to_profiles
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION fn_sync_user_profile();
