const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * Full-text and geolocation post search using the search_posts_v2 DB function.
 * @param {object} params
 * @param {string|null} [params.query] - Text search query
 * @param {number|null} [params.lat] - Latitude
 * @param {number|null} [params.lng] - Longitude
 * @param {number} [params.radius=50] - Search radius in km
 * @param {string|null} [params.categoryId] - Category filter
 * @param {string|null} [params.subcategoryId] - Subcategory filter
 * @param {number|null} [params.minPrice] - Minimum price filter
 * @param {number|null} [params.maxPrice] - Maximum price filter
 * @param {number} [params.limit=20] - Max results
 * @param {number} [params.offset=0] - Pagination offset
 * @returns {Promise<object[]>} Matching posts
 */
const searchPosts = async ({
  query = null,
  lat = null,
  lng = null,
  radius = 50,
  categoryId = null,
  subcategoryId = null,
  minPrice = null,
  maxPrice = null,
  limit = 20,
  offset = 0,
}) => {
  try {
    const result = await runQuery(
      `
      WITH base AS (
        SELECT * FROM search_posts_v2($1, $2, $3, $4, $5, $6, $7, $8, $9)
      )
      SELECT
        base.*,
        p.category_id,
        p.subcategory_id,
        c.name AS category_name,
        sc.name AS subcategory_name
      FROM base
      LEFT JOIN posts p ON base.post_id = p.post_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
      WHERE ($10::text IS NULL OR p.subcategory_id::text = $10::text)
      `,
      [
        query,
        lat,
        lng,
        radius,
        categoryId,
        minPrice,
        maxPrice,
        limit,
        offset,
        subcategoryId,
      ]
    );
    return result.rows;
  } catch (error) {
    logger.error("[SearchService] search_posts_v2 error:", error.message);
    throw error;
  }
};

/**
 * Retrieve posts near a geographic point using get_nearby_posts_v2.
 * @param {object} params
 * @param {number} params.lat - Latitude
 * @param {number} params.lng - Longitude
 * @param {number} [params.radius=25] - Search radius in km
 * @param {string|null} [params.categoryId] - Category filter
 * @param {string|null} [params.subcategoryId] - Subcategory filter
 * @param {number} [params.limit=20] - Max results
 * @returns {Promise<object[]>} Nearby posts
 */
const getNearbyPosts = async ({
  lat,
  lng,
  radius = 25,
  categoryId = null,
  subcategoryId = null,
  limit = 20,
}) => {
  try {
    const result = await runQuery(
      `
      WITH base AS (
        SELECT * FROM get_nearby_posts_v2($1, $2, $3, $4, $5)
      )
      SELECT
        base.*,
        p.category_id,
        p.subcategory_id,
        c.name AS category_name,
        sc.name AS subcategory_name
      FROM base
      LEFT JOIN posts p ON base.post_id = p.post_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
      WHERE ($6::text IS NULL OR p.subcategory_id::text = $6::text)
      `,
      [lat, lng, radius, categoryId, limit, subcategoryId]
    );
    return result.rows;
  } catch (error) {
    logger.error("[SearchService] get_nearby_posts_v2 error:", error.message);
    throw error;
  }
};

/**
 * Calculate the haversine distance between two coordinates.
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {Promise<number|null>} Distance in km, or null on failure
 */
const calculateDistance = async (lat1, lng1, lat2, lng2) => {
  try {
    const result = await runQuery(
      `SELECT haversine_distance($1, $2, $3, $4) as distance`,
      [lat1, lng1, lat2, lng2]
    );
    return result.rows[0]?.distance || null;
  } catch (error) {
    logger.error("[SearchService] haversine_distance error:", error.message);
    throw error;
  }
};

/**
 * Get or create a chat session between a buyer and seller for a specific post.
 * @param {string} buyerId
 * @param {string} sellerId
 * @param {string} postId
 * @returns {Promise<string|null>} Chat ID
 */
const getOrCreateChat = async (buyerId, sellerId, postId) => {
  try {
    const result = await runQuery(
      `SELECT get_or_create_chat_v2($1, $2, $3) as chat_id`,
      [buyerId, sellerId, postId]
    );
    return result.rows[0]?.chat_id || null;
  } catch (error) {
    logger.error(
      "[SearchService] get_or_create_chat_v2 error:",
      error.message
    );
    throw error;
  }
};

/**
 * Run the database cleanup routine for expired data.
 * @returns {Promise<boolean>} true on success, false on failure
 */
const cleanupExpiredData = async () => {
  try {
    await runQuery(`SELECT cleanup_expired_data_v2()`);
    logger.info("[SearchService] Cleanup completed successfully");
    return true;
  } catch (error) {
    logger.error(
      "[SearchService] cleanup_expired_data_v2 error:",
      error.message
    );
    return false;
  }
};

module.exports = {
  searchPosts,
  getNearbyPosts,
  calculateDistance,
  getOrCreateChat,
  cleanupExpiredData,
};
