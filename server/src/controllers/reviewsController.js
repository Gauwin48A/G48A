/**
 * Reviews Controller
 * Handles ratings, reviews, and seller reputation
 */

const pool = require('../config/db');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const REVIEWS_CACHE_TTL_SECONDS = 30;
const REVIEW_UPDATE_COOLDOWN_MINUTES = Number.parseInt(process.env.REVIEW_UPDATE_COOLDOWN_MINUTES, 10) || 30;
const MAX_REVIEWS_PER_DAY = Number.parseInt(process.env.REVIEW_MAX_PER_DAY, 10) || 20;
const REVIEW_AUTO_HIDE_FLAG_THRESHOLD = Number.parseInt(process.env.REVIEW_AUTO_HIDE_FLAG_THRESHOLD, 10) || 3;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
let reviewsSchemaReadyPromise = null;
let reviewsUpdatedAtAvailablePromise = null;
let reviewsUpdatedAtMissingLogged = false;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

function parseOptionalString(value) {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized.length ? normalized : null;
}

function parsePositiveInt(value, fallback, max = Number.MAX_SAFE_INTEGER) {
    const normalized = parseOptionalString(value);
    if (!normalized || !/^\d+$/.test(normalized)) return fallback;
    const parsed = Number(normalized);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, max);
}

function parseRating(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function idsEqual(left, right) {
    if (!left || !right) return false;
    return String(left) === String(right);
}

function getAuthenticatedUserId(req) {
    return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function getRequesterRole(req) {
    return String(req.user?.role || '').toLowerCase();
}

function canModerateReviews(req) {
    const role = getRequesterRole(req);
    return role === 'admin' || role === 'superadmin' || role === 'moderator';
}

function parseBoolean(value, fallback = false) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return fallback;
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

function buildReviewsCacheKey(userId, page, limit) {
    return `reviews:${userId}:page:${page}:limit:${limit}`;
}

function invalidateReviewsCache(userId) {
    if (!userId) return;
    cacheService.clearPattern(`reviews:${userId}:*`);
}

async function ensureReviewsModerationSchema() {
    if (!reviewsSchemaReadyPromise) {
        reviewsSchemaReadyPromise = (async () => {
            await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_response TEXT`);
            await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_response_at TIMESTAMPTZ`);
            await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false`);
            await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_reason TEXT`);
            await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_by TEXT`);
            await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ`);
            await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_count INTEGER DEFAULT 0`);
            await runQuery(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS abuse_score INTEGER DEFAULT 0`);

            await runQuery(`
                CREATE TABLE IF NOT EXISTS review_helpful_votes (
                    vote_id BIGSERIAL PRIMARY KEY,
                    review_id TEXT NOT NULL,
                    voter_id TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    UNIQUE (review_id, voter_id)
                )
            `);
            await runQuery(`CREATE INDEX IF NOT EXISTS idx_review_helpful_votes_review ON review_helpful_votes(review_id, created_at DESC)`);

            await runQuery(`
                CREATE TABLE IF NOT EXISTS review_flags (
                    flag_id BIGSERIAL PRIMARY KEY,
                    review_id TEXT NOT NULL,
                    reporter_id TEXT NOT NULL,
                    reason TEXT,
                    status VARCHAR(24) NOT NULL DEFAULT 'open',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    reviewed_at TIMESTAMPTZ,
                    reviewed_by TEXT,
                    UNIQUE (review_id, reporter_id)
                )
            `);
            await runQuery(`CREATE INDEX IF NOT EXISTS idx_review_flags_review_status ON review_flags(review_id, status, created_at DESC)`);
        })().catch((err) => {
            logger.warn('[Reviews] Moderation schema check failed', { message: err.message });
            return false;
        });
    }

    return reviewsSchemaReadyPromise;
}

async function hasReviewsUpdatedAtColumn() {
    if (!reviewsUpdatedAtAvailablePromise) {
        reviewsUpdatedAtAvailablePromise = runQuery(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'reviews'
                      AND column_name = 'updated_at'
                ) AS available
            `
        )
            .then((result) => {
                const available = Boolean(result?.rows?.[0]?.available);
                if (!available && !reviewsUpdatedAtMissingLogged) {
                    logger.warn('[Reviews] reviews.updated_at column is missing; falling back to created_at.');
                    reviewsUpdatedAtMissingLogged = true;
                }
                return available;
            })
            .catch((error) => {
                logger.warn('[Reviews] Failed to inspect updated_at column; using created_at fallback.', {
                    message: error.message
                });
                return false;
            });
    }

    return reviewsUpdatedAtAvailablePromise;
}

function getReviewUpdatedAtSelectClause(hasUpdatedAtColumn, tableAlias = '') {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    return hasUpdatedAtColumn ? `${prefix}updated_at` : `${prefix}created_at AS updated_at`;
}

function getReviewUpdatedAtSetClause(hasUpdatedAtColumn) {
    return hasUpdatedAtColumn ? ',\n                    updated_at = NOW()' : '';
}

// Get reviews for a user (seller)
const getReviewsForUser = async (req, res) => {
    try {
        await ensureReviewsModerationSchema();
        const userId = parseOptionalString(req.params.userId);
        const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
        const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
        const offset = (page - 1) * limit;
        const includeHidden = parseBoolean(req.query.include_hidden, false) && canModerateReviews(req);
        const hiddenFilterSql = includeHidden ? '' : 'AND COALESCE(r.is_hidden, false) = false';

        if (!userId) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const cacheKey = buildReviewsCacheKey(userId, page, limit);
        const payload = await cacheService.getOrSetWithStampedeProtection(
            cacheKey,
            async () => {
                const [reviewsResult, statsResult] = await Promise.all([
                    runQuery(
                        `
                            SELECT
                                r.*,
                                u.username as reviewer_name,
                                p.full_name as reviewer_full_name,
                                p.avatar_url as reviewer_avatar
                            FROM reviews r
                            JOIN users u ON u.user_id::text = r.reviewer_id::text
                            LEFT JOIN profiles p ON p.user_id::text = r.reviewer_id::text
                            WHERE r.reviewee_id::text = $1
                              ${hiddenFilterSql}
                            ORDER BY r.created_at DESC
                            LIMIT $2 OFFSET $3
                        `,
                        [userId, limit, offset]
                    ),
                    runQuery(
                        `
                            SELECT
                                COUNT(*)::int as total_reviews,
                                COALESCE(AVG(rating), 0) as average_rating,
                                COUNT(CASE WHEN rating = 5 THEN 1 END)::int as five_star,
                                COUNT(CASE WHEN rating = 4 THEN 1 END)::int as four_star,
                                COUNT(CASE WHEN rating = 3 THEN 1 END)::int as three_star,
                                COUNT(CASE WHEN rating = 2 THEN 1 END)::int as two_star,
                                COUNT(CASE WHEN rating = 1 THEN 1 END)::int as one_star
                            FROM reviews
                            WHERE reviewee_id::text = $1
                              ${includeHidden ? '' : 'AND COALESCE(is_hidden, false) = false'}
                        `,
                        [userId]
                    )
                ]);

                const stats = statsResult.rows[0];
                const totalReviews = stats?.total_reviews || 0;
                const averageRating = Number(stats?.average_rating || 0).toFixed(1);

                return {
                    reviews: reviewsResult.rows,
                    stats: {
                        totalReviews,
                        averageRating,
                        distribution: {
                            5: stats?.five_star || 0,
                            4: stats?.four_star || 0,
                            3: stats?.three_star || 0,
                            2: stats?.two_star || 0,
                            1: stats?.one_star || 0
                        }
                    },
                    pagination: {
                        page,
                        limit,
                        total: totalReviews
                    }
                };
            },
            REVIEWS_CACHE_TTL_SECONDS
        );

        return res.json(payload);
    } catch (error) {
        logger.error('Error fetching reviews:', error);
        return res.status(500).json({ error: 'Failed to fetch reviews' });
    }
};

// Create a new review
const createReview = async (req, res) => {
    try {
        await ensureReviewsModerationSchema();
        const hasReviewsUpdatedAt = await hasReviewsUpdatedAtColumn();
        const revieweeId = parseOptionalString(req.body.revieweeId || req.body.reviewee_id);
        const postId = parseOptionalString(req.body.postId || req.body.post_id);
        const rating = parseRating(req.body.rating);
        const title = parseOptionalString(req.body.title);
        const comment = parseOptionalString(req.body.comment);
        const reviewerId = getAuthenticatedUserId(req);

        if (!reviewerId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!revieweeId || rating === null) {
            return res.status(400).json({ error: 'Reviewee ID and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        if (idsEqual(reviewerId, revieweeId)) {
            return res.status(400).json({ error: 'You cannot review yourself' });
        }

        const dailyUsageResult = await runQuery(
            `
                SELECT COUNT(*)::int AS review_count
                FROM reviews
                WHERE reviewer_id::text = $1
                  AND created_at > NOW() - INTERVAL '24 hours'
            `,
            [reviewerId]
        );

        if ((dailyUsageResult.rows[0]?.review_count || 0) >= MAX_REVIEWS_PER_DAY) {
            return res.status(429).json({
                error: 'Daily review limit reached. Please try again tomorrow.',
                retryAfterHours: 24
            });
        }

        const existingReviewResult = await runQuery(
            `
                SELECT review_id, ${getReviewUpdatedAtSelectClause(hasReviewsUpdatedAt)}
                FROM reviews
                WHERE reviewer_id::text = $1
                  AND reviewee_id::text = $2
                  AND (
                        (post_id::text = $3)
                        OR (post_id IS NULL AND $3 IS NULL)
                      )
                LIMIT 1
            `,
            [reviewerId, revieweeId, postId]
        );

        if (existingReviewResult.rows.length > 0) {
            const updatedAt = existingReviewResult.rows[0].updated_at
                ? new Date(existingReviewResult.rows[0].updated_at).getTime()
                : 0;
            const cooldownMs = REVIEW_UPDATE_COOLDOWN_MINUTES * 60 * 1000;
            if (updatedAt && (Date.now() - updatedAt) < cooldownMs) {
                const retryAfterMinutes = Math.ceil((cooldownMs - (Date.now() - updatedAt)) / (60 * 1000));
                return res.status(429).json({
                    error: `Review update cooldown active. Try again in ${retryAfterMinutes} minute(s).`,
                    retryAfterMinutes
                });
            }
        }

        let verifiedPurchase = false;
        if (postId) {
            const transactionCheck = await runQuery(
                `
                    SELECT 1
                    FROM transactions
                    WHERE buyer_id::text = $1
                      AND seller_id::text = $2
                      AND post_id::text = $3
                      AND status = 'completed'
                    LIMIT 1
                `,
                [reviewerId, revieweeId, postId]
            );
            verifiedPurchase = transactionCheck.rows.length > 0;
        }

        const result = await runQuery(
            `
                INSERT INTO reviews (reviewer_id, reviewee_id, post_id, rating, title, comment, verified_purchase)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (reviewer_id, reviewee_id, post_id)
                DO UPDATE SET
                    rating = $4,
                    title = $5,
                    comment = $6,
                    verified_purchase = $7${getReviewUpdatedAtSetClause(hasReviewsUpdatedAt)}
                RETURNING
                    review_id,
                    reviewer_id,
                    reviewee_id,
                    post_id,
                    rating,
                    title,
                    comment,
                    verified_purchase,
                    helpful_count,
                    seller_response,
                    seller_response_at,
                    is_hidden,
                    hidden_reason,
                    hidden_by,
                    hidden_at,
                    flag_count,
                    abuse_score,
                    created_at,
                    ${getReviewUpdatedAtSelectClause(hasReviewsUpdatedAt)}
            `,
            [reviewerId, revieweeId, postId, rating, title, comment, verifiedPurchase]
        );
        invalidateReviewsCache(revieweeId);

        return res.status(201).json({
            message: 'Review submitted successfully',
            review: result.rows[0]
        });
    } catch (error) {
        logger.error('Error creating review:', error);
        return res.status(500).json({ error: 'Failed to submit review' });
    }
};

// Mark review as helpful
const markReviewHelpful = async (req, res) => {
    try {
        await ensureReviewsModerationSchema();
        const reviewId = parseOptionalString(req.params.reviewId);
        const voterId = getAuthenticatedUserId(req);

        if (!voterId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!reviewId) {
            return res.status(400).json({ error: 'Invalid review ID' });
        }

        const reviewLookup = await runQuery(
            `
                SELECT review_id, reviewer_id, reviewee_id, helpful_count
                FROM reviews
                WHERE review_id::text = $1
                LIMIT 1
            `,
            [reviewId]
        );

        if (!reviewLookup.rows.length) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const review = reviewLookup.rows[0];
        if (idsEqual(voterId, review.reviewer_id)) {
            return res.status(400).json({ error: 'You cannot mark your own review as helpful' });
        }

        const voteInsert = await runQuery(
            `
                INSERT INTO review_helpful_votes (review_id, voter_id, created_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (review_id, voter_id) DO NOTHING
                RETURNING vote_id
            `,
            [reviewId, voterId]
        );

        if (!voteInsert.rows.length) {
            return res.status(200).json({
                alreadyVoted: true,
                helpfulCount: review.helpful_count || 0
            });
        }

        const result = await runQuery(
            `
                UPDATE reviews
                SET helpful_count = COALESCE(helpful_count, 0) + 1
                WHERE review_id::text = $1
                RETURNING helpful_count, reviewee_id
            `,
            [reviewId]
        );

        const revieweeId = result.rows[0]?.reviewee_id;
        invalidateReviewsCache(revieweeId);

        return res.json({ helpfulCount: result.rows[0].helpful_count });
    } catch (error) {
        logger.error('Error updating helpful count:', error);
        return res.status(500).json({ error: 'Failed to update' });
    }
};

// Delete own review
const deleteReview = async (req, res) => {
    try {
        const reviewId = parseOptionalString(req.params.reviewId);
        const reviewerId = getAuthenticatedUserId(req);

        if (!reviewerId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!reviewId) {
            return res.status(400).json({ error: 'Invalid review ID' });
        }

        const result = await runQuery(
            `
                DELETE FROM reviews
                WHERE review_id::text = $1
                  AND reviewer_id::text = $2
                RETURNING review_id, reviewee_id
            `,
            [reviewId, reviewerId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: 'Review not found or not authorized' });
        }
        const deletedRevieweeId = result.rows[0]?.reviewee_id;
        invalidateReviewsCache(deletedRevieweeId);

        return res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        logger.error('Error deleting review:', error);
        return res.status(500).json({ error: 'Failed to delete review' });
    }
};

// Seller response to a review
const respondToReview = async (req, res) => {
    try {
        await ensureReviewsModerationSchema();
        const hasReviewsUpdatedAt = await hasReviewsUpdatedAtColumn();
        const reviewId = parseOptionalString(req.params.reviewId);
        const actorId = getAuthenticatedUserId(req);
        const responseText = parseOptionalString(req.body.response || req.body.seller_response);

        if (!actorId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!reviewId) {
            return res.status(400).json({ error: 'Invalid review ID' });
        }
        if (!responseText) {
            return res.status(400).json({ error: 'Seller response is required' });
        }
        if (responseText.length > 1000) {
            return res.status(400).json({ error: 'Seller response must be 1000 characters or less' });
        }

        const reviewLookup = await runQuery(
            `
                SELECT review_id, reviewee_id
                FROM reviews
                WHERE review_id::text = $1
                LIMIT 1
            `,
            [reviewId]
        );

        if (!reviewLookup.rows.length) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const review = reviewLookup.rows[0];
        if (!idsEqual(actorId, review.reviewee_id) && !canModerateReviews(req)) {
            return res.status(403).json({ error: 'Only the reviewed seller can respond to this review' });
        }

        const result = await runQuery(
            `
                UPDATE reviews
                SET seller_response = $1,
                    seller_response_at = NOW()${getReviewUpdatedAtSetClause(hasReviewsUpdatedAt)}
                WHERE review_id::text = $2
                RETURNING
                    review_id,
                    reviewer_id,
                    reviewee_id,
                    post_id,
                    rating,
                    title,
                    comment,
                    verified_purchase,
                    helpful_count,
                    seller_response,
                    seller_response_at,
                    is_hidden,
                    hidden_reason,
                    hidden_by,
                    hidden_at,
                    flag_count,
                    abuse_score,
                    created_at,
                    ${getReviewUpdatedAtSelectClause(hasReviewsUpdatedAt)}
            `,
            [responseText, reviewId]
        );

        invalidateReviewsCache(review.reviewee_id);
        return res.json({
            message: 'Seller response submitted',
            review: result.rows[0]
        });
    } catch (error) {
        logger.error('Error responding to review:', error);
        return res.status(500).json({ error: 'Failed to submit seller response' });
    }
};

// Flag a review for abuse/spam
const flagReview = async (req, res) => {
    try {
        await ensureReviewsModerationSchema();
        const hasReviewsUpdatedAt = await hasReviewsUpdatedAtColumn();
        const reviewId = parseOptionalString(req.params.reviewId);
        const reporterId = getAuthenticatedUserId(req);
        const reason = parseOptionalString(req.body.reason) || 'Flagged by user';

        if (!reporterId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!reviewId) {
            return res.status(400).json({ error: 'Invalid review ID' });
        }

        const reviewLookup = await runQuery(
            `
                SELECT review_id, reviewer_id, reviewee_id, flag_count
                FROM reviews
                WHERE review_id::text = $1
                LIMIT 1
            `,
            [reviewId]
        );

        if (!reviewLookup.rows.length) {
            return res.status(404).json({ error: 'Review not found' });
        }

        const review = reviewLookup.rows[0];
        if (idsEqual(reporterId, review.reviewer_id)) {
            return res.status(400).json({ error: 'You cannot flag your own review' });
        }

        const flagInsert = await runQuery(
            `
                INSERT INTO review_flags (review_id, reporter_id, reason, status, created_at)
                VALUES ($1, $2, $3, 'open', NOW())
                ON CONFLICT (review_id, reporter_id) DO NOTHING
                RETURNING flag_id
            `,
            [reviewId, reporterId, reason]
        );

        if (!flagInsert.rows.length) {
            return res.status(200).json({
                alreadyFlagged: true,
                message: 'You have already flagged this review'
            });
        }

        const updatedReview = await runQuery(
            `
                UPDATE reviews
                SET flag_count = COALESCE(flag_count, 0) + 1,
                    abuse_score = COALESCE(abuse_score, 0) + 1,
                    is_hidden = CASE
                        WHEN COALESCE(flag_count, 0) + 1 >= $2 THEN true
                        ELSE COALESCE(is_hidden, false)
                    END,
                    hidden_reason = CASE
                        WHEN COALESCE(flag_count, 0) + 1 >= $2 THEN 'Auto-hidden due to multiple abuse flags'
                        ELSE hidden_reason
                    END,
                    hidden_by = CASE
                        WHEN COALESCE(flag_count, 0) + 1 >= $2 THEN 'system'
                        ELSE hidden_by
                    END,
                    hidden_at = CASE
                        WHEN COALESCE(flag_count, 0) + 1 >= $2 THEN COALESCE(hidden_at, NOW())
                        ELSE hidden_at
                    END${hasReviewsUpdatedAt ? `,
                    updated_at = NOW()` : ''}
                WHERE review_id::text = $1
                RETURNING review_id, reviewee_id, flag_count, is_hidden, hidden_reason
            `,
            [reviewId, REVIEW_AUTO_HIDE_FLAG_THRESHOLD]
        );

        const revieweeId = updatedReview.rows[0]?.reviewee_id;
        invalidateReviewsCache(revieweeId);

        return res.json({
            success: true,
            message: 'Review flagged for moderation',
            moderation: updatedReview.rows[0]
        });
    } catch (error) {
        logger.error('Error flagging review:', error);
        return res.status(500).json({ error: 'Failed to flag review' });
    }
};

// Admin/moderator hide or unhide review
const moderateReviewVisibility = async (req, res) => {
    try {
        await ensureReviewsModerationSchema();
        const hasReviewsUpdatedAt = await hasReviewsUpdatedAtColumn();
        const reviewId = parseOptionalString(req.params.reviewId);
        const moderatorId = getAuthenticatedUserId(req);
        const action = String(req.body.action || '').trim().toLowerCase();
        const reason = parseOptionalString(req.body.reason);

        if (!moderatorId) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!canModerateReviews(req)) {
            return res.status(403).json({ error: 'Admin or moderator access required' });
        }
        if (!reviewId) {
            return res.status(400).json({ error: 'Invalid review ID' });
        }
        if (!['hide', 'unhide'].includes(action)) {
            return res.status(400).json({ error: 'Action must be hide or unhide' });
        }

        const shouldHide = action === 'hide';
        const result = await runQuery(
            `
                UPDATE reviews
                SET is_hidden = $1,
                    hidden_reason = CASE WHEN $1 THEN COALESCE($2, hidden_reason, 'Hidden by moderation') ELSE NULL END,
                    hidden_by = CASE WHEN $1 THEN $3 ELSE NULL END,
                    hidden_at = CASE WHEN $1 THEN NOW() ELSE NULL END${hasReviewsUpdatedAt ? `,
                    updated_at = NOW()` : ''}
                WHERE review_id::text = $4
                RETURNING review_id, reviewee_id, is_hidden, hidden_reason, hidden_by, hidden_at
            `,
            [shouldHide, reason, moderatorId, reviewId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ error: 'Review not found' });
        }

        invalidateReviewsCache(result.rows[0].reviewee_id);
        return res.json({
            success: true,
            message: shouldHide ? 'Review hidden' : 'Review made visible',
            moderation: result.rows[0]
        });
    } catch (error) {
        logger.error('Error moderating review visibility:', error);
        return res.status(500).json({ error: 'Failed to moderate review' });
    }
};

module.exports = {
    getReviewsForUser,
    createReview,
    markReviewHelpful,
    deleteReview,
    respondToReview,
    flagReview,
    moderateReviewVisibility
};
