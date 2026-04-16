const express = require("express");
const router = express.Router();
const { runQuery, getAuthUserId, parseOptionalString, parsePositiveInt } = require("../utils/dbHelpers");
const logger = require("../utils/logger");
const { optionalAuth } = require("../middleware/auth");
const { attachTrustToPosts } = require("../services/trustBadgeService");
const {
  CATEGORY_GROUP_SQL,
  CATEGORY_GROUP_VALUES,
} = require("../utils/categoryGroupSql");

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

function parseOptionalDate(value) {
  const normalized = parseOptionalString(value);
  if (!normalized) {
    return null;
  }

  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : normalized;
}

function normalizeCategoryGroup(value) {
  const normalized = parseOptionalString(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.startsWith("electronic") || normalized.startsWith("mobile")) {
    return "electronics";
  }
  if (normalized.startsWith("fashion")) {
    return "fashion";
  }
  if (normalized.startsWith("vehicle") || normalized.startsWith("auto")) {
    return "vehicles";
  }
  if (normalized === "other" || normalized === "others") {
    return "others";
  }
  return CATEGORY_GROUP_VALUES.has(normalized) ? normalized : null;
}

/** Apply optional authentication to all routes */
router.use(optionalAuth);

/**
 * Normalize a category filter into a deduplicated lowercase array.
 */
function normalizeCategoryFilter(category) {
  if (!category) {
    return [];
  }
  const values = Array.isArray(category)
    ? category
    : String(category).split(",").map(entry => entry.trim());
  return [
    ...new Set(
      values
        .map(entry => String(entry).trim().toLowerCase())
        .filter(Boolean)
    )
  ];
}

function normalizeSubcategoryFilter(subcategory) {
  if (!subcategory) {
    return [];
  }

  const values = Array.isArray(subcategory)
    ? subcategory
    : String(subcategory).split(",").map((entry) => entry.trim());

  return [
    ...new Set(
      values
        .flatMap((entry) => String(entry).split(","))
        .map((entry) => String(entry).trim().toLowerCase())
        .filter((entry) => entry && entry !== "all")
    ),
  ];
}

/**
 * @route GET /
 * @desc  Fetch recommended posts with optional filters (location, price, category, search).
 *        Falls back to saved user preferences when no filters are supplied.
 */
router.get("/", async (req, res) => {
  const { userId, search } = req.query;
  let {
    location,
    minPrice,
    maxPrice,
    category,
    category_id: categoryId,
    category_group: categoryGroupParam,
    subcategory_id: subcategoryId,
    startDate,
    endDate,
    latestWindow,
    page = DEFAULT_PAGE,
    limit = DEFAULT_LIMIT
  } = req.query;

  const authenticatedUserId = getAuthUserId(req);
  const requestedUserId = parseOptionalString(userId);
  const effectiveUserId = authenticatedUserId || null;
  const trimmedSearch = typeof search === "string" ? search.trim() : "";
  const latestWindowValue = parsePositiveInt(latestWindow, null, MAX_LIMIT);
  const categoryGroup = normalizeCategoryGroup(
    categoryGroupParam || req.query.categoryGroup || req.query.group
  );

  if (latestWindowValue) {
    limit = latestWindowValue;
  }

  let normalizedStartDate = parseOptionalDate(startDate);
  let normalizedEndDate = parseOptionalDate(endDate);
  if (
    normalizedStartDate &&
    normalizedEndDate &&
    Date.parse(normalizedStartDate) > Date.parse(normalizedEndDate)
  ) {
    [normalizedStartDate, normalizedEndDate] = [normalizedEndDate, normalizedStartDate];
  }

  if (requestedUserId && authenticatedUserId && requestedUserId !== authenticatedUserId) {
    logger.warn("[RECOMMENDATIONS] Ignoring cross-user override request", {
      requester: authenticatedUserId,
      requested: requestedUserId
    });
  }

  page = parsePositiveInt(page, DEFAULT_PAGE);
  limit = parsePositiveInt(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const offset = (page - 1) * limit;

  try {
    /* Load saved preferences when the user supplies no explicit filters */
    if (
      effectiveUserId &&
      !trimmedSearch &&
      !location &&
      !minPrice &&
      !maxPrice &&
      !category &&
      !categoryId &&
      !categoryGroup &&
      !subcategoryId &&
      !req.query.subcategory &&
      !req.query.subcategories &&
      !normalizedStartDate &&
      !normalizedEndDate &&
      !latestWindowValue
    ) {
      try {
        const prefResult = await runQuery(
          "SELECT location, min_price, max_price, categories FROM preferences WHERE user_id = $1 LIMIT 1",
          [effectiveUserId]
        );

        if (prefResult.rows && prefResult.rows.length > 0) {
          const userPref = prefResult.rows[0];
          location = location || userPref.location || "";
          minPrice = minPrice || userPref.min_price;
          maxPrice = maxPrice || userPref.max_price;

          const savedSubcategories = Array.isArray(userPref.subcategories)
            ? userPref.subcategories
            : Array.isArray(userPref.categories)
              ? userPref.categories
              : [];

          if (!req.query.subcategory && !req.query.subcategories && savedSubcategories.length > 0) {
            req.query.subcategory = savedSubcategories.join(",");
          }

          logger.info("[RECOMMENDATIONS] Applied saved user preferences", {
            userId: effectiveUserId,
            hasLocation: Boolean(location),
            hasMinPrice: minPrice !== undefined && minPrice !== null,
            hasMaxPrice: maxPrice !== undefined && maxPrice !== null,
            subcategoryCount: normalizeSubcategoryFilter(req.query.subcategory).length
          });
        }
      } catch (prefErr) {
        logger.info("[RECOMMENDATIONS] Could not fetch user preferences", prefErr.message);
      }
    }

    /* Build dynamic WHERE clause */
    const params = [];
    const addParam = value => {
      params.push(value);
      return `$${params.length}`;
    };

    const whereClauses = [`p.status = 'active'`];

    if (effectiveUserId) {
      whereClauses.push(`p.user_id != ${addParam(effectiveUserId)}`);
    }

    if (trimmedSearch) {
      const searchParam = addParam(`%${trimmedSearch}%`);
      whereClauses.push(
        `(p.title ILIKE ${searchParam} OR p.description ILIKE ${searchParam} OR c.name ILIKE ${searchParam})`
      );
    }

    const trimmedLocation = typeof location === "string" ? location.trim() : "";
    if (trimmedLocation) {
      whereClauses.push(`p.location ILIKE ${addParam(`%${trimmedLocation}%`)}`);
    }

    const minPriceValue = Number.parseFloat(minPrice);
    if (Number.isFinite(minPriceValue)) {
      whereClauses.push(`p.price >= ${addParam(minPriceValue)}`);
    }

    const maxPriceValue = Number.parseFloat(maxPrice);
    if (Number.isFinite(maxPriceValue)) {
      whereClauses.push(`p.price <= ${addParam(maxPriceValue)}`);
    }

    if (normalizedStartDate) {
      whereClauses.push(`p.created_at >= ${addParam(normalizedStartDate)}::date`);
    }

    if (normalizedEndDate) {
      whereClauses.push(`p.created_at < (${addParam(normalizedEndDate)}::date + INTERVAL '1 day')`);
    }

    const categoryFilters = normalizeCategoryFilter(categoryId || category);
    if (categoryFilters.length > 0) {
      const categoryParam = addParam(categoryFilters);
      whereClauses.push(
        `(LOWER(c.name) = ANY(${categoryParam}::text[]) OR p.category_id::text = ANY(${categoryParam}::text[]))`
      );
    }

    if (categoryGroup) {
      if (categoryGroup === "others") {
        whereClauses.push(
          `${CATEGORY_GROUP_SQL} NOT IN ('electronics', 'fashion', 'vehicles')`
        );
      } else {
        whereClauses.push(`${CATEGORY_GROUP_SQL} = ${addParam(categoryGroup)}`);
      }
    }

    const subcategoryFilters = normalizeSubcategoryFilter(
      subcategoryId ||
        req.query.subcategory ||
        req.query.subcategories ||
        req.query["subcategory[]"]
    );
    if (subcategoryFilters.length > 0) {
      const subcategoryParam = addParam(subcategoryFilters);
      whereClauses.push(
        `(LOWER(sc.name) = ANY(${subcategoryParam}::text[]) OR p.subcategory_id::text = ANY(${subcategoryParam}::text[]))`
      );
    }

    let query = `
      SELECT p.*, c.name as category_name, sc.name as subcategory_name,
             u.username as seller_name,
             COALESCE(pr.full_name, u.username, 'Seller') as author_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN LATERAL (
        SELECT full_name
        FROM profiles
        WHERE user_id = p.user_id
        LIMIT 1
      ) pr ON TRUE
      WHERE ${whereClauses.join(" AND ")}
    `;

    query += ` ORDER BY p.created_at DESC LIMIT ${addParam(limit)} OFFSET ${addParam(offset)}`;

    logger.info("[RECOMMENDATIONS] Executing query", {
      userId: effectiveUserId,
      requestedUserId: requestedUserId,
      page: page,
      limit: limit,
      hasSearch: Boolean(trimmedSearch),
      hasLocation: Boolean(trimmedLocation),
      hasMinPrice: Number.isFinite(minPriceValue),
      hasMaxPrice: Number.isFinite(maxPriceValue),
      hasStartDate: Boolean(normalizedStartDate),
      hasEndDate: Boolean(normalizedEndDate),
      latestWindow: latestWindowValue,
      categoryCount: categoryFilters.length,
      subcategoryCount: subcategoryFilters.length,
      categoryGroup
    });

    const result = await runQuery(query, params);
    logger.info("[RECOMMENDATIONS] Found", result.rows.length, "posts");
    const enrichedPosts = await attachTrustToPosts(result.rows || []);

    res.json({
      posts: enrichedPosts,
      count: result.rows.length,
      page: page,
      limit: limit,
      filters: {
        location: location,
        minPrice: minPrice,
        maxPrice: maxPrice,
        category_id: categoryId,
        category_group: categoryGroup,
        subcategory_id: subcategoryId,
        category: category,
        search: trimmedSearch,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        latestWindow: latestWindowValue
      }
    });
  } catch (err) {
    logger.error("[RECOMMENDATIONS] Error:", err.message);
    logger.error("[RECOMMENDATIONS] Full error:", err);
    res.status(500).json({ error: "Failed to fetch recommendations" });
  }
});

module.exports = router;
