/**
 * Offers Controller
 * Price negotiation between buyers and sellers
 */

const pool = require('../config/db');

// Create a new offer - works with both old (postId/offeredPrice) and new (post_id/offer_amount) formats
const createOffer = async (req, res) => {
    const buyerId = req.user?.userId || req.user?.id;

    // Support both parameter naming conventions
    const postId = req.body.postId || req.body.post_id;
    const offeredPrice = req.body.offeredPrice || req.body.offer_amount;
    const sellerId = req.body.seller_id;
    const message = req.body.message;
    const discountPercent = req.body.discount_percent;

    if (!buyerId) {
        return res.status(401).json({ error: 'Authentication required', message: 'Login required to make offers' });
    }

    if (!postId || !offeredPrice) {
        return res.status(400).json({ error: 'Post ID and offered price required', message: 'Missing required fields' });
    }

    try {
        // Get post details
        const postResult = await pool.query(
            'SELECT user_id, price, title FROM posts WHERE post_id = $1 AND status = $2',
            [postId, 'active']
        );

        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found or not available' });
        }

        const post = postResult.rows[0];
        const sellerId = post.user_id;

        if (buyerId === sellerId) {
            return res.status(400).json({ error: 'Cannot make offer on your own post' });
        }

        // Check for existing pending offer
        const existingOffer = await pool.query(
            'SELECT offer_id FROM offers WHERE post_id = $1 AND buyer_id = $2 AND status = $3',
            [postId, buyerId, 'pending']
        );

        if (existingOffer.rows.length > 0) {
            return res.status(400).json({ error: 'You already have a pending offer on this post' });
        }

        // Create offer
        const result = await pool.query(`
      INSERT INTO offers (post_id, buyer_id, seller_id, offered_price, original_price, message)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [postId, buyerId, sellerId, offeredPrice, post.price, message]);

        res.status(201).json({
            message: 'Offer sent successfully',
            offer: result.rows[0]
        });
    } catch (error) {
        console.error('Create offer error:', error);
        res.status(500).json({ error: 'Failed to create offer' });
    }
};

// Get offers for a user (as seller or buyer)
const getOffers = async (req, res) => {
    const userId = req.user?.userId || req.user?.id;
    const { role = 'seller', status } = req.query; // role: 'seller' or 'buyer'

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        let query = `
      SELECT o.*, 
             p.title as post_title,
             p.images as post_images,
             bu.full_name as buyer_name,
             su.full_name as seller_name
      FROM offers o
      JOIN posts p ON p.post_id = o.post_id
      JOIN users bu ON bu.user_id = o.buyer_id
      JOIN users su ON su.user_id = o.seller_id
      WHERE ${role === 'seller' ? 'o.seller_id' : 'o.buyer_id'} = $1
    `;

        const params = [userId];

        if (status) {
            query += ` AND o.status = $2`;
            params.push(status);
        }

        query += ` ORDER BY o.created_at DESC`;

        const result = await pool.query(query, params);
        res.json({ offers: result.rows });
    } catch (error) {
        console.error('Get offers error:', error);
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
};

// Respond to an offer (accept/reject/counter)
const respondToOffer = async (req, res) => {
    const sellerId = req.user?.userId;
    const { offerId } = req.params;
    const { action, counterPrice } = req.body; // action: 'accept', 'reject', 'counter'

    if (!sellerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!['accept', 'reject', 'counter'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
    }

    try {
        // Verify ownership
        const offerResult = await pool.query(
            'SELECT * FROM offers WHERE offer_id = $1 AND seller_id = $2 AND status = $3',
            [offerId, sellerId, 'pending']
        );

        if (offerResult.rows.length === 0) {
            return res.status(404).json({ error: 'Offer not found or already processed' });
        }

        const offer = offerResult.rows[0];
        let newStatus = action === 'accept' ? 'accepted' : action === 'reject' ? 'rejected' : 'countered';

        const result = await pool.query(`
      UPDATE offers SET 
        status = $1, 
        counter_price = $2,
        updated_at = NOW()
      WHERE offer_id = $3
      RETURNING *
    `, [newStatus, counterPrice || null, offerId]);

        // If accepted, update post status
        if (action === 'accept') {
            await pool.query(
                'UPDATE posts SET status = $1 WHERE post_id = $2',
                ['sold', offer.post_id]
            );
        }

        res.json({
            message: `Offer ${newStatus}`,
            offer: result.rows[0]
        });
    } catch (error) {
        console.error('Respond to offer error:', error);
        res.status(500).json({ error: 'Failed to process offer' });
    }
};

// Get full offer negotiation history for a post
const getOfferHistory = async (req, res) => {
    const { postId } = req.params;

    try {
        const result = await pool.query(`
      SELECT o.*,
             bu.full_name as buyer_name,
             su.full_name as seller_name,
             p.title as post_title,
             p.price as post_price
      FROM offers o
      JOIN posts p ON p.post_id = o.post_id
      JOIN users bu ON bu.user_id = o.buyer_id
      JOIN users su ON su.user_id = o.seller_id
      WHERE o.post_id = $1
      ORDER BY o.created_at DESC
    `, [postId]);

        res.json({ history: result.rows });
    } catch (error) {
        console.error('Get offer history error:', error);
        res.status(500).json({ error: 'Failed to fetch offer history' });
    }
};

// Set auto-accept threshold for a seller
const setAutoAcceptThreshold = async (req, res) => {
    const sellerId = req.user?.userId || req.user?.id;
    const { postId, minAcceptPrice } = req.body;

    if (!sellerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (!postId || !minAcceptPrice || minAcceptPrice <= 0) {
        return res.status(400).json({ error: 'postId and valid minAcceptPrice required' });
    }

    try {
        // Verify ownership
        const post = await pool.query('SELECT user_id FROM posts WHERE post_id = $1', [postId]);
        if (post.rows.length === 0 || post.rows[0].user_id !== sellerId) {
            return res.status(403).json({ error: 'Not your post' });
        }

        // Store auto-accept threshold (using a metadata field or separate table)
        await pool.query(`
      UPDATE posts SET auto_accept_price = $1, updated_at = NOW()
      WHERE post_id = $2
    `, [minAcceptPrice, postId]);

        // Auto-accept any pending offers that meet the threshold
        const autoAccepted = await pool.query(`
      UPDATE offers SET status = 'accepted', updated_at = NOW()
      WHERE post_id = $1 AND status = 'pending' AND offered_price >= $2
      RETURNING *
    `, [postId, minAcceptPrice]);

        res.json({
            message: `Auto-accept threshold set to ${minAcceptPrice}`,
            autoAcceptedCount: autoAccepted.rows.length
        });
    } catch (error) {
        console.error('Set auto-accept error:', error);
        res.status(500).json({ error: 'Failed to set auto-accept threshold' });
    }
};

// Expire offers older than 48 hours (called by cron)
const expireOffers = async () => {
    try {
        const result = await pool.query(`
      UPDATE offers SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending'
        AND created_at < NOW() - INTERVAL '48 hours'
      RETURNING offer_id, buyer_id, seller_id, post_id
    `);

        if (result.rows.length > 0) {
            console.log(`[CRON] Expired ${result.rows.length} offers older than 48h`);
            // Notify buyers their offers expired
            for (const offer of result.rows) {
                await pool.query(`
          INSERT INTO notifications (user_id, title, message, type, created_at)
          VALUES ($1, '⏰ Offer Expired', 'Your offer has expired because the seller did not respond in 48 hours.', 'offer_expired', NOW())
        `, [offer.buyer_id]);
            }
        }
        return result.rows.length;
    } catch (error) {
        console.error('[CRON] Offer expiry error:', error);
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
