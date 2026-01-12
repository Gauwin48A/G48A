/**
 * Recently Viewed Controller
 * Track and retrieve user's browsing history
 */

const pool = require('../config/db');

// Add/Update recently viewed
const addRecentlyViewed = async (req, res) => {
    // Support both naming conventions
    const userId = req.user?.userId || req.body.userId || req.body.user_id;
    const postId = req.body.postId || req.body.post_id;
    const source = req.body.source || 'allposts'; // Default to 'allposts'

    if (!userId || !postId) {
        return res.status(400).json({ error: 'userId and postId required' });
    }

    try {
        // Upsert - insert or update view count (with source)
        const result = await pool.query(`
            INSERT INTO recently_viewed (user_id, post_id, view_count, viewed_at, source)
            VALUES ($1::text, $2::text, 1, NOW(), $3)
            ON CONFLICT (user_id, post_id) 
            DO UPDATE SET 
                view_count = recently_viewed.view_count + 1,
                viewed_at = NOW(),
                source = EXCLUDED.source
            RETURNING *
        `, [userId, postId, source]);

        res.json({ success: true, item: result.rows[0] });
    } catch (error) {
        console.error('Add recently viewed error:', error);
        res.status(500).json({ error: 'Failed to track view' });
    }
};

// Get recently viewed posts
const getRecentlyViewed = async (req, res) => {
    const userId = req.user?.userId || req.query.userId;
    const limit = parseInt(req.query.limit) || 20;
    const source = req.query.source; // Optional: 'allposts', 'feed', or undefined for all

    if (!userId) {
        return res.status(400).json({ error: 'userId required' });
    }

    try {
        let query = `
            SELECT 
                rv.id,
                rv.view_count,
                rv.viewed_at,
                rv.source,
                p.post_id,
                p.title,
                p.price,
                p.images,
                p.location,
                p.status,
                p.condition,
                c.name as category_name,
                COALESCE(pr.full_name, u.username) as seller_name
            FROM recently_viewed rv
            JOIN posts p ON rv.post_id::text = p.post_id::text
            LEFT JOIN users u ON p.user_id::text = u.user_id::text
            LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
            LEFT JOIN categories c ON p.category_id::text = c.category_id::text
            WHERE rv.user_id::text = $1
        `;

        const params = [userId];

        if (source) {
            query += ` AND rv.source = $2`;
            params.push(source);
        }

        query += ` ORDER BY rv.viewed_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await pool.query(query, params);

        res.json({
            items: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Get recently viewed error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
};

// Clear recently viewed history
const clearHistory = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        await pool.query('DELETE FROM recently_viewed WHERE user_id::text = $1', [userId]);
        res.json({ message: 'History cleared' });
    } catch (error) {
        console.error('Clear history error:', error);
        res.status(500).json({ error: 'Failed to clear history' });
    }
};

// Remove single item from history
const removeFromHistory = async (req, res) => {
    const userId = req.user?.userId;
    const { postId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        await pool.query(
            'DELETE FROM recently_viewed WHERE user_id::text = $1 AND post_id::text = $2',
            [userId, postId]
        );
        res.json({ message: 'Removed from history' });
    } catch (error) {
        console.error('Remove from history error:', error);
        res.status(500).json({ error: 'Failed to remove' });
    }
};

module.exports = {
    addRecentlyViewed,
    getRecentlyViewed,
    clearHistory,
    removeFromHistory
};
