/**
 * Offers Controller
 * Price negotiation between buyers and sellers
 */

const pool = require('../config/db');

// Create a new offer
const createOffer = async (req, res) => {
    const buyerId = req.user?.userId;
    const { postId, offeredPrice, message } = req.body;

    if (!buyerId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (!postId || !offeredPrice) {
        return res.status(400).json({ error: 'Post ID and offered price required' });
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

        if (parseInt(buyerId) === sellerId) {
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
    const userId = req.user?.userId;
    const { role = 'seller', status } = req.query; // role: 'seller' or 'buyer'

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        let query = `
      SELECT o.*, 
             p.title as post_title,
             p.images as post_images,
             bu.username as buyer_username,
             bp.full_name as buyer_name,
             su.username as seller_username,
             sp.full_name as seller_name
      FROM offers o
      JOIN posts p ON p.post_id = o.post_id
      JOIN users bu ON bu.user_id = o.buyer_id
      LEFT JOIN profiles bp ON bp.user_id = o.buyer_id
      JOIN users su ON su.user_id = o.seller_id
      LEFT JOIN profiles sp ON sp.user_id = o.seller_id
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

module.exports = {
    createOffer,
    getOffers,
    respondToOffer
};
