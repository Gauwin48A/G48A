const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;

function runQuery(text, values = []) {
    return pool.query({
        text,
        values,
        query_timeout: DB_QUERY_TIMEOUT_MS
    });
}

const MIN_RADIUS_KM = 0.1;
const MAX_RADIUS_KM = 200;
const DEFAULT_RADIUS_KM = 10;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parsePositiveFloat(value, fallback, min, max) {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.min(max, Math.max(min, parsed));
}

function parsePositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < min) return fallback;
    return Math.min(max, parsed);
}

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
        const { lat, long, radius = DEFAULT_RADIUS_KM, limit = DEFAULT_LIMIT, category } = req.query;

        // Validate coordinates
        if (!lat || !long) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        const latitude = Number.parseFloat(lat);
        const longitude = Number.parseFloat(long);
        const radiusKm = parsePositiveFloat(radius, DEFAULT_RADIUS_KM, MIN_RADIUS_KM, MAX_RADIUS_KM);
        const limitCount = parsePositiveInt(limit, DEFAULT_LIMIT, 1, MAX_LIMIT);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coordinates'
            });
        }

        // Narrow candidates with a bounding box before Haversine filter.
        const latDelta = radiusKm / 111.32;
        const cosLat = Math.cos((latitude * Math.PI) / 180);
        const lngDelta = Math.abs(cosLat) > 0.00001 ? radiusKm / (111.32 * Math.abs(cosLat)) : 180;
        const minLat = latitude - latDelta;
        const maxLat = latitude + latDelta;
        const minLong = longitude - lngDelta;
        const maxLong = longitude + lngDelta;

        // Build query with Haversine formula computed once per row.
        let query = `
      WITH candidate_posts AS (
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
          AND p.latitude BETWEEN $4 AND $5
          AND p.longitude BETWEEN $6 AND $7
      )
      SELECT
        post_id,
        title,
        description,
        price,
        images,
        location,
        status,
        condition,
        views_count,
        created_at,
        category_name,
        category_id,
        seller_name,
        seller_rating,
        seller_verified,
        distance_km
      FROM candidate_posts
      WHERE distance_km <= $3
    `;

        const params = [latitude, longitude, radiusKm, minLat, maxLat, minLong, maxLong];

        // Add category filter if provided
        if (category) {
            const categoryId = Number.parseInt(category, 10);
            if (Number.isFinite(categoryId) && categoryId > 0) {
                query += ` AND category_id = $${params.length + 1}`;
                params.push(categoryId);
            }
        }

        query += ` ORDER BY distance_km ASC LIMIT $${params.length + 1}`;
        params.push(limitCount);

        const result = await runQuery(query, params);

        // Format response
        const posts = result.rows.map((post) => {
            const distanceKm = Number.parseFloat(post.distance_km);
            return {
                ...post,
                distance_km: distanceKm.toFixed(2),
                distance_text: formatDistance(distanceKm)
            };
        });

        res.json({
            success: true,
            count: posts.length,
            radius_km: radiusKm,
            user_location: { lat: latitude, long: longitude },
            posts
        });

    } catch (error) {
        logger.error('[Nearby] Error:', error);
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
        const result = await runQuery(`
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
        logger.error('[Nearby] Cities error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch cities' });
    }
});

module.exports = router;
