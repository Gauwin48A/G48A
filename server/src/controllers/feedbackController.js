const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const logger = require("../utils/logger");

const DEFAULT_FEEDBACK_LIMIT = 50;
const MAX_FEEDBACK_LIMIT = 200;

// Cached schema inspection — only runs once
let feedbackIdColumnAvailablePromise = null;

async function hasFeedbackIdColumn() {
  if (!feedbackIdColumnAvailablePromise) {
    feedbackIdColumnAvailablePromise = runQuery(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'feedback'
          AND column_name = 'id'
      ) AS available`,
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((err) => {
        logger.warn("[Feedback] Failed to inspect feedback.id column", { message: err.message });
        return false;
      });
  }
  return feedbackIdColumnAvailablePromise;
}

function getFeedbackIdSelectExpression(hasIdColumn, tableAlias = "") {
  const prefix = tableAlias ? `${tableAlias}.` : "";
  return hasIdColumn ? `${prefix}id` : `${prefix}feedback_id AS id`;
}

function canModerateFeedback(req) {
  const role = String(req.user?.role || "").toLowerCase();
  return role === "admin" || role === "superadmin" || role === "moderator";
}

/**
 * GET /api/feedback
 * Admin/moderator only: list all feedback entries with pagination.
 */
exports.getFeedback = async (req, res) => {
  try {
    if (!canModerateFeedback(req)) {
      return res.status(403).json({ error: "Admin or moderator access required" });
    }

    const page = parsePositiveInt(req.query.page, 1);
    const limit = parsePositiveInt(req.query.limit, DEFAULT_FEEDBACK_LIMIT, MAX_FEEDBACK_LIMIT);
    const offset = (page - 1) * limit;
    const hasIdColumn = await hasFeedbackIdColumn();

    const result = await runQuery(
      `SELECT ${getFeedbackIdSelectExpression(hasIdColumn)}, user_id, message, rating, category, status, created_at
       FROM feedback
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    res.json(result.rows);
  } catch (err) {
    logger.error("Error fetching feedback:", err.message);
    res.json([]);
  }
};

/**
 * GET /api/feedback/mine
 * Returns the authenticated user's feedback submissions.
 */
exports.getMyFeedback = async (req, res) => {
  try {
    const hasIdColumn = await hasFeedbackIdColumn();
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await runQuery(
      `SELECT ${getFeedbackIdSelectExpression(hasIdColumn)}, user_id, message, rating, category, status, created_at
       FROM feedback
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [String(userId)],
    );

    return res.json({ feedback: result.rows });
  } catch (err) {
    logger.error("Error fetching my feedback:", err.message);
    return res.status(500).json({ error: "Failed to fetch feedback", details: err.message });
  }
};

/**
 * POST /api/feedback
 * Submit new feedback. Body: { message, rating? (1-5), category?, subject? }
 */
exports.createFeedback = async (req, res) => {
  try {
    const hasIdColumn = await hasFeedbackIdColumn();
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { message, rating = 5, category = "general", subject = "" } = req.body || {};
    const trimmedMessage = String(message || "").trim();

    if (!trimmedMessage) {
      return res.status(400).json({ error: "Message is required" });
    }

    const parsedRating = Number.parseInt(rating, 10);
    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }

    const normalizedCategory = String(category || "general").trim().toLowerCase() || "general";
    const normalizedSubject = String(subject || "").trim();
    const storedMessage = normalizedSubject
      ? `[${normalizedSubject}] ${trimmedMessage}`
      : trimmedMessage;

    const result = await runQuery(
      `INSERT INTO feedback (user_id, message, rating, category, status, created_at)
       VALUES ($1, $2, $3, $4, 'open', NOW())
       RETURNING ${getFeedbackIdSelectExpression(hasIdColumn)}, user_id, message, rating, category, status, created_at`,
      [String(userId), storedMessage, parsedRating, normalizedCategory],
    );

    return res.status(201).json({
      message: "Feedback submitted successfully",
      feedback: result.rows[0],
    });
  } catch (err) {
    logger.error("Error creating feedback:", err.message);
    return res.status(500).json({ error: "Failed to submit feedback", details: err.message });
  }
};
