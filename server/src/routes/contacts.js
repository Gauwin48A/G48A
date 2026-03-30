const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

/** All contact routes require authentication */
router.use(protect);

/**
 * @route POST /sync - Sync device contacts and match platform users
 */
router.post("/sync", async (req, res) => {
  const userId = getAuthUserId(req);
  const { contacts } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ error: "Contacts array required" });
  }

  try {
    const upsertResult = await runQuery(
      `
      WITH incoming AS (
        SELECT
          $1::bigint AS owner_id,
          COALESCE(NULLIF(TRIM(c.name), ''), 'Unknown') AS name,
          c.phone
        FROM jsonb_to_recordset($2::jsonb) AS c(name text, phone text)
        WHERE c.phone ~ '^[0-9]{10}$'
      ),
      deduped AS (
        SELECT owner_id, phone, MAX(name) AS name
        FROM incoming
        GROUP BY owner_id, phone
      )
      INSERT INTO user_contacts (owner_id, name, phone, created_at)
      SELECT owner_id, name, phone, NOW()
      FROM deduped
      ON CONFLICT (owner_id, phone)
      DO UPDATE SET name = EXCLUDED.name
      RETURNING phone
    `,
      [userId, JSON.stringify(contacts)]
    );

    const synced = upsertResult.rowCount || 0;

    await runQuery(
      `
      WITH incoming AS (
        SELECT DISTINCT c.phone
        FROM jsonb_to_recordset($2::jsonb) AS c(name text, phone text)
        WHERE c.phone ~ '^[0-9]{10}$'
      )
      UPDATE user_contacts uc
      SET is_on_platform = TRUE, matched_user_id = u.user_id
      FROM users u
      JOIN incoming i ON i.phone = uc.phone
      WHERE uc.owner_id = $1
        AND (u.phone_number = uc.phone OR u.phone_number = CONCAT('+91', uc.phone))
        AND u.user_id != $1
    `,
      [userId, JSON.stringify(contacts)]
    );

    res.json({ message: "Contacts synced", synced: synced });
  } catch (error) {
    logger.error("[Contacts] Sync error:", error);
    res.status(500).json({ error: "Failed to sync contacts" });
  }
});

/**
 * @route GET /friends - Find contacts who are also on the platform
 */
router.get("/friends", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const result = await runQuery(
      `
      SELECT
        uc.name as contact_name,
        uc.phone,
        u.user_id,
        u.username,
        p.avatar_url,
        p.full_name
      FROM user_contacts uc
      JOIN users u ON u.phone_number = uc.phone OR u.phone_number = CONCAT('+91', uc.phone)
      LEFT JOIN profiles p ON p.user_id = u.user_id
      WHERE uc.owner_id = $1
        AND u.user_id != $1
      ORDER BY uc.name
    `,
      [userId]
    );

    res.json({ friends: result.rows });
  } catch (error) {
    logger.error("[Contacts] Find friends error:", error);
    res.status(500).json({ error: "Failed to find friends" });
  }
});

/**
 * @route GET /stats - Get contact sync statistics
 */
router.get("/stats", async (req, res) => {
  const userId = getAuthUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const stats = await runQuery(
      `
      SELECT
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN is_on_platform THEN 1 END) as friends_on_platform
      FROM user_contacts
      WHERE owner_id = $1
    `,
      [userId]
    );

    res.json(stats.rows[0]);
  } catch (error) {
    logger.error("[Contacts] Stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
});

module.exports = router;
