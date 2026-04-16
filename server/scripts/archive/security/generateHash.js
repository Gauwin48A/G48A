const argon2 = require('argon2');
const fs = require('fs');

async function main() {
    const hash = await argon2.hash('Test@12345', {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 1
    });

    const sql = `
-- ================================================
-- COPY AND RUN THIS IN NEON CONSOLE
-- Password: Test@12345
-- ================================================

-- Option 1: Create new test user
INSERT INTO users (phone_number, full_name, password_hash, phone_verified, role)
VALUES ('9999999999', 'Test User', '${hash}', true, 'user')
ON CONFLICT (phone_number) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    full_name = 'Test User';

-- Option 2: Reset password for existing user (replace YOUR_PHONE)
-- UPDATE users SET password_hash = '${hash}' WHERE phone_number = 'YOUR_PHONE';

-- Verify:
SELECT user_id, phone_number, full_name FROM users WHERE phone_number = '9999999999';
`;

    fs.writeFileSync('TEST_USER_SQL.txt', sql);
    console.log(sql);
}

main();
