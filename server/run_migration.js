const pool = require('./src/config/db');

async function runMigration() {
    try {
        await pool.query(`
      ALTER TABLE recently_viewed 
      ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'allposts'
    `);
        console.log('Migration successful: source column added');
    } catch (error) {
        console.log('Migration note:', error.message);
    } finally {
        await pool.end();
    }
}

runMigration();
