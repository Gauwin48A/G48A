-- Quick fix for missing columns
-- Run this in pgAdmin

-- Add missing accuracy column to user_locations
ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS accuracy DECIMAL(10,2);

-- Also ensure these columns exist
ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS heading DECIMAL(10,2);

-- Verify
SELECT column_name FROM information_schema.columns WHERE table_name = 'user_locations';
