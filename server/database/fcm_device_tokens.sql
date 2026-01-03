-- Device Tokens Table for Push Notifications (FCM)
-- Run this after setting up Firebase

CREATE TABLE IF NOT EXISTS device_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  device_type VARCHAR(50) DEFAULT 'web', -- 'web', 'android', 'ios'
  device_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);

-- Index for faster lookups by token
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

-- Function to update timestamp on update
CREATE OR REPLACE FUNCTION update_device_token_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS device_token_update_timestamp ON device_tokens;
CREATE TRIGGER device_token_update_timestamp
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_device_token_timestamp();
