/**
 * Offers Controller
 * Price negotiation between buyers and sellers
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

const VALID_OFFER_ACTIONS = new Set(['accept', 'reject', 'counter']);
const VALID_OFFER_ROLES = new Set(['seller', 'buyer']);
const DEFAULT_OFFERS_PAGE = 1;
const DEFAULT_OFFERS_LIMIT = 50;
const MAX_OFFERS_LIMIT = 200;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
let offersUpdatedAtAvailablePromise = null;
let offersUpdatedAtMissingLogged = false;

function getUserId(req) {
    return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

function idsEqual(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
}

function parseOptionalString(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
}

function parsePositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const normalized = parseOptionalString(value);
    if (!normalized || !/^\d+$/.test(normalized)) return fallback;
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function normalizeOfferRole(role) {
    const normalized = parseOptionalString(role)?.toLowerCase();
    return VALID_OFFER_ROLES.has(normalized) ? normalized : 'seller';
}

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

async function hasOffersUpdatedAtColumn() {
    if (!offersUpdatedAtAvailablePromise) {
        offersUpdatedAtAvailablePromise = runQuery(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'offers'
                      AND column_name = 'updated_at'
                ) AS available
            `
        )
            .then((result) => {
                const available = Boolean(result?.rows?.[0]?.available);
                if (!available && !offersUpdatedAtMissingLogged) {
                    logger.warn('[Offers] offers.updated_at column is missing; falling back to created_at.');
                    offersUpdatedAtMissingLogged = true;
                }
                return available;
            })
            .catch((error) => {
                logger.warn('[Offers] Failed to detect offers.updated_at availability; using fallback.', {
                    message: error.message
                });
                return false;
            });
    }

    return offersUpdatedAtAvailablePromise;
}

function getOfferUpdatedAtSelect(hasUpdatedAtColumn, tableAlias = '') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return hasUpdatedAtColumn ? `${prefix}updated_at` : `${prefix}created_at AS updated_at`;
}

function getOfferUpdatedAtSetClause(hasUpdatedAtColumn) {
    return hasUpdatedAtColumn ? ', updated_at = NOW()' : '';
}

// Create a new offer - supports old (postId/offeredPrice) and new (post_id/offer_amount) formats
const createOffer = async (req, res) => {
    const buyerId = getUserId(req);
    const postId = req.body.postId || req.body.post_id;
    const offeredPrice = parsePositiveNumber(req.body.offeredPrice || req.body.offer_amount);
    const message = parseOptionalString(req.body.message);

    if (!buyerId) {
        return res.status(401).json({ error: 'Authentication required', message: 'Login required to make offers' });
    }

    if (!postId || !offeredPrice) {
        return res.status(400).json({ error: 'Post ID and offered price required', message: 'Missing required fields' });
    }

    try {
        const offersHasUpdatedAt = await hasOffersUpdatedAtColumn();
        const postResult = await runQuery(
            'SELECT user_id, price, title FROM posts WHERE post_id = $1 AND status = $2',
            [postId, 'active']
        );

        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found or not available' });
        }

        const post = postResult.rows[0];
        const sellerId = post.user_id;

        if (idsEqual(buyerId, sellerId)) {
            return res.status(400).json({ error: 'Cannot make offer on your own post' });
        }

        const existingOffer = await runQuery(
            `
                SELECT offer_id
                FROM offers
                WHERE post_id = $1
                  AND buyer_id::text = $2
                  AND status = $3
                LIMIT 1
            `,
            [postId, String(buyerId), 'pending']
        );

        if (existingOffer.rows.length > 0) {
            return res.status(400).json({ error: 'You already have a pending offer on this post' });
        }

        const result = await runQuery(
            `
                INSERT INTO offers (post_id, buyer_id, seller_id, offered_price, original_price, message)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING
                    offer_id,
                    post_id,
                    buyer_id,
                    seller_id,
                    offered_price,
                    original_price,
                    message,
                    status,
                    counter_price,
                    created_at,
                    ${getOfferUpdatedAtSelect(offersHasUpdatedAt)}
            `,
            [postId, buyerId, sellerId, offeredPrice, post.price, message]
        );

        return res.status(201).json({
            message: 'Offer sent successfully',
            offer: result.rows[0]
        });
    } catch (error) {
        logger.error('Create offer error:', error);
        return res.status(500).json({ error: 'Failed to create offer' });
    }
};

// Get offers for a user (as seller or buyer)
const getOffers = async (req, res) => {
    const userId = getUserId(req);
    const role = normalizeOfferRole(req.query.role);
    const status = parseOptionalString(req.query.status);
    const page = parsePositiveInt(req.query.page, DEFAULT_OFFERS_PAGE);
    const limit = parsePositiveInt(req.query.limit, DEFAULT_OFFERS_LIMIT, MAX_OFFERS_LIMIT);
    const offset = (page - 1) * limit;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const offersHasUpdatedAt = await hasOffersUpdatedAtColumn();
        const params = [String(userId)];
        const scopeColumn = role === 'seller' ? 'o.seller_id' : 'o.buyer_id';
        let query = `
            SELECT
                COUNT(*) OVER()::int AS total_count,
                o.offer_id,
                o.post_id,
                o.buyer_id,
                o.seller_id,
                o.offered_price,
                o.original_price,
                o.message,
                o.status,
                o.counter_price,
                o.created_at,
                ${getOfferUpdatedAtSelect(offersHasUpdatedAt, 'o')},
                p.title AS post_title,
                p.images AS post_images,
                COALESCE(bpr.full_name, bu.username) AS buyer_name,
                COALESCE(spr.full_name, su.username) AS seller_name
            FROM offers o
            JOIN posts p ON p.post_id = o.post_id
            JOIN users bu ON bu.user_id::text = o.buyer_id::text
            JOIN users su ON su.user_id::text = o.seller_id::text
            LEFT JOIN profiles bpr ON bpr.user_id::text = bu.user_id::text
            LEFT JOIN profiles spr ON spr.user_id::text = su.user_id::text
            WHERE ${scopeColumn}::text = $1
        `;

        if (status) {
            params.push(status);
            query += ` AND o.status = $${params.length}`;
        }

        params.push(limit, offset);
        query += ` ORDER BY o.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

        const result = await runQuery(query, params);
        const offers = result.rows.map(({ total_count, ...offer }) => offer);
        const total = result.rows.length ? Number(result.rows[0].total_count) || 0 : 0;
        return res.json({ offers, total, page, limit });
    } catch (error) {
        logger.error('Get offers error:', error);
        return res.status(500).json({ error: 'Failed to fetch offers' });
    }
};

// Respond to an offer (accept/reject/counter)
const respondToOffer = async (req, res) => {
    const sellerId = getUserId(req);
    const { offerId } = req.params;
    const action = parseOptionalString(req.body.action)?.toLowerCase();
    const counterPrice = parsePositiveNumber(req.body.counterPrice || req.body.counter_price);

    if (!sellerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!VALID_OFFER_ACTIONS.has(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    if (action === 'counter' && !counterPrice) {
        return res.status(400).json({ error: 'Valid counterPrice is required for counter action' });
    }

    const offersHasUpdatedAt = await hasOffersUpdatedAtColumn();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const offerResult = await client.query(
            `
                SELECT
                    offer_id,
                    post_id,
                    buyer_id,
                    seller_id,
                    offered_price,
                    original_price,
                    message,
                    status,
                    counter_price,
                    created_at,
                    ${getOfferUpdatedAtSelect(offersHasUpdatedAt)}
                FROM offers
                WHERE offer_id = $1
                  AND seller_id::text = $2
                  AND status = 'pending'
                FOR UPDATE
            `,
            [offerId, String(sellerId)]
        );

        if (offerResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Offer not found or already processed' });
        }

        const offer = offerResult.rows[0];
        const newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered';

        const updatedOffer = await client.query(
            `
                UPDATE offers
                SET status = $1, counter_price = $2${getOfferUpdatedAtSetClause(offersHasUpdatedAt)}
                WHERE offer_id = $3
                RETURNING
                    offer_id,
                    post_id,
                    buyer_id,
                    seller_id,
                    offered_price,
                    original_price,
                    message,
                    status,
                    counter_price,
                    created_at,
                    ${getOfferUpdatedAtSelect(offersHasUpdatedAt)}
            `,
            [newStatus, action === 'counter' ? counterPrice : null, offerId]
        );

        if (action === 'accept') {
            await client.query(
                `
                    UPDATE posts
                    SET status = 'sold', updated_at = NOW()
                    WHERE post_id = $1
                `,
                [offer.post_id]
            );
        }

        await client.query('COMMIT');

        return res.json({
            message: `Offer ${newStatus}`,
            offer: updatedOffer.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Respond to offer error:', error);
        return res.status(500).json({ error: 'Failed to process offer' });
    } finally {
        client.release();
    }
};

// Get full offer negotiation history for a post
const getOfferHistory = async (req, res) => {
    const { postId } = req.params;
    const limit = parsePositiveInt(req.query.limit, 100, MAX_OFFERS_LIMIT);

    try {
        const offersHasUpdatedAt = await hasOffersUpdatedAtColumn();
        const result = await runQuery(
            `
                SELECT
                    o.offer_id,
                    o.post_id,
                    o.buyer_id,
                    o.seller_id,
                    o.offered_price,
                    o.original_price,
                    o.message,
                    o.status,
                    o.counter_price,
                    o.created_at,
                    ${getOfferUpdatedAtSelect(offersHasUpdatedAt, 'o')},
                    COALESCE(bpr.full_name, bu.username) AS buyer_name,
                    COALESCE(spr.full_name, su.username) AS seller_name,
                    p.title AS post_title,
                    p.price AS post_price
                FROM offers o
                JOIN posts p ON p.post_id = o.post_id
                JOIN users bu ON bu.user_id::text = o.buyer_id::text
                JOIN users su ON su.user_id::text = o.seller_id::text
                LEFT JOIN profiles bpr ON bpr.user_id::text = bu.user_id::text
                LEFT JOIN profiles spr ON spr.user_id::text = su.user_id::text
                WHERE o.post_id = $1
                ORDER BY o.created_at DESC
                LIMIT $2
            `,
            [postId, limit]
        );

        return res.json({ history: result.rows, total: result.rows.length, limit });
    } catch (error) {
        logger.error('Get offer history error:', error);
        return res.status(500).json({ error: 'Failed to fetch offer history' });
    }
};

// Set auto-accept threshold for a seller
const setAutoAcceptThreshold = async (req, res) => {
    const sellerId = getUserId(req);
    const postId = req.body.postId || req.body.post_id;
    const minAcceptPrice = parsePositiveNumber(req.body.minAcceptPrice || req.body.min_accept_price);

    if (!sellerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!postId || !minAcceptPrice) {
        return res.status(400).json({ error: 'postId and valid minAcceptPrice required' });
    }

    const offersHasUpdatedAt = await hasOffersUpdatedAtColumn();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const post = await client.query(
            `
                SELECT user_id
                FROM posts
                WHERE post_id = $1
                FOR UPDATE
            `,
            [postId]
        );

        if (post.rows.length === 0 || !idsEqual(post.rows[0].user_id, sellerId)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Not your post' });
        }

        await client.query(
            `
                UPDATE posts
                SET auto_accept_price = $1, updated_at = NOW()
                WHERE post_id = $2
            `,
            [minAcceptPrice, postId]
        );

        const autoAccepted = await client.query(
            `
                UPDATE offers
                SET status = 'accepted'${getOfferUpdatedAtSetClause(offersHasUpdatedAt)}
                WHERE post_id = $1
                  AND status = 'pending'
                  AND offered_price >= $2
                RETURNING offer_id
            `,
            [postId, minAcceptPrice]
        );

        await client.query('COMMIT');

        return res.json({
            message: `Auto-accept threshold set to ${minAcceptPrice}`,
            autoAcceptedCount: autoAccepted.rows.length
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Set auto-accept error:', error);
        return res.status(500).json({ error: 'Failed to set auto-accept threshold' });
    } finally {
        client.release();
    }
};

// Expire offers older than 48 hours (called by cron)
const expireOffers = async () => {
    try {
        const offersHasUpdatedAt = await hasOffersUpdatedAtColumn();
        const result = await runQuery(
            `
                WITH expired AS (
                    UPDATE offers
                    SET status = 'expired'${getOfferUpdatedAtSetClause(offersHasUpdatedAt)}
                    WHERE status = 'pending'
                      AND created_at < NOW() - INTERVAL '48 hours'
                    RETURNING buyer_id
                ),
                notifications_inserted AS (
                    INSERT INTO notifications (user_id, title, message, type, created_at)
                    SELECT
                        e.buyer_id,
                        'Offer Expired',
                        'Your offer has expired because the seller did not respond in 48 hours.',
                        'offer_expired',
                        NOW()
                    FROM expired e
                    RETURNING user_id
                )
                SELECT COUNT(*)::int AS expired_count
                FROM expired
            `
        );

        const expiredCount = result.rows[0]?.expired_count || 0;
        if (expiredCount > 0) {
            logger.info(`[CRON] Expired ${expiredCount} offers older than 48h`);
        }

        return expiredCount;
    } catch (error) {
        logger.error('[CRON] Offer expiry error:', error);
        return 0;
    }
};

module.exports = {
    createOffer,
    getOffers,
    respondToOffer,
    getOfferHistory,
    setAutoAcceptThreshold,
    expireOffers
};
