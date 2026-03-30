// Complete fix: Update DB and verify login works
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const PASSWORD = 'Password123'; // uppercase P, lowercase, numbers

async function main() {
    try {
        console.log('=== FIXING PASSWORDS ===\n');

        // Step 1: Generate hash
        console.log('1. Generating bcrypt hash for:', PASSWORD);
        const hash = await bcrypt.hash(PASSWORD, 10);
        console.log('   Hash:', hash);
        console.log('   Length:', hash.length, '(should be 60)');

        // Step 2: Verify hash works BEFORE updating DB
        console.log('\n2. Verifying hash works...');
        const testMatch = await bcrypt.compare(PASSWORD, hash);
        if (!testMatch) {
            console.log('   ❌ HASH VERIFICATION FAILED!');
            process.exit(1);
        }
        console.log('   ✅ Hash verification passed');

        // Step 3: Update database
        console.log('\n3. Updating database...');
        const result = await pool.query(
            'UPDATE users SET password_hash = $1 RETURNING user_id, email',
            [hash]
        );
        console.log('   ✅ Updated', result.rowCount, 'users');

        // Step 4: Verify database has correct hash
        console.log('\n4. Verifying database update...');
        const dbCheck = await pool.query('SELECT email, password_hash FROM users WHERE email = $1', ['admin@mhub.com']);
        if (dbCheck.rows.length === 0) {
            console.log('   ❌ admin@mhub.com not found in database!');
            process.exit(1);
        }

        const dbHash = dbCheck.rows[0].password_hash;
        console.log('   DB hash:', dbHash);

        // Step 5: Verify login will work
        console.log('\n5. Simulating login...');
        const loginMatch = await bcrypt.compare(PASSWORD, dbHash);
        if (!loginMatch) {
            console.log('   ❌ LOGIN WILL FAIL - hash mismatch!');
            process.exit(1);
        }
        console.log('   ✅ LOGIN WILL SUCCEED');

        // Final summary
        console.log('\n=== SUCCESS ===');
        console.log('Email: admin@mhub.com');
        console.log('Password:', PASSWORD);
        console.log('\nAll users updated:');
        result.rows.forEach(r => console.log('  -', r.email));

        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

main();
