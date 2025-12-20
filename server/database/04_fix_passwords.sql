-- Run this in pgAdmin to fix all user passwords
-- Password: Password123 (capital P, meets all validation rules)

UPDATE users 
SET password_hash = '$2b$10$lXurxyvKM5cz1LIr6d1GKO4nC8hiNpXKSzDD0er9Pkphhxrczc7RT.';

-- Verify update
SELECT email, LEFT(password_hash, 30) as hash_preview FROM users;
