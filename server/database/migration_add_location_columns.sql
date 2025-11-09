-- Migration: Add new columns to existing user_locations table
-- Run this ONLY if your database already has the user_locations table
-- This migration ensures backward compatibility for existing databases

ALTER TABLE user_locations 
ADD COLUMN IF NOT EXISTS permission_status VARCHAR(20),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Update existing records to have 'granted' status (since they already have coordinates)
UPDATE user_locations 
SET permission_status = 'granted' 
WHERE permission_status IS NULL AND latitude != 0 AND longitude != 0;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_locations_permission ON user_locations(permission_status);
CREATE INDEX IF NOT EXISTS idx_user_locations_city ON user_locations(city);

-- Comments:
-- permission_status: Tracks whether user granted/denied location permission
-- city: Stores the city name from reverse geocoding
-- country: Stores the country name from reverse geocoding
