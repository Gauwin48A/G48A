const pool = require('./src/config/db');

async function reproduce() {
    try {
        // Exact parameters from subagent
        const sortBy = 'shuffle';
        const page = '1';
        const limit = '10';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const shuffleLimit = 200;

        let query = `
          SELECT 
            p.*,
            COALESCE(p.tier_priority, 1) as tier_priority,
            COALESCE(p.views_count, p.views, 0) as views,
            COALESCE(p.views_count, 0) as views_count,
            COALESCE(p.shares, 0) as shares,
            COALESCE(p.likes, 0) as likes,
            u.username,
            u.email,
            u.rating as seller_rating,
            COALESCE(pr.full_name, u.username) as user_name,
            c.name as category_name
          FROM posts p
          LEFT JOIN users u ON p.user_id::text = u.user_id::text
          LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
          LEFT JOIN categories c ON p.category_id = c.category_id
          WHERE p.status = 'active'
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
        `;

        const params = [];
        query += ` ORDER BY p.created_at DESC LIMIT ${shuffleLimit}`;

        console.log('REPRODUCING with query:', query);
        const result = await pool.query(query, params);
        console.log('SUCCESS! Rows:', result.rows.length);

        process.exit(0);
    } catch (err) {
        console.error('REPRODUCTION FAILED:', err.message);
        console.error('Code:', err.code);
        process.exit(1);
    }
}

reproduce();
