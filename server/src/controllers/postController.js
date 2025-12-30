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
    // Use subqueries for verification since user_verifications uses verification_type column
    let query = `
      SELECT 
        p.*,
        COALESCE(p.views_count, p.views, 0) as views,
        COALESCE(p.views_count, 0) as views_count,
        COALESCE(p.shares, 0) as shares,
        COALESCE(p.likes, 0) as likes,
        u.username,
        u.email,
        u.rating as seller_rating,
        COALESCE(pr.full_name, u.username) as user_name,
        c.name as category_name,
        (SELECT array_agg(image_url) FROM post_images pi WHERE pi.post_id = p.post_id LIMIT 5) as images,

        (SELECT is_verified FROM user_verifications WHERE user_id = p.user_id AND verification_type = 'aadhaar' LIMIT 1) as aadhaar_verified,
        (SELECT is_verified FROM user_verifications WHERE user_id = p.user_id AND verification_type = 'pan' LIMIT 1) as pan_verified,
        (SELECT verified_at FROM user_verifications WHERE user_id = p.user_id AND is_verified = true ORDER BY verified_at DESC LIMIT 1) as verification_date
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN profiles pr ON p.user_id = pr.user_id
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
    `;


    const params = [];

    // Search across title, description, location, AND category name
    if (search) {
      query += ` AND (p.title ILIKE $${params.length + 1} OR p.description ILIKE $${params.length + 1} OR p.location ILIKE $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
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

    // Transform results to include user object with verification status
    const posts = result.rows.map(post => ({
      ...post,
      id: post.post_id,
      category: post.category_name || 'General',
      user: {
        name: post.user_name || post.username || 'Unknown',
        username: post.username,
        email: post.email,
        rating: parseFloat(post.seller_rating) || 0,
        isVerified: post.aadhaar_verified || post.pan_verified,
        aadhaarVerified: post.aadhaar_verified,
        panVerified: post.pan_verified,
        verificationDate: post.verification_date
      },
      image_url: post.images?.[0] || post.image_url || '/placeholder.svg'
    }));


    // Get total count for pagination (must join categories to search by category name)
    let countQuery = `SELECT COUNT(*) FROM posts p LEFT JOIN categories c ON p.category_id = c.category_id WHERE p.status = 'active'`;
    const countParams = [];
    if (search) { countQuery += ` AND (p.title ILIKE $${countParams.length + 1} OR p.description ILIKE $${countParams.length + 1} OR p.location ILIKE $${countParams.length + 1} OR c.name ILIKE $${countParams.length + 1})`; countParams.push(`%${search}%`); }
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


// Post creation - supports regular posts with images OR feed posts (text-only)
exports.createPost = async (req, res) => {
  try {
    // SECURITY FIX: Get user_id from authenticated token, NOT from request body
    const user_id = req.user?.id || req.user?.userId || req.body.user_id;
    const { category_id, title, description, price, type, location } = req.body;
    const images = req.files?.images || [];

    if (!user_id) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Insert the post directly (no stored procedure needed)
    const insertResult = await pool.query(
      `INSERT INTO posts (user_id, category_id, title, description, price, location, post_type, status, created_at, views_count, likes, shares)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW(), 0, 0, 0)
       RETURNING post_id`,
      [
        user_id,
        category_id || 1, // Default category
        title || 'Update',
        description || '',
        price || 0,
        location || null,
        type || 'sale' // 'feed' for feed posts, 'sale' for regular
      ]
    );

    const post_id = insertResult.rows[0]?.post_id;
    if (!post_id) {
      logError('Post creation failed', { body: req.body });
      return res.status(400).json({ error: 'Post creation failed' });
    }

    // Insert images if any
    if (images.length > 0) {
      const imageValues = images.map((img, idx) =>
        `(${post_id}, '${img.path || img.filename}', ${idx + 1})`
      ).join(',');
      await pool.query(
        `INSERT INTO post_images (post_id, image_url, display_order) VALUES ${imageValues}`
      );
    }

    // Fetch the created post for response
    const postRes = await pool.query('SELECT * FROM posts WHERE post_id = $1', [post_id]);
    const imagesRes = await pool.query('SELECT * FROM post_images WHERE post_id = $1', [post_id]);

    logInfo('Post created successfully', { post_id, user_id, type: type || 'sale' });
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
    // Increment view count when post is viewed
    await pool.query('UPDATE posts SET views_count = views_count + 1 WHERE post_id = $1', [postId]);
    // Fetch author and category - use user_id column for users table
    const authorRes = await pool.query('SELECT username FROM users WHERE user_id = $1', [post.user_id]);
    const categoryRes = await pool.query('SELECT name FROM categories WHERE category_id = $1', [post.category_id]);
    post.author = authorRes.rows[0]?.username || 'Unknown';
    post.category = categoryRes.rows[0]?.name || 'Unknown';
    post.views = post.views_count; // Alias for frontend compatibility
    // Return with post wrapper for consistency
    res.json({ post });
  } catch (err) {
    logError('Error fetching post by ID:', err);
    res.status(500).json({ error: err.message });
  }
};
