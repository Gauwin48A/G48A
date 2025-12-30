-- Auth System Migration
-- Run this to add new columns for email verification and password reset

-- Add email verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expiry TIMESTAMP;

-- Add password reset columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;

-- Add refresh token column
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Add last login tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Set all existing users as verified
UPDATE users SET email_verified = true WHERE email_verified IS NULL;

-- Create index for token lookups
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));

SELECT 'Auth migration complete!' as status;
