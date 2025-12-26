/**
 * Price History Controller
 * Track and retrieve price changes for posts
 */

const pool = require('../config/db');

// Record a price change (called when post price is updated)
const recordPriceChange = async (req, res) => {
    const { postId, oldPrice, newPrice, reason } = req.body;
    const userId = req.user?.userId;

    if (!postId || !oldPrice || !newPrice) {
        return res.status(400).json({ error: 'postId, oldPrice, newPrice required' });
    }

    try {
        const percentageChange = ((newPrice - oldPrice) / oldPrice * 100).toFixed(2);

        const result = await pool.query(`
            INSERT INTO price_history (post_id, old_price, new_price, percentage_change, changed_by, reason)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [postId, oldPrice, newPrice, percentageChange, userId || null, reason || null]);

        res.status(201).json({
            message: 'Price change recorded',
            history: result.rows[0]
        });
    } catch (error) {
        console.error('Record price change error:', error);
        res.status(500).json({ error: 'Failed to record' });
    }
};

// Get price history for a post
const getPriceHistory = async (req, res) => {
    const { postId } = req.params;

    if (!postId) {
        return res.status(400).json({ error: 'postId required' });
    }

    try {
        const result = await pool.query(`
            SELECT 
                ph.*,
                COALESCE(pr.full_name, u.username) as changed_by_name
            FROM price_history ph
            LEFT JOIN users u ON ph.changed_by = u.user_id
            LEFT JOIN profiles pr ON ph.changed_by = pr.user_id
            WHERE ph.post_id = $1
            ORDER BY ph.changed_at DESC
        `, [postId]);

        // Get current price
        const currentPrice = await pool.query(
            'SELECT price FROM posts WHERE post_id = $1',
            [postId]
        );

        res.json({
            history: result.rows,
            currentPrice: currentPrice.rows[0]?.price || null,
            totalChanges: result.rows.length
        });
    } catch (error) {
        console.error('Get price history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
};

// Get posts with recent price drops
const getRecentPriceDrops = async (req, res) => {
    const days = parseInt(req.query.days) || 7;
    const minDrop = parseFloat(req.query.minDrop) || 5;

    try {
        const result = await pool.query(`
            SELECT DISTINCT ON (p.post_id)
                p.post_id,
                p.title,
                p.price as current_price,
                p.images,
                p.location,
                p.status,
                ph.old_price,
                ph.percentage_change,
                ph.changed_at,
                c.name as category_name,
                COALESCE(pr.full_name, u.username) as seller_name
            FROM price_history ph
            JOIN posts p ON ph.post_id = p.post_id
            LEFT JOIN users u ON p.user_id = u.user_id
            LEFT JOIN profiles pr ON p.user_id = pr.user_id
            LEFT JOIN categories c ON p.category_id = c.category_id
            WHERE ph.changed_at >= NOW() - INTERVAL '1 day' * $1
            AND ph.percentage_change <= -$2
            AND p.status = 'active'
            ORDER BY p.post_id, ph.changed_at DESC
        `, [days, minDrop]);

        res.json({
            posts: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Get recent price drops error:', error);
        res.status(500).json({ error: 'Failed to get price drops' });
    }
};

module.exports = {
    recordPriceChange,
    getPriceHistory,
    getRecentPriceDrops
};
