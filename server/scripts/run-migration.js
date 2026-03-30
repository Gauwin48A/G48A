/**
 * Run SQL Migration
 * Execute: node scripts/run-migration.js add_offers_and_flash_sales.sql
 */

const fs = require('fs');
const path = require('path');
const pool = require('../src/config/db');

async function runMigration(filename) {
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', filename);

    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log(`📦 Running migration: ${filename}`);
    console.log('─'.repeat(50));

    try {
        await pool.query(sql);
        console.log('✅ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);

        // Try running statements one by one
        console.log('\n🔄 Attempting individual statements...\n');
        const statements = sql.split(';').filter(s => s.trim());

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (!stmt) continue;

            try {
                await pool.query(stmt);
                console.log(`✅ Statement ${i + 1}: OK`);
            } catch (stmtError) {
                if (stmtError.message.includes('already exists')) {
                    console.log(`⏭️  Statement ${i + 1}: Already exists (skipped)`);
                } else {
                    console.error(`❌ Statement ${i + 1}: ${stmtError.message}`);
                }
            }
        }
    }

    await pool.end();
    console.log('\n🎉 Done!');
}

const filename = process.argv[2] || 'add_offers_and_flash_sales.sql';
runMigration(filename);
