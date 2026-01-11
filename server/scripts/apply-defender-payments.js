const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

const applyPayments = async () => {
    console.log('🛡️ Applying Defender Payment Tables (UUID)...');

    try {
        const sqlPath = path.join(__dirname, '../database/migrations/defender_payment_tables.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Payment Tables Created Successfully (UUID compliant).');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
};

applyPayments();
