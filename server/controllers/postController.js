// postController.js
const db = require('../db');

// Get all posts for the main feed
exports.getAllPosts = async (req, res) => {
  try {
    const query = `
      SELECT
        p.post_id AS id,
        p.title,
        p.description,
        p.price,
        p.status,
        p.created_at,
        p.views,
        u.username AS user_name,
        c.name AS category_name
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      JOIN categories c ON p.category_id = c.category_id
      WHERE p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT 50;
    `;
    const result = await db.query(query);

    const formattedPosts = result.rows.map(post => ({
      id: post.id,
      title: post.title,
      price: post.price,
      description: post.description,
      isSponsored: false,
      user: { name: post.user_name },
      category: post.category_name,
      views: post.views,
      likes: 0,
    }));

    res.json({ posts: formattedPosts, total: formattedPosts.length });
  } catch (err) {
    console.error('Error fetching all posts:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
};

// AddPost: validate and create post after tier/category selection
exports.createPost = async (req, res) => {
  const { user_id, category_id, tier_id, title, description, price, latitude, longitude } = req.body;
  // Server-side validation
  const v = await db.query('SELECT * FROM validate_add_post($1,$2,$3,$4,$5,$6,$7)', [user_id, category_id, tier_id, title, price, latitude, longitude]);
  if (!v.rows[0].valid) return res.status(400).json({ error: v.rows[0].message, field: v.rows[0].field });
  try {
    const result = await db.query(
      `INSERT INTO posts (user_id, category_id, title, description, price, status, created_at) VALUES ($1,$2,$3,$4,$5,'active',NOW()) RETURNING post_id`,
      [user_id, category_id, title, description, price]
    );
    // Optionally: insert location, tier, etc.
    res.json({ post_id: result.rows[0].post_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SaleDone/SaleUndone: transition sale state
exports.updateSaleStatus = async (req, res) => {
  const { sale_id, new_status, user_id } = req.body;
  const v = await db.query('SELECT * FROM validate_sale_transition($1,$2)', [sale_id, new_status]);
  if (!v.rows[0].valid) return res.status(400).json({ error: v.rows[0].message, field: v.rows[0].field });
  try {
    const old = await db.query('SELECT sale_status FROM sales WHERE sale_id=$1', [sale_id]);
    await db.query('UPDATE sales SET sale_status=$1 WHERE sale_id=$2', [new_status, sale_id]);
    await db.query('INSERT INTO sale_transitions (sale_id, old_status, new_status, changed_by) VALUES ($1,$2,$3,$4)', [sale_id, old.rows[0].sale_status, new_status, user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Recommendations: get posts for user
exports.getRecommendations = async (req, res) => {
  const { user_id } = req.query;
  try {
    const recs = await db.query('SELECT * FROM get_recommendations($1)', [user_id]);
    res.json(recs.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single post by its ID, including seller and image info
exports.getPostById = async (req, res) => {
  const { id } = req.params;
  try {
    // Increment the view count
    await db.query('UPDATE posts SET views = views + 1 WHERE post_id = $1', [id]);

    // Fetch the post details along with seller info and images
    const postQuery = `
      SELECT
        p.*,
        u.username AS seller_name,
        u.rating AS seller_rating,
        u.user_id AS seller_id,
        COALESCE(i.images, '[]'::json) AS images
      FROM posts p
      JOIN users u ON p.user_id = u.user_id
      LEFT JOIN (
        SELECT
          post_id,
          json_agg(image_url) AS images
        FROM post_images
        GROUP BY post_id
      ) i ON p.post_id = i.post_id
      WHERE p.post_id = $1;
    `;
    const result = await db.query(postQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // The frontend expects a specific structure, so we format it
    const post = result.rows[0];
    const formattedPost = {
      id: post.post_id,
      title: post.title,
      description: post.description,
      price: `$${parseFloat(post.price).toFixed(2)}`,
      originalPrice: post.original_price ? `$${parseFloat(post.original_price).toFixed(2)}` : null,
      condition: post.condition,
      age: post.age,
      category: post.category_id, // This should be joined with categories table for name
      location: post.location,
      postedDate: new Date(post.created_at).toLocaleDateString(),
      tier: post.tier_id, // This should be joined with tiers table for name
      views: post.views,
      images: post.images.map(img => img.image_url || img), // Ensure it handles both raw url and object
      seller: {
        id: post.seller_id,
        name: post.seller_name,
        rating: post.seller_rating,
        verified: true, // Assuming all users are verified for now
      },
    };

    res.json(formattedPost);
  } catch (err) {
    console.error('Error fetching post by ID:', err);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
};

// ...other endpoints for categories, notifications, rewards, etc.
