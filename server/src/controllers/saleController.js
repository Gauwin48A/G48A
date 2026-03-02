/**
 * Sale Controller - Dual-Handshake Logic
 *
 * State machine:
 * INITIATED -> PENDING_BUYER_CONFIRM -> COMPLETED
 *       |              |
 *   CANCELLED       EXPIRED (48h)
 */

const pool = require('../config/db');
const crypto = require('crypto');
const otpService = require('../services/otpService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const {
    applyRewardDeltaInTransaction,
    afterCommitRewardMutation
} = require('../services/rewardsLedgerService');

const DEFAULT_PENDING_SALES_LIMIT = 50;
const MAX_PENDING_SALES_LIMIT = 200;
const PENDING_SALES_CACHE_TTL_SECONDS = 15;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function getUserId(req) {
    return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

function idsEqual(a, b) {
    if (a === undefined || a === null || b === undefined || b === null) return false;
    return String(a) === String(b);
}

function parsePositiveNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function invalidateSaleCache(userId) {
    if (!userId) return;
    cacheService.clearPattern(`sale:${userId}:*`);
}

function isLegacyTransactionSchemaError(error) {
    if (!error) return false;
    if (error.code !== '42703') return false;
    const message = String(error.message || '').toLowerCase();
    return message.includes('agreed_price')
        || message.includes('expires_at')
        || message.includes('cancelled_by')
        || message.includes('cancel_reason');
}

function calculateSaleRewardPoints(saleAmount) {
    const normalizedSaleAmount = Math.max(0, Number(saleAmount) || 0);
    return {
        sellerPoints: Math.floor(normalizedSaleAmount / 100), // 1 point per Rs100
        buyerPoints: Math.floor(normalizedSaleAmount / 200) // 0.5 point per Rs100
    };
}

/**
 * Seller initiates a sale
 * POST /api/sale/initiate
 */
const initiateSale = async (req, res) => {
    const sellerId = getUserId(req);
    const { postId, buyerId, agreedPrice } = req.body;

    if (!sellerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!postId || !buyerId || agreedPrice === undefined || agreedPrice === null) {
        return res.status(400).json({ error: 'Post ID, Buyer ID, and Agreed Price are required' });
    }

    const normalizedPrice = parsePositiveNumber(agreedPrice);
    if (!normalizedPrice) {
        return res.status(400).json({ error: 'Agreed price must be a positive number' });
    }

    if (idsEqual(sellerId, buyerId)) {
        return res.status(400).json({ error: 'Cannot sell to yourself' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify post ownership and lock row to avoid concurrent sale initiation
        const postCheck = await client.query(
            `
                SELECT post_id, user_id, status, title
                FROM posts
                WHERE post_id = $1
                FOR UPDATE
            `,
            [postId]
        );

        if (postCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Post not found' });
        }

        const post = postCheck.rows[0];
        if (!idsEqual(post.user_id, sellerId)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'You are not the owner of this post' });
        }

        if (post.status !== 'active') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Post is not available for sale' });
        }

        // Check for existing in-progress transaction for this post
        const existingCheck = await client.query(
            `
                SELECT transaction_id
                FROM transactions
                WHERE post_id = $1 AND status IN ('pending_buyer_confirm', 'initiated')
                LIMIT 1
            `,
            [postId]
        );

        if (existingCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'A sale is already in progress for this item' });
        }

        const secretOTP = typeof otpService.generateOTP === 'function'
            ? otpService.generateOTP()
            : crypto.randomInt(100000, 1000000).toString();
        const hashedOTP = crypto.createHash('sha256').update(secretOTP).digest('hex');
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h for transaction
        const otpExpiresAt = new Date(Date.now() + otpService.OTP_EXPIRY_MINUTES * 60 * 1000); // 10m for OTP

        // Create transaction
        const result = await client.query(
            `
                INSERT INTO transactions (
                    post_id, seller_id, buyer_id, agreed_price,
                    secret_otp, otp_hash, otp_expires_at, otp_attempts,
                    status, expires_at, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'pending_buyer_confirm', $8, NOW())
                RETURNING transaction_id
            `,
            [postId, sellerId, buyerId, normalizedPrice, secretOTP, hashedOTP, otpExpiresAt, expiresAt]
        );

        // Transition post to sale_pending
        await client.query(
            `UPDATE posts SET status = 'sale_pending' WHERE post_id = $1`,
            [postId]
        );

        // Notify buyer
        await client.query(
            `
                INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
                VALUES ($1, $2, $3, 'sale_confirmation', $4, NOW())
            `,
            [
                buyerId,
                'Confirm Your Purchase',
                `The seller has initiated a sale for "${post.title || 'an item'}". Please confirm with the OTP code they provide.`,
                result.rows[0].transaction_id
            ]
        );

        await client.query('COMMIT');
        invalidateSaleCache(sellerId);
        invalidateSaleCache(buyerId);

        // Send OTP via email/SMS (best-effort, non-blocking)
        try {
            const buyerInfo = await runQuery(
                `
                    SELECT
                        email,
                        COALESCE(
                            NULLIF(to_jsonb(users)->>'phone_number', ''),
                            NULLIF(to_jsonb(users)->>'phone', '')
                        ) AS phone
                    FROM users
                    WHERE user_id::text = $1
                    LIMIT 1
                `,
                [String(buyerId)]
            );

            const buyerEmail = buyerInfo.rows[0]?.email ? String(buyerInfo.rows[0].email).trim() : null;
            const numericPhone = buyerInfo.rows[0]?.phone
                ? String(buyerInfo.rows[0].phone).replace(/\D/g, '')
                : '';

            if (numericPhone) {
                const destination = numericPhone.length === 10
                    ? `+91${numericPhone}`
                    : numericPhone.startsWith('91')
                        ? `+${numericPhone}`
                        : `+${numericPhone}`;
                await otpService.sendOTP('sms', destination, secretOTP, {
                    flow: 'sale',
                    purpose: 'sale_confirm',
                    metadata: {
                        transaction_id: String(result.rows[0].transaction_id),
                        post_id: String(postId),
                        buyer_id: String(buyerId)
                    }
                });
            } else if (buyerEmail) {
                await otpService.sendOTP('email', buyerEmail, secretOTP, {
                    flow: 'sale',
                    purpose: 'sale_confirm',
                    metadata: {
                        transaction_id: String(result.rows[0].transaction_id),
                        post_id: String(postId),
                        buyer_id: String(buyerId)
                    }
                });
            }
        } catch (notifyErr) {
            logger.warn('[Sale] OTP notification failed (non-blocking):', notifyErr.message);
        }

        return res.status(201).json({
            message: 'Sale initiated successfully',
            transaction: {
                transactionId: result.rows[0].transaction_id,
                status: 'pending_buyer_confirm',
                secretOTP, // Shown to seller to share with buyer in-person
                otpExpiresIn: `${otpService.OTP_EXPIRY_MINUTES} minutes`,
                expiresAt
            },
            instructions: 'Share this OTP with the buyer in person. They must enter it to confirm the sale. OTP expires in 10 minutes.'
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('[Sale] Initiate error:', error);
        return res.status(500).json({ error: 'Failed to initiate sale' });
    } finally {
        client.release();
    }
};

/**
 * Buyer confirms the sale with OTP
 * POST /api/sale/confirm
 */
const confirmSale = async (req, res) => {
    const buyerId = getUserId(req);
    const { transactionId, otp } = req.body;

    if (!buyerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!transactionId || !otp) {
        return res.status(400).json({ error: 'Transaction ID and OTP are required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const txResult = await client.query(
            `
                SELECT
                    transaction_id,
                    post_id,
                    seller_id,
                    buyer_id,
                    agreed_price,
                    secret_otp,
                    otp_hash,
                    otp_expires_at,
                    otp_attempts,
                    status,
                    expires_at
                FROM transactions
                WHERE transaction_id = $1
                FOR UPDATE
            `,
            [transactionId]
        );

        if (txResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = txResult.rows[0];

        if (!idsEqual(transaction.buyer_id, buyerId)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'You are not the buyer for this transaction' });
        }

        if (transaction.status !== 'pending_buyer_confirm') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: `Transaction is ${transaction.status}, cannot confirm` });
        }

        const now = new Date();

        if (transaction.expires_at && now > new Date(transaction.expires_at)) {
            await Promise.all([
                client.query(
                    `UPDATE transactions SET status = 'expired' WHERE transaction_id = $1`,
                    [transactionId]
                ),
                client.query(
                    `UPDATE posts SET status = 'active' WHERE post_id = $1`,
                    [transaction.post_id]
                )
            ]);
            await client.query('COMMIT');
            invalidateSaleCache(transaction.seller_id);
            invalidateSaleCache(transaction.buyer_id);
            return res.status(400).json({ error: 'Transaction has expired' });
        }

        const otpExpiry = transaction.otp_expires_at ? new Date(transaction.otp_expires_at) : null;
        if (otpExpiry && now > otpExpiry) {
            await Promise.all([
                client.query(
                    `UPDATE transactions SET status = 'expired' WHERE transaction_id = $1`,
                    [transactionId]
                ),
                client.query(
                    `UPDATE posts SET status = 'active' WHERE post_id = $1`,
                    [transaction.post_id]
                )
            ]);
            await client.query('COMMIT');
            invalidateSaleCache(transaction.seller_id);
            invalidateSaleCache(transaction.buyer_id);
            return res.status(400).json({ error: 'OTP has expired. Ask the seller to initiate a new sale.' });
        }

        const attempts = transaction.otp_attempts || 0;
        if (attempts >= otpService.MAX_ATTEMPTS) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Too many failed OTP attempts. Ask the seller to initiate a new sale.' });
        }

        const hashedInput = crypto.createHash('sha256').update(String(otp)).digest('hex');
        const otpValid = (transaction.otp_hash && transaction.otp_hash === hashedInput)
            || (transaction.secret_otp === otp);

        if (!otpValid) {
            const attemptsResult = await client.query(
                `
                    UPDATE transactions
                    SET otp_attempts = COALESCE(otp_attempts, 0) + 1
                    WHERE transaction_id = $1
                    RETURNING otp_attempts
                `,
                [transactionId]
            );
            await client.query('COMMIT');
            invalidateSaleCache(transaction.seller_id);
            invalidateSaleCache(transaction.buyer_id);

            const updatedAttempts = attemptsResult.rows[0]?.otp_attempts || attempts + 1;
            const remaining = Math.max(0, otpService.MAX_ATTEMPTS - updatedAttempts);
            return res.status(400).json({ error: `Invalid OTP code. ${remaining} attempt(s) remaining.` });
        }

        await Promise.all([
            client.query(
                `
                    UPDATE transactions
                    SET status = 'completed', completed_at = NOW()
                    WHERE transaction_id = $1
                `,
                [transactionId]
            ),
            client.query(
                `UPDATE posts SET status = 'sold' WHERE post_id = $1`,
                [transaction.post_id]
            )
        ]);

        const rewardReferenceId = String(transaction.transaction_id || transactionId);
        const rewardPoints = calculateSaleRewardPoints(transaction.agreed_price);
        let sellerRewardChange = null;
        let buyerRewardChange = null;

        if (rewardPoints.sellerPoints > 0) {
            sellerRewardChange = await applyRewardDeltaInTransaction({
                client,
                userId: transaction.seller_id,
                pointsDelta: rewardPoints.sellerPoints,
                action: 'sale_completed',
                description: `Sale completion reward for transaction ${rewardReferenceId}`,
                idempotencyKey: `sale:${rewardReferenceId}:seller`
            });
        }

        if (rewardPoints.buyerPoints > 0) {
            buyerRewardChange = await applyRewardDeltaInTransaction({
                client,
                userId: transaction.buyer_id,
                pointsDelta: rewardPoints.buyerPoints,
                action: 'purchase_completed',
                description: `Purchase verification reward for transaction ${rewardReferenceId}`,
                idempotencyKey: `sale:${rewardReferenceId}:buyer`
            });
        }

        await client.query('COMMIT');
        invalidateSaleCache(transaction.seller_id);
        invalidateSaleCache(transaction.buyer_id);
        if (sellerRewardChange?.applied) {
            afterCommitRewardMutation(sellerRewardChange);
        }
        if (buyerRewardChange?.applied) {
            afterCommitRewardMutation(buyerRewardChange);
        }

        // Best-effort side effects after the state transition is committed
        const nonBlockingTasks = [
            runQuery(
                `
                    INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
                    VALUES ($1, 'Sale Completed!', 'Your item has been sold successfully.', 'sale_completed', $2, NOW())
                `,
                [transaction.seller_id, transactionId]
            )
        ];
        const settled = await Promise.allSettled(nonBlockingTasks);
        settled.forEach((result) => {
            if (result.status === 'rejected') {
                logger.warn('[Sale] Post-completion side effect failed:', result.reason?.message || result.reason);
            }
        });

        return res.json({
            message: 'Sale confirmed successfully!',
            transaction: {
                transactionId: transaction.transaction_id,
                status: 'completed',
                completedAt: new Date()
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('[Sale] Confirm error:', error);
        return res.status(500).json({ error: 'Failed to confirm sale' });
    } finally {
        client.release();
    }
};

/**
 * Cancel a pending sale
 * POST /api/sale/cancel
 */
const cancelSale = async (req, res) => {
    const userId = getUserId(req);
    const { transactionId, reason } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const txResult = await client.query(
            `
                SELECT
                    transaction_id,
                    post_id,
                    seller_id,
                    buyer_id,
                    status
                FROM transactions
                WHERE transaction_id = $1
                FOR UPDATE
            `,
            [transactionId]
        );

        if (txResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = txResult.rows[0];

        if (!idsEqual(transaction.seller_id, userId) && !idsEqual(transaction.buyer_id, userId)) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'You are not part of this transaction' });
        }

        if (transaction.status !== 'pending_buyer_confirm') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot cancel - transaction is not pending' });
        }

        await Promise.all([
            client.query(
                `
                    UPDATE transactions
                    SET status = 'cancelled', cancelled_by = $1, cancel_reason = $2
                    WHERE transaction_id = $3
                `,
                [userId, reason || 'No reason provided', transactionId]
            ),
            client.query(
                `UPDATE posts SET status = 'active' WHERE post_id = $1`,
                [transaction.post_id]
            )
        ]);

        const otherPartyId = idsEqual(transaction.seller_id, userId)
            ? transaction.buyer_id
            : transaction.seller_id;

        await client.query(
            `
                INSERT INTO notifications (user_id, title, message, type, created_at)
                VALUES ($1, 'Sale Cancelled', 'The pending sale has been cancelled.', 'sale_cancelled', NOW())
            `,
            [otherPartyId]
        );

        await client.query('COMMIT');
        invalidateSaleCache(transaction.seller_id);
        invalidateSaleCache(transaction.buyer_id);
        return res.json({ message: 'Sale cancelled successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('[Sale] Cancel error:', error);
        return res.status(500).json({ error: 'Failed to cancel sale' });
    } finally {
        client.release();
    }
};

/**
 * Get pending sales for a user
 * GET /api/sale/pending
 */
const getPendingSales = async (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const page = parsePositiveInt(req.query.page, 1);
        const limit = parsePositiveInt(req.query.limit, DEFAULT_PENDING_SALES_LIMIT, MAX_PENDING_SALES_LIMIT);
        const offset = (page - 1) * limit;
        const cacheKey = `sale:${userId}:pending:${page}:${limit}`;

        const payload = await cacheService.getOrSetWithStampedeProtection(
            cacheKey,
            async () => {
                const result = await runQuery(
                    `
                        SELECT
                            COUNT(*) OVER()::int AS total_count,
                            t.transaction_id,
                            t.post_id,
                            t.seller_id,
                            t.buyer_id,
                            t.agreed_price,
                            t.status,
                            t.expires_at,
                            t.created_at,
                            t.completed_at,
                            t.cancelled_by,
                            t.cancel_reason,
                            p.title as post_title,
                            p.images as post_images,
                            seller.username as seller_name,
                            buyer.username as buyer_name
                        FROM transactions t
                        JOIN posts p ON p.post_id = t.post_id
                        JOIN users seller ON seller.user_id = t.seller_id
                        JOIN users buyer ON buyer.user_id = t.buyer_id
                        WHERE (t.seller_id::text = $1 OR t.buyer_id::text = $1)
                          AND t.status = 'pending_buyer_confirm'
                        ORDER BY t.created_at DESC
                        LIMIT $2 OFFSET $3
                    `,
                    [String(userId), limit, offset]
                );

                const total = result.rows.length ? Number(result.rows[0].total_count) || 0 : 0;
                const pendingSales = result.rows.map(({ total_count, ...sale }) => sale);
                return { pendingSales, total, page, limit };
            },
            PENDING_SALES_CACHE_TTL_SECONDS
        );

        return res.json(payload);
    } catch (error) {
        if (isLegacyTransactionSchemaError(error)) {
            try {
                const page = parsePositiveInt(req.query.page, 1);
                const limit = parsePositiveInt(req.query.limit, DEFAULT_PENDING_SALES_LIMIT, MAX_PENDING_SALES_LIMIT);
                const offset = (page - 1) * limit;
                const fallbackResult = await runQuery(
                    `
                        SELECT
                            COUNT(*) OVER()::int AS total_count,
                            t.transaction_id,
                            t.post_id,
                            t.seller_id,
                            t.buyer_id,
                            t.amount AS agreed_price,
                            t.status,
                            NULL::timestamp AS expires_at,
                            t.created_at,
                            t.completed_at,
                            NULL::text AS cancelled_by,
                            NULL::text AS cancel_reason,
                            p.title as post_title,
                            p.images as post_images,
                            seller.username as seller_name,
                            buyer.username as buyer_name
                        FROM transactions t
                        JOIN posts p ON p.post_id = t.post_id
                        JOIN users seller ON seller.user_id = t.seller_id
                        JOIN users buyer ON buyer.user_id = t.buyer_id
                        WHERE (t.seller_id::text = $1 OR t.buyer_id::text = $1)
                          AND t.status IN ('pending_buyer_confirm', 'initiated', 'pending')
                        ORDER BY t.created_at DESC
                        LIMIT $2 OFFSET $3
                    `,
                    [String(userId), limit, offset]
                );

                const total = fallbackResult.rows.length ? Number(fallbackResult.rows[0].total_count) || 0 : 0;
                const pendingSales = fallbackResult.rows.map(({ total_count, ...sale }) => sale);
                return res.json({ pendingSales, total, page, limit });
            } catch (fallbackErr) {
                logger.error('[Sale] Fallback pending fetch failed:', fallbackErr);
            }
        }
        logger.error('[Sale] Get pending error:', error);
        return res.status(500).json({ error: 'Failed to fetch pending sales' });
    }
};

module.exports = {
    initiateSale,
    confirmSale,
    cancelSale,
    getPendingSales
};
