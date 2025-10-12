const pool = require('../config/db');
const logger = require('../utils/logger');

// Get posts for a specific user
exports.getUserPosts = async (req, res) => {
  try {
    const { userId, status, sortBy = 'posted_date', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
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
    // Use stored procedure for fetching posts with filtering, searching, pagination
    const { category, minPrice, maxPrice, sortBy = 'posted_date', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    // Build dynamic query for filtering, sorting, pagination
    let query = 'SELECT * FROM posts WHERE 1=1';
    const params = [];
    if (category) { query += ` AND category_id = $${params.length + 1}`; params.push(category); }
    if (minPrice) { query += ` AND price >= $${params.length + 1}`; params.push(minPrice); }
    if (maxPrice) { query += ` AND price <= $${params.length + 1}`; params.push(maxPrice); }
    query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM posts WHERE 1=1';
    const countParams = [];
    if (category) { countQuery += ` AND category_id = $${countParams.length + 1}`; countParams.push(category); }
    if (minPrice) { countQuery += ` AND price >= $${countParams.length + 1}`; countParams.push(minPrice); }
    if (maxPrice) { countQuery += ` AND price <= $${countParams.length + 1}`; countParams.push(maxPrice); }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);
    res.json({ posts: result.rows, total });
  } catch (err) {
    logger.error('Error fetching posts:', err);
    res.status(500).json({ error: err.message });
  }
};

// Post creation now supports multiple image uploads
exports.createPost = async (req, res) => {
  try {
    // Only use DB fields and values, no hardcoded data
    const { user_id, category, title, description, price } = req.body;
    const images = req.files?.images || [];
    // Use stored procedure for post creation with images
    const imageUrls = images.map(img => img.path);
    const result = await pool.query(
      'SELECT add_post_with_images($1, $2, $3, $4, $5, $6) AS post_id',
      [user_id, category, title, description, price, imageUrls]
    );
    const post_id = result.rows[0]?.post_id;
    if (!post_id) {
      logger.error('Post creation failed', { body: req.body });
      return res.status(400).json({ error: 'Post creation failed' });
    }
    // Fetch the created post and images for response
    const postRes = await pool.query('SELECT * FROM posts WHERE post_id = $1', [post_id]);
    const imagesRes = await pool.query('SELECT * FROM post_images WHERE post_id = $1', [post_id]);
    res.status(201).json({ post: postRes.rows[0], images: imagesRes.rows });
  } catch (err) {
    logger.error('Error creating post:', err);
    res.status(400).json({ error: err.message });
  }
};

// Get post by ID
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.postId;
    if (!postId) return res.status(400).json({ error: 'postId required' });
    const postRes = await pool.query('SELECT * FROM posts WHERE post_id = $1', [postId]);
    if (!postRes.rows.length) return res.status(404).json({ error: 'Post not found' });
    // Optionally fetch images and user info
    const imagesRes = await pool.query('SELECT * FROM post_images WHERE post_id = $1', [postId]);
    const userRes = await pool.query('SELECT * FROM users WHERE user_id = $1', [postRes.rows[0].user_id]);
    const post = postRes.rows[0];
    post.images = imagesRes.rows.map(img => img.url);
    post.user = userRes.rows[0];
    res.json({ post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
