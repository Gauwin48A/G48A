-- UPDATE PASSWORD IN PGADMIN
-- Password: Password123 (capital P)
UPDATE users SET password_hash = '$2b$10$7RUhCoeyM.iJAndg.JS0Sezda.bWT9qe9O/gv5nSGKGD5TjprBCa6';
SELECT 'Updated ' || COUNT(*) || ' users' FROM users;