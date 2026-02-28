const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const logger = require('../utils/logger');
const { optionalAuth } = require('../middleware/auth');

const DB_QUERY_TIMEOUT_MS = Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 10000;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 50;

function runQuery(text, values = []) {
  return pool.query({
    text,
    values,
    query_timeout: DB_QUERY_TIMEOUT_MS
  });
}

function parsePositiveInt(value, fallback, maxValue = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maxValue);
}

function parseOptionalString(value) {
  if (value === undefined || value === null) return null;
  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
}

function getAuthenticatedUserId(req) {
  return parseOptionalString(req.user?.userId || req.user?.id || req.user?.user_id);
}

// Attach best-effort auth context for optional personalization.
router.use(optionalAuth);

function normalizeCategoryFilter(category) {
  if (!category) {
    return [];
  }

  const values = Array.isArray(category)
    ? category
    : String(category)
        .split(',')
        .map((entry) => entry.trim());

  return [...new Set(values.map((entry) => String(entry).trim().toLowerCase()).filter(Boolean))];
}

// GET /api/recommendations?userId=1&location=Mumbai&minPrice=1000&maxPrice=50000&category=Electronics&search=iPhone
router.get('/', async (req, res) => {
  const { userId, search } = req.query;
  let { location, minPrice, maxPrice, category, page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = req.query;
  const authenticatedUserId = getAuthenticatedUserId(req);
  const requestedUserId = parseOptionalString(userId);

  // Privacy hardening: only authenticated self-context can hydrate saved preferences.
  const effectiveUserId = authenticatedUserId || null;
  if (requestedUserId && authenticatedUserId && requestedUserId !== authenticatedUserId) {
    logger.warn('[RECOMMENDATIONS] Ignoring cross-user override request', {
      requester: authenticatedUserId,
      requested: requestedUserId
    });
  }

  page = parsePositiveInt(page, DEFAULT_PAGE);
  limit = parsePositiveInt(limit, DEFAULT_LIMIT, MAX_LIMIT);
  const offset = (page - 1) * limit;

  try {
    // Hydrate preferences only for authenticated user context.
    if (effectiveUserId && (!location && !minPrice && !maxPrice && !category)) {
      try {
        const prefResult = await runQuery(
          'SELECT location, min_price, max_price, categories FROM preferences WHERE user_id = $1 LIMIT 1',
          [effectiveUserId]
        );

        if (prefResult.rows && prefResult.rows.length > 0) {
          const userPref = prefResult.rows[0];

          location = location || userPref.location || '';
          minPrice = minPrice || userPref.min_price;
          maxPrice = maxPrice || userPref.max_price;

          if (!category && Array.isArray(userPref.categories) && userPref.categories.length > 0) {
            category = userPref.categories;
          }

          logger.info('[RECOMMENDATIONS] Applied saved user preferences', {
            userId: effectiveUserId,
            hasLocation: Boolean(location),
            hasMinPrice: minPrice !== undefined && minPrice !== null,
            hasMaxPrice: maxPrice !== undefined && maxPrice !== null,
            categoryCount: normalizeCategoryFilter(category).length
          });
        }
      } catch (prefErr) {
        logger.info('[RECOMMENDATIONS] Could not fetch user preferences', prefErr.message);
      }
    }

    const params = [];
    const addParam = (value) => {
      params.push(value);
      return `$${params.length}`;
    };

    const whereClauses = [`p.status = 'active'`];

    if (effectiveUserId) {
      whereClauses.push(`p.user_id != ${addParam(effectiveUserId)}`);
    }

    const trimmedSearch = typeof search === 'string' ? search.trim() : '';
    if (trimmedSearch) {
      const searchParam = addParam(`%${trimmedSearch}%`);
      whereClauses.push(
        `(p.title ILIKE ${searchParam} OR p.description ILIKE ${searchParam} OR c.name ILIKE ${searchParam})`
      );
    }

    const trimmedLocation = typeof location === 'string' ? location.trim() : '';
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

    const categoryFilters = normalizeCategoryFilter(category);
    if (categoryFilters.length > 0) {
      const categoryParam = addParam(categoryFilters);
      whereClauses.push(
        `(LOWER(c.name) = ANY(${categoryParam}::text[]) OR p.category_id::text = ANY(${categoryParam}::text[]))`
      );
    }

    let query = `
      SELECT p.*, c.name as category_name, u.username as seller_name, COALESCE(pr.full_name, u.username, 'Seller') as author_name
      FROM posts p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN users u ON p.user_id = u.user_id
      LEFT JOIN LATERAL (
        SELECT full_name
        FROM profiles
        WHERE user_id = p.user_id
        LIMIT 1
      ) pr ON TRUE
      WHERE ${whereClauses.join(' AND ')}
    `;

    query += ` ORDER BY p.created_at DESC LIMIT ${addParam(limit)} OFFSET ${addParam(offset)}`;

    logger.info('[RECOMMENDATIONS] Executing query', {
      userId: effectiveUserId,
      requestedUserId,
      page,
      limit,
      hasSearch: Boolean(trimmedSearch),
      hasLocation: Boolean(trimmedLocation),
      hasMinPrice: Number.isFinite(minPriceValue),
      hasMaxPrice: Number.isFinite(maxPriceValue),
      categoryCount: categoryFilters.length
    });

    const result = await runQuery(query, params);

    logger.info('[RECOMMENDATIONS] Found', result.rows.length, 'posts');

    res.json({
      posts: result.rows,
      count: result.rows.length,
      page,
      limit,
      filters: {
        location,
        minPrice,
        maxPrice,
        category,
        search: trimmedSearch
      }
    });
  } catch (err) {
    logger.error('[RECOMMENDATIONS] Error:', err.message);
    logger.error('[RECOMMENDATIONS] Full error:', err);
    res.status(500).json({ error: 'Failed to fetch recommendations', details: err.message });
  }
});

module.exports = router;
