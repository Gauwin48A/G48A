/**
 * Recently Viewed Controller
 * Track and retrieve user's browsing history
 */

const pool = require('../config/db');
const logger = require('../utils/logger');
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function getScalarQueryValue(value) {
    return Array.isArray(value) ? value[0] : value;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const scalar = getScalarQueryValue(value);
    if (scalar === undefined || scalar === null) return fallback;
    const normalized = (typeof scalar === 'string' ? scalar : String(scalar)).trim();
    if (!/^\d+$/.test(normalized)) return fallback;
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function normalizeSource(value, fallback = null) {
    const scalar = getScalarQueryValue(value);
    if (scalar === undefined || scalar === null) return fallback;
    const normalized = String(scalar).trim().toLowerCase();
    return normalized || fallback;
}

function parseOptionalString(value) {
    const scalar = getScalarQueryValue(value);
    if (scalar === undefined || scalar === null) return null;
    const normalized = String(scalar).trim();
    return normalized || null;
}

function getAuthenticatedUserId(req) {
    return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function enforceUserAccess(req, res, { allowBodyOverride = false, allowQueryOverride = false } = {}) {
    const authenticatedUserId = getAuthenticatedUserId(req);
    if (!authenticatedUserId) {
        res.status(401).json({ error: 'Authentication required' });
        return null;
    }

    const requestedBodyUserId = allowBodyOverride ? parseOptionalString(req.body?.userId || req.body?.user_id) : null;
    const requestedQueryUserId = allowQueryOverride ? parseOptionalString(req.query?.userId || req.query?.user_id) : null;

    if ((requestedBodyUserId && requestedBodyUserId !== authenticatedUserId) ||
        (requestedQueryUserId && requestedQueryUserId !== authenticatedUserId)) {
        res.status(403).json({ error: 'Cannot access another user history' });
        return null;
    }

    return authenticatedUserId;
}

// Add/Update recently viewed
const addRecentlyViewed = async (req, res) => {
    // Support both naming conventions
    const userId = enforceUserAccess(req, res, { allowBodyOverride: true });
    const postId = req.body.postId || req.body.post_id;
    const source = normalizeSource(req.body.source, 'allposts');

    if (!userId) return;
    if (!postId) {
        return res.status(400).json({ error: 'postId required' });
    }

    try {
        const normalizedUserId = String(userId);
        const normalizedPostId = String(postId);
        // Upsert - insert or update view count (with source)
        const result = await runQuery(`
            INSERT INTO recently_viewed (user_id, post_id, view_count, viewed_at, source)
            VALUES ($1::text, $2::text, 1, NOW(), $3)
            ON CONFLICT (user_id, post_id) 
            DO UPDATE SET 
                view_count = recently_viewed.view_count + 1,
                viewed_at = NOW(),
                source = EXCLUDED.source
            RETURNING id, user_id, post_id, view_count, viewed_at, source
        `, [normalizedUserId, normalizedPostId, source]);

        res.json({ success: true, item: result.rows[0] });
    } catch (error) {
        logger.error('Add recently viewed error:', error);
        res.status(500).json({ error: 'Failed to track view' });
    }
};

// Get recently viewed posts
const getRecentlyViewed = async (req, res) => {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
    const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
    const source = normalizeSource(req.query.source); // Optional: 'allposts', 'feed', or undefined for all

    if (!userId) return;

    try {
        const normalizedUserId = String(userId);
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

        const params = [normalizedUserId];

        if (source) {
            query += ` AND rv.source = $2`;
            params.push(source);
        }

        query += ` ORDER BY rv.viewed_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await runQuery(query, params);

        res.json({
            items: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        logger.error('Get recently viewed error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
};

// Clear recently viewed history
const clearHistory = async (req, res) => {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true, allowBodyOverride: true });
    if (!userId) return;

    try {
        await runQuery('DELETE FROM recently_viewed WHERE user_id::text = $1', [String(userId)]);
        res.json({ message: 'History cleared' });
    } catch (error) {
        logger.error('Clear history error:', error);
        res.status(500).json({ error: 'Failed to clear history' });
    }
};

// Remove single item from history
const removeFromHistory = async (req, res) => {
    const userId = enforceUserAccess(req, res, { allowQueryOverride: true, allowBodyOverride: true });
    const { postId } = req.params;

    if (!userId) return;

    try {
        await runQuery(
            'DELETE FROM recently_viewed WHERE user_id::text = $1 AND post_id::text = $2',
            [String(userId), String(postId)]
        );
        res.json({ message: 'Removed from history' });
    } catch (error) {
        logger.error('Remove from history error:', error);
        res.status(500).json({ error: 'Failed to remove' });
    }
};

module.exports = {
    addRecentlyViewed,
    getRecentlyViewed,
    clearHistory,
    removeFromHistory
};
