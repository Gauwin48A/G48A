const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

const applyDefenderSchema = async () => {
    console.log('🏰 Applying THE DEFENDER Schema (Nuclear Option)...');
    console.log('⚠️  WARNING: This will drop existing tables and data!');

    try {
        const sqlPath = path.join(__dirname, '../database/migrations/defender_schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        console.log('✅ Defender Schema Applied: UUIDs and Tables Reset.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Schema Application Failed:', err);
        process.exit(1);
    }
};

applyDefenderSchema();
