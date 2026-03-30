const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function applyUuidFix() {
    try {
        console.log('🚀 Starting UUID Final Restoration...');
        const sqlPath = path.join(__dirname, '../database/migrations/uuid_final_fix.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);
        console.log('✅ UUID Restoration Applied Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error applying UUID restoration:', error);
        process.exit(1);
    }
}

applyUuidFix();
