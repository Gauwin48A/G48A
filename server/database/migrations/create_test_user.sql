-- ============================================================================
-- EMERGENCY ACCESS: Create Test User with Known Password
-- ============================================================================
-- 
-- RUN THIS IN YOUR NEON/POSTGRES CONSOLE
--
-- ============================================================================

-- Step 1: Create a test user with a KNOWN password
-- Password: "Test@12345" (Argon2id hash)

INSERT INTO users (
    phone_number, 
    full_name, 
    password_hash, 
    phone_verified, 
    role,
    email
)
VALUES (
    '9999999999',
    'Test User',
    -- This is the Argon2id hash for password: "Test@12345"
    '$argon2id$v=19$m=65536,t=3,p=1$randomsalthere$hashedpasswordvalue',
    true,
    'user',
    'test@mhub.com'
)
ON CONFLICT (phone_number) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name;

-- Step 2: Verify the user was created
SELECT user_id, phone_number, email, full_name, phone_verified 
FROM users 
WHERE phone_number = '9999999999';

-- ============================================================================
-- ALTERNATIVE: Reset Password for EXISTING User
-- ============================================================================
-- 
-- If you know an existing user's phone number, run this to reset their password
-- to "Test@12345"
--
-- UPDATE users 
-- SET password_hash = '$argon2id$v=19$m=65536,t=3,p=1$randomsalthere$hashedpasswordvalue'
-- WHERE phone_number = 'YOUR_PHONE_HERE';
--
-- ============================================================================

-- NOTE: The hash above is a PLACEHOLDER. 
-- You should generate a real hash using the steps below, OR use OTP login.
