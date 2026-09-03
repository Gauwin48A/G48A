const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * GET /api/v1/search/products?q=&category=&min_price=&max_price=
 * Full-text search on products using the search_vector column
 */
exports.products = async (req, res) => {
  const { q, category, min_price, max_price, page = 1, limit = 20 } = req.query;

  try {
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    let whereClauses = ["p.status = 'PUBLISHED'"];
    let params = [];
    let paramIndex = 1;

    if (q && q.trim()) {
      whereClauses.push(`p.search_vector @@ plainto_tsquery('english', $${paramIndex})`);
      params.push(q.trim());
      paramIndex++;
    }

    if (category) {
      whereClauses.push(`(c.slug = $${paramIndex} OR c.name ILIKE $${paramIndex})`);
      params.push(category);
      paramIndex++;
    }

    if (min_price) {
      whereClauses.push(`p.price >= $${paramIndex}`);
      params.push(parseFloat(min_price));
      paramIndex++;
    }

    if (max_price) {
      whereClauses.push(`p.price <= $${paramIndex}`);
      params.push(parseFloat(max_price));
      paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

    const countResult = await runQuery(
      `SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id::text = c.category_id::text ${whereSQL}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count, 10);

    const orderSQL = q && q.trim()
      ? `ORDER BY ts_rank(p.search_vector, plainto_tsquery('english', $1)) DESC`
      : "ORDER BY p.created_at DESC";

    const result = await runQuery(
      `SELECT p.product_id, p.title, p.description, p.price, p.condition, p.status,
              p.created_at, c.name as category_name, c.slug as category_slug,
              (SELECT object_key FROM product_images WHERE product_id = p.product_id AND is_primary = true LIMIT 1) as primary_image
       FROM products p
       LEFT JOIN categories c ON p.category_id::text = c.category_id::text
       ${whereSQL}
       ${orderSQL}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit, 10), offset]
    );

    res.json({
      success: true,
      products: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      },
    });
  } catch (err) {
    logger.error("[Search] products error:", err);
    res.status(500).json({ error: "Search failed" });
  }
};

/**
 * GET /api/v1/search/posts?q=
 * Search posts by content
 */
exports.posts = async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  try {
    if (!q || !q.trim()) {
      return res.status(400).json({ error: "Search query (q) is required" });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const searchTerm = `%${q.trim()}%`;

    const countResult = await runQuery(
      `SELECT COUNT(*) FROM posts WHERE status = 'active' AND (title ILIKE $1 OR description ILIKE $1)`,
      [searchTerm]
    );

    const result = await runQuery(
      `SELECT post_id, title, description, price, status, created_at
       FROM posts
       WHERE status = 'active' AND (title ILIKE $1 OR description ILIKE $1)
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [searchTerm, parseInt(limit, 10), offset]
    );

    res.json({
      success: true,
      posts: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total: parseInt(countResult.rows[0].count, 10),
      },
    });
  } catch (err) {
    logger.error("[Search] posts error:", err);
    res.status(500).json({ error: "Search failed" });
  }
};

/**
 * GET /api/v1/search/pages?q=
 * Search pages by name or description
 */
exports.pages = async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  try {
    if (!q || !q.trim()) return res.status(400).json({ error: "Search query (q) is required" });
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const searchTerm = `%${q.trim()}%`;

    const result = await runQuery(
      `SELECT * FROM pages WHERE is_active = true AND (name ILIKE $1 OR description ILIKE $1)
       ORDER BY follower_count DESC LIMIT $2 OFFSET $3`,
      [searchTerm, parseInt(limit, 10), offset]
    );

    res.json({ success: true, pages: result.rows });
  } catch (err) {
    logger.error("[Search] pages error:", err);
    res.status(500).json({ error: "Search failed" });
  }
};

/**
 * GET /api/v1/search/users?q=
 * Search users by username or email
 */
exports.users = async (req, res) => {
  const { q, page = 1, limit = 20 } = req.query;

  try {
    if (!q || !q.trim()) return res.status(400).json({ error: "Search query (q) is required" });
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const searchTerm = `%${q.trim()}%`;

    const result = await runQuery(
      `SELECT user_id, username, email FROM users
       WHERE username ILIKE $1 OR email ILIKE $1
       ORDER BY username ASC LIMIT $2 OFFSET $3`,
      [searchTerm, parseInt(limit, 10), offset]
    );

    res.json({ success: true, users: result.rows });
  } catch (err) {
    logger.error("[Search] users error:", err);
    res.status(500).json({ error: "Search failed" });
  }
};

/**
 * GET /api/search/trending
 * Aggregates top search queries and popular product keywords for discovery
 */
exports.trending = async (req, res) => {
  try {
    const result = await runQuery(`
      SELECT query FROM (
        SELECT lower(title) as query, count(*) as count
        FROM posts
        WHERE status = 'active'
        GROUP BY lower(title)
        ORDER BY count DESC
        LIMIT 10
      ) t
    `);
    const queries = result.rows.map((r) => r.query).filter(Boolean);
    const fallbackQueries = [
      "iPhone 15 Pro",
      "MacBook M2",
      "Honda City",
      "Royal Enfield",
      "PlayStation 5",
      "2BHK Apartment",
      "Nike Air Jordan",
      "Canon EOS",
    ];
    res.json({ queries: queries.length ? queries : fallbackQueries });
  } catch (err) {
    logger.error("[Search] trending error:", err);
    res.json({
      queries: [
        "iPhone 15 Pro",
        "MacBook M2",
        "Honda City",
        "Royal Enfield",
        "PlayStation 5",
        "2BHK Apartment",
      ],
    });
  }
};

