/**
 * Price Alerts Controller
 * Subscribe to price drop notifications for posts
 */

const pool = require('../config/db');
const logger = require('../utils/logger');
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_PERCENTAGE_THRESHOLD = 10;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function toFiniteNumber(value, fallback = null) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getUserId(req) {
    return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

function isAdmin(req) {
    const role = String(req.user?.role || '').toLowerCase();
    return role === 'admin' || role === 'superadmin';
}

// Subscribe to price drop alerts
const subscribeAlert = async (req, res) => {
    const userId = getUserId(req);
    const { postId, targetPrice, percentageThreshold } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!postId) {
        return res.status(400).json({ error: 'postId required' });
    }

    try {
        const normalizedUserId = String(userId);
        const normalizedTargetPrice = targetPrice === undefined || targetPrice === null || targetPrice === ''
            ? null
            : toFiniteNumber(targetPrice, null);
        const normalizedThreshold = toFiniteNumber(percentageThreshold, DEFAULT_PERCENTAGE_THRESHOLD);

        // Check if post exists
        const postCheck = await runQuery(
            'SELECT price FROM posts WHERE post_id = $1',
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const result = await runQuery(`
            INSERT INTO price_drop_alerts (user_id, post_id, target_price, percentage_threshold)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, post_id) 
            DO UPDATE SET 
                target_price = EXCLUDED.target_price,
                percentage_threshold = EXCLUDED.percentage_threshold,
                is_active = true
            RETURNING
                alert_id,
                user_id,
                post_id,
                target_price,
                percentage_threshold,
                is_active,
                last_notified_at,
                created_at,
                created_at AS updated_at
        `, [normalizedUserId, postId, normalizedTargetPrice, normalizedThreshold]);

        res.status(201).json({
            message: 'Alert subscribed',
            alert: result.rows[0]
        });
    } catch (error) {
        logger.error('Subscribe alert error:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
};

// Get user's price alerts
const getAlerts = async (req, res) => {
    const userId = getUserId(req);
    const { active } = req.query;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const normalizedUserId = String(userId);
        const activeOnly = String(active).toLowerCase() === 'true';
        let query = `
            SELECT 
                pda.alert_id,
                pda.user_id,
                pda.post_id,
                pda.target_price,
                pda.percentage_threshold,
                pda.is_active,
                pda.last_notified_at,
                pda.created_at,
                pda.created_at AS updated_at,
                p.title,
                p.price as current_price,
                p.images,
                p.status,
                p.location
            FROM price_drop_alerts pda
            JOIN posts p ON pda.post_id = p.post_id
            WHERE pda.user_id = $1
        `;

        if (activeOnly) {
            query += ` AND pda.is_active = true`;
        }

        query += ` ORDER BY pda.created_at DESC`;

        const result = await runQuery(query, [normalizedUserId]);

        res.json({ alerts: result.rows });
    } catch (error) {
        logger.error('Get alerts error:', error);
        res.status(500).json({ error: 'Failed to get alerts' });
    }
};

// Unsubscribe from alert
const unsubscribeAlert = async (req, res) => {
    const userId = getUserId(req);
    const { postId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        await runQuery(
            'UPDATE price_drop_alerts SET is_active = false WHERE user_id = $1 AND post_id = $2',
            [String(userId), postId]
        );

        res.json({ message: 'Alert unsubscribed' });
    } catch (error) {
        logger.error('Unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
};

// Delete alert completely
const deleteAlert = async (req, res) => {
    const userId = getUserId(req);
    const { postId } = req.params;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        await runQuery(
            'DELETE FROM price_drop_alerts WHERE user_id = $1 AND post_id = $2',
            [String(userId), postId]
        );

        res.json({ message: 'Alert deleted' });
    } catch (error) {
        logger.error('Delete alert error:', error);
        res.status(500).json({ error: 'Failed to delete' });
    }
};

// Check if price drop occurred (for background job)
const checkPriceDrops = async (req, res) => {
    if (!isAdmin(req)) {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        // Find alerts where current price is below target or dropped by percentage
        const result = await runQuery(`
            SELECT 
                pda.alert_id,
                pda.user_id,
                pda.post_id,
                pda.target_price,
                pda.percentage_threshold,
                pda.is_active,
                pda.last_notified_at,
                pda.created_at,
                pda.created_at AS updated_at,
                p.price as current_price,
                p.title,
                u.email,
                pr.full_name
            FROM price_drop_alerts pda
            JOIN posts p ON pda.post_id = p.post_id
            JOIN users u ON pda.user_id = u.user_id
            LEFT JOIN profiles pr ON pda.user_id = pr.user_id
            WHERE pda.is_active = true
            AND p.status = 'active'
            AND (
                (pda.target_price IS NOT NULL AND p.price <= pda.target_price)
                OR (
                    pda.target_price IS NULL 
                    AND EXISTS (
                        SELECT 1 FROM price_history ph 
                        WHERE ph.post_id = p.post_id 
                        AND ABS(ph.percentage_change) >= pda.percentage_threshold
                        AND ph.changed_at > COALESCE(pda.last_notified_at, '2000-01-01')
                    )
                )
            )
        `);

        res.json({
            alertsToNotify: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        logger.error('Check price drops error:', error);
        res.status(500).json({ error: 'Failed to check' });
    }
};

module.exports = {
    subscribeAlert,
    getAlerts,
    unsubscribeAlert,
    deleteAlert,
    checkPriceDrops
};
