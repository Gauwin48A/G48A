-- CLEAR ALL LOCKOUTS AND RATE LIMITS
-- Run this in Neon Console

-- 1. Reset login attempts and clear lockouts for all users
UPDATE users SET login_attempts = 0, lock_until = NULL;

-- 2. Verify the reset worked
SELECT user_id, email, login_attempts, lock_until FROM users LIMIT 5;

-- Done! All users can now login again.
