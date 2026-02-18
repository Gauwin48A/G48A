/**
 * Inquiry Controller — Enhanced
 *
 * Additions over the original:
 *  - Quick-reply templates (GET /templates)
 *  - Seller quick-reply to an inquiry (POST /:id/reply)
 *  - Spam / duplicate detection on submission
 *  - Inquiry analytics summary (GET /analytics)
 *  - Mark inquiry as spam (PATCH /:id/spam)
 */
const pool = require('../config/db');

/* ─── helpers ─── */
const getUserId = (req) => req.user?.id || req.user?.userId || req.user?.user_id || null;

/* ─────────────────────────────────────────────
   Create inquiry (with spam/duplicate guard)
───────────────────────────────────────────── */
const createInquiry = async (req, res) => {
    try {
        const { postId, buyerName, phone, address, message } = req.body;

        if (!postId || !buyerName || !phone) {
            return res.status(400).json({ error: 'Post ID, buyer name, and phone number are required' });
        }

        const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        const buyerId = getUserId(req);

        // Post existence check
        const postCheck = await pool.query('SELECT post_id, user_id FROM posts WHERE post_id = $1', [postId]);
        if (postCheck.rows.length === 0) return res.status(404).json({ error: 'Post not found' });

        // ── Spam / duplicate guard ──
        // Prevent same phone from spamming the same post within 24h
        const dupeCheck = await pool.query(`
            SELECT inquiry_id FROM buyer_inquiries
            WHERE post_id = $1 AND phone = $2 AND created_at > NOW() - INTERVAL '24 hours'
            LIMIT 1
        `, [postId, phone.trim()]);

        if (dupeCheck.rows.length > 0) {
            return res.status(429).json({
                error: 'You have already submitted an inquiry for this listing in the last 24 hours.'
            });
        }

        // ── Spam score: >5 inquiries from same phone in 1h across all posts ──
        const spamCheck = await pool.query(`
            SELECT COUNT(*) FROM buyer_inquiries
            WHERE phone = $1 AND created_at > NOW() - INTERVAL '1 hour'
        `, [phone.trim()]);

        const isSpam = parseInt(spamCheck.rows[0].count) >= 5;

        const result = await pool.query(
            `INSERT INTO buyer_inquiries (post_id, buyer_id, buyer_name, phone, address, message, is_spam)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [postId, buyerId, buyerName, phone.trim(), address || null, message || null, isSpam]
        );

        if (!isSpam) {
            const sellerId = postCheck.rows[0].user_id;
            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type)
                 VALUES ($1, $2, $3, 'inquiry')`,
                [sellerId, 'New Buyer Interest!', `${buyerName} is interested in your listing. Phone: ${phone}`]
            );
        }

        res.status(201).json({
            success: true,
            message: isSpam ? 'Inquiry received' : 'Your interest has been submitted to the seller',
            inquiry: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating inquiry:', error);
        res.status(500).json({ error: 'Failed to submit inquiry' });
    }
};

/* ─────────────────────────────────────────────
   Get all inquiries for seller's posts
───────────────────────────────────────────── */
const getInquiriesForSeller = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const { status, search, page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const params = [userId];
        const conditions = ['p.user_id = $1', 'bi.is_spam = false'];

        if (status) { params.push(status); conditions.push(`bi.status = $${params.length}`); }
        if (search) { params.push(`%${search}%`); conditions.push(`(bi.buyer_name ILIKE $${params.length} OR bi.phone ILIKE $${params.length})`); }

        params.push(parseInt(limit), offset);

        const result = await pool.query(`
            SELECT bi.*, p.title as post_title, p.price as post_price
            FROM buyer_inquiries bi
            JOIN posts p ON bi.post_id = p.post_id
            WHERE ${conditions.join(' AND ')}
            ORDER BY bi.created_at DESC
            LIMIT $${params.length - 1} OFFSET $${params.length}
        `, params);

        res.json({ success: true, inquiries: result.rows, total: result.rows.length });
    } catch (error) {
        console.error('Error fetching seller inquiries:', error);
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
};

/* ─────────────────────────────────────────────
   Get inquiries for a specific post
───────────────────────────────────────────── */
const getInquiriesForPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = getUserId(req);

        const postCheck = await pool.query('SELECT user_id FROM posts WHERE post_id = $1', [postId]);
        if (postCheck.rows.length === 0) return res.status(404).json({ error: 'Post not found' });
        if (postCheck.rows[0].user_id !== userId) return res.status(403).json({ error: 'Not authorized' });

        const result = await pool.query(
            `SELECT * FROM buyer_inquiries WHERE post_id = $1 ORDER BY created_at DESC`,
            [postId]
        );
        res.json({ success: true, inquiries: result.rows, total: result.rows.length });
    } catch (error) {
        console.error('Error fetching post inquiries:', error);
        res.status(500).json({ error: 'Failed to fetch inquiries' });
    }
};

/* ─────────────────────────────────────────────
   Update inquiry status
───────────────────────────────────────────── */
const updateInquiryStatus = async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const { status } = req.body;
        const userId = getUserId(req);

        const validStatuses = ['pending', 'contacted', 'closed'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Must be: pending, contacted, closed' });
        }

        const inquiry = await pool.query(`
            SELECT bi.*, p.user_id as seller_id
            FROM buyer_inquiries bi JOIN posts p ON bi.post_id = p.post_id
            WHERE bi.inquiry_id = $1
        `, [inquiryId]);

        if (inquiry.rows.length === 0) return res.status(404).json({ error: 'Inquiry not found' });
        if (inquiry.rows[0].seller_id !== userId) return res.status(403).json({ error: 'Not authorized' });

        const result = await pool.query(
            `UPDATE buyer_inquiries SET status = $1, updated_at = NOW() WHERE inquiry_id = $2 RETURNING *`,
            [status, inquiryId]
        );
        res.json({ success: true, inquiry: result.rows[0] });
    } catch (error) {
        console.error('Error updating inquiry:', error);
        res.status(500).json({ error: 'Failed to update inquiry' });
    }
};

/* ─────────────────────────────────────────────
   Quick-reply templates
───────────────────────────────────────────── */
const QUICK_REPLY_TEMPLATES = [
    { id: 1, label: 'Interested – Call me', text: 'Thank you for your interest! Please call me to discuss further.' },
    { id: 2, label: 'Price negotiable', text: 'Hi! The price is negotiable. Let\'s connect and work something out.' },
    { id: 3, label: 'Item sold', text: 'Sorry, this item has already been sold. Thank you for your interest!' },
    { id: 4, label: 'Available – Visit anytime', text: 'The item is available. You\'re welcome to visit and inspect it anytime.' },
    { id: 5, label: 'WhatsApp me', text: 'Please WhatsApp me for more details and photos.' },
];

const getQuickReplyTemplates = async (req, res) => {
    res.json({ templates: QUICK_REPLY_TEMPLATES });
};

/* ─────────────────────────────────────────────
   Seller quick-reply to an inquiry
───────────────────────────────────────────── */
const replyToInquiry = async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const { reply_text, template_id } = req.body;
        const userId = getUserId(req);

        if (!reply_text && !template_id) {
            return res.status(400).json({ error: 'reply_text or template_id required' });
        }

        const finalText = reply_text || QUICK_REPLY_TEMPLATES.find(t => t.id === template_id)?.text;
        if (!finalText) return res.status(400).json({ error: 'Invalid template_id' });

        // Verify ownership
        const inquiry = await pool.query(`
            SELECT bi.*, p.user_id as seller_id, bi.buyer_id
            FROM buyer_inquiries bi JOIN posts p ON bi.post_id = p.post_id
            WHERE bi.inquiry_id = $1
        `, [inquiryId]);

        if (inquiry.rows.length === 0) return res.status(404).json({ error: 'Inquiry not found' });
        if (inquiry.rows[0].seller_id !== userId) return res.status(403).json({ error: 'Not authorized' });

        // Store reply
        const result = await pool.query(`
            UPDATE buyer_inquiries
            SET seller_reply = $1, reply_at = NOW(), status = 'contacted', updated_at = NOW()
            WHERE inquiry_id = $2 RETURNING *
        `, [finalText, inquiryId]);

        // Notify buyer if they have an account
        const buyerId = inquiry.rows[0].buyer_id;
        if (buyerId) {
            await pool.query(`
                INSERT INTO notifications (user_id, title, message, type)
                VALUES ($1, '💬 Seller Replied', $2, 'inquiry_reply')
            `, [buyerId, `The seller replied to your inquiry: "${finalText.substring(0, 80)}..."`]);
        }

        res.json({ success: true, inquiry: result.rows[0] });
    } catch (error) {
        console.error('Error replying to inquiry:', error);
        res.status(500).json({ error: 'Failed to send reply' });
    }
};

/* ─────────────────────────────────────────────
   Mark as spam (seller action)
───────────────────────────────────────────── */
const markAsSpam = async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const userId = getUserId(req);

        const inquiry = await pool.query(`
            SELECT bi.*, p.user_id as seller_id
            FROM buyer_inquiries bi JOIN posts p ON bi.post_id = p.post_id
            WHERE bi.inquiry_id = $1
        `, [inquiryId]);

        if (inquiry.rows.length === 0) return res.status(404).json({ error: 'Inquiry not found' });
        if (inquiry.rows[0].seller_id !== userId) return res.status(403).json({ error: 'Not authorized' });

        await pool.query(
            `UPDATE buyer_inquiries SET is_spam = true, status = 'closed', updated_at = NOW() WHERE inquiry_id = $1`,
            [inquiryId]
        );

        res.json({ success: true, message: 'Inquiry marked as spam' });
    } catch (error) {
        console.error('Error marking spam:', error);
        res.status(500).json({ error: 'Failed to mark as spam' });
    }
};

/* ─────────────────────────────────────────────
   Analytics summary for seller
───────────────────────────────────────────── */
const getInquiryAnalytics = async (req, res) => {
    try {
        const userId = getUserId(req);
        if (!userId) return res.status(401).json({ error: 'Authentication required' });

        const result = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE bi.is_spam = false)                          AS total,
                COUNT(*) FILTER (WHERE bi.status = 'pending' AND bi.is_spam = false) AS pending,
                COUNT(*) FILTER (WHERE bi.status = 'contacted')                      AS contacted,
                COUNT(*) FILTER (WHERE bi.status = 'closed')                         AS closed,
                COUNT(*) FILTER (WHERE bi.is_spam = true)                            AS spam,
                COUNT(*) FILTER (WHERE bi.created_at > NOW() - INTERVAL '7 days' AND bi.is_spam = false) AS last_7_days,
                COUNT(*) FILTER (WHERE bi.seller_reply IS NOT NULL)                  AS replied
            FROM buyer_inquiries bi
            JOIN posts p ON bi.post_id = p.post_id
            WHERE p.user_id = $1
        `, [userId]);

        const topPosts = await pool.query(`
            SELECT p.title, p.post_id, COUNT(bi.inquiry_id) as inquiry_count
            FROM buyer_inquiries bi
            JOIN posts p ON bi.post_id = p.post_id
            WHERE p.user_id = $1 AND bi.is_spam = false
            GROUP BY p.post_id, p.title
            ORDER BY inquiry_count DESC
            LIMIT 5
        `, [userId]);

        res.json({
            summary: result.rows[0],
            top_posts: topPosts.rows
        });
    } catch (error) {
        console.error('Error fetching inquiry analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

module.exports = {
    createInquiry,
    getInquiriesForSeller,
    getInquiriesForPost,
    updateInquiryStatus,
    getQuickReplyTemplates,
    replyToInquiry,
    markAsSpam,
    getInquiryAnalytics
};
