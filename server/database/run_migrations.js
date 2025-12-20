// Run new feature migrations
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'mhub_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function runMigrations() {
    console.log('Running new feature migrations...');

    try {
        // Wishlist table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        wishlist_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id)
      )
    `);
        console.log('✅ Wishlist table created');

        // Recently viewed table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS recently_viewed (
        view_id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        post_id INTEGER NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Recently viewed table created');

        // Indexes
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_recently_viewed_user ON recently_viewed(user_id, viewed_at DESC)`);
        console.log('✅ Indexes created');

        console.log('\n🎉 All migrations completed!');
    } catch (err) {
        console.error('Migration error:', err.message);
    } finally {
        await pool.end();
    }
}

runMigrations();
