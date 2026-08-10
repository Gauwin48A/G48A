const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/**
 * POST /api/v1/media/upload
 * Record a media file upload (actual upload handled by R2 pre-signed URL separately)
 */
exports.upload = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { post_id, object_key, media_type, mime_type, file_size, width, height, duration } = req.body;

  if (!object_key || !media_type) {
    return res.status(400).json({ error: "object_key and media_type are required" });
  }

  try {
    const result = await runQuery(
      `INSERT INTO post_media (post_id, user_id, object_key, media_type, mime_type, file_size, width, height, duration, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'READY')
       RETURNING *`,
      [post_id || null, userId, object_key, media_type, mime_type || null, file_size || null, width || null, height || null, duration || null]
    );

    res.status(201).json({ success: true, media: result.rows[0] });
  } catch (err) {
    logger.error("[Media] upload error:", err);
    res.status(500).json({ error: "Failed to record media upload" });
  }
};

/**
 * GET /api/v1/media/:id
 * Get media details
 */
exports.getById = async (req, res) => {
  try {
    const result = await runQuery(`SELECT * FROM post_media WHERE media_id::text = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Media not found" });
    res.json({ success: true, media: result.rows[0] });
  } catch (err) {
    logger.error("[Media] getById error:", err);
    res.status(500).json({ error: "Failed to fetch media" });
  }
};

/**
 * DELETE /api/v1/media/:id
 * Soft-delete a media record
 */
exports.delete = async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  try {
    const result = await runQuery(
      `UPDATE post_media SET status = 'DELETED' WHERE media_id::text = $1 AND user_id::text = $2 RETURNING *`,
      [req.params.id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Media not found or access denied" });
    res.json({ success: true, message: "Media deleted" });
  } catch (err) {
    logger.error("[Media] delete error:", err);
    res.status(500).json({ error: "Failed to delete media" });
  }
};
