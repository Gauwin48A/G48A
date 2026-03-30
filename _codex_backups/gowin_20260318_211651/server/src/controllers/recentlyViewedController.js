const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const { parsePositiveInt, getScalarQueryValue, parseOptionalString } = require("../utils/parseHelpers");
const logger = require("../utils/logger");

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let recentlyViewedSchemaPromise = null;

function normalizeSource(value, fallback = null) {
  const scalar = getScalarQueryValue(value);
  if (scalar === undefined || scalar === null) return fallback;

  const normalized = String(scalar).trim().toLowerCase();
  return normalized || fallback;
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

function buildUpdateStatement(schema, source) {
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

function buildInsertStatement(schema, source) {
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

  const attempt = async () => {
    const update = buildUpdateStatement(schema, source);
    if (update) {
      const updateResult = await runQuery(update.query, [normalizedUserId, normalizedPostId, ...update.values]);
      if (updateResult.rows.length) {
        return updateResult.rows[0];
      }
    }

    const insert = buildInsertStatement(schema, source);
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
  const source = normalizeSource(req.query.source);

  if (!userId) return;

  try {
    const schema = await getRecentlyViewedSchema();
    if (!schema.tableExists) {
      return res.json({ items: [], total: 0, skipped: true, reason: "table-missing" });
    }

    const selectId = hasColumn(schema, "id") ? "rv.id" : "NULL::bigint AS id";
    const selectViewCount = hasColumn(schema, "view_count")
      ? "rv.view_count"
      : "1::integer AS view_count";
    const selectViewedAt = hasColumn(schema, "viewed_at")
      ? "rv.viewed_at"
      : "p.created_at AS viewed_at";
    const selectSource = hasColumn(schema, "source")
      ? "rv.source"
      : "NULL::text AS source";

    let query = `
      SELECT
        ${selectId},
        ${selectViewCount},
        ${selectViewedAt},
        ${selectSource},
        p.post_id,
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
      query += ` AND rv.source = $2`;
      params.push(source);
    }

    const orderBy = hasColumn(schema, "viewed_at") ? "rv.viewed_at DESC" : "p.created_at DESC";
    query += ` ORDER BY ${orderBy} LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await runQuery(query, params);
    const items = result.rows.map((row) => {
      const images = normalizeImagesPayload(row.images);
      return {
        ...row,
        images,
        image_url: normalizeUploadsPath(row.image_url) || images[0] || "/placeholder.svg",
      };
    });

    return res.json({ items, total: items.length });
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
            NULLIF(u.email,''),
            'User'
          ) AS viewer_name,
          u.email,
          COALESCE(
            NULLIF(to_jsonb(u)->>'phone_number',''),
            NULLIF(to_jsonb(u)->>'phone',''),
            NULLIF(to_jsonb(pr)->>'phone','')
          ) AS phone
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
  getViewersForPost,
};
