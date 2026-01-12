const pool = require('./src/config/db');

async function debug() {
    try {
        const page = 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const shuffleLimit = 200;

        // Emulate the query logic from postController.js
        let query = `
          SELECT 
            p.*,
            COALESCE(p.tier_priority, 1) as tier_priority,
            u.username
          FROM posts p
          LEFT JOIN users u ON p.user_id::text = u.user_id::text
          WHERE p.status = 'active'
        `;

        const params = [];
        query += ` ORDER BY p.created_at DESC LIMIT ${shuffleLimit}`;

        console.log('Executing query:', query);
        console.log('Params:', params);

        const result = await pool.query(query, params);
        console.log('Success! Count:', result.rows.length);
        process.exit(0);
    } catch (err) {
        console.error('FAILED with error:', err.message);
        console.error('Stack:', err.stack);
        process.exit(1);
    }
}

debug();
