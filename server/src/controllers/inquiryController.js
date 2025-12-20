const pool = require('../config/db');

// Create a new buyer inquiry
const createInquiry = async (req, res) => {
    try {
        const { postId, buyerName, phone, address, message } = req.body;

        // Validate required fields
        if (!postId || !buyerName || !phone) {
            return res.status(400).json({
                error: 'Post ID, buyer name, and phone number are required'
            });
        }

        // Validate phone format (basic validation)
        const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        // Get buyer_id if user is authenticated
        const buyerId = req.user?.id || req.user?.user_id || null;

        // Check if post exists
        const postCheck = await pool.query(
            'SELECT post_id, user_id FROM posts WHERE post_id = $1',
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Insert the inquiry
        const result = await pool.query(
            `INSERT INTO buyer_inquiries (post_id, buyer_id, buyer_name, phone, address, message)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [postId, buyerId, buyerName, phone, address || null, message || null]
        );

        // Create notification for seller
        const sellerId = postCheck.rows[0].user_id;
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
            [
                sellerId,
                'New Buyer Interest!',
                `${buyerName} is interested in your listing. Phone: ${phone}`,
                'inquiry'
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Your interest has been submitted to the seller',
            inquiry: result.rows[0]
        });

    } catch (error) {
        console.error('Error creating inquiry:', error);
        res.status(500).json({ error: 'Failed to submit inquiry' });
    }
};

// Get all inquiries for a seller's posts
const getInquiriesForSeller = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.user_id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await pool.query(
            `SELECT bi.*, p.title as post_title, p.price as post_price
       FROM buyer_inquiries bi
       JOIN posts p ON bi.post_id = p.post_id
       WHERE p.user_id = $1
       ORDER BY bi.created_at DESC`,
            [userId]
        );

        res.json({
            success: true,
            inquiries: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching seller inquiries:', error);
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
};

// Get inquiries for a specific post
const getInquiriesForPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user?.id || req.user?.user_id;

        // Verify user owns this post
        const postCheck = await pool.query(
            'SELECT user_id FROM posts WHERE post_id = $1',
            [postId]
        );

        if (postCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Post not found' });
        }

        if (postCheck.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to view these inquiries' });
        }

        const result = await pool.query(
            `SELECT * FROM buyer_inquiries 
       WHERE post_id = $1 
       ORDER BY created_at DESC`,
            [postId]
        );

        res.json({
            success: true,
            inquiries: result.rows,
            total: result.rows.length
        });

    } catch (error) {
        console.error('Error fetching post inquiries:', error);
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
};

// Update inquiry status
const updateInquiryStatus = async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const { status } = req.body;
        const userId = req.user?.id || req.user?.user_id;

        // Validate status
        const validStatuses = ['pending', 'contacted', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        // Check ownership
        const inquiry = await pool.query(
            `SELECT bi.*, p.user_id as seller_id
       FROM buyer_inquiries bi
       JOIN posts p ON bi.post_id = p.post_id
       WHERE bi.inquiry_id = $1`,
            [inquiryId]
        );

        if (inquiry.rows.length === 0) {
            return res.status(404).json({ error: 'Inquiry not found' });
        }

        if (inquiry.rows[0].seller_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const result = await pool.query(
            `UPDATE buyer_inquiries 
       SET status = $1, updated_at = NOW() 
       WHERE inquiry_id = $2 
       RETURNING *`,
            [status, inquiryId]
        );

        res.json({
            success: true,
            inquiry: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating inquiry:', error);
        res.status(500).json({ error: 'Failed to update inquiry' });
    }
};

module.exports = {
    createInquiry,
    getInquiriesForSeller,
    getInquiriesForPost,
    updateInquiryStatus
};
