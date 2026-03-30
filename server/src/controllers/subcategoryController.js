const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");
const { runQuery } = require("../utils/dbHelpers");
const { CATEGORY_GROUP_SQL } = require("../utils/categoryGroupSql");

const SUBCATEGORY_CACHE_TTL_SECONDS =
  Number.parseInt(process.env.SUBCATEGORY_CACHE_TTL_SECONDS, 10) || 300;

/**
 * GET /api/subcategories
 * Fetch all subcategories, optionally filtered by category_id.
 * Results are cached per category_id with stampede protection.
 */
exports.getSubcategories = async (req, res) => {
  try {
    const categoryId = req.query.category_id || req.query.categoryId || null;
    const cacheKey = categoryId
      ? `subcategories:cat:${categoryId}`
      : "subcategories:all";

    const rows = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        let query = `
          SELECT
            s.subcategory_id,
            s.category_id,
            s.name,
            s.description,
            s.icon_url,
            s.display_order,
            NULLIF(to_jsonb(s)->>'seo_slug', '') AS seo_slug,
            COALESCE(to_jsonb(s)->'search_keywords', '[]'::jsonb) AS search_keywords,
            COALESCE(NULLIF(to_jsonb(s)->>'featured', '')::boolean, FALSE) AS featured,
            COALESCE(NULLIF(to_jsonb(s)->>'popularity_score', '')::int, 0) AS popularity_score,
            c.name AS category_name,
            COALESCE(pc.post_count, 0)::int AS post_count
          FROM subcategories s
          JOIN categories c ON s.category_id = c.category_id
          LEFT JOIN (
            SELECT subcategory_id, COUNT(*)::int AS post_count
            FROM posts
            WHERE status = 'active'
            GROUP BY subcategory_id
          ) pc ON pc.subcategory_id = s.subcategory_id
          WHERE s.is_active = TRUE
        `;
        const params = [];

        if (categoryId) {
          params.push(categoryId);
          query += ` AND s.category_id = $1`;
        }

        query += ` ORDER BY s.display_order ASC, s.name ASC`;

        const result = await runQuery(query, params);
        return result.rows;
      },
      SUBCATEGORY_CACHE_TTL_SECONDS,
    );

    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    res.json(rows);
  } catch (err) {
    logger.error("Error fetching subcategories:", err);
    res.status(500).json({
      code: 500,
      message: "Failed to fetch subcategories",
      details: err.message,
    });
  }
};

/**
 * GET /api/subcategories/grouped
 * Returns all subcategories grouped by their parent category.
 */
exports.getSubcategoriesGrouped = async (req, res) => {
  try {
    const rows = await cacheService.getOrSetWithStampedeProtection(
      "subcategories:grouped",
      async () => {
        const result = await runQuery(`
          SELECT
            s.subcategory_id,
            s.category_id,
            s.name,
            s.description,
            s.icon_url,
            s.display_order,
            NULLIF(to_jsonb(s)->>'seo_slug', '') AS seo_slug,
            COALESCE(to_jsonb(s)->'search_keywords', '[]'::jsonb) AS search_keywords,
            COALESCE(NULLIF(to_jsonb(s)->>'featured', '')::boolean, FALSE) AS featured,
            COALESCE(NULLIF(to_jsonb(s)->>'popularity_score', '')::int, 0) AS popularity_score,
            c.name AS category_name,
            COALESCE(pc.post_count, 0)::int AS post_count
          FROM subcategories s
          JOIN categories c ON s.category_id = c.category_id
          LEFT JOIN (
            SELECT subcategory_id, COUNT(*)::int AS post_count
            FROM posts
            WHERE status = 'active'
            GROUP BY subcategory_id
          ) pc ON pc.subcategory_id = s.subcategory_id
          WHERE s.is_active = TRUE
          ORDER BY c.name ASC, s.display_order ASC, s.name ASC
        `);
        return result.rows;
      },
      SUBCATEGORY_CACHE_TTL_SECONDS,
    );

    // Group by category
    const grouped = {};
    for (const row of rows || []) {
      const catKey = row.category_name || `cat_${row.category_id}`;
      if (!grouped[catKey]) {
        grouped[catKey] = {
          category_id: row.category_id,
          category_name: row.category_name,
          subcategories: [],
        };
      }
      grouped[catKey].subcategories.push({
        subcategory_id: row.subcategory_id,
        name: row.name,
        description: row.description,
        icon_url: row.icon_url,
        seo_slug: row.seo_slug,
        search_keywords: Array.isArray(row.search_keywords) ? row.search_keywords : [],
        featured: Boolean(row.featured),
        popularity_score: Number(row.popularity_score || 0),
        post_count: row.post_count,
      });
    }

    res.json(Object.values(grouped));
  } catch (err) {
    logger.error("Error fetching grouped subcategories:", err);
    res.status(500).json({
      code: 500,
      message: "Failed to fetch grouped subcategories",
      details: err.message,
    });
  }
};

/**
 * GET /api/subcategories/trending
 * Returns the most active subcategories ranked by explicit popularity_score
 * and then by active post volume.
 */
exports.getTrendingSubcategories = async (req, res) => {
  try {
    const limit = Math.max(
      1,
      Math.min(
        Number.parseInt(req.query.limit, 10) || 12,
        50
      )
    );

    const result = await cacheService.getOrSetWithStampedeProtection(
      `subcategories:trending:${limit}`,
      async () => {
        const trendingResult = await runQuery(
          `
          SELECT
            s.subcategory_id,
            s.category_id,
            s.name,
            s.description,
            s.icon_url,
            s.display_order,
            NULLIF(to_jsonb(s)->>'seo_slug', '') AS seo_slug,
            COALESCE(to_jsonb(s)->'search_keywords', '[]'::jsonb) AS search_keywords,
            COALESCE(NULLIF(to_jsonb(s)->>'featured', '')::boolean, FALSE) AS featured,
            COALESCE(NULLIF(to_jsonb(s)->>'popularity_score', '')::int, 0) AS popularity_score,
            c.name AS category_name,
            ${CATEGORY_GROUP_SQL} AS category_group,
            COALESCE(pc.post_count, 0)::int AS post_count
          FROM subcategories s
          JOIN categories c ON s.category_id = c.category_id
          LEFT JOIN (
            SELECT subcategory_id, COUNT(*)::int AS post_count
            FROM posts
            WHERE status = 'active'
            GROUP BY subcategory_id
          ) pc ON pc.subcategory_id = s.subcategory_id
          WHERE s.is_active = TRUE
          ORDER BY
            COALESCE(NULLIF(to_jsonb(s)->>'featured', '')::boolean, FALSE) DESC,
            COALESCE(NULLIF(to_jsonb(s)->>'popularity_score', '')::int, 0) DESC,
            COALESCE(pc.post_count, 0)::int DESC,
            s.display_order ASC,
            s.name ASC
          LIMIT $1
          `,
          [limit]
        );
        return trendingResult.rows;
      },
      SUBCATEGORY_CACHE_TTL_SECONDS
    );

    res.json({
      data: result,
      subcategories: result,
      count: result.length,
      meta: {
        primary_collection: "data",
        ranking: "featured,popularity_score,post_count",
      },
    });
  } catch (err) {
    logger.error("Error fetching trending subcategories:", err);
    res.status(500).json({
      code: 500,
      message: "Failed to fetch trending subcategories",
      details: err.message,
      data: [],
      subcategories: [],
      count: 0,
    });
  }
};

function parseActiveState(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y", "on", "active"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off", "inactive"].includes(normalized)) {
    return false;
  }
  return null;
}

exports.setSubcategoryActiveState = async (req, res) => {
  try {
    const rawSubcategoryId = String(req.params.subcategoryId || "").trim();
    if (!/^\d+$/.test(rawSubcategoryId)) {
      return res.status(400).json({
        code: 400,
        message: "Valid subcategoryId is required",
      });
    }

    const requestedState =
      req.body?.is_active ??
      req.body?.isActive ??
      req.body?.active;
    const isActive = parseActiveState(requestedState);

    if (isActive === null) {
      return res.status(400).json({
        code: 400,
        message: "Boolean is_active is required",
      });
    }

    const result = await runQuery(
      `
      UPDATE subcategories s
      SET is_active = $2
      FROM categories c
      WHERE s.subcategory_id = $1
        AND c.category_id = s.category_id
      RETURNING
        s.subcategory_id,
        s.category_id,
        s.name,
        s.description,
        s.icon_url,
        s.display_order,
        s.is_active,
        NULLIF(to_jsonb(s)->>'seo_slug', '') AS seo_slug,
        COALESCE(to_jsonb(s)->'search_keywords', '[]'::jsonb) AS search_keywords,
        COALESCE(NULLIF(to_jsonb(s)->>'featured', '')::boolean, FALSE) AS featured,
        COALESCE(NULLIF(to_jsonb(s)->>'popularity_score', '')::int, 0) AS popularity_score,
        c.name AS category_name
      `,
      [rawSubcategoryId, isActive]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        code: 404,
        message: "Subcategory not found",
      });
    }

    cacheService.invalidateRelated([
      "subcategories:*",
      "categories:*",
    ]);

    res.json({
      success: true,
      message: `Subcategory ${isActive ? "activated" : "deactivated"} successfully`,
      subcategory: {
        ...result.rows[0],
        search_keywords: Array.isArray(result.rows[0]?.search_keywords)
          ? result.rows[0].search_keywords
          : [],
      },
    });
  } catch (err) {
    logger.error("Error updating subcategory status:", err);
    res.status(500).json({
      code: 500,
      message: "Failed to update subcategory status",
      details: err.message,
    });
  }
};
