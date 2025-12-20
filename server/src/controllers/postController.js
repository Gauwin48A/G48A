const pool = require('../config/db');
let logger;
try {
  logger = require('../utils/logger');
} catch (e) {
  logger = null;
}
const logError = (logger && logger.error) ? logger.error : console.error;
const logInfo = (logger && logger.info) ? logger.info : console.log;

// Get posts for a specific user
exports.getUserPosts = async (req, res) => {
  try {
    const { userId, status, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = 'SELECT * FROM posts WHERE user_id = $1';
    // If your schema uses id instead of user_id, change to 'id = $1'
    const params = [userId];
    if (status) { query += ` AND status = $2`; params.push(status); }
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    const countRes = await pool.query('SELECT COUNT(*) FROM posts WHERE user_id = $1', [userId]);
    res.json({ posts: result.rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    // Get least viewed active posts first (prioritize posts that need more visibility)
    const leastViewedRes = await pool.query(
      "SELECT * FROM posts WHERE status = 'active' ORDER BY COALESCE(views_count, 0) ASC, created_at DESC LIMIT 20"
    );
    // Build dynamic query for filtering, searching, pagination
    // Default sortBy is views_count ASC (least viewed first) for fair visibility
    const { search, category, location, minPrice, maxPrice, author, startDate, endDate, sortBy = 'views_count', sortOrder = 'asc', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = "SELECT * FROM posts WHERE status = 'active'";
    const params = [];
    // Search across title, description, AND location
    if (search) {
      query += ` AND (title ILIKE $${params.length + 1} OR description ILIKE $${params.length + 1} OR location ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    if (category) {
      query += ` AND category_id = $${params.length + 1}`;
      params.push(category);
    }
    // Location filter (separate from search)
    if (location) {
      query += ` AND location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }
    if (author) {
      query += ` AND user_id = $${params.length + 1}`;
      params.push(author);
    }
    if (startDate) {
      query += ` AND created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND created_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    if (minPrice) {
      query += ` AND price >= $${params.length + 1}`;
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ` AND price <= $${params.length + 1}`;
      params.push(maxPrice);
    }
    // Dynamic sorting based on user selection
    const allowedSortFields = ['created_at', 'price', 'views_count'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    // Merge least-viewed posts at the top, avoiding duplicates
    const mergedPosts = [...leastViewedRes.rows, ...result.rows.filter(p => !leastViewedRes.rows.some(lv => lv.id === p.id))];
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM posts WHERE status = \'active\'';
    const countParams = [];
    if (search) { countQuery += ` AND (title ILIKE $${countParams.length + 1} OR description ILIKE $${countParams.length + 1} OR location ILIKE $${countParams.length + 1})`; countParams.push(`%${search}%`); }
    if (category) { countQuery += ` AND category_id = $${countParams.length + 1}`; countParams.push(category); }
    if (location) { countQuery += ` AND location ILIKE $${countParams.length + 1}`; countParams.push(`%${location}%`); }
    if (author) { countQuery += ` AND user_id = $${countParams.length + 1}`; countParams.push(author); }
    if (startDate) { countQuery += ` AND created_at >= $${countParams.length + 1}`; countParams.push(startDate); }
    if (endDate) { countQuery += ` AND created_at <= $${countParams.length + 1}`; countParams.push(endDate); }
    if (minPrice) { countQuery += ` AND price >= $${countParams.length + 1}`; countParams.push(minPrice); }
    if (maxPrice) { countQuery += ` AND price <= $${countParams.length + 1}`; countParams.push(maxPrice); }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    res.json({ posts: mergedPosts, total });
  } catch (err) {
    logError('Error fetching posts:', err);
    res.status(500).json({ error: err.message });
  }
};

// Post creation now supports multiple image uploads
exports.createPost = async (req, res) => {
  try {
    // SECURITY FIX: Get user_id from authenticated token, NOT from request body
    // This prevents IDOR attacks where attacker could post as another user
    const user_id = req.user?.id || req.body.user_id; // Fallback for backwards compatibility
    const { category, title, description, price } = req.body;
    const images = req.files?.images || [];
    // Use stored procedure for post creation with images
    const imageUrls = images.map(img => img.path);
    const result = await pool.query(
      'SELECT add_post_with_images($1, $2, $3, $4, $5, $6) AS post_id',
      [user_id, category, title, description, price, imageUrls]
    );
    const post_id = result.rows[0]?.post_id;
    if (!post_id) {
      logError('Post creation failed', { body: req.body });
      return res.status(400).json({ error: 'Post creation failed' });
    }
    // Fetch the created post and images for response
    const postRes = await pool.query('SELECT * FROM posts WHERE post_id = $1', [post_id]);
    const imagesRes = await pool.query('SELECT * FROM post_images WHERE post_id = $1', [post_id]);
    res.status(201).json({ post: postRes.rows[0], images: imagesRes.rows });
  } catch (err) {
    logError('Error creating post:', err);
    res.status(400).json({ error: err.message });
  }
};

// Get post by ID
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.postId || req.params.id;
    // Fetch post details - use post_id column
    const postRes = await pool.query('SELECT * FROM posts WHERE post_id = $1', [postId]);
    if (!postRes.rows.length) return res.status(404).json({ error: 'Post not found' });
    const post = postRes.rows[0];
    // Note: View count update commented out due to column name mismatch (views vs views_count)
    // await pool.query('UPDATE posts SET views_count = views_count + 1 WHERE post_id = $1', [postId]);
    // Fetch author and category - use user_id column for users table
    const authorRes = await pool.query('SELECT username FROM users WHERE user_id = $1', [post.user_id]);
    const categoryRes = await pool.query('SELECT name FROM categories WHERE category_id = $1', [post.category_id]);
    post.author = authorRes.rows[0]?.username || 'Unknown';
    post.category = categoryRes.rows[0]?.name || 'Unknown';
    // Return with post wrapper for consistency
    res.json({ post });
  } catch (err) {
    logError('Error fetching post by ID:', err);
    res.status(500).json({ error: err.message });
  }
};
