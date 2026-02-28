/**
 * Price History Controller
 * Track and retrieve price changes for posts
 */

const pool = require('../config/db');
const logger = require('../utils/logger');
const DEFAULT_DAYS = 7;
const MAX_DAYS = 365;
const DEFAULT_MIN_DROP_PERCENT = 5;
const MAX_MIN_DROP_PERCENT = 100;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    if (value === undefined || value === null) return fallback;
    const normalized = (typeof value === 'string' ? value : String(value)).trim();
    if (!/^\d+$/.test(normalized)) return fallback;
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function parsePositiveNumber(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    if (value === undefined || value === null) return fallback;
    const normalized = (typeof value === 'string' ? value : String(value)).trim();
    if (!normalized.length) return fallback;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(parsed, max);
}

function parseOptionalString(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
}

function getAuthenticatedUserId(req) {
    return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

// Record a price change (called when post price is updated)
const recordPriceChange = async (req, res) => {
    const { postId, reason } = req.body;
    const oldPrice = Number(req.body.oldPrice);
    const newPrice = Number(req.body.newPrice);
    const userId = getAuthenticatedUserId(req);

    if (!postId || !Number.isFinite(oldPrice) || !Number.isFinite(newPrice) || oldPrice <= 0) {
        return res.status(400).json({ error: 'postId, oldPrice (>0), newPrice required' });
    }

    try {
        const percentageChange = Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2));

        const result = await runQuery(`
            INSERT INTO price_history (post_id, old_price, new_price, percentage_change, changed_by, reason)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                history_id,
                post_id,
                old_price,
                new_price,
                percentage_change,
                changed_by,
                reason,
                changed_at
        `, [postId, oldPrice, newPrice, percentageChange, userId || null, reason || null]);

        res.status(201).json({
            message: 'Price change recorded',
            history: result.rows[0]
        });
    } catch (error) {
        logger.error('Record price change error:', error);
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
        const result = await runQuery(`
            SELECT 
                ph.history_id,
                ph.post_id,
                ph.old_price,
                ph.new_price,
                ph.percentage_change,
                ph.changed_by,
                ph.reason,
                ph.changed_at,
                COALESCE(pr.full_name, u.username) as changed_by_name
            FROM price_history ph
            LEFT JOIN users u ON ph.changed_by = u.user_id
            LEFT JOIN profiles pr ON ph.changed_by = pr.user_id
            WHERE ph.post_id = $1
            ORDER BY ph.changed_at DESC
        `, [postId]);

        // Get current price
        const currentPrice = await runQuery(
            'SELECT price FROM posts WHERE post_id = $1',
            [postId]
        );

        res.json({
            history: result.rows,
            currentPrice: currentPrice.rows[0]?.price || null,
            totalChanges: result.rows.length
        });
    } catch (error) {
        logger.error('Get price history error:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
};

// Get posts with recent price drops
const getRecentPriceDrops = async (req, res) => {
    const days = parsePositiveInt(req.query.days, DEFAULT_DAYS, MAX_DAYS);
    const minDrop = parsePositiveNumber(req.query.minDrop, DEFAULT_MIN_DROP_PERCENT, MAX_MIN_DROP_PERCENT);

    try {
        const result = await runQuery(`
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
        logger.error('Get recent price drops error:', error);
        res.status(500).json({ error: 'Failed to get price drops' });
    }
};

module.exports = {
    recordPriceChange,
    getPriceHistory,
    getRecentPriceDrops
};
