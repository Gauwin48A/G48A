// Migration Runner - Execute SQL migrations
import { pool } from '../db/index.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
    console.log('🔄 Running database migration...');

    try {
        // Read the migration file
        const migrationPath = join(__dirname, '../database/migration_add_location_columns.sql');
        const sql = readFileSync(migrationPath, 'utf8');

        console.log('📜 Migration SQL:');
        console.log(sql);

        // Execute the migration
        await pool.query(sql);

        console.log('✅ Migration completed successfully!');

        // Verify the columns exist
        const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_locations'
      ORDER BY ordinal_position;
    `);

        console.log('📊 Current user_locations columns:');
        result.rows.forEach(row => console.log('  -', row.column_name));

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

runMigration();
