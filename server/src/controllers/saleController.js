/**
 * Sale Controller - Dual-Handshake Logic
 * Blue Team Gap 1: Verified Sale Process
 * 
 * State Machine:
 * INITIATED → PENDING_BUYER_CONFIRM → COMPLETED
 *      ↓              ↓
 *   CANCELLED    EXPIRED (48h)
 */

const pool = require('../config/db');
const crypto = require('crypto');
const otpService = require('../services/otpService');

// Generate 6-digit OTP (kept for backward compat, prefer otpService)
const generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Seller initiates a sale
 * POST /api/sale/initiate
 */
const initiateSale = async (req, res) => {
    const sellerId = req.user?.userId;
    const { postId, buyerId, agreedPrice } = req.body;

    if (!sellerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!postId || !buyerId || !agreedPrice) {
        return res.status(400).json({ error: 'Post ID, Buyer ID, and Agreed Price are required' });
    }

    if (parseInt(sellerId) === parseInt(buyerId)) {
        return res.status(400).json({ error: 'Cannot sell to yourself' });
    }

    try {
        // Verify seller owns the post
        const postCheck = await pool.query(
            'SELECT post_id, user_id, status, price FROM posts WHERE post_id = $1',
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const post = postCheck.rows[0];
        if (post.user_id !== parseInt(sellerId)) {
            return res.status(403).json({ error: 'You are not the owner of this post' });
        }

        if (post.status !== 'active') {
            return res.status(400).json({ error: 'Post is not available for sale' });
        }

        // Check for existing pending transaction
        const existingCheck = await pool.query(
            `SELECT * FROM transactions 
       WHERE post_id = $1 AND status IN ('pending_buyer_confirm', 'initiated')`,
            [postId]
        );

        if (existingCheck.rows.length > 0) {
            return res.status(400).json({ error: 'A sale is already in progress for this item' });
        }

        // Generate secure OTP for buyer verification via otpService
        const secretOTP = generateOTP();
        const hashedOTP = crypto.createHash('sha256').update(secretOTP).digest('hex');
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours for full transaction
        const otpExpiresAt = new Date(Date.now() + otpService.OTP_EXPIRY_MINUTES * 60 * 1000); // 10 min for OTP

        // Create transaction record with hashed OTP
        const result = await pool.query(`
      INSERT INTO transactions (
        post_id, seller_id, buyer_id, agreed_price, 
        secret_otp, otp_hash, otp_expires_at, otp_attempts,
        status, expires_at, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 'pending_buyer_confirm', $8, NOW())
      RETURNING *
    `, [postId, sellerId, buyerId, agreedPrice, secretOTP, hashedOTP, otpExpiresAt, expiresAt]);

        // Update post status
        await pool.query(
            `UPDATE posts SET status = 'sale_pending' WHERE post_id = $1`,
            [postId]
        );

        // Create notification for buyer
        await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
      VALUES ($1, $2, $3, 'sale_confirmation', $4, NOW())
    `, [
            buyerId,
            'Confirm Your Purchase',
            `The seller has initiated a sale for "${post.title || 'an item'}". Please confirm with the OTP code they provide.`,
            result.rows[0].transaction_id
        ]);

        // Send OTP via email/SMS (currently mock)
        try {
            const buyerInfo = await pool.query('SELECT email, phone FROM users WHERE user_id = $1', [buyerId]);
            if (buyerInfo.rows[0]?.email) {
                await otpService.sendOTP('email', buyerInfo.rows[0].email, secretOTP);
            }
        } catch (notifyErr) {
            console.warn('[Sale] OTP notification failed (non-blocking):', notifyErr.message);
        }

        res.status(201).json({
            message: 'Sale initiated successfully',
            transaction: {
                transactionId: result.rows[0].transaction_id,
                status: 'pending_buyer_confirm',
                secretOTP: secretOTP, // Show to seller to share with buyer in-person
                otpExpiresIn: `${otpService.OTP_EXPIRY_MINUTES} minutes`,
                expiresAt: expiresAt
            },
            instructions: 'Share this OTP with the buyer in person. They must enter it to confirm the sale. OTP expires in 10 minutes.'
        });

    } catch (error) {
        console.error('[Sale] Initiate error:', error);
        res.status(500).json({ error: 'Failed to initiate sale' });
    }
};

/**
 * Buyer confirms the sale with OTP
 * POST /api/sale/confirm
 */
const confirmSale = async (req, res) => {
    const buyerId = req.user?.userId;
    const { transactionId, otp } = req.body;

    if (!buyerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!transactionId || !otp) {
        return res.status(400).json({ error: 'Transaction ID and OTP are required' });
    }

    try {
        // Get transaction
        const txResult = await pool.query(
            `SELECT * FROM transactions WHERE transaction_id = $1`,
            [transactionId]
        );

        if (txResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = txResult.rows[0];

        // Verify buyer
        if (transaction.buyer_id !== parseInt(buyerId)) {
            return res.status(403).json({ error: 'You are not the buyer for this transaction' });
        }

        // Check status
        if (transaction.status !== 'pending_buyer_confirm') {
            return res.status(400).json({ error: `Transaction is ${transaction.status}, cannot confirm` });
        }

        // Check expiry
        if (new Date() > new Date(transaction.expires_at)) {
            await pool.query(
                `UPDATE transactions SET status = 'expired' WHERE transaction_id = $1`,
                [transactionId]
            );
            return res.status(400).json({ error: 'Transaction has expired' });
        }

        // Check OTP expiry (10-min window)
        const otpExpiry = transaction.otp_expires_at ? new Date(transaction.otp_expires_at) : null;
        if (otpExpiry && new Date() > otpExpiry) {
            return res.status(400).json({ error: 'OTP has expired. Ask the seller to initiate a new sale.' });
        }

        // Check attempt limit (max 3)
        const attempts = transaction.otp_attempts || 0;
        if (attempts >= otpService.MAX_ATTEMPTS) {
            return res.status(400).json({ error: 'Too many failed OTP attempts. Ask the seller to initiate a new sale.' });
        }

        // Increment attempt count
        await pool.query(
            'UPDATE transactions SET otp_attempts = COALESCE(otp_attempts, 0) + 1 WHERE transaction_id = $1',
            [transactionId]
        );

        // Verify OTP (support both hashed and plain comparison for backward compat)
        const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');
        const otpValid = (transaction.otp_hash && transaction.otp_hash === hashedInput) ||
            (transaction.secret_otp === otp);

        if (!otpValid) {
            const remaining = otpService.MAX_ATTEMPTS - attempts - 1;
            return res.status(400).json({ error: `Invalid OTP code. ${remaining} attempt(s) remaining.` });
        }

        // Complete the sale
        await pool.query(`
      UPDATE transactions 
      SET status = 'completed', completed_at = NOW() 
      WHERE transaction_id = $1
    `, [transactionId]);

        // Update post status to sold
        await pool.query(
            `UPDATE posts SET status = 'sold' WHERE post_id = $1`,
            [transaction.post_id]
        );

        // Award rewards to both parties
        await awardSaleRewards(transaction.seller_id, transaction.buyer_id, transaction.agreed_price);

        // Notify seller
        await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
      VALUES ($1, 'Sale Completed!', 'Your item has been sold successfully. Rewards have been credited.', 'sale_completed', $2, NOW())
    `, [transaction.seller_id, transactionId]);

        res.json({
            message: 'Sale confirmed successfully!',
            transaction: {
                transactionId: transaction.transaction_id,
                status: 'completed',
                completedAt: new Date()
            }
        });

    } catch (error) {
        console.error('[Sale] Confirm error:', error);
        res.status(500).json({ error: 'Failed to confirm sale' });
    }
};

/**
 * Cancel a pending sale
 * POST /api/sale/cancel
 */
const cancelSale = async (req, res) => {
    const userId = req.user?.userId;
    const { transactionId, reason } = req.body;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const txResult = await pool.query(
            `SELECT * FROM transactions WHERE transaction_id = $1`,
            [transactionId]
        );

        if (txResult.rows.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const transaction = txResult.rows[0];

        // Verify user is part of transaction
        if (transaction.seller_id !== parseInt(userId) && transaction.buyer_id !== parseInt(userId)) {
            return res.status(403).json({ error: 'You are not part of this transaction' });
        }

        // Can only cancel pending transactions
        if (transaction.status !== 'pending_buyer_confirm') {
            return res.status(400).json({ error: 'Cannot cancel - transaction is not pending' });
        }

        // Cancel the transaction
        await pool.query(`
      UPDATE transactions 
      SET status = 'cancelled', cancelled_by = $1, cancel_reason = $2 
      WHERE transaction_id = $3
    `, [userId, reason || 'No reason provided', transactionId]);

        // Restore post to active
        await pool.query(
            `UPDATE posts SET status = 'active' WHERE post_id = $1`,
            [transaction.post_id]
        );

        // Notify the other party
        const otherPartyId = transaction.seller_id === parseInt(userId)
            ? transaction.buyer_id
            : transaction.seller_id;

        await pool.query(`
      INSERT INTO notifications (user_id, title, message, type, created_at)
      VALUES ($1, 'Sale Cancelled', 'The pending sale has been cancelled.', 'sale_cancelled', NOW())
    `, [otherPartyId]);

        res.json({ message: 'Sale cancelled successfully' });

    } catch (error) {
        console.error('[Sale] Cancel error:', error);
        res.status(500).json({ error: 'Failed to cancel sale' });
    }
};

/**
 * Get pending sales for a user
 * GET /api/sale/pending
 */
const getPendingSales = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      SELECT t.*, p.title as post_title, p.images as post_images,
             seller.username as seller_name, buyer.username as buyer_name
      FROM transactions t
      JOIN posts p ON p.post_id = t.post_id
      JOIN users seller ON seller.user_id = t.seller_id
      JOIN users buyer ON buyer.user_id = t.buyer_id
      WHERE (t.seller_id = $1 OR t.buyer_id = $1)
        AND t.status = 'pending_buyer_confirm'
      ORDER BY t.created_at DESC
    `, [userId]);

        res.json({ pendingSales: result.rows });

    } catch (error) {
        console.error('[Sale] Get pending error:', error);
        res.status(500).json({ error: 'Failed to fetch pending sales' });
    }
};

/**
 * Award rewards after successful sale
 */
const awardSaleRewards = async (sellerId, buyerId, saleAmount) => {
    try {
        // Seller gets trust points
        const sellerPoints = Math.floor(saleAmount / 100); // 1 point per ₹100
        await pool.query(`
      INSERT INTO rewards (user_id, type, points, description, created_at)
      VALUES ($1, 'sale_completed', $2, 'Sale completed successfully', NOW())
    `, [sellerId, sellerPoints]);

        // Buyer gets points too (smaller amount)
        const buyerPoints = Math.floor(saleAmount / 200); // 0.5 points per ₹100
        await pool.query(`
      INSERT INTO rewards (user_id, type, points, description, created_at)
      VALUES ($1, 'purchase_completed', $2, 'Purchase verified', NOW())
    `, [buyerId, buyerPoints]);

        console.log(`[Rewards] Awarded ${sellerPoints} to seller, ${buyerPoints} to buyer`);
    } catch (error) {
        console.error('[Rewards] Award error:', error);
    }
};

module.exports = {
    initiateSale,
    confirmSale,
    cancelSale,
    getPendingSales
};
