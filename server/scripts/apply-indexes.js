const pool = require('../src/config/db');

const applyIndexes = async () => {
    console.log('🚀 Applying Performance Indexes...');

    try {
        // 1. Posts: Category + Status (Compound)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_posts_category_status 
            ON posts(category_id, status) 
            WHERE status = 'active';
        `);
        console.log('✅ Index created: idx_posts_category_status');

        // 2. Posts: Price Range Scanning
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_posts_price 
            ON posts(price);
        `);
        console.log('✅ Index created: idx_posts_price');

        // 3. Posts: Chronological Feeds
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_posts_created_desc 
            ON posts(created_at DESC);
        `);
        console.log('✅ Index created: idx_posts_created_desc');

        // 4. Users: Email Lookup (Lower case for case-insensitive login)
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_users_email_lower 
            ON users(lower(email));
        `);
        console.log('✅ Index created: idx_users_email_lower');

        // 5. Audit Logs: User History
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_audit_logs_user 
            ON audit_logs(user_id);
        `);
        console.log('✅ Index created: idx_audit_logs_user');

        console.log('✨ All performance indexes applied successfully!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Indexing failed:', err);
        process.exit(1);
    }
};

applyIndexes();
