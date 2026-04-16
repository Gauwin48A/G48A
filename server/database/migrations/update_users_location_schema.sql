ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_city TEXT,
ADD COLUMN IF NOT EXISTS current_state TEXT,
ADD COLUMN IF NOT EXISTS current_area TEXT,
ADD COLUMN IF NOT EXISTS current_locality TEXT,
ADD COLUMN IF NOT EXISTS current_district TEXT,
ADD COLUMN IF NOT EXISTS current_pincode TEXT,
ADD COLUMN IF NOT EXISTS current_display_name TEXT,
ADD COLUMN IF NOT EXISTS last_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS last_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS device_speed DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS last_location_sync TIMESTAMPTZ;

ALTER TABLE user_locations
ADD COLUMN IF NOT EXISTS speed DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS locality TEXT,
ADD COLUMN IF NOT EXISTS district TEXT,
ADD COLUMN IF NOT EXISTS pincode TEXT,
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS street TEXT,
ADD COLUMN IF NOT EXISTS timezone TEXT,
ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;

-- Index for regional discovery
CREATE INDEX IF NOT EXISTS idx_users_location ON users(current_city, current_state);
CREATE INDEX IF NOT EXISTS idx_users_location_area ON users(current_city, current_area, current_locality);
CREATE INDEX IF NOT EXISTS idx_user_locations_area ON user_locations(city, area, locality);
