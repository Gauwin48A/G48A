const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

const applyHardening = async () => {
    console.log('🛡️ Applying Production Hardening Migration...');

    try {
        const sqlPath = path.join(__dirname, '../database/migrations/production_hardening.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split into statements roughly (basic split by ;) or just run as one block if pure SQL
        // pg pool can run multiple statements usually
        await pool.query(sql);

        console.log('✅ Hardening Applied: UUID schema enforced for Payments & Subscriptions.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
};

applyHardening();
