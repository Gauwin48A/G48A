-- Migration 001: Add village and colony columns for exact location detection
-- L7: Backend location storage — village/colony columns

-- user_locations table
ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE user_locations ADD COLUMN IF NOT EXISTS colony TEXT;

-- users table snapshot columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_village TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_colony TEXT;

-- Index for village/colony-based queries
CREATE INDEX IF NOT EXISTS idx_user_locations_village_colony ON user_locations(village, colony);
