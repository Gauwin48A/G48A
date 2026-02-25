-- ============================================================================
-- BACKFILL: USERS WITHOUT PROFILES
-- Ensures every existing users row has a matching profiles row.
-- ============================================================================

INSERT INTO profiles (user_id, full_name, phone)
SELECT
    u.user_id,
    COALESCE(NULLIF(TRIM(u.name), ''), NULLIF(TRIM(u.username), ''), 'User') AS full_name,
    NULLIF(TRIM(u.phone_number), '') AS phone
FROM users u
LEFT JOIN profiles p ON p.user_id = u.user_id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
