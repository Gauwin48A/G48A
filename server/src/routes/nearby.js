const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * GET /api/nearby
 * Get posts near a location using Haversine formula
 * 
 * Query params:
 * - lat: User's latitude (required)
 * - long: User's longitude (required)
 * - radius: Search radius in km (default: 10)
 * - limit: Max results (default: 50)
 * - category: Filter by category ID (optional)
 */
router.get('/', async (req, res) => {
    try {
        const { lat, long, radius = 10, limit = 50, category } = req.query;

        // Validate coordinates
        if (!lat || !long) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        const latitude = parseFloat(lat);
        const longitude = parseFloat(long);
        const radiusKm = parseFloat(radius);
        const limitCount = parseInt(limit);

        if (isNaN(latitude) || isNaN(longitude)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coordinates'
            });
        }

        // Build query with Haversine formula
        let query = `
      SELECT 
        p.post_id,
        p.title,
        p.description,
        p.price,
        p.images,
        p.location,
        p.status,
        p.condition,
        p.views_count,
        p.created_at,
        c.name as category_name,
        c.category_id,
        pr.full_name as seller_name,
        u.rating as seller_rating,
        u.isAadhaarVerified as seller_verified,
        (6371 * acos(
          cos(radians($1)) * 
          cos(radians(p.latitude)) * 
          cos(radians(p.longitude) - radians($2)) + 
          sin(radians($1)) * 
          sin(radians(p.latitude))
        )) as distance_km
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      WHERE p.status = 'active'
        AND p.latitude IS NOT NULL 
        AND p.longitude IS NOT NULL
        AND (6371 * acos(
          cos(radians($1)) * 
          cos(radians(p.latitude)) * 
          cos(radians(p.longitude) - radians($2)) + 
          sin(radians($1)) * 
          sin(radians(p.latitude))
        )) <= $3
    `;

        const params = [latitude, longitude, radiusKm];

        // Add category filter if provided
        if (category) {
            query += ` AND p.category_id = $4`;
            params.push(parseInt(category));
        }

        query += ` ORDER BY distance_km ASC LIMIT $${params.length + 1}`;
        params.push(limitCount);

        const result = await pool.query(query, params);

        // Format response
        const posts = result.rows.map(post => ({
            ...post,
            distance_km: parseFloat(post.distance_km).toFixed(2),
            distance_text: formatDistance(parseFloat(post.distance_km))
        }));

        res.json({
            success: true,
            count: posts.length,
            radius_km: radiusKm,
            user_location: { lat: latitude, long: longitude },
            posts
        });

    } catch (error) {
        console.error('[Nearby] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch nearby posts',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Format distance for display
 */
function formatDistance(km) {
    if (km < 1) {
        return `${Math.round(km * 1000)}m away`;
    } else if (km < 10) {
        return `${km.toFixed(1)}km away`;
    } else {
        return `${Math.round(km)}km away`;
    }
}

/**
 * GET /api/nearby/cities
 * Get popular cities with post counts
 */
router.get('/cities', async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        location as city,
        COUNT(*) as post_count
      FROM posts 
      WHERE status = 'active' AND location IS NOT NULL
      GROUP BY location
      ORDER BY post_count DESC
      LIMIT 20
    `);

        res.json({
            success: true,
            cities: result.rows
        });
    } catch (error) {
        console.error('[Nearby] Cities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cities' });
    }
});

module.exports = router;
