const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

exports.list = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `SELECT * FROM pages WHERE owner_id::text = $1 OR page_id IN 
       (SELECT page_id FROM page_members WHERE user_id::text = $1)
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );
    res.json({ success: true, pages: result.rows });
  } catch (err) {
    logger.error("[Pages] list error:", err);
    res.status(500).json({ error: "Failed to fetch pages" });
  }
};

exports.create = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { name, description, category } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  try {
    const result = await runQuery(
      `INSERT INTO pages (owner_id, name, slug, description, category) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [userId, name, slug + "-" + Date.now(), description || null, category || null]
    );
    await runQuery(
      `INSERT INTO page_members (page_id, user_id, role) VALUES ($1, $2, 'owner')`,
      [result.rows[0].page_id, userId]
    );
    res.status(201).json({ success: true, page: result.rows[0] });
  } catch (err) {
    logger.error("[Pages] create error:", err);
    res.status(500).json({ error: "Failed to create page" });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await runQuery(`SELECT * FROM pages WHERE page_id::text = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Page not found" });
    res.json({ success: true, page: result.rows[0] });
  } catch (err) {
    logger.error("[Pages] getById error:", err);
    res.status(500).json({ error: "Failed to fetch page" });
  }
};

exports.update = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { name, description, avatar_url, cover_url, category } = req.body;

  try {
    const result = await runQuery(
      `UPDATE pages SET 
        name = COALESCE($1, name), description = COALESCE($2, description),
        avatar_url = COALESCE($3, avatar_url), cover_url = COALESCE($4, cover_url),
        category = COALESCE($5, category), updated_at = NOW()
       WHERE page_id::text = $6 AND owner_id::text = $7 RETURNING *`,
      [name, description, avatar_url, cover_url, category, req.params.id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Page not found or access denied" });
    res.json({ success: true, page: result.rows[0] });
  } catch (err) {
    logger.error("[Pages] update error:", err);
    res.status(500).json({ error: "Failed to update page" });
  }
};

exports.follow = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await runQuery(
      `INSERT INTO page_followers (page_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, userId]
    );
    await runQuery(`UPDATE pages SET follower_count = (SELECT COUNT(*) FROM page_followers WHERE page_id::text = $1) WHERE page_id::text = $1`, [req.params.id]);
    res.json({ success: true, message: "Following page" });
  } catch (err) {
    logger.error("[Pages] follow error:", err);
    res.status(500).json({ error: "Failed to follow page" });
  }
};

exports.unfollow = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    await runQuery(`DELETE FROM page_followers WHERE page_id::text = $1 AND user_id::text = $2`, [req.params.id, userId]);
    await runQuery(`UPDATE pages SET follower_count = (SELECT COUNT(*) FROM page_followers WHERE page_id::text = $1) WHERE page_id::text = $1`, [req.params.id]);
    res.json({ success: true, message: "Unfollowed page" });
  } catch (err) {
    logger.error("[Pages] unfollow error:", err);
    res.status(500).json({ error: "Failed to unfollow page" });
  }
};

exports.listPosts = async (req, res) => {
  try {
    const result = await runQuery(
      `SELECT pp.*, u.username as author_name FROM page_posts pp
       LEFT JOIN users u ON u.user_id::text = pp.author_id::text
       WHERE pp.page_id::text = $1 AND pp.status = 'PUBLISHED'
       ORDER BY pp.created_at DESC LIMIT 50`,
      [req.params.id]
    );
    res.json({ success: true, posts: result.rows });
  } catch (err) {
    logger.error("[Pages] listPosts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
};

exports.createPost = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { content, media } = req.body;
  if (!content) return res.status(400).json({ error: "content is required" });

  try {
    const result = await runQuery(
      `INSERT INTO page_posts (page_id, author_id, content, media) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, userId, content, media ? JSON.stringify(media) : "[]"]
    );
    res.status(201).json({ success: true, post: result.rows[0] });
  } catch (err) {
    logger.error("[Pages] createPost error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
};
