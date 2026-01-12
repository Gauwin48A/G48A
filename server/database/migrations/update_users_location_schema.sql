ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_city TEXT,
ADD COLUMN IF NOT EXISTS current_state TEXT,
ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS device_speed DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS last_location_sync TIMESTAMPTZ;

ALTER TABLE user_locations
ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION;

-- Index for regional discovery
CREATE INDEX IF NOT EXISTS idx_users_location ON users(current_city, current_state);
