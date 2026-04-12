const { runQuery } = require("../utils/dbHelpers");
const logger = require("../utils/logger");

const DEFAULT_BATCH_LIMIT = Number.parseInt(
  process.env.BATCH_VIEW_MAX_IDS || "500",
  10
);
const DEFAULT_FLUSH_INTERVAL_MS = Number.parseInt(
  process.env.BATCH_VIEW_FLUSH_INTERVAL_MS || "250",
  10
);
const DEFAULT_MAX_BUFFERED_KEYS = Number.parseInt(
  process.env.BATCH_VIEW_MAX_BUFFERED_KEYS || "5000",
  10
);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NUMERIC_RE = /^\d+$/;

let postIdType = null;
let postIdTypePromise = null;

const normalizePostIdType = (row) => {
  const dataType = String(row?.data_type || row?.udt_name || "")
    .trim()
    .toLowerCase();
  if (dataType === "uuid") return "uuid";
  if (dataType === "integer" || dataType === "int4") return "integer";
  if (dataType === "bigint" || dataType === "int8") return "bigint";
  return "text";
};

const detectPostIdType = async () => {
  try {
    const result = await runQuery(
      `
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'posts'
        AND column_name = 'post_id'
      LIMIT 1
      `
    );
    return normalizePostIdType(result.rows?.[0]);
  } catch (err) {
    logger.warn("[PostViewBuffer] Failed to detect post_id type, defaulting to text", {
      message: err.message,
    });
    return "text";
  }
};

const getPostIdType = async () => {
  if (postIdType) return postIdType;
  if (!postIdTypePromise) {
    postIdTypePromise = detectPostIdType()
      .then((type) => {
        postIdType = type;
        return type;
      })
      .finally(() => {
        postIdTypePromise = null;
      });
  }
  return postIdTypePromise;
};

const isValidPostId = (value, idType) => {
  if (idType === "uuid") return UUID_RE.test(value);
  if (idType === "integer" || idType === "bigint") return NUMERIC_RE.test(value);
  return UUID_RE.test(value) || NUMERIC_RE.test(value);
};

const pendingCounts = new Map();
let flushTimer = null;
let flushInProgress = false;
let droppedDueToBufferLimit = 0;

/**
 * Validate and deduplicate an array of post UUIDs.
 * @param {string[]} postIds - Raw post IDs
 * @param {number} [limit] - Maximum number of IDs to return
 * @returns {string[]} Sanitised, deduplicated post IDs
 */
function sanitizePostIds(postIds, limit = DEFAULT_BATCH_LIMIT, idType = "uuid") {
  if (!Array.isArray(postIds) || postIds.length === 0) return [];

  const out = [];
  const seen = new Set();

  for (const rawId of postIds) {
    if (out.length >= limit) break;
    const id = String(rawId || "").trim().toLowerCase();
    if (!id || seen.has(id) || !isValidPostId(id, idType)) continue;
    seen.add(id);
    out.push(id);
  }

  return out;
}

/**
 * Return current buffer statistics (size, flush state, drops).
 * @returns {{bufferedPostCount: number, flushInProgress: boolean, flushScheduled: boolean, droppedDueToBufferLimit: number}}
 */
function getQueueStats() {
  return {
    bufferedPostCount: pendingCounts.size,
    flushInProgress,
    flushScheduled: Boolean(flushTimer),
    droppedDueToBufferLimit,
  };
}

/**
 * Merge a count map back into the pending buffer (used on flush failure).
 * @param {Map<string, number>} countMap
 */
function mergeBackCounts(countMap) {
  for (const [postId, increment] of countMap.entries()) {
    const current = pendingCounts.get(postId) || 0;
    if (
      pendingCounts.size >= DEFAULT_MAX_BUFFERED_KEYS &&
      !pendingCounts.has(postId)
    ) {
      droppedDueToBufferLimit += 1;
      continue;
    }
    pendingCounts.set(postId, current + increment);
  }
}

/**
 * Write a map of post-id -> increment pairs to the database in a single UPDATE.
 * @param {Map<string, number>} countMap - Post IDs and their view increments
 * @returns {Promise<{updatedRows: number, flushedIds: number}>}
 */
async function flushCountMap(countMap, idType) {
  if (!countMap || countMap.size === 0) return { updatedRows: 0, flushedIds: 0 };

  const ids = [];
  const increments = [];

  for (const [postId, increment] of countMap.entries()) {
    ids.push(postId);
    increments.push(Number(increment) || 1);
  }

  const resolvedType = idType || "uuid";
  let sql = "";

  if (resolvedType === "uuid") {
    sql = `
      UPDATE posts p
      SET views = COALESCE(p.views, 0) + v.increment
      FROM (
        SELECT * FROM UNNEST($1::uuid[], $2::int[])
      ) AS v(post_id, increment)
      WHERE p.post_id = v.post_id
    `;
  } else if (resolvedType === "integer" || resolvedType === "bigint") {
    sql = `
      UPDATE posts p
      SET views = COALESCE(p.views, 0) + v.increment
      FROM (
        SELECT * FROM UNNEST($1::bigint[], $2::int[])
      ) AS v(post_id, increment)
      WHERE p.post_id = v.post_id
    `;
  } else {
    sql = `
      UPDATE posts p
      SET views = COALESCE(p.views, 0) + v.increment
      FROM (
        SELECT * FROM UNNEST($1::text[], $2::int[])
      ) AS v(post_id, increment)
      WHERE p.post_id::text = v.post_id
    `;
  }

  const result = await runQuery(sql, [ids, increments]);

  return { updatedRows: result.rowCount || 0, flushedIds: ids.length };
}

function clearFlushTimer() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}

function scheduleFlush() {
  if (flushTimer || flushInProgress || pendingCounts.size === 0) return false;

  flushTimer = setTimeout(() => {
    void flushNow();
  }, DEFAULT_FLUSH_INTERVAL_MS);

  if (typeof flushTimer.unref === "function") {
    flushTimer.unref();
  }

  return true;
}

/**
 * Immediately flush all buffered view counts to the database.
 * Re-queues counts on failure so they are not lost.
 * @returns {Promise<{updatedRows: number, flushedIds: number, failed?: boolean, error?: string}>}
 */
async function flushNow() {
  if (flushInProgress) return { skipped: "already_flushing" };
  if (pendingCounts.size === 0) return { updatedRows: 0, flushedIds: 0 };

  flushInProgress = true;
  clearFlushTimer();

  const snapshot = new Map(pendingCounts);
  pendingCounts.clear();

  try {
    const idType = await getPostIdType();
    const result = await flushCountMap(snapshot, idType);
    return { ...result, failed: false };
  } catch (err) {
    mergeBackCounts(snapshot);
    logger.warn("[PostViewBuffer] Flush failed; increments re-queued", {
      message: err.message,
      bufferedPostCount: pendingCounts.size,
    });
    return {
      updatedRows: 0,
      flushedIds: snapshot.size,
      failed: true,
      error: err.message,
    };
  } finally {
    flushInProgress = false;
    if (pendingCounts.size > 0) {
      scheduleFlush();
    }
  }
}

/**
 * Enqueue one or more post IDs for a batched view-count increment.
 * In sync mode the update is written immediately; otherwise it is buffered.
 * @param {string[]} postIds - Post UUIDs to increment
 * @param {object} [options={}]
 * @param {boolean} [options.syncMode] - Write immediately instead of buffering
 * @param {number} [options.limit] - Override the max batch size
 * @returns {Promise<{mode: string, queued: number, skipped: number, updated: number, flushScheduled: boolean}>}
 */
async function enqueueBatchView(postIds, options = {}) {
  const syncMode =
    options.syncMode === true ||
    process.env.BATCH_VIEW_SYNC_MODE === "true";

  const idType = await getPostIdType();
  const sanitized = sanitizePostIds(
    postIds,
    options.limit || DEFAULT_BATCH_LIMIT,
    idType
  );

  if (sanitized.length === 0) {
    return {
      mode: syncMode ? "sync" : "async",
      queued: 0,
      skipped: Array.isArray(postIds) ? postIds.length : 0,
      updated: 0,
      flushScheduled: false,
    };
  }

  if (syncMode) {
    const countMap = new Map();
    for (const postId of sanitized) {
      countMap.set(postId, (countMap.get(postId) || 0) + 1);
    }
    const flushResult = await flushCountMap(countMap, idType);
    return {
      mode: "sync",
      queued: sanitized.length,
      skipped: Math.max(
        0,
        (Array.isArray(postIds) ? postIds.length : sanitized.length) -
          sanitized.length
      ),
      updated: flushResult.updatedRows,
      flushScheduled: false,
    };
  }

  let queued = 0;
  for (const postId of sanitized) {
    if (
      pendingCounts.size >= DEFAULT_MAX_BUFFERED_KEYS &&
      !pendingCounts.has(postId)
    ) {
      droppedDueToBufferLimit += 1;
      continue;
    }
    pendingCounts.set(postId, (pendingCounts.get(postId) || 0) + 1);
    queued += 1;
  }

  const flushScheduled = scheduleFlush();
  return {
    mode: "async",
    queued,
    skipped: Math.max(
      0,
      (Array.isArray(postIds) ? postIds.length : queued) - queued
    ),
    updated: 0,
    flushScheduled,
  };
}

/**
 * Reset internal state (for test isolation only).
 */
function resetForTests() {
  clearFlushTimer();
  flushInProgress = false;
  droppedDueToBufferLimit = 0;
  pendingCounts.clear();
  postIdType = null;
  postIdTypePromise = null;
}

module.exports = {
  enqueueBatchView,
  flushNow,
  getQueueStats,
  sanitizePostIds,
  resetForTests,
};
