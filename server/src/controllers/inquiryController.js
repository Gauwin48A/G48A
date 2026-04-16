const logger = require("../utils/logger");
const { emitNotification } = require("../services/notificationEmitter");
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const {
  parseOptionalString,
  parsePositiveInt,
  getScalarQueryValue,
} = require("../utils/parseHelpers");

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const VALID_INQUIRY_STATUSES = new Set(["pending", "contacted", "closed"]);

const QUICK_REPLY_TEMPLATES = [
  {
    id: 1,
    label: "Interested - Call me",
    text: "Thank you for your interest! Please call me to discuss further.",
  },
  {
    id: 2,
    label: "Price negotiable",
    text: "Hi! The price is negotiable. Let's connect and work something out.",
  },
  {
    id: 3,
    label: "Item sold",
    text: "Sorry, this item has already been sold. Thank you for your interest!",
  },
  {
    id: 4,
    label: "Available - Visit anytime",
    text: "The item is available. You're welcome to visit and inspect it anytime.",
  },
  {
    id: 5,
    label: "WhatsApp me",
    text: "Please WhatsApp me for more details and photos.",
  },
];

// ─── Schema introspection (cached) ──────────────────────────────────────────

let buyerInquirySchemaConfigPromise = null;

/**
 * Inspect the buyer_inquiries table once and cache which optional columns exist.
 * @returns {Promise<Object>} Column-presence flags
 */
async function getBuyerInquirySchemaConfig() {
  if (!buyerInquirySchemaConfigPromise) {
    buyerInquirySchemaConfigPromise = runQuery(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'buyer_inquiries'`
    )
      .then((result) => {
        const columns = new Set(
          (result?.rows || []).map((row) => row.column_name)
        );
        return {
          hasBuyerName: columns.has("buyer_name"),
          hasPhone: columns.has("phone"),
          hasAddress: columns.has("address"),
          hasIsSpam: columns.has("is_spam"),
          hasSellerReply: columns.has("seller_reply"),
          hasReplyAt: columns.has("reply_at"),
          hasUpdatedAt: columns.has("updated_at"),
        };
      })
      .catch((error) => {
        logger.warn(
          "[Inquiry] Failed to inspect buyer_inquiries schema; using fallback defaults",
          { message: error.message }
        );
        return {
          hasBuyerName: false,
          hasPhone: false,
          hasAddress: false,
          hasIsSpam: false,
          hasSellerReply: false,
          hasReplyAt: false,
          hasUpdatedAt: false,
        };
      });
  }
  return buyerInquirySchemaConfigPromise;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Parse a query-string value that may be an array, then trim to string or null.
 * Wraps the shared parseOptionalString with getScalarQueryValue for query params.
 * @param {*} value - Raw query-string value (may be string or string[])
 * @returns {string|null}
 */
function parseQueryString(value) {
  return parseOptionalString(getScalarQueryValue(value));
}

/**
 * Parse a query-string integer that may be an array.
 * @param {*} value
 * @param {number} fallback
 * @param {number} [max]
 * @returns {number}
 */
function parseQueryInt(value, fallback, max) {
  const scalar = getScalarQueryValue(value);
  const normalized = parseOptionalString(scalar);
  if (!normalized || !/^\d+$/.test(normalized)) return fallback;
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max ?? Number.MAX_SAFE_INTEGER);
}

function normalizeSellerInquiryQuery(query) {
  const page = parseQueryInt(query.page, 1);
  const limit = parseQueryInt(query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const status = parseQueryString(query.status);
  const search = parseQueryString(query.search);
  return {
    page,
    limit,
    offset: (page - 1) * limit,
    status: status || null,
    search,
  };
}

function buildSellerInquiryFilters({
  userId,
  status,
  search,
  schemaConfig = {},
}) {
  const hasIsSpam = schemaConfig.hasIsSpam !== false;
  const hasBuyerName = schemaConfig.hasBuyerName !== false;
  const hasPhone = schemaConfig.hasPhone !== false;

  const params = [String(userId)];
  const conditions = ["p.user_id::text = $1"];

  if (hasIsSpam) {
    conditions.push("bi.is_spam = false");
  }

  if (status) {
    params.push(status);
    conditions.push(`bi.status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const placeholder = `$${params.length}`;
    const searchConditions = [];
    if (hasBuyerName) searchConditions.push(`bi.buyer_name ILIKE ${placeholder}`);
    if (hasPhone) searchConditions.push(`bi.phone ILIKE ${placeholder}`);
    if (!searchConditions.length)
      searchConditions.push(`bi.message ILIKE ${placeholder}`);
    conditions.push(`(${searchConditions.join(" OR ")})`);
  }

  return { whereClause: conditions.join(" AND "), params };
}

function isBuyerInquirySchemaError(err) {
  if (!err) return false;
  if (err.code === "42703") return true;
  const message = String(err.message || "").toLowerCase();
  return message.includes("buyer_inquiries") || message.includes("column");
}

function getInquirySelectClause(schemaConfig, tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return `
    ${prefix}inquiry_id,
    ${prefix}post_id,
    ${prefix}buyer_id,
    ${schemaConfig.hasBuyerName ? `${prefix}buyer_name` : "NULL::text AS buyer_name"},
    ${schemaConfig.hasPhone ? `${prefix}phone` : "NULL::text AS phone"},
    ${schemaConfig.hasAddress ? `${prefix}address` : "NULL::text AS address"},
    ${prefix}message,
    ${prefix}status,
    ${schemaConfig.hasIsSpam ? `${prefix}is_spam` : "false AS is_spam"},
    ${schemaConfig.hasSellerReply ? `${prefix}seller_reply` : "NULL::text AS seller_reply"},
    ${schemaConfig.hasReplyAt ? `${prefix}reply_at` : "NULL::timestamp AS reply_at"},
    ${prefix}created_at,
    ${schemaConfig.hasUpdatedAt ? `${prefix}updated_at` : `${prefix}created_at AS updated_at`}
  `;
}

function getInquiryUpdatedAtSetClause(schemaConfig) {
  return schemaConfig.hasUpdatedAt ? ", updated_at = NOW()" : "";
}

/**
 * Load an inquiry and verify the requesting user is its seller.
 * @param {number|string} inquiryId
 * @param {string} userId
 * @returns {Promise<{inquiry?: Object, error?: {status: number, body: Object}}>}
 */
async function getOwnedInquiry(inquiryId, userId) {
  const schemaConfig = await getBuyerInquirySchemaConfig();
  const inquiry = await runQuery(
    `SELECT
       ${getInquirySelectClause(schemaConfig, "bi")},
       p.user_id AS seller_id
     FROM buyer_inquiries bi
     JOIN posts p ON bi.post_id = p.post_id
     WHERE bi.inquiry_id = $1`,
    [inquiryId]
  );

  if (inquiry.rows.length === 0) {
    return { error: { status: 404, body: { error: "Inquiry not found" } } };
  }
  if (String(inquiry.rows[0].seller_id) !== String(userId)) {
    return { error: { status: 403, body: { error: "Not authorized" } } };
  }
  return { inquiry: inquiry.rows[0] };
}

// ─── Route handlers ──────────────────────────────────────────────────────────

/**
 * POST / - Create a new buyer inquiry for a listing.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const createInquiry = async (req, res) => {
  try {
    const { postId, buyerName, phone, address, message } = req.body;

    if (!postId || !buyerName || !phone) {
      return res
        .status(400)
        .json({ error: "Post ID, buyer name, and phone number are required" });
    }

    const phoneRegex = /^[+]?[\d\s-]{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ""))) {
      return res.status(400).json({ error: "Invalid phone number format" });
    }

    const buyerId = getAuthUserId(req);
    const normalizedPhone = parseOptionalString(phone);
    const normalizedBuyerName = parseOptionalString(buyerName);

    if (!normalizedPhone || !normalizedBuyerName) {
      return res
        .status(400)
        .json({ error: "Post ID, buyer name, and phone number are required" });
    }

    const schemaConfig = await getBuyerInquirySchemaConfig();

    const postCheck = await runQuery(
      "SELECT post_id, user_id FROM posts WHERE post_id = $1",
      [postId]
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    let dupeCheck = { rows: [] };
    let spamCheck = { rows: [{ count: "0" }] };

    if (schemaConfig.hasPhone) {
      [dupeCheck, spamCheck] = await Promise.all([
        runQuery(
          `SELECT inquiry_id FROM buyer_inquiries
           WHERE post_id = $1 AND phone = $2
             AND created_at > NOW() - INTERVAL '24 hours'
           LIMIT 1`,
          [postId, normalizedPhone]
        ),
        runQuery(
          `SELECT COUNT(*) FROM buyer_inquiries
           WHERE phone = $1
             AND created_at > NOW() - INTERVAL '1 hour'`,
          [normalizedPhone]
        ),
      ]);
    }

    if (dupeCheck.rows.length > 0) {
      return res.status(429).json({
        error:
          "You have already submitted an inquiry for this listing in the last 24 hours.",
      });
    }

    const isSpam =
      schemaConfig.hasIsSpam &&
      Number.parseInt(spamCheck.rows[0].count, 10) >= 5;

    const insertColumns = ["post_id", "buyer_id", "message"];
    const insertValues = [postId, buyerId, parseOptionalString(message)];

    if (schemaConfig.hasBuyerName) {
      insertColumns.push("buyer_name");
      insertValues.push(normalizedBuyerName);
    }
    if (schemaConfig.hasPhone) {
      insertColumns.push("phone");
      insertValues.push(normalizedPhone);
    }
    if (schemaConfig.hasAddress) {
      insertColumns.push("address");
      insertValues.push(parseOptionalString(address));
    }
    if (schemaConfig.hasIsSpam) {
      insertColumns.push("is_spam");
      insertValues.push(isSpam);
    }

    const placeholders = insertValues
      .map((_, index) => `$${index + 1}`)
      .join(", ");

    const result = await runQuery(
      `INSERT INTO buyer_inquiries (${insertColumns.join(", ")})
       VALUES (${placeholders})
       RETURNING ${getInquirySelectClause(schemaConfig)}`,
      insertValues
    );

    if (!isSpam) {
      const sellerId = postCheck.rows[0].user_id;
      const actionPath = `/post/${postId}`;
      const notificationResult = await runQuery(
        `INSERT INTO notifications (user_id, title, message, type, sender_id, post_id, action_path, metadata)
         VALUES ($1, $2, $3, 'inquiry', $4, $5, $6, $7)
         RETURNING notification_id, created_at`,
        [
          sellerId,
          "New Buyer Interest!",
          `${normalizedBuyerName} is interested in your listing. Phone: ${normalizedPhone}`,
          buyerId,
          postId,
          actionPath,
          JSON.stringify({ action_label: "View Post" }),
        ]
      );

      emitNotification(String(sellerId), {
        notification_id: notificationResult.rows[0]?.notification_id,
        title: "New Buyer Interest!",
        message: `${normalizedBuyerName} is interested in your listing.`,
        type: "inquiry",
        sender_id: buyerId,
        post_id: postId,
        action: { path: actionPath, label: "View Post" },
        created_at: notificationResult.rows[0]?.created_at || new Date().toISOString(),
      });
    }

    res.status(201).json({
      success: true,
      message: isSpam
        ? "Inquiry received"
        : "Your interest has been submitted to the seller",
      inquiry: result.rows[0],
    });
  } catch (error) {
    logger.error("Error creating inquiry:", error);
    res.status(500).json({ error: "Failed to submit inquiry" });
  }
};

/**
 * GET / - List buyer inquiries for the authenticated seller, with pagination,
 * status filtering, and search.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getInquiriesForSeller = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const schemaConfig = await getBuyerInquirySchemaConfig();
    const { page, limit, offset, status, search } =
      normalizeSellerInquiryQuery(req.query);

    const { whereClause, params } = buildSellerInquiryFilters({
      userId,
      status,
      search,
      schemaConfig,
    });

    const listParams = [...params, limit, offset];
    const listResult = await runQuery(
      `SELECT
         COUNT(*) OVER()::int AS total_count,
         ${getInquirySelectClause(schemaConfig, "bi")},
         p.title AS post_title,
         p.price AS post_price
       FROM buyer_inquiries bi
       JOIN posts p ON bi.post_id = p.post_id
       WHERE ${whereClause}
       ORDER BY bi.created_at DESC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    const total = listResult.rows.length
      ? listResult.rows[0].total_count
      : 0;
    const inquiries = listResult.rows.map(
      ({ total_count, ...inquiry }) => inquiry
    );

    res.json({
      success: true,
      inquiries,
      total,
      page,
      limit,
      total_pages: total > 0 ? Math.ceil(total / limit) : 0,
    });
  } catch (error) {
    if (isBuyerInquirySchemaError(error)) {
      try {
        const userId = getAuthUserId(req);
        if (!userId) {
          return res.status(401).json({ error: "Authentication required" });
        }

        const { page, limit, offset } = normalizeSellerInquiryQuery(req.query);

        const fallbackResult = await runQuery(
          `SELECT
             COUNT(*) OVER()::int AS total_count,
             bi.inquiry_id,
             bi.post_id,
             bi.buyer_id,
             NULL::text AS buyer_name,
             NULL::text AS phone,
             NULL::text AS address,
             bi.message,
             bi.status,
             false AS is_spam,
             NULL::text AS seller_reply,
             NULL::timestamp AS reply_at,
             bi.created_at,
             bi.created_at AS updated_at,
             p.title AS post_title,
             p.price AS post_price
           FROM buyer_inquiries bi
           JOIN posts p ON bi.post_id = p.post_id
           WHERE p.user_id::text = $1
           ORDER BY bi.created_at DESC
           LIMIT $2 OFFSET $3`,
          [String(userId), limit, offset]
        );

        const total = fallbackResult.rows.length
          ? fallbackResult.rows[0].total_count
          : 0;
        const inquiries = fallbackResult.rows.map(
          ({ total_count, ...inquiry }) => inquiry
        );

        return res.json({
          success: true,
          inquiries,
          total,
          page,
          limit,
          total_pages: total > 0 ? Math.ceil(total / limit) : 0,
        });
      } catch (fallbackErr) {
        logger.error(
          "Fallback fetching seller inquiries failed:",
          fallbackErr
        );
      }
    }

    logger.error("Error fetching seller inquiries:", error);
    res.status(500).json({ error: "Failed to fetch inquiries" });
  }
};

/**
 * GET /:postId - List buyer inquiries for a specific post owned by the
 * authenticated user.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getInquiriesForPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const limit = parsePositiveInt(req.query.limit, 200, 1000);
    const schemaConfig = await getBuyerInquirySchemaConfig();

    const postCheck = await runQuery(
      "SELECT user_id FROM posts WHERE post_id = $1",
      [postId]
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (String(postCheck.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const result = await runQuery(
      `SELECT
         ${getInquirySelectClause(schemaConfig)}
       FROM buyer_inquiries
       WHERE post_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [postId, limit]
    );

    res.json({
      success: true,
      inquiries: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    logger.error("Error fetching post inquiries:", error);
    res.status(500).json({ error: "Failed to fetch inquiries" });
  }
};

/**
 * PATCH /:inquiryId/status - Update the status of an inquiry owned by the
 * authenticated seller.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateInquiryStatus = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { status } = req.body;
    const userId = getAuthUserId(req);
    const schemaConfig = await getBuyerInquirySchemaConfig();

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!VALID_INQUIRY_STATUSES.has(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status. Must be: pending, contacted, closed" });
    }

    const ownedInquiry = await getOwnedInquiry(inquiryId, userId);
    if (ownedInquiry.error) {
      return res
        .status(ownedInquiry.error.status)
        .json(ownedInquiry.error.body);
    }

    const result = await runQuery(
      `UPDATE buyer_inquiries
       SET status = $1${getInquiryUpdatedAtSetClause(schemaConfig)}
       WHERE inquiry_id = $2
       RETURNING
         ${getInquirySelectClause(schemaConfig)}`,
      [status, inquiryId]
    );

    res.json({ success: true, inquiry: result.rows[0] });
  } catch (error) {
    logger.error("Error updating inquiry:", error);
    res.status(500).json({ error: "Failed to update inquiry" });
  }
};

/**
 * GET /templates - Return the list of quick-reply templates.
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 */
const getQuickReplyTemplates = async (_req, res) => {
  res.json({ templates: QUICK_REPLY_TEMPLATES });
};

/**
 * POST /:inquiryId/reply - Send a seller reply (free-text or template) to an
 * inquiry and notify the buyer.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const replyToInquiry = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const { reply_text, template_id } = req.body;
    const userId = getAuthUserId(req);
    const schemaConfig = await getBuyerInquirySchemaConfig();

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!reply_text && !template_id) {
      return res
        .status(400)
        .json({ error: "reply_text or template_id required" });
    }

    const templateId = parsePositiveInt(
      template_id,
      null,
      QUICK_REPLY_TEMPLATES.length
    );
    const finalText =
      reply_text ||
      QUICK_REPLY_TEMPLATES.find((t) => t.id === templateId)?.text;

    if (!finalText) {
      return res.status(400).json({ error: "Invalid template_id" });
    }

    if (!schemaConfig.hasSellerReply) {
      return res
        .status(503)
        .json({ error: "Inquiry reply feature is unavailable on current schema" });
    }

    const ownedInquiry = await getOwnedInquiry(inquiryId, userId);
    if (ownedInquiry.error) {
      return res
        .status(ownedInquiry.error.status)
        .json(ownedInquiry.error.body);
    }

    const updateFields = ["seller_reply = $1", "status = 'contacted'"];
    if (schemaConfig.hasReplyAt) updateFields.push("reply_at = NOW()");
    if (schemaConfig.hasUpdatedAt) updateFields.push("updated_at = NOW()");

    const result = await runQuery(
      `UPDATE buyer_inquiries
       SET ${updateFields.join(", ")}
       WHERE inquiry_id = $2
       RETURNING
         ${getInquirySelectClause(schemaConfig)}`,
      [finalText, inquiryId]
    );

    const buyerId = ownedInquiry.inquiry.buyer_id;
    if (buyerId) {
      const actionPath = `/chat`;
      const replyText = finalText.substring(0, 80);
      const notificationResult = await runQuery(
        `INSERT INTO notifications (user_id, title, message, type, sender_id, post_id, action_path, metadata)
         VALUES ($1, 'Seller Replied', $2, 'inquiry_reply', $3, $4, $5, $6)
         RETURNING notification_id, created_at`,
        [
          buyerId,
          `The seller replied to your inquiry: "${replyText}..."`,
          userId,
          ownedInquiry.inquiry.post_id,
          actionPath,
          JSON.stringify({ action_label: "Open Chat" }),
        ]
      );

      emitNotification(String(buyerId), {
        notification_id: notificationResult.rows[0]?.notification_id,
        title: "Seller Replied",
        message: `The seller replied to your inquiry: "${replyText}..."`,
        type: "inquiry_reply",
        sender_id: userId,
        post_id: ownedInquiry.inquiry.post_id,
        action: { path: actionPath, label: "Open Chat" },
        created_at: notificationResult.rows[0]?.created_at || new Date().toISOString(),
      });
    }

    res.json({ success: true, inquiry: result.rows[0] });
  } catch (error) {
    logger.error("Error replying to inquiry:", error);
    res.status(500).json({ error: "Failed to send reply" });
  }
};

/**
 * POST /:inquiryId/spam - Mark an inquiry as spam and close it.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const markAsSpam = async (req, res) => {
  try {
    const { inquiryId } = req.params;
    const userId = getAuthUserId(req);
    const schemaConfig = await getBuyerInquirySchemaConfig();

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const ownedInquiry = await getOwnedInquiry(inquiryId, userId);
    if (ownedInquiry.error) {
      return res
        .status(ownedInquiry.error.status)
        .json(ownedInquiry.error.body);
    }

    const updateFields = ["status = 'closed'"];
    if (schemaConfig.hasIsSpam) updateFields.push("is_spam = true");
    if (schemaConfig.hasUpdatedAt) updateFields.push("updated_at = NOW()");

    await runQuery(
      `UPDATE buyer_inquiries
       SET ${updateFields.join(", ")}
       WHERE inquiry_id = $1`,
      [inquiryId]
    );

    res.json({ success: true, message: "Inquiry marked as spam" });
  } catch (error) {
    logger.error("Error marking spam:", error);
    res.status(500).json({ error: "Failed to mark as spam" });
  }
};

/**
 * GET /analytics - Return inquiry summary stats and top posts for the
 * authenticated seller.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const getInquiryAnalytics = async (req, res) => {
  try {
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [result, topPosts] = await Promise.all([
      runQuery(
        `SELECT
           COUNT(*) FILTER (WHERE bi.is_spam = false)                          AS total,
           COUNT(*) FILTER (WHERE bi.status = 'pending' AND bi.is_spam = false) AS pending,
           COUNT(*) FILTER (WHERE bi.status = 'contacted')                      AS contacted,
           COUNT(*) FILTER (WHERE bi.status = 'closed')                         AS closed,
           COUNT(*) FILTER (WHERE bi.is_spam = true)                            AS spam,
           COUNT(*) FILTER (WHERE bi.created_at > NOW() - INTERVAL '7 days'
                             AND bi.is_spam = false)                            AS last_7_days,
           COUNT(*) FILTER (WHERE bi.seller_reply IS NOT NULL)                  AS replied
         FROM buyer_inquiries bi
         JOIN posts p ON bi.post_id = p.post_id
         WHERE p.user_id::text = $1`,
        [String(userId)]
      ),
      runQuery(
        `SELECT p.title, p.post_id, COUNT(bi.inquiry_id) AS inquiry_count
         FROM buyer_inquiries bi
         JOIN posts p ON bi.post_id = p.post_id
         WHERE p.user_id::text = $1 AND bi.is_spam = false
         GROUP BY p.post_id, p.title
         ORDER BY inquiry_count DESC
         LIMIT 5`,
        [String(userId)]
      ),
    ]);

    res.json({ summary: result.rows[0], top_posts: topPosts.rows });
  } catch (error) {
    if (isBuyerInquirySchemaError(error)) {
      try {
        const userId = getAuthUserId(req);
        if (!userId) {
          return res.status(401).json({ error: "Authentication required" });
        }

        const [result, topPosts] = await Promise.all([
          runQuery(
            `SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE bi.status = 'pending')::int AS pending,
               COUNT(*) FILTER (WHERE bi.status = 'contacted')::int AS contacted,
               COUNT(*) FILTER (WHERE bi.status = 'closed')::int AS closed,
               0::int AS spam,
               COUNT(*) FILTER (WHERE bi.created_at > NOW() - INTERVAL '7 days')::int AS last_7_days,
               0::int AS replied
             FROM buyer_inquiries bi
             JOIN posts p ON bi.post_id = p.post_id
             WHERE p.user_id::text = $1`,
            [String(userId)]
          ),
          runQuery(
            `SELECT p.title, p.post_id, COUNT(bi.inquiry_id)::int AS inquiry_count
             FROM buyer_inquiries bi
             JOIN posts p ON bi.post_id = p.post_id
             WHERE p.user_id::text = $1
             GROUP BY p.post_id, p.title
             ORDER BY inquiry_count DESC
             LIMIT 5`,
            [String(userId)]
          ),
        ]);

        return res.json({ summary: result.rows[0], top_posts: topPosts.rows });
      } catch (fallbackErr) {
        logger.error("Fallback inquiry analytics failed:", fallbackErr);
      }
    }

    logger.error("Error fetching inquiry analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  createInquiry,
  getInquiriesForSeller,
  getInquiriesForPost,
  updateInquiryStatus,
  getQuickReplyTemplates,
  replyToInquiry,
  markAsSpam,
  getInquiryAnalytics,
};
