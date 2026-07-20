const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const translateText = async (text, sourceLang, targetLang) => {
  const fetchFn = resolveFetch();
  if (fetchFn) {
    try {
      const translated = await translateViaGoogle(text, sourceLang, targetLang, fetchFn);
      if (translated && translated !== text) {
        return translated;
      }
    } catch (err) {
      logger.warn(`[Translation] Google translate failed for "${text.slice(0, 20)}":`, err.message || err);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  return `[${targetLang.toUpperCase()}] ${text}`;
};

const TRANSLATE_TEXT_MAX_CHARS = 4000;
const TRANSLATE_BATCH_MAX_ITEMS =
  Number.parseInt(process.env.TRANSLATE_BATCH_MAX_ITEMS, 10) || 40;
const TRANSLATE_BATCH_MAX_TOTAL_CHARS =
  Number.parseInt(process.env.TRANSLATE_BATCH_MAX_TOTAL_CHARS, 10) || 8000;

const resolveFetch = () => {
  if (typeof fetch === "function") return fetch;
  try {
    // eslint-disable-next-line global-require
    return require("node-fetch");
  } catch {
    return null;
  }
};

const parseGoogleTranslateResponse = (data, fallback) => {
  if (Array.isArray(data?.[0])) {
    let translated = "";
    data[0].forEach((item) => {
      if (item?.[0]) translated += item[0];
    });
    if (translated) return translated;
  }
  return fallback;
};

const normalizeLang = (value, fallback = "auto") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  return normalized.split("-")[0] || fallback;
};

const mapWithConcurrency = async (items, mapper, concurrency = 5) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results = new Array(items.length);
  let nextIndex = 0;

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await mapper(items[currentIndex], currentIndex);
      }
    },
  );

  await Promise.all(workers);
  return results;
};

const translateViaGoogle = async (text, sourceLang, targetLang, fetchFn) => {
  const params = new URLSearchParams({
    client: "gtx",
    sl: sourceLang,
    tl: targetLang,
    dt: "t",
  });
  params.append("q", text);

  const response = await fetchFn(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`
  );
  if (!response.ok) {
    throw new Error("Translation upstream error.");
  }
  const data = await response.json();
  return parseGoogleTranslateResponse(data, text);
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
            target_lang: item.target_lang,
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

      await runQuery(
        `
        INSERT INTO translations (entity_type, entity_id, language, field, value)
        SELECT 'post', s.post_id::text, s.target_lang, 'title', s.translated_text
        FROM jsonb_to_recordset($1::jsonb) AS s(post_id bigint, target_lang text, translated_text text)
        ON CONFLICT ON CONSTRAINT unique_translation
        DO UPDATE SET value = EXCLUDED.value
        `,
        [
          JSON.stringify(
            successRecords.map(({ post_id, target_lang, translated_text }) => ({
              post_id,
              target_lang,
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
  translateOnDemand: async (req, res) => {
    const rawText = req.body?.text ?? req.body?.q ?? req.query?.q ?? "";
    const text = typeof rawText === "string" ? rawText.trim() : String(rawText || "");
    const targetLang = normalizeLang(req.body?.targetLang ?? req.body?.tl ?? req.query?.tl, "en");
    const sourceLang = normalizeLang(req.body?.sourceLang ?? req.body?.sl ?? req.query?.sl, "auto");

    if (!text) {
      return res.status(400).json({ error: "Text is required for translation." });
    }
    if (text.length > TRANSLATE_TEXT_MAX_CHARS) {
      return res.status(413).json({ error: "Text exceeds translation limit." });
    }

    const fetchFn = resolveFetch();
    if (!fetchFn) {
      return res.status(500).json({ error: "Translation service unavailable." });
    }

    try {
      const translatedText = await translateViaGoogle(
        text,
        sourceLang,
        targetLang,
        fetchFn
      );
      return res.json({
        success: true,
        translatedText,
        targetLang,
        sourceLang,
      });
    } catch (error) {
      logger.warn("[Translation] On-demand translate failed:", error?.message || error);
      return res.status(502).json({ error: "Translation failed." });
    }
  },
  translateBatchOnDemand: async (req, res) => {
    const rawTexts = req.body?.texts ?? req.body?.q ?? [];
    const texts = Array.isArray(rawTexts)
      ? rawTexts.map((value) =>
          typeof value === "string" ? value : String(value ?? "")
        )
      : [];
    const targetLang = normalizeLang(
      req.body?.targetLang ?? req.body?.tl ?? req.query?.tl,
      "en"
    );
    const sourceLang = normalizeLang(
      req.body?.sourceLang ?? req.body?.sl ?? req.query?.sl,
      "auto"
    );

    if (texts.length === 0) {
      return res.status(400).json({ error: "Texts are required for translation." });
    }
    if (texts.length > TRANSLATE_BATCH_MAX_ITEMS) {
      return res.status(413).json({ error: "Too many texts in translation batch." });
    }

    let totalChars = 0;
    for (const text of texts) {
      const length = text.length;
      if (length > TRANSLATE_TEXT_MAX_CHARS) {
        return res.status(413).json({ error: "Text exceeds translation limit." });
      }
      totalChars += length;
    }
    if (totalChars > TRANSLATE_BATCH_MAX_TOTAL_CHARS) {
      return res.status(413).json({ error: "Translation batch too large." });
    }

    const fetchFn = resolveFetch();
    if (!fetchFn) {
      return res.status(500).json({ error: "Translation service unavailable." });
    }

    const concurrency =
      Number.parseInt(process.env.TRANSLATION_CONCURRENCY, 10) || 5;

    try {
      const translations = await mapWithConcurrency(
        texts,
        async (value) => {
          if (!value) return value;
          try {
            return await translateViaGoogle(value, sourceLang, targetLang, fetchFn);
          } catch (error) {
            logger.warn(
              "[Translation] Batch item failed:",
              error?.message || error
            );
            return value;
          }
        },
        concurrency
      );

      return res.json({
        success: true,
        translations,
        targetLang,
        sourceLang,
      });
    } catch (error) {
      logger.warn("[Translation] Batch translate failed:", error?.message || error);
      return res.status(502).json({ error: "Translation failed." });
    }
  },
};
