const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parsePositiveInt, getScalarQueryValue, parseOptionalString } = require("../utils/parseHelpers");
const logger = require("../utils/logger");
const { attachTrustToPosts } = require("../services/trustBadgeService");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const RECENTLY_VIEWED_TTL_DAYS = Number.parseInt(
  process.env.RECENTLY_VIEWED_TTL_DAYS || "90",
  10,
);
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let recentlyViewedSchemaPromise = null;

function normalizeSource(value, fallback = null) {
  const scalar = getScalarQueryValue(value);
  if (scalar === undefined || scalar === null) return fallback;

  const normalized = String(scalar).trim().toLowerCase();
  return normalized || fallback;
}

function parseCursor(raw) {
  const normalized = parseOptionalString(raw);
  if (!normalized) return null;
  const [timestamp, id] = normalized.split("|");
  if (!timestamp || !id) return null;
  const parsedDate = new Date(timestamp);
  if (Number.isNaN(parsedDate.getTime())) return null;
  return { viewedAt: parsedDate.toISOString(), id: String(id).trim() };
}

function resolveSort(sort) {
  const normalized = String(sort || "recent").trim().toLowerCase();
  switch (normalized) {
    case "oldest":
      return { clause: "viewed_at ASC, cursor_id ASC", cursorDir: "asc" };
    case "price_low":
    case "price_asc":
      return { clause: "p.price ASC NULLS LAST, viewed_at DESC" };
    case "price_high":
    case "price_desc":
      return { clause: "p.price DESC NULLS LAST, viewed_at DESC" };
    case "most_viewed":
      return { clause: "view_count DESC, viewed_at DESC" };
    case "recent":
    default:
      return { clause: "viewed_at DESC, cursor_id DESC", cursorDir: "desc" };
  }
}

function normalizeIdForColumn(value, columnType) {
  const normalized = String(value ?? "").trim();
  if (!normalized) return null;

  const type = String(columnType || "").toLowerCase();
  if (["integer", "bigint", "smallint"].includes(type)) {
    if (!/^\d+$/.test(normalized)) return null;
    return normalized;
  }

  if (type === "uuid") {
    if (!UUID_REGEX.test(normalized)) return null;
    return normalized;
  }

  return normalized;
}

function buildIdWhereClause(schema, columnName, paramIndex) {
  const type = schema?.columnTypes?.get(columnName);
  if (type === "uuid") {
    return `${columnName} = $${paramIndex}::uuid`;
  }
  if (["integer", "bigint", "smallint"].includes(String(type).toLowerCase())) {
    return `${columnName} = $${paramIndex}::bigint`;
  }
  return `${columnName}::text = $${paramIndex}`;
}

function buildIdInsertPlaceholder(schema, columnName, paramIndex) {
  const type = schema?.columnTypes?.get(columnName);
  if (type === "uuid") {
    return `NULLIF($${paramIndex}, '')::uuid`;
  }
  if (["integer", "bigint", "smallint"].includes(String(type).toLowerCase())) {
    return `$${paramIndex}::bigint`;
  }
  return `$${paramIndex}::text`;
}

// parseOptionalString imported from parseHelpers

function normalizeUploadsPath(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) return null;

  const withForwardSlashes = normalized.replace(/\\/g, "/");
  if (withForwardSlashes.startsWith("/uploads/")) return withForwardSlashes;
  if (withForwardSlashes.startsWith("uploads/")) return `/${withForwardSlashes}`;

  const withoutFilePrefix = withForwardSlashes.replace(/^file:\/+/i, "/");
  const uploadsMatch = withoutFilePrefix.match(/(?:^|\/)uploads\/(.+)$/i);
  if (uploadsMatch?.[1]) {
    return `/uploads/${uploadsMatch[1].replace(/^\/+/, "")}`;
  }

  if (!withForwardSlashes.includes("/") && /^[^/]+\.[a-z0-9]{2,8}$/i.test(withForwardSlashes)) {
    return `/uploads/${withForwardSlashes}`;
  }

  if (withForwardSlashes.startsWith("http://") || withForwardSlashes.startsWith("https://")) {
    return withForwardSlashes;
  }

  return null;
}

function normalizeImagesPayload(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeUploadsPath(entry) || parseOptionalString(entry))
      .filter(Boolean);
  }

  const normalized = parseOptionalString(value);
  if (!normalized) return [];

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeUploadsPath(entry) || parseOptionalString(entry))
        .filter(Boolean);
    }
  } catch {
    // Keep original string fallback below.
  }

  const fallback = normalizeUploadsPath(normalized) || normalized;
  return fallback ? [fallback] : [];
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

function hasColumn(schema, columnName) {
  return Boolean(schema?.columns?.has(columnName));
}

function shouldRefreshSchema(error) {
  const code = String(error?.code || "");
  return ["42P01", "42703", "42P10", "42883"].includes(code);
}

async function getRecentlyViewedSchema(forceRefresh = false) {
  if (recentlyViewedSchemaPromise && !forceRefresh) {
    return recentlyViewedSchemaPromise;
  }

  recentlyViewedSchemaPromise = (async () => {
    try {
      const tableResult = await runQuery(
        `
          SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = 'recently_viewed'
          ) AS exists
        `,
      );

      const tableExists = Boolean(tableResult.rows?.[0]?.exists);
      if (!tableExists) {
        return { tableExists: false, columns: new Set(), columnTypes: new Map() };
      }

      const columnResult = await runQuery(
        `
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'recently_viewed'
        `,
      );

      const columns = new Set((columnResult.rows || []).map((row) => String(row.column_name)));
      const columnTypes = new Map(
        (columnResult.rows || []).map((row) => [String(row.column_name), String(row.data_type)])
      );
      return { tableExists: true, columns, columnTypes };
    } catch (error) {
      logger.warn("[RecentlyViewed] Failed to inspect schema", { message: error.message });
      return { tableExists: false, columns: new Set(), columnTypes: new Map() };
    }
  })();

  return recentlyViewedSchemaPromise;
}

function enforceUserAccess(req, res, { allowBodyOverride = false, allowQueryOverride = false } = {}) {
  const authenticatedUserId = getAuthenticatedUserId(req);
  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  const requestedBodyUserId = allowBodyOverride
    ? parseOptionalString(req.body?.userId || req.body?.user_id)
    : null;
  const requestedQueryUserId = allowQueryOverride
    ? parseOptionalString(req.query?.userId || req.query?.user_id)
    : null;

  if (
    (requestedBodyUserId && requestedBodyUserId !== authenticatedUserId) ||
    (requestedQueryUserId && requestedQueryUserId !== authenticatedUserId)
  ) {
    res.status(403).json({ error: "Cannot access another user history" });
    return null;
  }

  return authenticatedUserId;
}

function buildUpdateStatement(schema, source, postPrice) {
  const setClauses = [];
  const values = [];

  if (hasColumn(schema, "view_count")) {
    setClauses.push("view_count = COALESCE(view_count, 0) + 1");
  }
  if (hasColumn(schema, "viewed_at")) {
    setClauses.push("viewed_at = NOW()");
  }
  if (hasColumn(schema, "source")) {
    values.push(source || "allposts");
    setClauses.push(`source = $${values.length + 2}`);
  }

  if (hasColumn(schema, "price_at_view") && postPrice !== null && postPrice !== undefined) {
    values.push(postPrice);
    setClauses.push(`price_at_view = COALESCE(price_at_view, $${values.length + 2})`);
  }
  if (hasColumn(schema, "last_viewed_price") && postPrice !== null && postPrice !== undefined) {
    values.push(postPrice);
    setClauses.push(`last_viewed_price = $${values.length + 2}`);
  }
  if (hasColumn(schema, "expires_at")) {
    setClauses.push(`expires_at = NOW() + INTERVAL '${RECENTLY_VIEWED_TTL_DAYS} days'`);
  }

  if (!setClauses.length) {
    return null;
  }

  return {
    query: `
      UPDATE recently_viewed
      SET ${setClauses.join(", ")}
      WHERE ${buildIdWhereClause(schema, "user_id", 1)}
        AND ${buildIdWhereClause(schema, "post_id", 2)}
      RETURNING *
    `,
    values,
  };
}

function buildInsertStatement(schema, source, postPrice) {
  const fields = ["user_id", "post_id"];
  const placeholders = [
    buildIdInsertPlaceholder(schema, "user_id", 1),
    buildIdInsertPlaceholder(schema, "post_id", 2),
  ];
  const values = [];

  if (hasColumn(schema, "view_count")) {
    fields.push("view_count");
    placeholders.push("1");
  }
  if (hasColumn(schema, "viewed_at")) {
    fields.push("viewed_at");
    placeholders.push("NOW()");
  }
  if (hasColumn(schema, "source")) {
    fields.push("source");
    values.push(source || "allposts");
    placeholders.push(`$${values.length + 2}`);
  }

  if (hasColumn(schema, "price_at_view")) {
    fields.push("price_at_view");
    if (postPrice !== null && postPrice !== undefined) {
      values.push(postPrice);
      placeholders.push(`$${values.length + 2}`);
    } else {
      placeholders.push("NULL");
    }
  }
  if (hasColumn(schema, "last_viewed_price")) {
    fields.push("last_viewed_price");
    if (postPrice !== null && postPrice !== undefined) {
      values.push(postPrice);
      placeholders.push(`$${values.length + 2}`);
    } else {
      placeholders.push("NULL");
    }
  }
  if (hasColumn(schema, "expires_at")) {
    fields.push("expires_at");
    placeholders.push(`NOW() + INTERVAL '${RECENTLY_VIEWED_TTL_DAYS} days'`);
  }

  return {
    query: `
      INSERT INTO recently_viewed (${fields.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `,
    values,
  };
}

async function trackRecentlyViewed(userId, postId, source) {
  let schema = await getRecentlyViewedSchema();
  if (!schema.tableExists) {
    return { skipped: true, reason: "table-missing" };
  }

  const normalizedUserId = normalizeIdForColumn(
    userId,
    schema.columnTypes?.get("user_id"),
  );
  const normalizedPostId = normalizeIdForColumn(
    postId,
    schema.columnTypes?.get("post_id"),
  );

  if (!normalizedUserId || !normalizedPostId) {
    return { skipped: true, reason: "id-type-mismatch" };
  }

  let postPrice = null;
  try {
    const priceResult = await runQuery(
      "SELECT price FROM posts WHERE post_id::text = $1 LIMIT 1",
      [String(postId)],
    );
    if (priceResult.rows.length) {
      postPrice = priceResult.rows[0]?.price ?? null;
    }
  } catch {
    postPrice = null;
  }

  const attempt = async () => {
    const update = buildUpdateStatement(schema, source, postPrice);
    if (update) {
      const updateResult = await runQuery(update.query, [normalizedUserId, normalizedPostId, ...update.values]);
      if (updateResult.rows.length) {
        return updateResult.rows[0];
      }
    }

    const insert = buildInsertStatement(schema, source, postPrice);
    const insertResult = await runQuery(insert.query, [normalizedUserId, normalizedPostId, ...insert.values]);
    return insertResult.rows[0] || null;
  };

  try {
    const row = await attempt();
    return { skipped: false, row };
  } catch (error) {
    if (shouldRefreshSchema(error)) {
      schema = await getRecentlyViewedSchema(true);
      if (!schema.tableExists) {
        return { skipped: true, reason: "table-missing" };
      }
      const row = await attempt();
      return { skipped: false, row };
    }
    throw error;
  }
}

const addRecentlyViewed = async (req, res) => {
  const authenticatedUserId = getAuthenticatedUserId(req);
  const requestedBodyUserId = parseOptionalString(req.body?.userId || req.body?.user_id);

  if (!authenticatedUserId) {
    // optionalAuth route: skip silently for guest users
    return res.status(202).json({ success: true, skipped: true, reason: "guest" });
  }

  if (requestedBodyUserId && requestedBodyUserId !== authenticatedUserId) {
    return res.status(403).json({ error: "Cannot access another user history" });
  }

  const postId = req.body.postId || req.body.post_id;
  const source = normalizeSource(req.body.source, "allposts");

  if (!postId) {
    return res.status(400).json({ error: "postId required" });
  }

  try {
    const result = await trackRecentlyViewed(authenticatedUserId, postId, source);
    if (result.skipped) {
      return res.status(202).json({ success: true, skipped: true, reason: result.reason });
    }

    return res.json({ success: true, item: result.row || null });
  } catch (error) {
    logger.error("Add recently viewed error:", error);
    return res.status(500).json({ error: "Failed to track view" });
  }
};

const getRecentlyViewed = async (req, res) => {
  const userId = enforceUserAccess(req, res, { allowQueryOverride: true });
  const limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
  const page = parsePositiveInt(req.query.page, 1, 10_000);
  const source = normalizeSource(req.query.source);
  const search = parseOptionalString(req.query.search || req.query.q);
  const sort = resolveSort(req.query.sort);
  const cursor = parseCursor(req.query.cursor);

  if (!userId) return;

  try {
    const schema = await getRecentlyViewedSchema();
    if (!schema.tableExists) {
      return res.json({ items: [], total: 0, skipped: true, reason: "table-missing" });
    }

    if (hasColumn(schema, "expires_at")) {
      await runQuery(
        "DELETE FROM recently_viewed WHERE user_id::text = $1 AND expires_at <= NOW()",
        [String(userId)],
      );
    }

    const cursorIdExpr = hasColumn(schema, "id") ? "rv.id" : "rv.post_id::text";
    const viewedAtExpr = hasColumn(schema, "viewed_at")
      ? "rv.viewed_at"
      : hasColumn(schema, "created_at")
        ? "rv.created_at"
        : "p.created_at";
    const selectViewCount = hasColumn(schema, "view_count")
      ? "rv.view_count"
      : "1::integer AS view_count";
    const selectSource = hasColumn(schema, "source")
      ? "rv.source"
      : "NULL::text AS source";
    const selectPriceAtView = hasColumn(schema, "price_at_view")
      ? "rv.price_at_view"
      : "NULL::numeric AS price_at_view";
    const selectLastViewedPrice = hasColumn(schema, "last_viewed_price")
      ? "rv.last_viewed_price"
      : "NULL::numeric AS last_viewed_price";
    const selectExpiresAt = hasColumn(schema, "expires_at")
      ? "rv.expires_at"
      : "NULL::timestamptz AS expires_at";

    let query = `
      SELECT
        COUNT(*) OVER()::int AS total_count,
        ${cursorIdExpr} AS cursor_id,
        ${selectViewCount},
        ${viewedAtExpr} AS viewed_at,
        ${selectSource},
        ${selectPriceAtView},
        ${selectLastViewedPrice},
        ${selectExpiresAt},
        p.post_id,
        p.user_id,
        p.title,
        p.price,
        p.images,
        p.location,
        COALESCE(to_jsonb(p)->>'status', 'active') AS status,
        COALESCE(to_jsonb(p)->>'condition', '') AS condition,
        p.subcategory_id,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(pr.full_name, u.username) AS seller_name
      FROM recently_viewed rv
      JOIN posts p ON rv.post_id::text = p.post_id::text
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id::text = c.category_id::text
      LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
      WHERE rv.user_id::text = $1
    `;

    const params = [String(userId)];

    if (source && hasColumn(schema, "source")) {
      params.push(source);
      query += ` AND rv.source = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.title ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.location ILIKE $${params.length})`;
    }

    if (cursor && sort.cursorDir) {
      params.push(cursor.viewedAt);
      params.push(cursor.id);
      const dateParam = params.length - 1;
      const idParam = params.length;
      const operator = sort.cursorDir === "asc" ? ">" : "<";
      query += ` AND (${viewedAtExpr} ${operator} $${dateParam} OR (${viewedAtExpr} = $${dateParam} AND ${cursorIdExpr}::text ${operator} $${idParam}))`;
    }

    const offset = (page - 1) * limit;
    const useOffset = !cursor || !sort.cursorDir;
    query += ` ORDER BY ${sort.clause}`;
    if (useOffset) {
      params.push(offset);
      params.push(limit + 1);
      query += ` OFFSET $${params.length - 1} LIMIT $${params.length}`;
    } else {
      params.push(limit + 1);
      query += ` LIMIT $${params.length}`;
    }

    const result = await runQuery(query, params);
    const rows = result.rows || [];
    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;

    const items = sliced.map((row) => {
      const images = normalizeImagesPayload(row.images);
      const currentPrice = Number(row.price ?? 0);
      const priceAtView = row.price_at_view !== null && row.price_at_view !== undefined
        ? Number(row.price_at_view)
        : row.last_viewed_price !== null && row.last_viewed_price !== undefined
          ? Number(row.last_viewed_price)
          : null;
      const priceDelta =
        priceAtView !== null && Number.isFinite(currentPrice)
          ? currentPrice - priceAtView
          : null;
      const priceChanged =
        priceAtView !== null && Number.isFinite(currentPrice) && priceDelta !== 0;
      const priceDropped =
        priceAtView !== null && Number.isFinite(currentPrice) && priceDelta < 0;

      return {
        ...row,
        images,
        image_url: normalizeUploadsPath(row.image_url) || images[0] || "/placeholder.svg",
        price_at_view: priceAtView,
        price_changed: priceChanged,
        price_delta: priceDelta,
        price_drop: priceDropped,
      };
    });
    const enrichedItems = await attachTrustToPosts(items);
    const last = enrichedItems[enrichedItems.length - 1];
    const nextCursor =
      last?.viewed_at && last?.cursor_id
        ? `${new Date(last.viewed_at).toISOString()}|${last.cursor_id}`
        : null;
    const total = sliced.length
      ? Number(sliced[0]?.total_count || 0)
      : 0;

    return res.json({
      items: enrichedItems,
      total,
      limit,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    logger.error("Get recently viewed error:", error);
    return res.status(500).json({ error: "Failed to get history" });
  }
};

const clearHistory = async (req, res) => {
  const userId = enforceUserAccess(req, res, {
    allowQueryOverride: true,
    allowBodyOverride: true,
  });

  if (!userId) return;

  try {
    const schema = await getRecentlyViewedSchema();
    if (!schema.tableExists) {
      return res.json({ message: "History cleared" });
    }

    await runQuery("DELETE FROM recently_viewed WHERE user_id::text = $1", [String(userId)]);
    return res.json({ message: "History cleared" });
  } catch (error) {
    logger.error("Clear history error:", error);
    return res.status(500).json({ error: "Failed to clear history" });
  }
};

const removeFromHistory = async (req, res) => {
  const userId = enforceUserAccess(req, res, {
    allowQueryOverride: true,
    allowBodyOverride: true,
  });

  const { postId } = req.params;
  if (!userId) return;

  try {
    const schema = await getRecentlyViewedSchema();
    if (!schema.tableExists) {
      return res.json({ message: "Removed from history" });
    }

    await runQuery(
      "DELETE FROM recently_viewed WHERE user_id::text = $1 AND post_id::text = $2",
      [String(userId), String(postId)],
    );

    return res.json({ message: "Removed from history" });
  } catch (error) {
    logger.error("Remove from history error:", error);
    return res.status(500).json({ error: "Failed to remove" });
  }
};

const bulkRemoveFromHistory = async (req, res) => {
  const userId = enforceUserAccess(req, res, {
    allowQueryOverride: true,
    allowBodyOverride: true,
  });
  if (!userId) return;

  const postIds = Array.isArray(req.body?.postIds || req.body?.post_ids)
    ? req.body.postIds || req.body.post_ids
    : [];
  const normalized = postIds
    .map((value) => parseOptionalString(value))
    .filter(Boolean);

  if (!normalized.length) {
    return res.status(400).json({ error: "postIds required" });
  }

  try {
    const schema = await getRecentlyViewedSchema();
    if (!schema.tableExists) {
      return res.json({ message: "Removed from history", removed: 0 });
    }

    await runQuery(
      "DELETE FROM recently_viewed WHERE user_id::text = $1 AND post_id::text = ANY($2::text[])",
      [String(userId), normalized],
    );

    return res.json({ message: "Removed from history", removed: normalized.length });
  } catch (error) {
    logger.error("Bulk remove history error:", error);
    return res.status(500).json({ error: "Failed to remove history items" });
  }
};

const getViewersForPost = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const postId = parseOptionalString(req.params?.postId);
  if (!postId) {
    return res.status(400).json({ error: "Post ID is required" });
  }

  try {
    const postCheck = await runQuery(
      "SELECT user_id FROM posts WHERE post_id = $1",
      [postId],
    );
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }
    if (String(postCheck.rows[0].user_id) !== String(userId)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const schema = await getRecentlyViewedSchema();
    if (!schema.tableExists) {
      return res.json({
        viewers: [],
        total: 0,
        warning: "recently_viewed table is missing",
      });
    }

    const limit = parsePositiveInt(req.query?.limit, 200, 1000);
    const viewedAtExpr = hasColumn(schema, "viewed_at")
      ? "rv.viewed_at"
      : hasColumn(schema, "created_at")
        ? "rv.created_at"
        : "NULL::timestamp AS viewed_at";
    const viewCountExpr = hasColumn(schema, "view_count")
      ? "rv.view_count"
      : "NULL::int AS view_count";
    const orderExpr = hasColumn(schema, "viewed_at")
      ? "rv.viewed_at"
      : hasColumn(schema, "created_at")
        ? "rv.created_at"
        : "rv.user_id";

    const result = await runQuery(
      `
        SELECT
          rv.user_id AS viewer_id,
          ${viewCountExpr},
          ${viewedAtExpr},
          COALESCE(
            NULLIF(to_jsonb(pr)->>'full_name',''),
            NULLIF(to_jsonb(u)->>'username',''),
            'User'
          ) AS viewer_name
        FROM recently_viewed rv
        JOIN users u ON u.user_id::text = rv.user_id::text
        LEFT JOIN profiles pr ON pr.user_id::text = u.user_id::text
        WHERE rv.post_id::text = $1
        ORDER BY ${orderExpr} DESC
        LIMIT $2
      `,
      [String(postId), limit],
    );

    return res.json({
      viewers: result.rows,
      total: result.rows.length,
      limit,
    });
  } catch (error) {
    logger.error("[RecentlyViewed] Fetch viewers error:", error);
    if (shouldRefreshSchema(error)) {
      await getRecentlyViewedSchema(true);
    }
    return res.status(500).json({ error: "Failed to fetch viewers" });
  }
};

module.exports = {
  addRecentlyViewed,
  getRecentlyViewed,
  clearHistory,
  removeFromHistory,
  bulkRemoveFromHistory,
  getViewersForPost,
};
