/**
 * Analytics Controller
 * Seller performance insights and dashboard data
 */

const pool = require('../config/db');

// Get seller analytics dashboard
const getSellerAnalytics = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        // Get or create analytics record
        let analytics = await pool.query(
            'SELECT * FROM seller_analytics WHERE user_id = $1',
            [userId]
        );

        if (analytics.rows.length === 0) {
            await pool.query(
                'INSERT INTO seller_analytics (user_id) VALUES ($1)',
                [userId]
            );
        }

        // Calculate real-time stats
        const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM posts WHERE user_id = $1) as total_posts,
        (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND status = 'active') as active_posts,
        (SELECT COUNT(*) FROM posts WHERE user_id = $1 AND status = 'sold') as sold_posts,
        (SELECT COALESCE(SUM(views_count), 0) FROM posts WHERE user_id = $1) as total_views,
        (SELECT COUNT(*) FROM buyer_inquiries WHERE seller_id = $1) as total_inquiries,
        (SELECT COUNT(*) FROM offers WHERE seller_id = $1) as total_offers,
        (SELECT COUNT(*) FROM offers WHERE seller_id = $1 AND status = 'accepted') as accepted_offers,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE seller_id = $1 AND status = 'completed') as total_revenue,
        (SELECT AVG(rating) FROM reviews WHERE reviewee_id = $1) as avg_rating,
        (SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1) as total_reviews
    `, [userId]);

        const data = stats.rows[0];
        const conversionRate = data.total_inquiries > 0
            ? ((data.accepted_offers / data.total_inquiries) * 100).toFixed(1)
            : 0;

        // Update analytics record
        await pool.query(`
      UPDATE seller_analytics SET
        total_views = $2,
        total_inquiries = $3,
        total_offers = $4,
        total_sales = $5,
        total_revenue = $6,
        conversion_rate = $7,
        updated_at = NOW()
      WHERE user_id = $1
    `, [userId, data.total_views, data.total_inquiries, data.total_offers,
            data.sold_posts, data.total_revenue, conversionRate]);

        res.json({
            overview: {
                totalPosts: parseInt(data.total_posts),
                activePosts: parseInt(data.active_posts),
                soldPosts: parseInt(data.sold_posts),
                totalViews: parseInt(data.total_views),
                totalInquiries: parseInt(data.total_inquiries),
                totalOffers: parseInt(data.total_offers),
                acceptedOffers: parseInt(data.accepted_offers),
                totalRevenue: parseFloat(data.total_revenue),
                avgRating: data.avg_rating ? parseFloat(data.avg_rating).toFixed(1) : null,
                totalReviews: parseInt(data.total_reviews),
                conversionRate: parseFloat(conversionRate)
            }
        });
    } catch (error) {
        console.error('Get seller analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
};

// Get post performance breakdown
const getPostPerformance = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      SELECT 
        p.post_id,
        p.title,
        p.price,
        p.status,
        p.views_count,
        p.created_at,
        c.name as category,
        (SELECT COUNT(*) FROM buyer_inquiries WHERE post_id = p.post_id) as inquiry_count,
        (SELECT COUNT(*) FROM offers WHERE post_id = p.post_id) as offer_count
      FROM posts p
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE p.user_id = $1
      ORDER BY p.views_count DESC
      LIMIT 20
    `, [userId]);

        res.json({ posts: result.rows });
    } catch (error) {
        console.error('Get post performance error:', error);
        res.status(500).json({ error: 'Failed to fetch post performance' });
    }
};

// Get category distribution
const getCategoryBreakdown = async (req, res) => {
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const result = await pool.query(`
      SELECT 
        c.name as category,
        COUNT(*) as post_count,
        SUM(p.views_count) as total_views,
        COUNT(CASE WHEN p.status = 'sold' THEN 1 END) as sold_count
      FROM posts p
      LEFT JOIN categories c ON c.category_id = p.category_id
      WHERE p.user_id = $1
      GROUP BY c.category_id, c.name
      ORDER BY post_count DESC
    `, [userId]);

        res.json({ breakdown: result.rows });
    } catch (error) {
        console.error('Get category breakdown error:', error);
        res.status(500).json({ error: 'Failed to fetch category breakdown' });
    }
};

// ============================================
// DEVICE FINGERPRINTING & ANALYTICS
// ============================================

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

        // Get user_id from auth if available
        const userId = req.user?.id || req.user?.userId || null;

        // Get IP from request
        const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            'unknown';

        const query = `
            INSERT INTO device_analytics (
                user_id, fingerprint, ip_address, user_agent, device_type,
                browser, browser_version, os, os_version,
                screen_width, screen_height, pixel_ratio,
                language, timezone, network_type, cpu_cores,
                captured_at, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
            RETURNING id;
        `;

        const result = await pool.query(query, [
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

        console.log(`[Analytics] Device captured: ${fingerprint} (${deviceType})`);

        res.status(201).json({
            success: true,
            id: result.rows[0].id,
            fingerprint
        });

    } catch (error) {
        console.error('[Analytics] Device save error:', error);
        res.status(200).json({ success: false, error: 'Analytics temporarily unavailable' });
    }
};

/**
 * Get device analytics summary (admin)
 * GET /api/analytics/devices/summary
 */
const getDeviceSummary = async (req, res) => {
    try {
        const summary = await pool.query(`
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
        `);

        res.json({
            summary: summary.rows,
            period: '30 days'
        });

    } catch (error) {
        console.error('[Analytics] Summary error:', error);
        res.status(500).json({ error: 'Failed to get summary' });
    }
};

module.exports = {
    getSellerAnalytics,
    getPostPerformance,
    getCategoryBreakdown,
    saveDeviceInfo,
    getDeviceSummary
};
