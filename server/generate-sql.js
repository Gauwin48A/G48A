const bcrypt = require('bcryptjs');
const fs = require('fs');

bcrypt.hash('Password123', 10, (err, hash) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }

    console.log('Hash for Password123:', hash);
    console.log('Hash length:', hash.length);

    // Verify it works
    bcrypt.compare('Password123', hash, (err, result) => {
        console.log('Verification:', result ? 'PASS' : 'FAIL');

        const sql = `-- UPDATE PASSWORD IN PGADMIN
-- Password: Password123 (capital P)
UPDATE users SET password_hash = '${hash}';
SELECT 'Updated ' || COUNT(*) || ' users' FROM users;`;

        fs.writeFileSync('database/05_UPDATE_PASSWORD.sql', sql);
        console.log('\nSQL saved to: database/05_UPDATE_PASSWORD.sql');
        console.log('\nRun this SQL in pgAdmin, then login with:');
        console.log('Email: admin@mhub.com');
        console.log('Password: Password123');
    });
});
