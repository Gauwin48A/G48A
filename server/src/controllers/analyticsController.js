/**
 * Analytics Controller
 * Seller performance insights and dashboard data
 */

const pool = require('../config/db');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');
const { captureClientError } = require('../services/errorReporter');

const SELLER_ANALYTICS_CACHE_TTL_SECONDS = 30;
const POST_PERFORMANCE_CACHE_TTL_SECONDS = 60;
const CATEGORY_BREAKDOWN_CACHE_TTL_SECONDS = 60;
const DEVICE_SUMMARY_CACHE_TTL_SECONDS = 300;
const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const ANALYTICS_DEBUG = process.env.ANALYTICS_DEBUG === 'true';

function getUserId(req) {
    return req.user?.userId || req.user?.id || req.user?.user_id || null;
}

function parseInteger(value, fallback = 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function parseFloatValue(value, fallback = 0) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

// Get seller analytics dashboard
const getSellerAnalytics = async (req, res) => {
  const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    const userIdInt = Number.parseInt(String(userId), 10);
    if (!Number.isFinite(userIdInt)) {
        return res.status(400).json({ error: 'Invalid user id' });
    }

  try {
        const userIdText = String(userId);
        const cacheKey = `analytics:seller:${userIdText}`;
        if (String(req.query.refresh).toLowerCase() === 'true') {
            cacheService.del(cacheKey);
        }

        const payload = await cacheService.getOrSetWithStampedeProtection(
            cacheKey,
            async () => {
                await runQuery(
                    `
                        INSERT INTO seller_analytics (user_id)
                        SELECT $1::int
                        WHERE NOT EXISTS (
                            SELECT 1 FROM seller_analytics WHERE user_id = $1::int
                        )
                    `,
                    [userIdInt]
                );

                const stats = await runQuery(
                    `
                        WITH post_stats AS (
                            SELECT
                                COUNT(*)::int AS total_posts,
                                COUNT(*) FILTER (WHERE status = 'active')::int AS active_posts,
                                COUNT(*) FILTER (WHERE status = 'sold')::int AS sold_posts,
                                COALESCE(SUM(views_count), 0)::bigint AS total_views
                            FROM posts
                            WHERE user_id::text = $1
                        ),
                        inquiry_stats AS (
                            SELECT COUNT(*)::int AS total_inquiries
                            FROM buyer_inquiries bi
                            JOIN posts p ON p.post_id = bi.post_id
                            WHERE p.user_id::text = $1
                        ),
                        offer_stats AS (
                            SELECT
                                COUNT(*)::int AS total_offers,
                                COUNT(*) FILTER (WHERE status = 'accepted')::int AS accepted_offers
                            FROM offers
                            WHERE seller_id::text = $1
                        ),
                        revenue_stats AS (
                            SELECT COALESCE(SUM(amount), 0)::numeric AS total_revenue
                            FROM transactions
                            WHERE seller_id::text = $1 AND status = 'completed'
                        ),
                        review_stats AS (
                            SELECT
                                AVG(rating) AS avg_rating,
                                COUNT(*)::int AS total_reviews
                            FROM reviews
                            WHERE reviewee_id::text = $1
                        )
                        SELECT
                            ps.total_posts,
                            ps.active_posts,
                            ps.sold_posts,
                            ps.total_views,
                            ins.total_inquiries,
                            os.total_offers,
                            os.accepted_offers,
                            rs.total_revenue,
                            rvs.avg_rating,
                            rvs.total_reviews
                        FROM post_stats ps
                        CROSS JOIN inquiry_stats ins
                        CROSS JOIN offer_stats os
                        CROSS JOIN revenue_stats rs
                        CROSS JOIN review_stats rvs
                    `,
                    [userIdText]
                );

                const data = stats.rows[0];
                const totalInquiries = parseInteger(data.total_inquiries, 0);
                const acceptedOffers = parseInteger(data.accepted_offers, 0);
                const conversionRate = totalInquiries > 0
                    ? Number(((acceptedOffers / totalInquiries) * 100).toFixed(1))
                    : 0;

                await runQuery(
                    `
                        UPDATE seller_analytics
                        SET
                            total_views = $2,
                            total_inquiries = $3,
                            total_offers = $4,
                            total_sales = $5,
                            total_revenue = $6,
                            conversion_rate = $7,
                            updated_at = NOW()
                        WHERE user_id = $1
                    `,
                    [
                        userIdText,
                        parseInteger(data.total_views, 0),
                        totalInquiries,
                        parseInteger(data.total_offers, 0),
                        parseInteger(data.sold_posts, 0),
                        parseFloatValue(data.total_revenue, 0),
                        conversionRate
                    ]
                );

                return {
                    overview: {
                        totalPosts: parseInteger(data.total_posts, 0),
                        activePosts: parseInteger(data.active_posts, 0),
                        soldPosts: parseInteger(data.sold_posts, 0),
                        totalViews: parseInteger(data.total_views, 0),
                        totalInquiries: totalInquiries,
                        totalOffers: parseInteger(data.total_offers, 0),
                        acceptedOffers: acceptedOffers,
                        totalRevenue: parseFloatValue(data.total_revenue, 0),
                        avgRating: data.avg_rating ? parseFloatValue(data.avg_rating, 0).toFixed(1) : null,
                        totalReviews: parseInteger(data.total_reviews, 0),
                        conversionRate
                    }
                };
            },
            SELLER_ANALYTICS_CACHE_TTL_SECONDS
        );

        return res.json(payload);
    } catch (error) {
        logger.error('Get seller analytics error:', error);
        return res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

// Get post performance breakdown
const getPostPerformance = async (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const userIdText = String(userId);
        const cacheKey = `analytics:post-performance:${userIdText}`;
        const payload = await cacheService.getOrSetWithStampedeProtection(
            cacheKey,
            async () => {
                const result = await runQuery(
                    `
                        WITH user_posts AS (
                            SELECT
                                p.post_id,
                                p.title,
                                p.price,
                                p.status,
                                p.views_count,
                                p.created_at,
                                p.category_id
                            FROM posts p
                            WHERE p.user_id::text = $1
                        ),
                        inquiry_counts AS (
                            SELECT
                                bi.post_id,
                                COUNT(*)::int AS inquiry_count
                            FROM buyer_inquiries bi
                            JOIN user_posts up ON up.post_id = bi.post_id
                            GROUP BY bi.post_id
                        ),
                        offer_counts AS (
                            SELECT
                                o.post_id,
                                COUNT(*)::int AS offer_count
                            FROM offers o
                            JOIN user_posts up ON up.post_id = o.post_id
                            GROUP BY o.post_id
                        )
                        SELECT
                            up.post_id,
                            up.title,
                            up.price,
                            up.status,
                            up.views_count,
                            up.created_at,
                            c.name as category,
                            COALESCE(ic.inquiry_count, 0) as inquiry_count,
                            COALESCE(oc.offer_count, 0) as offer_count
                        FROM user_posts up
                        LEFT JOIN categories c ON c.category_id = up.category_id
                        LEFT JOIN inquiry_counts ic ON ic.post_id = up.post_id
                        LEFT JOIN offer_counts oc ON oc.post_id = up.post_id
                        ORDER BY up.views_count DESC
                        LIMIT 20
                    `,
                    [userIdText]
                );
                return { posts: result.rows };
            },
            POST_PERFORMANCE_CACHE_TTL_SECONDS
        );
        return res.json(payload);
    } catch (error) {
        logger.error('Get post performance error:', error);
        return res.status(500).json({ error: 'Failed to fetch post performance' });
    }
};

// Get category distribution
const getCategoryBreakdown = async (req, res) => {
    const userId = getUserId(req);

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const userIdText = String(userId);
        const cacheKey = `analytics:category-breakdown:${userIdText}`;
        const payload = await cacheService.getOrSetWithStampedeProtection(
            cacheKey,
            async () => {
                const result = await runQuery(
                    `
                        SELECT
                            c.name as category,
                            COUNT(*)::int as post_count,
                            COALESCE(SUM(p.views_count), 0)::bigint as total_views,
                            COUNT(CASE WHEN p.status = 'sold' THEN 1 END)::int as sold_count
                        FROM posts p
                        LEFT JOIN categories c ON c.category_id = p.category_id
                        WHERE p.user_id::text = $1
                        GROUP BY c.category_id, c.name
                        ORDER BY post_count DESC
                    `,
                    [userIdText]
                );
                return { breakdown: result.rows };
            },
            CATEGORY_BREAKDOWN_CACHE_TTL_SECONDS
        );
        return res.json(payload);
    } catch (error) {
        logger.error('Get category breakdown error:', error);
        return res.status(500).json({ error: 'Failed to fetch category breakdown' });
    }
};

/**
 * Store device fingerprint and info
 * POST /api/analytics/device
 */
const saveDeviceInfo = async (req, res) => {
    try {
        const {
            fingerprint,
            userAgent,
            deviceType,
            browser,
            browserVersion,
            os,
            osVersion,
            screenWidth,
            screenHeight,
            pixelRatio,
            language,
            timezone,
            networkInfo,
            cpuCores,
            capturedAt
        } = req.body;

        const userId = getUserId(req);
        const ip = req.headers['x-forwarded-for']?.split(',')[0]
            || req.connection?.remoteAddress
            || req.socket?.remoteAddress
            || 'unknown';

        const query = `
            INSERT INTO device_analytics (
                user_id, fingerprint, ip_address, user_agent, device_type,
                browser, browser_version, os, os_version,
                screen_width, screen_height, pixel_ratio,
                language, timezone, network_type, cpu_cores,
                captured_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
            RETURNING id
        `;

        const result = await runQuery(query, [
            userId,
            fingerprint,
            ip,
            userAgent?.substring(0, 500),
            deviceType,
            browser,
            browserVersion,
            os,
            osVersion,
            screenWidth,
            screenHeight,
            pixelRatio,
            language,
            timezone,
            networkInfo?.effectiveType || null,
            cpuCores,
            capturedAt
        ]);

        if (ANALYTICS_DEBUG) {
            logger.info(`[Analytics] Device captured: ${fingerprint} (${deviceType})`);
        }
        cacheService.del('analytics:devices:summary:30d');

        return res.status(201).json({
            success: true,
            id: result.rows[0].id,
            fingerprint
        });
    } catch (error) {
        logger.error('[Analytics] Device save error:', error);
        return res.status(200).json({ success: false, error: 'Analytics temporarily unavailable' });
    }
};

/**
 * Capture frontend runtime errors (Sentry-compatible fallback).
 * POST /api/analytics/client-error
 */
const saveClientError = async (req, res) => {
    try {
        const userId = getUserId(req);
        const payload = req.body || {};
        const message = String(payload.message || '').trim().slice(0, 500);

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        const normalizedPayload = {
            message,
            stack: String(payload.stack || '').slice(0, 5000),
            source: String(payload.source || 'client').slice(0, 100),
            page: String(payload.page || '').slice(0, 500),
            userAgent: String(payload.userAgent || '').slice(0, 500),
            timestamp: payload.timestamp || new Date().toISOString()
        };

        captureClientError(normalizedPayload, {
            userId: userId || null,
            ip: req.headers['x-forwarded-for']?.split(',')[0]
                || req.connection?.remoteAddress
                || req.socket?.remoteAddress
                || 'unknown'
        });

        return res.status(202).json({ success: true });
    } catch (error) {
        logger.error('[Analytics] Client error capture failed:', error);
        return res.status(200).json({ success: false });
    }
};

/**
 * Capture frontend UX telemetry events (route views, exits, drop-offs).
 * POST /api/analytics/client-event
 */
const saveClientEvent = async (req, res) => {
    try {
        const userId = getUserId(req);
        const payload = req.body || {};
        const eventName = String(payload.eventName || payload.event || '').trim().slice(0, 120);

        if (!eventName) {
            return res.status(400).json({ error: 'eventName is required' });
        }

        const rawMetadata = payload.metadata && typeof payload.metadata === 'object' && !Array.isArray(payload.metadata)
            ? payload.metadata
            : {};
        const normalizedMetadata = {};
        Object.entries(rawMetadata).slice(0, 40).forEach(([key, value]) => {
            const safeKey = String(key || '').trim().slice(0, 80);
            if (!safeKey) return;

            if (typeof value === 'number' && Number.isFinite(value)) {
                normalizedMetadata[safeKey] = value;
                return;
            }

            if (typeof value === 'boolean') {
                normalizedMetadata[safeKey] = value;
                return;
            }

            if (typeof value === 'string') {
                normalizedMetadata[safeKey] = value.slice(0, 300);
                return;
            }

            normalizedMetadata[safeKey] = String(value ?? '').slice(0, 300);
        });

        const normalizedPayload = {
            eventName,
            source: String(payload.source || 'ux-telemetry').slice(0, 80),
            page: String(payload.page || '').slice(0, 500),
            pathname: String(payload.pathname || '').slice(0, 200),
            search: String(payload.search || '').slice(0, 300),
            sessionId: String(payload.sessionId || '').slice(0, 80),
            metadata: normalizedMetadata,
            userAgent: String(payload.userAgent || '').slice(0, 500),
            timestamp: payload.timestamp || new Date().toISOString()
        };

        const ip = req.headers['x-forwarded-for']?.split(',')[0]
            || req.connection?.remoteAddress
            || req.socket?.remoteAddress
            || 'unknown';

        captureClientError(
            {
                message: `[UX_EVENT] ${eventName}`,
                source: 'client-event',
                page: normalizedPayload.page,
                userAgent: normalizedPayload.userAgent,
                timestamp: normalizedPayload.timestamp,
                metadata: normalizedPayload
            },
            {
                userId: userId || null,
                ip
            }
        );

        if (ANALYTICS_DEBUG) {
            logger.info(`[Analytics] Client event captured: ${eventName}`);
        }

        return res.status(202).json({ success: true });
    } catch (error) {
        logger.error('[Analytics] Client event capture failed:', error);
        return res.status(200).json({ success: false });
    }
};

/**
 * Get device analytics summary (admin)
 * GET /api/analytics/devices/summary
 */
const getDeviceSummary = async (req, res) => {
    try {
        const payload = await cacheService.getOrSetWithStampedeProtection(
            'analytics:devices:summary:30d',
            async () => {
                const summary = await runQuery(
                    `
                        SELECT
                            device_type,
                            browser,
                            os,
                            COUNT(*) as count,
                            COUNT(DISTINCT fingerprint) as unique_devices
                        FROM device_analytics
                        WHERE created_at > NOW() - INTERVAL '30 days'
                        GROUP BY device_type, browser, os
                        ORDER BY count DESC
                        LIMIT 50
                    `
                );
                return {
                    summary: summary.rows,
                    period: '30 days'
                };
            },
            DEVICE_SUMMARY_CACHE_TTL_SECONDS
        );
        return res.json(payload);
    } catch (error) {
        logger.error('[Analytics] Summary error:', error);
        return res.status(500).json({ error: 'Failed to get summary' });
    }
};

module.exports = {
    getSellerAnalytics,
    getPostPerformance,
    getCategoryBreakdown,
    saveDeviceInfo,
    saveClientError,
    saveClientEvent,
    getDeviceSummary
};
