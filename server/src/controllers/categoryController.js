const logger = require("../utils/logger");
const cacheService = require("../services/cacheService");
const { runQuery } = require("../utils/dbHelpers");
const { CATEGORY_GROUP_SQL } = require("../utils/categoryGroupSql");

function parseBooleanParam(value) {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "on"].includes(normalized);
}

const CATEGORY_CACHE_TTL_SECONDS =
  Number.parseInt(process.env.CATEGORY_CACHE_TTL_SECONDS, 10) || 300;

function buildCategoryResponse(rows, { includeSubcategories = false } = {}) {
  const safeRows = Array.isArray(rows) ? rows : [];
  return {
    data: safeRows,
    categories: safeRows,
    count: safeRows.length,
    meta: {
      primary_collection: "data",
      includes_subcategories: includeSubcategories,
    },
  };
}

/**
 * Fetch all categories with their associated product counts.
 * Results are cached with stampede protection to avoid thundering-herd issues.
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @returns {Promise<void>}
 */
exports.getAllCategories = async (req, res) => {
  try {
    const includeSubcategories = parseBooleanParam(
      req.query.include_subcategories || req.query.includeSubcategories
    );
    const cacheKey = includeSubcategories
      ? "categories:with_counts:subcategories"
      : "categories:with_counts";

    const rows = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        if (!includeSubcategories) {
          const result = await runQuery(`
            SELECT
              c.category_id,
              c.name,
              c.icon_url,
              ${CATEGORY_GROUP_SQL} AS category_group,
              COALESCE(pc.product_count, 0)::int AS product_count
            FROM categories c
            LEFT JOIN (
              SELECT category_id::text AS category_key, COUNT(*)::int AS product_count
              FROM posts
              GROUP BY category_id::text
            ) pc ON pc.category_key = c.category_id::text
            ORDER BY c.name ASC
          `);
          return result.rows;
        }

        const result = await runQuery(`
          SELECT
            c.category_id,
            c.name,
            c.icon_url,
            ${CATEGORY_GROUP_SQL} AS category_group,
            COALESCE(pc.product_count, 0)::int AS product_count,
            s.subcategory_id,
            s.name AS subcategory_name,
            s.description AS subcategory_description,
            s.icon_url AS subcategory_icon_url,
            s.display_order AS subcategory_display_order,
            NULLIF(to_jsonb(s)->>'seo_slug', '') AS subcategory_seo_slug,
            COALESCE(to_jsonb(s)->'search_keywords', '[]'::jsonb) AS subcategory_search_keywords,
            COALESCE(NULLIF(to_jsonb(s)->>'featured', '')::boolean, FALSE) AS subcategory_featured,
            COALESCE(NULLIF(to_jsonb(s)->>'popularity_score', '')::int, 0) AS subcategory_popularity_score,
            COALESCE(spc.post_count, 0)::int AS subcategory_post_count
          FROM categories c
          LEFT JOIN (
            SELECT category_id::text AS category_key, COUNT(*)::int AS product_count
            FROM posts
            GROUP BY category_id::text
          ) pc ON pc.category_key = c.category_id::text
          LEFT JOIN subcategories s
            ON s.category_id = c.category_id
            AND s.is_active = TRUE
          LEFT JOIN (
            SELECT subcategory_id, COUNT(*)::int AS post_count
            FROM posts
            WHERE status = 'active'
            GROUP BY subcategory_id
          ) spc ON spc.subcategory_id = s.subcategory_id
          ORDER BY c.name ASC, s.display_order ASC, s.name ASC
        `);

        const grouped = new Map();
        for (const row of result.rows || []) {
          const key = row.category_id;
          if (!grouped.has(key)) {
            grouped.set(key, {
              category_id: row.category_id,
              name: row.name,
              icon_url: row.icon_url,
              category_group: row.category_group,
              product_count: row.product_count,
              subcategories: [],
            });
          }
          if (row.subcategory_id) {
            grouped.get(key).subcategories.push({
              subcategory_id: row.subcategory_id,
              category_id: row.category_id,
              category_name: row.name,
              name: row.subcategory_name,
              description: row.subcategory_description,
              icon_url: row.subcategory_icon_url,
              display_order: row.subcategory_display_order,
              seo_slug: row.subcategory_seo_slug,
              search_keywords: Array.isArray(row.subcategory_search_keywords)
                ? row.subcategory_search_keywords
                : [],
              featured: Boolean(row.subcategory_featured),
              popularity_score: Number(row.subcategory_popularity_score || 0),
              post_count: row.subcategory_post_count,
            });
          }
        }
        return Array.from(grouped.values());
      },
      CATEGORY_CACHE_TTL_SECONDS
    );

    if (process.env.NODE_ENV !== "production") {
      logger.info(`Categories fetched: ${rows.length}`);
    }

    const safeRows = Array.isArray(rows) ? rows : [];
    if (!safeRows.length) {
      logger.error("No categories found in DB");
    }

    res.json(
      buildCategoryResponse(safeRows, {
        includeSubcategories,
      })
    );
  } catch (err) {
    logger.error("Error fetching categories:", err);
    res.status(500).json({
      error: "Internal Server Error",
      code: 500,
      message: "Failed to fetch categories",
      ...buildCategoryResponse([], {
        includeSubcategories: parseBooleanParam(
          req.query.include_subcategories || req.query.includeSubcategories
        ),
      }),
    });
  }
};

exports.getCategoriesWithSubcategories = async (req, res) =>
  exports.getAllCategories(
    {
      ...req,
      query: {
        ...req.query,
        include_subcategories: true,
      },
    },
    res
  );

/**
 * Resolve a category or subcategory by name or ID.
 * This helps the frontend handle URLs like /all-posts?category=Beauty
 * where "Beauty" could be a category name or subcategory name.
 *
 * @param {import("express").Request} req - Express request object
 * @param {import("express").Response} res - Express response object
 * @returns {Promise<void>}
 */
/**
 * GET /categories/hub-stats
 * Returns per-group post counts and new-today counts for the category hub.
 * Cached 60 seconds in Redis/memory.
 */
exports.getHubStats = async (req, res) => {
  const HUB_STATS_TTL = 60;
  const cacheKey = "categories:hub_stats";
  try {
    const stats = await cacheService.getOrSetWithStampedeProtection(
      cacheKey,
      async () => {
        const result = await runQuery(`
          SELECT
            COALESCE(
              NULLIF(to_jsonb(c)->>'category_group', ''),
              CASE
                WHEN LOWER(c.name) LIKE '%electronics%' OR LOWER(c.name) IN ('mobiles','mobile') THEN 'electronics'
                WHEN LOWER(c.name) LIKE '%fashion%' THEN 'fashion'
                WHEN LOWER(c.name) LIKE '%vehicle%' THEN 'vehicles'
                ELSE 'others'
              END
            ) AS grp,
            COUNT(DISTINCT p.post_id)::int                                                        AS active_count,
            COUNT(DISTINCT CASE WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN p.post_id END)::int AS new_today,
            COUNT(DISTINCT CASE WHEN p.created_at > NOW() - INTERVAL '7 days'  THEN p.post_id END)::int AS new_week
          FROM posts p
          JOIN categories c ON p.category_id = c.category_id
          WHERE p.status = 'active'
            AND (p.expires_at IS NULL OR p.expires_at > NOW())
          GROUP BY grp
        `);

        const map = { electronics: {}, fashion: {}, vehicles: {}, others: {} };
        for (const row of result.rows || []) {
          const g = row.grp || "others";
          if (map[g] !== undefined) {
            map[g] = {
              active_count: Number(row.active_count || 0),
              new_today: Number(row.new_today || 0),
              new_week: Number(row.new_week || 0),
            };
          } else {
            // roll unknown groups into 'others'
            map.others = {
              active_count: (map.others.active_count || 0) + Number(row.active_count || 0),
              new_today:    (map.others.new_today    || 0) + Number(row.new_today    || 0),
              new_week:     (map.others.new_week     || 0) + Number(row.new_week     || 0),
            };
          }
        }
        return map;
      },
      HUB_STATS_TTL
    );

    res.set("Cache-Control", `public, max-age=${HUB_STATS_TTL}, stale-while-revalidate=120`);
    res.json({ ok: true, data: stats, ttl: HUB_STATS_TTL });
  } catch (err) {
    logger.error("Error fetching hub stats:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch hub stats" });
  }
};

exports.resolveCategory = async (req, res) => {
  try {
    const { name, id } = req.query;

    if (!name && !id) {
      return res.status(400).json({
        code: 400,
        message: "Either 'name' or 'id' parameter is required",
      });
    }

    const searchValue = (name || id || "").trim();
    const isNumeric = /^\d+$/.test(searchValue);

    // First, try to find as a category
    const categoryResult = await runQuery(`
      SELECT 
        c.category_id AS entity_id,
        c.category_id,
        c.name,
        c.name AS category_name,
        NULL::integer AS subcategory_id,
        NULL::text AS subcategory_name,
        c.icon_url,
        ${CATEGORY_GROUP_SQL} AS category_group,
        'category' AS type,
        FALSE AS is_subcategory,
        NULL AS parent_category_id,
        NULL AS parent_category_name,
        NULL::text AS seo_slug
      FROM categories c
      WHERE ${isNumeric ? "c.category_id::text = $1" : "LOWER(c.name) = LOWER($1)"}
      LIMIT 1
    `, [searchValue]);

    if (categoryResult.rows.length > 0) {
      const row = categoryResult.rows[0];
      const payload = {
        found: true,
        type: row.type,
        entity_id: row.entity_id,
        entity_type: row.type,
        is_subcategory: false,
        name: row.name,
        icon_url: row.icon_url,
        category_group: row.category_group,
        category_id: row.category_id,
        category_name: row.category_name,
        subcategory_id: null,
        subcategory_name: null,
        parent_category_id: null,
        parent_category_name: null,
        seo_slug: row.seo_slug,
        suggested_params: {
          category_id: row.category_id,
          category: row.category_name,
        },
      };
      return res.json({
        ...payload,
        data: payload,
      });
    }

    // If not found as category, try to find as a subcategory
    const subcategoryResult = await runQuery(`
      SELECT 
        s.subcategory_id AS entity_id,
        c.category_id,
        c.name AS category_name,
        s.subcategory_id,
        s.name,
        s.name AS subcategory_name,
        COALESCE(s.icon_url, c.icon_url) AS icon_url,
        'subcategory' AS type,
        TRUE AS is_subcategory,
        s.category_id AS parent_category_id,
        c.name AS parent_category_name,
        ${CATEGORY_GROUP_SQL} AS category_group,
        NULLIF(to_jsonb(s)->>'seo_slug', '') AS seo_slug
      FROM subcategories s
      JOIN categories c ON s.category_id = c.category_id
      WHERE ${isNumeric ? "s.subcategory_id::text = $1" : "LOWER(s.name) = LOWER($1)"}
        AND s.is_active = TRUE
      LIMIT 1
    `, [searchValue]);

    if (subcategoryResult.rows.length > 0) {
      const row = subcategoryResult.rows[0];
      const payload = {
        found: true,
        type: row.type,
        entity_id: row.entity_id,
        entity_type: row.type,
        is_subcategory: true,
        name: row.name,
        icon_url: row.icon_url,
        category_group: row.category_group,
        category_id: row.category_id,
        category_name: row.category_name,
        subcategory_id: row.subcategory_id,
        subcategory_name: row.subcategory_name,
        parent_category_id: row.parent_category_id,
        parent_category_name: row.parent_category_name,
        seo_slug: row.seo_slug,
        suggested_params: {
          category_id: row.parent_category_id,
          subcategory_id: row.subcategory_id,
          category: row.parent_category_name,
          subcategory: row.name,
        },
      };
      return res.json({
        ...payload,
        data: payload,
      });
    }

    // Not found as either
    const payload = {
      found: false,
      message: `No category or subcategory found for: ${searchValue}`,
    };
    return res.json({
      ...payload,
      data: payload,
    });
  } catch (err) {
    logger.error("Error resolving category:", err);
    res.status(500).json({
      error: "Internal Server Error",
      code: 500,
      message: "Failed to resolve category",
      data: null,
    });
  }
};
