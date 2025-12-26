// Wishlist Controller - Save/Unsave posts
const pool = require('../config/db');

// Get user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?.id || req.user?.userId;
        if (!userId) return res.status(400).json({ error: 'userId required' });

        const result = await pool.query(`
      SELECT 
        w.wishlist_id,
        w.notes,
        w.created_at as saved_at,
        p.*,
        COALESCE(pr.full_name, u.username) as seller_name,
        c.name as category_name
      FROM wishlists w
      JOIN posts p ON w.post_id = p.post_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC
    `, [userId]);

        res.json({ items: result.rows, total: result.rows.length });
    } catch (err) {
        console.error('[Wishlist] Get error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Add to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.body.userId || req.user?.id || req.user?.userId;
        const { postId, notes } = req.body;

        if (!userId || !postId) {
            return res.status(400).json({ error: 'userId and postId required' });
        }

        // Check if already in wishlist
        const existing = await pool.query(
            'SELECT wishlist_id FROM wishlists WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );

        if (existing.rows.length > 0) {
            return res.json({ message: 'Already in wishlist', wishlist_id: existing.rows[0].wishlist_id });
        }

        const result = await pool.query(
            'INSERT INTO wishlists (user_id, post_id, notes) VALUES ($1, $2, $3) RETURNING *',
            [userId, postId, notes || null]
        );

        res.status(201).json({ message: 'Added to wishlist', item: result.rows[0] });
    } catch (err) {
        console.error('[Wishlist] Add error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?.id || req.user?.userId;
        const { postId } = req.params;

        if (!userId || !postId) {
            return res.status(400).json({ error: 'userId and postId required' });
        }

        await pool.query(
            'DELETE FROM wishlists WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );

        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        console.error('[Wishlist] Remove error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Check if post is in wishlist
exports.checkWishlist = async (req, res) => {
    try {
        const userId = req.query.userId || req.user?.id || req.user?.userId;
        const { postId } = req.params;

        if (!userId || !postId) {
            return res.status(400).json({ error: 'userId and postId required' });
        }

        const result = await pool.query(
            'SELECT wishlist_id FROM wishlists WHERE user_id = $1 AND post_id = $2',
            [userId, postId]
        );

        res.json({ inWishlist: result.rows.length > 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

