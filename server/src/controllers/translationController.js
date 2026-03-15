const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const translateText = async (text, sourceLang, targetLang) => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return `[${targetLang.toUpperCase()}] ${text}`;
};

/**
 * Queue a post for translation.
 * Inserts a row into translation_queue with 'pending' status.
 * Uses ON CONFLICT DO NOTHING to avoid duplicate entries.
 * @param {number|string} postId - The post ID to translate
 * @param {string} text - Source text to translate
 * @param {string} [sourceLang="en"] - Source language code
 * @param {string} [targetLang="hi"] - Target language code
 * @returns {Promise<boolean>} true on success, false on error
 */
const queueTranslation = async (postId, text, sourceLang = "en", targetLang = "hi") => {
  try {
    await runQuery(
      `
      INSERT INTO translation_queue (post_id, source_text, source_lang, target_lang, status, created_at)
      VALUES ($1, $2, $3, $4, 'pending', NOW())
      ON CONFLICT DO NOTHING
      `,
      [postId, text, sourceLang, targetLang]
    );
    logger.info(`[Translation] Queued post ${postId} for translation`);
    return true;
  } catch (error) {
    logger.error("[Translation] Queue error:", error);
    return false;
  }
};

/**
 * Process a batch of pending translations from the queue.
 * Picks up to BATCH_SIZE pending items, translates them concurrently
 * (limited by TRANSLATION_CONCURRENCY), and updates both the queue
 * and the posts table with translated text.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const processTranslations = async (req, res) => {
  const BATCH_SIZE = 50;
  const MAX_RETRIES = 3;
  const TRANSLATION_CONCURRENCY =
    Number.parseInt(process.env.TRANSLATION_CONCURRENCY, 10) || 5;

  try {
    const pending = await runQuery(
      `
      SELECT queue_id, post_id, source_text, source_lang, target_lang, retry_count
      FROM translation_queue
      WHERE status = 'pending' AND retry_count < $1
      ORDER BY created_at ASC
      LIMIT $2
      `,
      [MAX_RETRIES, BATCH_SIZE]
    );

    if (pending.rows.length === 0) {
      return res.json({ message: "No pending translations", processed: 0 });
    }

    logger.info(`[Translation] Processing ${pending.rows.length} items`);

    let successCount = 0;
    let failCount = 0;

    const queueIds = pending.rows.map((r) => r.queue_id);
    await runQuery(
      `
      UPDATE translation_queue SET status = 'processing' WHERE queue_id = ANY($1)
      `,
      [queueIds]
    );

    const successRecords = [];
    const failedQueueIds = [];

    for (let i = 0; i < pending.rows.length; i += TRANSLATION_CONCURRENCY) {
      const batch = pending.rows.slice(i, i + TRANSLATION_CONCURRENCY);
      const outcomes = await Promise.allSettled(
        batch.map((item) =>
          translateText(item.source_text, item.source_lang, item.target_lang)
        )
      );

      for (let j = 0; j < batch.length; j += 1) {
        const item = batch[j];
        const outcome = outcomes[j];

        if (outcome.status === "fulfilled") {
          successRecords.push({
            queue_id: item.queue_id,
            post_id: item.post_id,
            translated_text: outcome.value,
          });
          successCount += 1;
        } else {
          logger.error(
            `[Translation] Failed for queue ${item.queue_id}:`,
            outcome.reason
          );
          failedQueueIds.push(item.queue_id);
          failCount += 1;
        }
      }
    }

    if (successRecords.length > 0) {
      await runQuery(
        `
        UPDATE translation_queue q
        SET status = 'completed',
            translated_text = s.translated_text,
            processed_at = NOW()
        FROM jsonb_to_recordset($1::jsonb) AS s(queue_id bigint, translated_text text)
        WHERE q.queue_id = s.queue_id
        `,
        [
          JSON.stringify(
            successRecords.map(({ queue_id, translated_text }) => ({
              queue_id,
              translated_text,
            }))
          ),
        ]
      );

      await runQuery(
        `
        UPDATE posts p
        SET translated_title = s.translated_text
        FROM jsonb_to_recordset($1::jsonb) AS s(post_id bigint, translated_text text)
        WHERE p.post_id = s.post_id
        `,
        [
          JSON.stringify(
            successRecords.map(({ post_id, translated_text }) => ({
              post_id,
              translated_text,
            }))
          ),
        ]
      );
    }

    if (failedQueueIds.length > 0) {
      await runQuery(
        `
        UPDATE translation_queue
        SET status = 'pending', retry_count = retry_count + 1
        WHERE queue_id = ANY($1::bigint[])
        `,
        [failedQueueIds]
      );
    }

    logger.info(
      `[Translation] Completed: ${successCount} success, ${failCount} failed`
    );
    res.json({
      message: "Translation batch processed",
      processed: successCount,
      failed: failCount,
      total: pending.rows.length,
    });
  } catch (error) {
    logger.error("[Translation] Process error:", error);
    res.status(500).json({ error: "Translation processing failed" });
  }
};

/**
 * Get the translation status for a specific post.
 * Returns the most recent queue entry for the given post ID.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getTranslationStatus = async (req, res) => {
  const { postId } = req.params;

  try {
    const result = await runQuery(
      `
      SELECT status, translated_text, processed_at
      FROM translation_queue
      WHERE post_id = $1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [postId]
    );

    if (result.rows.length === 0) {
      return res.json({ status: "not_queued" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error("[Translation] Status error:", error);
    res.status(500).json({ error: "Failed to get status" });
  }
};

/**
 * Get aggregate statistics for the translation queue.
 * Returns counts grouped by status and the number of pending items.
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @returns {Promise<void>}
 */
const getQueueStats = async (req, res) => {
  try {
    const result = await runQuery(
      `
      WITH grouped AS (
        SELECT status, COUNT(*)::int AS count
        FROM translation_queue
        GROUP BY status
      )
      SELECT
        COALESCE((SELECT json_agg(grouped) FROM grouped), '[]'::json) AS stats,
        COALESCE((SELECT count FROM grouped WHERE status = 'pending'), 0) AS pending_count
      `
    );

    const payload = result.rows[0] || {};
    res.json({
      stats: Array.isArray(payload.stats) ? payload.stats : [],
      pendingCount: Number.parseInt(payload.pending_count, 10) || 0,
    });
  } catch (error) {
    logger.error("[Translation] Stats error:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
};

module.exports = {
  queueTranslation,
  processTranslations,
  getTranslationStatus,
  getQueueStats,
};
