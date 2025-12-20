const pool = require('../config/db');
let logger;
try {
  logger = require('../utils/logger');
} catch (e) {
  logger = null;
}
const logError = (logger && logger.error) ? logger.error : console.error;
const logInfo = (logger && logger.info) ? logger.info : console.log;

// Get posts for a specific user (includes own posts + posts bought by user)
exports.getUserPosts = async (req, res) => {
  try {
    const { userId, status, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 100 } = req.query;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    // Query 1: Get user's own posts
    const ownPostsResult = await pool.query(
      `SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    // Query 2: Get posts bought BY this user
    const boughtPostsResult = await pool.query(
      `SELECT * FROM posts WHERE buyer_id = $1 AND user_id != $1 ORDER BY created_at DESC`,
      [userId]
    );

    // Mark ownership on each post
    const ownPosts = ownPostsResult.rows.map(p => ({ ...p, ownership: 'own' }));
    const boughtPosts = boughtPostsResult.rows.map(p => ({ ...p, ownership: 'bought', status: 'bought' }));

    // Combine all posts
    let allPosts = [...ownPosts, ...boughtPosts];

    // Filter by status if requested
    if (status) {
      allPosts = allPosts.filter(p => p.status === status);
    }

    // Sort
    allPosts.sort((a, b) => {
      const aVal = a[sortBy] || a.created_at;
      const bVal = b[sortBy] || b.created_at;
      return sortOrder === 'desc' ? new Date(bVal) - new Date(aVal) : new Date(aVal) - new Date(bVal);
    });

    // Paginate
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedPosts = allPosts.slice(offset, offset + parseInt(limit));

    res.json({ posts: paginatedPosts, total: allPosts.length });
  } catch (err) {
    console.error('[getUserPosts] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.getAllPosts = async (req, res) => {
  try {
    const { search, category, location, minPrice, maxPrice, author, startDate, endDate, sortBy = 'created_at', sortOrder = 'desc', page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build dynamic query with JOINs for user info, category, and images
    let query = `
      SELECT 
        p.*,
        u.username,
        u.email,
        COALESCE(pr.full_name, u.username) as user_name,
        c.name as category_name,
        (SELECT array_agg(image_url) FROM post_images pi WHERE pi.post_id = p.post_id LIMIT 5) as images
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
    `;
    const params = [];

    // Search across title, description, AND location
    if (search) {
      query += ` AND (p.title ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.location ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    if (category) {
      query += ` AND p.category_id = $${params.length + 1}`;
      params.push(category);
    }
    if (location) {
      query += ` AND p.location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }
    if (author) {
      query += ` AND p.user_id = $${params.length + 1}`;
      params.push(author);
    }
    if (startDate) {
      query += ` AND p.created_at >= $${params.length + 1}`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND p.created_at <= $${params.length + 1}`;
      params.push(endDate);
    }
    if (minPrice) {
      query += ` AND p.price >= $${params.length + 1}`;
      params.push(minPrice);
    }
    if (maxPrice) {
      query += ` AND p.price <= $${params.length + 1}`;
      params.push(maxPrice);
    }

    // Dynamic sorting
    const allowedSortFields = ['created_at', 'price', 'views_count'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? `p.${sortBy}` : 'p.created_at';
    const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${safeSortBy} ${safeSortOrder} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Transform results to include user object
    const posts = result.rows.map(post => ({
      ...post,
      id: post.post_id,
      category: post.category_name || 'General',
      user: {
        name: post.user_name || post.username || 'Unknown',
        username: post.username,
        email: post.email
      },
      image_url: post.images?.[0] || post.image_url || '/placeholder.svg'
    }));

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) FROM posts p WHERE p.status = 'active'`;
    const countParams = [];
    if (search) { countQuery += ` AND (p.title ILIKE $${countParams.length + 1} OR p.description ILIKE $${countParams.length + 1} OR p.location ILIKE $${countParams.length + 1})`; countParams.push(`%${search}%`); }
    if (category) { countQuery += ` AND p.category_id = $${countParams.length + 1}`; countParams.push(category); }
    if (location) { countQuery += ` AND p.location ILIKE $${countParams.length + 1}`; countParams.push(`%${location}%`); }
    if (author) { countQuery += ` AND p.user_id = $${countParams.length + 1}`; countParams.push(author); }
    if (startDate) { countQuery += ` AND p.created_at >= $${countParams.length + 1}`; countParams.push(startDate); }
    if (endDate) { countQuery += ` AND p.created_at <= $${countParams.length + 1}`; countParams.push(endDate); }
    if (minPrice) { countQuery += ` AND p.price >= $${countParams.length + 1}`; countParams.push(minPrice); }
    if (maxPrice) { countQuery += ` AND p.price <= $${countParams.length + 1}`; countParams.push(maxPrice); }
    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    res.json({ posts, total });
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
