// Fix passwords to Password123 (uppercase P + lowercase + numbers)
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

async function fixPasswords() {
    try {
        // Password123 = uppercase P + lowercase + numbers = MEETS ALL RULES
        const password = 'Password123';
        const hash = await bcrypt.hash(password, 10);

        console.log('Password:', password);
        console.log('Rules check:');
        console.log('  - 8+ chars:', password.length >= 8 ? '✅' : '❌');
        console.log('  - Uppercase:', /[A-Z]/.test(password) ? '✅' : '❌');
        console.log('  - Lowercase:', /[a-z]/.test(password) ? '✅' : '❌');
        console.log('  - Number:', /\d/.test(password) ? '✅' : '❌');

        // Verify hash
        const match = await bcrypt.compare(password, hash);
        console.log('\nHash verification:', match ? '✅ PASS' : '❌ FAIL');

        // Update DB
        const result = await pool.query('UPDATE users SET password_hash = $1', [hash]);
        console.log(`\n✅ Updated ${result.rowCount} users`);
        console.log('\nLogin with: Password123 (capital P)');

        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

fixPasswords();
