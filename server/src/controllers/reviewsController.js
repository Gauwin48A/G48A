/**
 * Reviews Controller
 * Handles ratings, reviews, and seller reputation
 */

const pool = require('../config/db');

// Get reviews for a user (seller)
const getReviewsForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Validate userId
        if (!userId || isNaN(parseInt(userId))) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Get reviews with reviewer info
        const reviewsResult = await pool.query(`
      SELECT 
        r.*,
        u.username as reviewer_name,
        p.full_name as reviewer_full_name,
        p.avatar_url as reviewer_avatar
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.user_id
      LEFT JOIN profiles p ON r.reviewer_id = p.user_id
      WHERE r.reviewee_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

        // Get rating statistics
        const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_reviews,
        COALESCE(AVG(rating), 0) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
      FROM reviews
      WHERE reviewee_id = $1
    `, [userId]);

        const stats = statsResult.rows[0];

        res.json({
            reviews: reviewsResult.rows,
            stats: {
                totalReviews: parseInt(stats.total_reviews),
                averageRating: parseFloat(stats.average_rating).toFixed(1),
                distribution: {
                    5: parseInt(stats.five_star),
                    4: parseInt(stats.four_star),
                    3: parseInt(stats.three_star),
                    2: parseInt(stats.two_star),
                    1: parseInt(stats.one_star)
                }
            },
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(stats.total_reviews)
            }
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

// Create a new review
const createReview = async (req, res) => {
    try {
        const { revieweeId, postId, rating, title, comment } = req.body;
        const reviewerId = req.user?.userId;

        // Validation
        if (!reviewerId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!revieweeId || !rating) {
            return res.status(400).json({ error: 'Reviewee ID and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Prevent self-review
        if (parseInt(reviewerId) === parseInt(revieweeId)) {
            return res.status(400).json({ error: 'You cannot review yourself' });
        }

        // Check for verified purchase
        let verifiedPurchase = false;
        if (postId) {
            const transactionCheck = await pool.query(`
        SELECT 1 FROM transactions 
        WHERE buyer_id = $1 AND seller_id = $2 AND post_id = $3 AND status = 'completed'
      `, [reviewerId, revieweeId, postId]);
            verifiedPurchase = transactionCheck.rows.length > 0;
        }

        // Insert review
        const result = await pool.query(`
      INSERT INTO reviews (reviewer_id, reviewee_id, post_id, rating, title, comment, verified_purchase)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (reviewer_id, reviewee_id, post_id) 
      DO UPDATE SET rating = $4, title = $5, comment = $6, updated_at = NOW()
      RETURNING *
    `, [reviewerId, revieweeId, postId, rating, title, comment, verifiedPurchase]);

        res.status(201).json({
            message: 'Review submitted successfully',
            review: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: 'Failed to submit review' });
    }
};

// Mark review as helpful
const markReviewHelpful = async (req, res) => {
    try {
        const { reviewId } = req.params;

        const result = await pool.query(`
      UPDATE reviews 
      SET helpful_count = helpful_count + 1
      WHERE review_id = $1
      RETURNING helpful_count
    `, [reviewId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found' });
        }

        res.json({ helpfulCount: result.rows[0].helpful_count });
    } catch (error) {
        console.error('Error updating helpful count:', error);
        res.status(500).json({ error: 'Failed to update' });
    }
};

// Delete own review
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const reviewerId = req.user?.userId;

        if (!reviewerId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await pool.query(`
      DELETE FROM reviews 
      WHERE review_id = $1 AND reviewer_id = $2
      RETURNING *
    `, [reviewId, reviewerId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found or not authorized' });
        }

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: 'Failed to delete review' });
    }
};

module.exports = {
    getReviewsForUser,
    createReview,
    markReviewHelpful,
    deleteReview
};
