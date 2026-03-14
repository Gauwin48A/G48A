-- High-precision location verification tables (PostGIS)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS seller_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  accuracy FLOAT,
  trust_score INTEGER DEFAULT 0,
  fraud_score INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_location_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy FLOAT,
  device_id VARCHAR(128),
  ip_address INET,
  trust_score INTEGER,
  fraud_score INTEGER,
  fraud_flags TEXT[],
  timestamp TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS fraud_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(64) NOT NULL,
  fraud_type VARCHAR(64),
  fraud_score INTEGER,
  details JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seller_location_gist
  ON seller_locations USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_user_location_events_user_id
  ON user_location_events (user_id);

CREATE INDEX IF NOT EXISTS idx_user_location_events_device_id
  ON user_location_events (device_id);

CREATE INDEX IF NOT EXISTS idx_fraud_events_user_id
  ON fraud_events (user_id);
