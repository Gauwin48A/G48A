const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parseOptionalString, parsePositiveInt } = require("../utils/parseHelpers");
const logger = require("../utils/logger");

const DEFAULT_FEEDBACK_LIMIT = 50;
const MAX_FEEDBACK_LIMIT = 200;
const AUTO_CREATE_FEEDBACK_TABLE =
  process.env.AUTO_CREATE_FEEDBACK_TABLE !== "false";

// Cached schema inspection — only runs once
let feedbackIdColumnAvailablePromise = null;
let feedbackTableAvailablePromise = null;
let feedbackSchemaReadyPromise = null;
let feedbackTableMissingLogged = false;

/**
 * Check whether the `feedback` table exists. Result is cached.
 * @returns {Promise<boolean>}
 */
async function isFeedbackTableAvailable() {
  if (!feedbackTableAvailablePromise) {
    feedbackTableAvailablePromise = runQuery(
      `SELECT to_regclass('public.feedback') IS NOT NULL AS available`
    )
      .then((result) => Boolean(result?.rows?.[0]?.available))
      .catch((err) => {
        logger.warn("[Feedback] Failed to verify feedback table availability", {
          message: err.message,
        });
        return false;
      });
  }
  return feedbackTableAvailablePromise;
}

/**
 * Run one-time schema setup if the feedback table is missing.
 * The promise is cached so creation executes at most once per process.
 * @returns {Promise<boolean>} true if schema is ready
 */
async function ensureFeedbackSchema() {
  if (!feedbackSchemaReadyPromise) {
    feedbackSchemaReadyPromise = (async () => {
      let tableAvailable = await isFeedbackTableAvailable();
      if (!tableAvailable && AUTO_CREATE_FEEDBACK_TABLE) {
        try {
          await runQuery(
            `CREATE TABLE IF NOT EXISTS feedback (
              feedback_id BIGSERIAL PRIMARY KEY,
              user_id TEXT NOT NULL,
              message TEXT NOT NULL,
              rating INT DEFAULT 5,
              category TEXT DEFAULT 'general',
              status TEXT DEFAULT 'open',
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )`
          );
          logger.info("[Feedback] feedback table created automatically.");
          feedbackTableAvailablePromise = Promise.resolve(true);
          feedbackIdColumnAvailablePromise = Promise.resolve(false);
          tableAvailable = true;
        } catch (createErr) {
          logger.warn("[Feedback] Unable to auto-create feedback table", {
            message: createErr.message,
          });
        }
      }

      if (!tableAvailable) {
        if (!feedbackTableMissingLogged) {
          logger.warn(
            "[Feedback] feedback table missing; read endpoints will return empty results."
          );
          feedbackTableMissingLogged = true;
        }
        return false;
      }

      return true;
    })().catch((err) => {
      logger.warn("[Feedback] Schema setup skipped", { message: err.message });
      return false;
    });
  }
  return feedbackSchemaReadyPromise;
}

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

    const schemaReady = await ensureFeedbackSchema();
    if (!schemaReady) {
      return res.json([]);
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
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
};

/**
 * GET /api/feedback/mine
 * Returns the authenticated user's feedback submissions.
 */
exports.getMyFeedback = async (req, res) => {
  try {
    const schemaReady = await ensureFeedbackSchema();
    if (!schemaReady) {
      return res.json({ feedback: [] });
    }

    const hasIdColumn = await hasFeedbackIdColumn();
    const userId = getAuthUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const result = await runQuery(
      `SELECT ${getFeedbackIdSelectExpression(hasIdColumn)}, user_id, message, rating, category, status, created_at
       FROM feedback
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [String(userId)],
    );

    return res.json({ feedback: result.rows });
  } catch (err) {
    logger.error("Error fetching my feedback:", err.message);
    return res.status(500).json({ error: "Failed to fetch feedback" });
  }
};

/**
 * POST /api/feedback
 * Submit new feedback. Body: { message, rating? (1-5), category?, subject? }
 */
exports.createFeedback = async (req, res) => {
  try {
    const schemaReady = await ensureFeedbackSchema();
    if (!schemaReady) {
      return res.status(503).json({
        error: "Feedback service unavailable",
        details: "Feedback table is not initialized",
      });
    }

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
    return res.status(500).json({ error: "Failed to submit feedback" });
  }
};
