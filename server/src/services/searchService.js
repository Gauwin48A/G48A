/**
 * SEARCH SERVICE v2
 * Uses database functions for optimized search
 * - search_posts_v2: Full-text + location search
 * - get_nearby_posts_v2: Fast nearby posts
 * - haversine_distance: Distance calculation
 */

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

/**
 * Search posts using the optimized database function
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query text
 * @param {number} params.lat - Latitude for location search
 * @param {number} params.lng - Longitude for location search
 * @param {number} params.radius - Radius in km (default: 50)
 * @param {number} params.categoryId - Category filter
 * @param {number} params.minPrice - Minimum price
 * @param {number} params.maxPrice - Maximum price
 * @param {number} params.limit - Results limit (default: 20)
 * @param {number} params.offset - Pagination offset (default: 0)
 * @returns {Promise<Array>} Search results
 */
const searchPosts = async ({
    query = null,
    lat = null,
    lng = null,
    radius = 50,
    categoryId = null,
    minPrice = null,
    maxPrice = null,
    limit = 20,
    offset = 0
}) => {
    try {
        const result = await runQuery(
            `SELECT * FROM search_posts_v2($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [query, lat, lng, radius, categoryId, minPrice, maxPrice, limit, offset]
        );
        return result.rows;
    } catch (error) {
        logger.error('[SearchService] search_posts_v2 error:', error.message);
        throw error;
    }
};

/**
 * Get nearby posts using optimized database function
 * @param {Object} params - Location parameters
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {number} params.radius - Radius in km (default: 25)
 * @param {number} params.categoryId - Optional category filter
 * @param {number} params.limit - Results limit (default: 20)
 * @returns {Promise<Array>} Nearby posts
 */
const getNearbyPosts = async ({
    lat,
    lng,
    radius = 25,
    categoryId = null,
    limit = 20
}) => {
    try {
        const result = await runQuery(
            `SELECT * FROM get_nearby_posts_v2($1, $2, $3, $4, $5)`,
            [lat, lng, radius, categoryId, limit]
        );
        return result.rows;
    } catch (error) {
        logger.error('[SearchService] get_nearby_posts_v2 error:', error.message);
        throw error;
    }
};

/**
 * Calculate distance between two coordinates
 * @param {number} lat1 - First latitude
 * @param {number} lng1 - First longitude
 * @param {number} lat2 - Second latitude
 * @param {number} lng2 - Second longitude
 * @returns {Promise<number>} Distance in kilometers
 */
const calculateDistance = async (lat1, lng1, lat2, lng2) => {
    try {
        const result = await runQuery(
            `SELECT haversine_distance($1, $2, $3, $4) as distance`,
            [lat1, lng1, lat2, lng2]
        );
        return result.rows[0]?.distance || null;
    } catch (error) {
        logger.error('[SearchService] haversine_distance error:', error.message);
        throw error;
    }
};

/**
 * Get or create a chat between buyer and seller
 * @param {number} buyerId - Buyer user ID
 * @param {number} sellerId - Seller user ID
 * @param {number} postId - Post ID
 * @returns {Promise<number>} Chat ID
 */
const getOrCreateChat = async (buyerId, sellerId, postId) => {
    try {
        const result = await runQuery(
            `SELECT get_or_create_chat_v2($1, $2, $3) as chat_id`,
            [buyerId, sellerId, postId]
        );
        return result.rows[0]?.chat_id || null;
    } catch (error) {
        logger.error('[SearchService] get_or_create_chat_v2 error:', error.message);
        throw error;
    }
};

/**
 * Cleanup expired data (scheduled job)
 * - Expires old posts
 * - Resets lockouts
 * - Deletes old sessions
 */
const cleanupExpiredData = async () => {
    try {
        await runQuery(`SELECT cleanup_expired_data_v2()`);
        logger.info('[SearchService] Cleanup completed successfully');
        return true;
    } catch (error) {
        logger.error('[SearchService] cleanup_expired_data_v2 error:', error.message);
        return false;
    }
};

module.exports = {
    searchPosts,
    getNearbyPosts,
    calculateDistance,
    getOrCreateChat,
    cleanupExpiredData
};
