// Wishlist Controller - Save/Unsave posts
const pool = require('../config/db');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_WISHLIST_LIMIT = 50;
const MAX_WISHLIST_LIMIT = 200;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function normalizeNullableString(value) {
    if (value === undefined || value === null) {
        return null;
    }
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function getAuthenticatedUserId(req) {
    return normalizeNullableString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function enforceUserAccess(req, res, { allowQueryOverride = false, allowBodyOverride = false } = {}) {
    const authenticatedUserId = getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
        res.status(401).json({ error: 'Authentication required' });
        return null;
    }

    const requestedQueryUserId = allowQueryOverride ? normalizeNullableString(req.query?.userId || req.query?.user_id) : null;
    const requestedBodyUserId = allowBodyOverride ? normalizeNullableString(req.body?.userId || req.body?.user_id) : null;

    if ((requestedQueryUserId && requestedQueryUserId !== authenticatedUserId) ||
        (requestedBodyUserId && requestedBodyUserId !== authenticatedUserId)) {
        res.status(403).json({ error: 'Cannot access another user wishlist' });
        return null;
    }

    return authenticatedUserId;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

// Get user's wishlist
exports.getWishlist = async (req, res) => {
    try {
        const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
        const limit = parsePositiveInt(req.query.limit, DEFAULT_WISHLIST_LIMIT, MAX_WISHLIST_LIMIT);
        if (!userId) return;

        const result = await runQuery(`
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
      LIMIT $2
    `, [String(userId), limit]);

        res.json({ items: result.rows, total: result.rows.length });
    } catch (err) {
        logger.error('[Wishlist] Get error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Add to wishlist
exports.addToWishlist = async (req, res) => {
    try {
        const userId = enforceUserAccess(req, res, { allowBodyOverride: true });
        const { postId, notes } = req.body;
        const normalizedNotes = normalizeNullableString(notes);

        if (!userId) return;
        if (!postId) {
            return res.status(400).json({ error: 'postId required' });
        }

        // Check if already in wishlist
        const existing = await runQuery(
            'SELECT wishlist_id FROM wishlists WHERE user_id = $1 AND post_id = $2',
            [String(userId), String(postId)]
        );

        if (existing.rows.length > 0) {
            return res.json({ message: 'Already in wishlist', wishlist_id: existing.rows[0].wishlist_id });
        }

        const result = await runQuery(
            `
              INSERT INTO wishlists (user_id, post_id, notes)
              VALUES ($1, $2, $3)
              RETURNING wishlist_id, user_id, post_id, notes, created_at
            `,
            [String(userId), String(postId), normalizedNotes]
        );

        res.status(201).json({ message: 'Added to wishlist', item: result.rows[0] });
    } catch (err) {
        logger.error('[Wishlist] Add error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Remove from wishlist
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = enforceUserAccess(req, res, { allowQueryOverride: true, allowBodyOverride: true });
        const { postId } = req.params;

        if (!userId) return;
        if (!postId) {
            return res.status(400).json({ error: 'postId required' });
        }

        await runQuery(
            'DELETE FROM wishlists WHERE user_id = $1 AND post_id = $2',
            [String(userId), String(postId)]
        );

        res.json({ message: 'Removed from wishlist' });
    } catch (err) {
        logger.error('[Wishlist] Remove error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

// Check if post is in wishlist
exports.checkWishlist = async (req, res) => {
    try {
        const userId = enforceUserAccess(req, res, { allowQueryOverride: true, allowBodyOverride: true });
        const { postId } = req.params;

        if (!userId) return;
        if (!postId) {
            return res.status(400).json({ error: 'postId required' });
        }

        const result = await runQuery(
            'SELECT wishlist_id FROM wishlists WHERE user_id = $1 AND post_id = $2',
            [String(userId), String(postId)]
        );

        res.json({ inWishlist: result.rows.length > 0 });
    } catch (err) {
        logger.error('[Wishlist] Check error:', err.message);
        res.status(500).json({ error: err.message });
    }
};

