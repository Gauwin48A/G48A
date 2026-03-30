const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

const applySeed = async () => {
    console.log('🌱 Seeding Defender Database...');

    try {
        const sqlPath = path.join(__dirname, '../database/seed_data.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Execute
        await pool.query(sql);

        console.log('✅ Seed Data Applied Successfully.');
        process.exit(0);
    } catch (err) {
        // Unique violation is fine if re-running
        if (err.code === '23505') {
            console.log('⚠️ Seed data already exists (Duplicate Key). Skipping.');
            process.exit(0);
        } else {
            console.error('❌ Seed Failed:', err);
            process.exit(1);
        }
    }
};

applySeed();
