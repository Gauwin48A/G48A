/**
 * Post Controller
 *
 * Handles CRUD operations for marketplace posts, including listing,
 * creation, retrieval, marking as sold, reactivation, and deletion.
 */

const pool = require("../config/db");
const { runQuery, getAuthUserId } = require("../utils/dbHelpers");
const {
  parseOptionalString,
  parsePositiveInt,
  getScalarQueryValue,
  parseNumberOrNull,
} = require("../utils/parseHelpers");
const { filterMissingUploads } = require("../utils/uploads");
const {
  CATEGORY_GROUP_SQL,
  CATEGORY_GROUP_VALUES,
} = require("../utils/categoryGroupSql");

const logger = require("../utils/logger");
const {
  TEST_USER_EXCLUSION,
  TEST_USER_CONDITION,
} = require("../queries/testDataExclusion");

const checkUserAccessFull = async (userId) => {
  if (!userId) return false;
  try {
    const res = await runQuery(
      `SELECT
         (COALESCE(kyc_verified, false) OR COALESCE(isaadhaarverified, false)
          OR UPPER(COALESCE(kyc_status, '')) IN ('VERIFIED', 'APPROVED', 'PAN_VERIFIED')) AS kyc_active,
         EXISTS (
           SELECT 1 FROM user_subscriptions us
           WHERE us.user_id::text = users.user_id::text
             AND us.status = 'ACTIVE' AND us.end_date > NOW()
         ) AS plan_active
       FROM users WHERE user_id::text = $1`,
      [String(userId)]
    );
    if (res.rows.length === 0) return false;
    const user = res.rows[0];
    return Boolean(user.kyc_active && user.plan_active);
  } catch (err) {
    logger.error("[AccessCheck] Error checking user access:", err);
    return false;
  }
};

const logError = (msg, err) => {
  if (err) {
    logger.error(msg, typeof err === "string" ? { message: err } : err);
  } else {
    logger.error(msg);
  }
};
const logInfo = (msg, data) => {
  if (data) {
    logger.info(msg, data);
  } else {
    logger.info(msg);
  }
};
const DEBUG_CATEGORY_FLOW =
  process.env.NODE_ENV !== "production" &&
  ["1", "true", "yes", "on"].includes(
    String(process.env.DEBUG_CATEGORY_FLOW || "").toLowerCase()
  );

function logCategoryDebug(label, payload) {
  if (!DEBUG_CATEGORY_FLOW) return;
  logInfo(`[CategoryDebug] ${label}`, payload);
}

const guaranteedReachController = require("./postGuaranteedReachController");
const { ensureUserTierColumns } = require("../services/schemaGuard");
const { recordPost } = require("../services/streakRewardsService");
const {
  afterCommitRewardMutation,
  applyRewardDeltaInTransaction,
} = require("../services/rewardsLedgerService");
const {
  applyReferralChainRewards,
  CHAIN_MAX_DEPTH,
} = require("../services/referralChainRewards");
const {
  calculateSaleRewardPoints,
  hasPriorCompletedTransactions,
} = require("../services/transactionRewardService");
const { computeTrustScore } = require("../services/trustScoreService");
const { getUserRiskState } = require("../services/riskStateService");
const { attachTrustToPosts, isComplaintRiskState } = require("../services/trustBadgeService");

/* ───────────────────── Constants ───────────────────── */

const DEFAULT_PAGE = 1;
const DEFAULT_USER_POST_LIMIT = 100;
const DEFAULT_ALL_POST_LIMIT = 10;
const MAX_POST_LIMIT = 100;
const SHUFFLE_POOL_LIMIT = 200;
const SHUFFLE_SEED_BUCKET_MS = 5 * 60 * 1e3;
const MAX_SHUFFLE_SEED = 2147483647;
const MAX_SHUFFLE_STATE = 2147483646;

const DB_QUERY_TIMEOUT_MS =
  Number.parseInt(process.env.DB_QUERY_TIMEOUT_MS, 10) || 1e4;
const FIRST_SALE_BONUS_POINTS =
  Number.parseInt(process.env.FIRST_SALE_BONUS_POINTS, 10) || 100;
const FIRST_PURCHASE_BONUS_POINTS =
  Number.parseInt(process.env.FIRST_PURCHASE_BONUS_POINTS, 10) || 50;

const POST_SORT_FIELDS = new Set(["created_at", "price", "views_count"]);
const USER_POST_SORT_FIELDS = new Set([
  "created_at",
  "updated_at",
  "price",
  "title",
  "status",
]);

/* ───────────────── Local Parse Helpers ─────────────── */

/**
 * Parse a query-param value that may arrive as an array,
 * normalise it to a trimmed string or null.
 * Wraps the shared parseOptionalString with array-unwrap logic
 * required by Express query strings (e.g. ?x=1&x=2).
 * @param {*} value
 * @returns {string|null}
 */
function parseOptionalStringScalar(value) {
  const scalar = getScalarQueryValue(value);
  if (scalar === undefined || scalar === null) return null;
  const normalized = (typeof scalar === "string" ? scalar : String(scalar)).trim();
  return normalized.length ? normalized : null;
}

/**
 * Extract authenticated user ID from the request, handling array-wrapped values.
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function getAuthenticatedUserId(req) {
  return parseOptionalStringScalar(
    req.user?.userId || req.user?.id || req.user?.user_id
  );
}

/**
 * Parse a value to a finite number or null.
 * @param {*} value
 * @returns {number|null}
 */
function parseOptionalNumber(value) {
  const normalized = parseOptionalStringScalar(value);
  if (normalized === null) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Parse a value to a valid date string or null.
 * @param {*} value
 * @returns {string|null}
 */
function parseOptionalDate(value) {
  const normalized = parseOptionalStringScalar(value);
  if (!normalized) return null;
  const timestamp = Date.parse(normalized);
  return Number.isNaN(timestamp) ? null : normalized;
}

async function validateSubcategoryForCategory(client, categoryId, subcategoryId) {
  const normalizedSubcategory = parseOptionalStringScalar(subcategoryId);
  if (!normalizedSubcategory) {
    return { categoryId: parseOptionalStringScalar(categoryId) || categoryId || null };
  }

  const result = await client.query(
    `SELECT subcategory_id, category_id
     FROM subcategories
     WHERE subcategory_id = $1 AND is_active = TRUE
     LIMIT 1`,
    [normalizedSubcategory]
  );

  if (!result.rows.length) {
    throw new Error("Invalid subcategory_id");
  }

  const resolvedCategoryId = result.rows[0].category_id;
  const normalizedCategory = parseOptionalStringScalar(categoryId);
  if (
    normalizedCategory &&
    String(normalizedCategory) !== String(resolvedCategoryId)
  ) {
    throw new Error("subcategory_id does not belong to category_id");
  }

  return { categoryId: normalizedCategory || resolvedCategoryId };
}

async function ensureActiveCategoryId(client, categoryId) {
  const normalizedCategory = parseOptionalStringScalar(categoryId);
  if (!normalizedCategory) return null;

  const result = await client.query(
    `SELECT category_id, is_active
     FROM categories
     WHERE category_id = $1
     LIMIT 1`,
    [normalizedCategory]
  );

  if (!result.rows.length) {
    throw new Error("Invalid category_id");
  }

  if (result.rows[0].is_active === false) {
    throw new Error("Category is inactive");
  }

  return String(result.rows[0].category_id);
}

async function resolveCategoryIdForPost(client, categoryId, categoryName) {
  let normalizedCategoryId = parseOptionalStringScalar(categoryId);
  let normalizedCategoryName = parseOptionalStringScalar(categoryName);

  if (!normalizedCategoryId && normalizedCategoryName && /^\d+$/.test(normalizedCategoryName)) {
    normalizedCategoryId = normalizedCategoryName;
    normalizedCategoryName = null;
  }

  let resolvedFromName = null;
  if (normalizedCategoryName) {
    const result = await client.query(
      `SELECT category_id, is_active
       FROM categories
       WHERE LOWER(name) = LOWER($1)
       LIMIT 1`,
      [normalizedCategoryName]
    );
    if (!result.rows.length) {
      throw new Error("Invalid category");
    }
    if (result.rows[0].is_active === false) {
      throw new Error("Category is inactive");
    }
    resolvedFromName = String(result.rows[0].category_id);
  }

  let resolvedFromId = null;
  if (normalizedCategoryId) {
    resolvedFromId = await ensureActiveCategoryId(client, normalizedCategoryId);
  }

  if (resolvedFromId && resolvedFromName && resolvedFromId !== resolvedFromName) {
    throw new Error("category does not match category_id");
  }

  return resolvedFromId || resolvedFromName || null;
}

function normalizeCategoryGroup(value) {
  const normalized = parseOptionalStringScalar(value)?.toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("electronic") || normalized.startsWith("mobile")) {
    return "electronics";
  }
  if (normalized.startsWith("fashion")) return "fashion";
  if (normalized.startsWith("vehicle") || normalized.startsWith("auto")) {
    return "vehicles";
  }
  if (normalized === "other" || normalized === "others") return "others";
  return CATEGORY_GROUP_VALUES.has(normalized) ? normalized : null;
}

/**
 * Parse a positive integer from a potentially array-wrapped value
 * using the stricter digit-regex approach.
 * @param {*} value
 * @param {number} fallback
 * @param {number} [max=Number.MAX_SAFE_INTEGER]
 * @returns {number}
 */
function parsePositiveIntStrict(value, fallback, max = Number.MAX_SAFE_INTEGER) {
  const normalized = parseOptionalStringScalar(value);
  if (!normalized || !/^\d+$/.test(normalized)) return fallback;
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

/* ─────────────── Image / Upload Helpers ─────────────── */

/**
 * Normalise a file path so it always starts with /uploads/
 * (or is returned as an absolute URL). Returns null if the
 * value cannot be normalised.
 * @param {*} value
 * @returns {string|null}
 */
function normalizeUploadsPath(value) {
  const normalized = parseOptionalStringScalar(value);
  if (!normalized) return null;

  const withForwardSlashes = normalized.replace(/\\/g, "/");

  if (withForwardSlashes.startsWith("/uploads/")) return withForwardSlashes;
  if (withForwardSlashes.startsWith("uploads/")) return `/${withForwardSlashes}`;

  const withoutFilePrefix = withForwardSlashes.replace(/^file:\/+/i, "/");
  const uploadsMatch = withoutFilePrefix.match(/(?:^|\/)uploads\/(.+)$/i);
  if (uploadsMatch?.[1]) {
    return `/uploads/${uploadsMatch[1].replace(/^\/+/, "")}`;
  }

  if (
    !withForwardSlashes.includes("/") &&
    /^[^/]+\.[a-z0-9]{2,8}$/i.test(withForwardSlashes)
  ) {
    return `/uploads/${withForwardSlashes}`;
  }

  if (
    withForwardSlashes.startsWith("http://") ||
    withForwardSlashes.startsWith("https://")
  ) {
    return withForwardSlashes;
  }

  return null;
}

/**
 * Normalise an images payload (array, JSON string, or single value)
 * into a clean array of upload paths / URLs.
 * @param {*} value
 * @returns {string[]}
 */
function normalizeImagesPayload(value) {
  if (Array.isArray(value)) {
    const list = value
      .map((entry) => normalizeUploadsPath(entry) || parseOptionalStringScalar(entry))
      .filter(Boolean);
    return filterMissingUploads(list);
  }

  const normalized = parseOptionalStringScalar(value);
  if (!normalized) return [];

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      const list = parsed
        .map((entry) => normalizeUploadsPath(entry) || parseOptionalStringScalar(entry))
        .filter(Boolean);
      return filterMissingUploads(list);
    }
  } catch {
    /* not JSON – fall through */
  }

  const fallback = normalizeUploadsPath(normalized) || normalized;
  return filterMissingUploads(fallback ? [fallback] : []);
}

/* ──────────────── Sort / Order Helpers ──────────────── */

/**
 * Parse a sort-by field for the public post list.
 * @param {*} value
 * @returns {string}
 */
function parseSortBy(value) {
  const normalized = parseOptionalStringScalar(value)?.toLowerCase();
  if (normalized === "shuffle" || normalized === "random") return "shuffle";
  return POST_SORT_FIELDS.has(normalized) ? normalized : "created_at";
}

/**
 * Parse sort order, defaulting to descending.
 * @param {*} value
 * @returns {"asc"|"desc"}
 */
function parseSortOrder(value) {
  return parseOptionalStringScalar(value)?.toLowerCase() === "asc" ? "asc" : "desc";
}

/**
 * Parse a sort-by field for the user's own post list.
 * @param {*} value
 * @returns {string}
 */
function parseUserPostSortBy(value) {
  const normalized = parseOptionalStringScalar(value)?.toLowerCase();
  return USER_POST_SORT_FIELDS.has(normalized) ? normalized : "created_at";
}

/**
 * Build a safe ORDER BY clause for the user-post query.
 * @param {string} sortBy
 * @param {string} sortOrder
 * @returns {string}
 */
function buildUserPostOrderClause(sortBy, sortOrder) {
  const safeOrder = sortOrder === "asc" ? "ASC" : "DESC";

  if (sortBy === "price") return `price ${safeOrder} NULLS LAST, created_at DESC`;
  if (sortBy === "title") return `title ${safeOrder}, created_at DESC`;
  if (sortBy === "status") return `status ${safeOrder}, created_at DESC`;
  if (sortBy === "updated_at") {
    return `updated_at ${safeOrder} NULLS LAST, created_at DESC`;
  }
  return `created_at ${safeOrder}`;
}

/* ─────────────── Shuffle / Seed Helpers ─────────────── */

/**
 * Hash a string into a numeric seed.
 * @param {string} value
 * @returns {number}
 */
function hashSeedString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % MAX_SHUFFLE_SEED;
  }
  return hash || 1;
}

/**
 * Parse a shuffle seed from a query parameter.
 * Falls back to a time-bucketed seed.
 * @param {*} value
 * @returns {number}
 */
function parseShuffleSeed(value) {
  const normalized = parseOptionalStringScalar(value);
  if (!normalized) return Math.floor(Date.now() / SHUFFLE_SEED_BUCKET_MS);
  if (/^-?\d+$/.test(normalized)) {
    const numericSeed = Math.abs(Number.parseInt(normalized, 10)) % MAX_SHUFFLE_SEED;
    return numericSeed || 1;
  }
  return hashSeedString(normalized);
}

function setNoStoreHeaders(res) {
  if (!res || typeof res.set !== "function") return;
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
    ETag: `W/"${Date.now()}"`,
  });
}

/**
 * Create a seeded pseudo-random number generator (Park-Miller).
 * @param {number} seed
 * @returns {() => number}
 */
function createSeededRandom(seed) {
  let state = seed % MAX_SHUFFLE_SEED;
  if (state <= 0) state += MAX_SHUFFLE_STATE;
  return () => {
    state = (state * 16807) % MAX_SHUFFLE_SEED;
    return (state - 1) / MAX_SHUFFLE_STATE;
  };
}

/**
 * Fisher-Yates shuffle using a seeded PRNG.
 * @param {Array} rows
 * @param {number} seed
 * @returns {Array}
 */
function shuffleRowsWithSeed(rows, seed) {
  const random = createSeededRandom(seed);
  const shuffledRows = [...rows];
  for (let i = shuffledRows.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffledRows[i], shuffledRows[j]] = [shuffledRows[j], shuffledRows[i]];
  }
  return shuffledRows;
}

/* ────────────── Query-Building Helpers ──────────────── */

/**
 * Normalise and validate the query parameters for the public post list.
 * @param {object} query - Express req.query
 * @returns {object}
 */
function normalizePostListQuery(query) {
  let minPrice = parseOptionalNumber(query.minPrice);
  let maxPrice = parseOptionalNumber(query.maxPrice);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  let startDate = parseOptionalDate(query.startDate);
  let endDate = parseOptionalDate(query.endDate);
  if (startDate && endDate && Date.parse(startDate) > Date.parse(endDate)) {
    [startDate, endDate] = [endDate, startDate];
  }

  const category =
    parseOptionalStringScalar(query.category) ||
    parseOptionalStringScalar(query.category_id);

  const subcategory =
    parseOptionalStringScalar(query.subcategory) ||
    parseOptionalStringScalar(query.subcategory_id);

  // Multi-subcategory filter (For You preferences): comma-separated list of
  // subcategory IDs or names, e.g. subcategory_ids=12,45 or subcategory_ids=Cars,Phones
  const subcategoryIdsRaw =
    parseOptionalStringScalar(query.subcategory_ids) ||
    parseOptionalStringScalar(query.subcategoryIds) ||
    null;
  const subcategoryIds = subcategoryIdsRaw
    ? subcategoryIdsRaw
        .split(",")
        .map((s) => String(s).trim())
        .filter(Boolean)
    : null;

  const categoryGroup = normalizeCategoryGroup(
    query.category_group || query.categoryGroup || query.group
  );

  return {
    page: parsePositiveIntStrict(query.page, DEFAULT_PAGE),
    limit: parsePositiveIntStrict(query.limit, DEFAULT_ALL_POST_LIMIT, MAX_POST_LIMIT),
    sortBy: parseSortBy(query.sortBy),
    sortOrder: parseSortOrder(query.sortOrder),
    shuffleSeed: parseShuffleSeed(
      query.shuffleSeed || query.refresh || query.seed
    ),
    filters: {
      search:
        parseOptionalStringScalar(query.search) ||
        parseOptionalStringScalar(query.q),
      category: category && category.toLowerCase() !== "all" ? category : null,
      categoryGroup,
      subcategory: subcategory && subcategory.toLowerCase() !== "all" ? subcategory : null,
      subcategoryIds,
      location: parseOptionalStringScalar(query.location),
      minPrice,
      maxPrice,
      author: parseOptionalStringScalar(query.author),
      startDate,
      endDate,
      // F-04: Advanced filters
      condition: parseOptionalStringScalar(query.condition),
      verifiedOnly: query.verifiedOnly === 'true' || query.verifiedOnly === '1',
    },
  };
}

/**
 * Build a WHERE clause (and parameter array) for the public post list.
 * Enhanced to handle category names, IDs, and subcategory-as-category fallback.
 * @param {object} filters
 * @returns {{ params: any[], clause: string, categoryResolution: string|null }}
 */
function buildPostWhereClause(filters) {
  const params = [];
  const conditions = [
    `p.status = 'active'`,
    `(p.expires_at IS NULL OR p.expires_at > NOW())`,
  ];
  let categoryResolution = null;

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.search) {
    const placeholder = addParam(`%${filters.search}%`);
    conditions.push(
      `(
        p.title ILIKE ${placeholder}
        OR p.description ILIKE ${placeholder}
        OR p.location ILIKE ${placeholder}
        OR c.name ILIKE ${placeholder}
        OR sc.name ILIKE ${placeholder}
        OR u.username ILIKE ${placeholder}
        OR COALESCE(pr.full_name, u.username) ILIKE ${placeholder}
        OR (to_jsonb(p)->>'brand') ILIKE ${placeholder}
        OR (to_jsonb(p)->>'model') ILIKE ${placeholder}
      )`
    );
  }

  if (filters.categoryGroup) {
    const group = normalizeCategoryGroup(filters.categoryGroup);
    if (group) {
      if (group === "others") {
        conditions.push(`${CATEGORY_GROUP_SQL} NOT IN ('electronics', 'fashion', 'vehicles')`);
      } else {
        conditions.push(`${CATEGORY_GROUP_SQL} = ${addParam(group)}`);
      }
    }
  }
  
  // Enhanced category filter: supports ID, name, or subcategory-as-category fallback
  if (filters.category) {
    const rawCategory = String(filters.category || "").trim();
    if (/^\d+$/.test(rawCategory)) {
      // Numeric ID - direct match
      conditions.push(`p.category_id::text = ${addParam(rawCategory)}`);
      categoryResolution = "id";
    } else {
      // Category name - match by name (case-insensitive)
      // Also check if this name might be a subcategory name (fallback)
      const catPlaceholder = addParam(rawCategory);
      conditions.push(`(
        c.name ILIKE ${catPlaceholder}
        OR (c.name IS NULL AND EXISTS (
          SELECT 1 FROM subcategories sc2 
          WHERE sc2.name ILIKE ${catPlaceholder} AND sc2.subcategory_id::text = p.subcategory_id::text
        ))
        OR EXISTS (
          SELECT 1 FROM subcategories sc3 
          WHERE sc3.name ILIKE ${catPlaceholder} AND sc3.subcategory_id::text = p.subcategory_id::text
        )
      )`);
      categoryResolution = "name_or_subcategory";
    }
  }
  
  // Subcategory filter
  if (filters.subcategory) {
    const rawSubcategory = String(filters.subcategory || "").trim();
    if (rawSubcategory) {
      if (/^\d+$/.test(rawSubcategory)) {
        conditions.push(`p.subcategory_id::text = ${addParam(rawSubcategory)}`);
      } else {
        conditions.push(`sc.name ILIKE ${addParam(rawSubcategory)}`);
      }
    }
  }
  // Multi-subcategory filter (For You preferences) — comma-separated IDs or names
  if (Array.isArray(filters.subcategoryIds) && filters.subcategoryIds.length > 0) {
    const idList = filters.subcategoryIds.filter((s) => /^\d+$/.test(s));
    const nameList = filters.subcategoryIds.filter((s) => !/^\d+$/.test(s));
    const idConditions = idList.map((id) => `p.subcategory_id::text = ${addParam(id)}`);
    const nameConditions = nameList.map(
      (name) => `LOWER(sc.name) = LOWER(${addParam(name)})`
    );
    const allSub = [...idConditions, ...nameConditions];
    if (allSub.length > 0) {
      conditions.push(`(${allSub.join(" OR ")})`);
    }
  }
  if (filters.location) {
    conditions.push(`p.location ILIKE ${addParam(`%${filters.location}%`)}`);
  }
  if (filters.author) {
    conditions.push(`p.user_id::text = ${addParam(filters.author)}`);
  }
  if (filters.startDate) {
    conditions.push(`p.created_at >= ${addParam(filters.startDate)}`);
  }
  if (filters.endDate) {
    conditions.push(`p.created_at <= ${addParam(filters.endDate)}`);
  }
  if (filters.minPrice !== null) {
    conditions.push(`p.price >= ${addParam(filters.minPrice)}`);
  }
  if (filters.maxPrice !== null) {
    conditions.push(`p.price <= ${addParam(filters.maxPrice)}`);
  }

  // F-04: Condition filter (new / like_new / good / fair)
  if (filters.condition && filters.condition !== '') {
    const validConditions = ['new', 'like_new', 'good', 'fair'];
    const normalized = String(filters.condition).toLowerCase().replace(/\s+/g, '_');
    if (validConditions.includes(normalized)) {
      conditions.push(`p.condition = ${addParam(normalized)}`);
    }
  }

  // F-04: Verified sellers only filter
  if (filters.verifiedOnly === true || filters.verifiedOnly === 'true') {
    conditions.push(`COALESCE(pr.verified, false) = true`);
  }

  // Exclude posts from known test / e2e accounts (identity-based — their seeded
  // titles are realistic and would bypass any title-based filter).
  conditions.push(TEST_USER_CONDITION);

  return { params, clause: `WHERE ${conditions.join(" AND ")}` };
}

/* ──────────────── Response Mappers ──────────────────── */

/**
 * Map a raw database row to the public post response shape.
 * @param {object} post
 * @returns {object}
 */
function mapPostForResponse(post) {
  const normalizedImages = normalizeImagesPayload(post.images);
  const normalizedImageUrl =
    normalizeUploadsPath(post.image_url) || normalizedImages[0] || "/placeholder.svg";

  return {
    ...post,
    images: normalizedImages,
    id: post.post_id,
    price: post.price !== undefined && post.price !== null ? Number(post.price) : null,
    discount_percentage: post.discount_percentage !== undefined && post.discount_percentage !== null ? Number(post.discount_percentage) : 0,
    tier_priority: post.tier_priority || 1,
    category: post.category_name || "General",
    subcategory: post.subcategory_name || null,
    subcategory_id: post.subcategory_id || null,
    user: {
      id: post.user_id || post.user?.id || null,
      name: post.user_name || post.username || "Unknown",
      username: post.username,
      rating: parseFloat(post.seller_rating) || 0,
      isVerified: !!(post.aadhaar_verified || post.pan_verified),
      rewardBadge: post.reward_badge || null,
    },
    image_url: normalizedImageUrl,
  };
}

/* ═══════════════════════════════════════════════════════
 *  Exported Route Handlers
 * ═══════════════════════════════════════════════════════ */

/**
 * GET /api/posts/user
 * Retrieve posts belonging to (or bought by) a specific user.
 */
exports.getUserPosts = async (req, res) => {
  try {
    // Enforce that users can only view their own posts via this endpoint
    const authenticatedUserId = req.user?.id || req.user?.userId || req.user?.user_id;
    const requestedUserId = req.query.userId || authenticatedUserId;

    if (!requestedUserId) return res.status(400).json({ error: "userId required" });

    // Security: only allow viewing own posts
    if (String(requestedUserId) !== String(authenticatedUserId)) {
      return res.status(403).json({ error: "Not authorized to view another user's posts" });
    }

    const userId = requestedUserId;
    const { status, page = DEFAULT_PAGE, limit = DEFAULT_USER_POST_LIMIT } = req.query;

    const categoryId = parseOptionalStringScalar(
      req.query.category || req.query.category_id || req.query.categoryId
    );
    const categoryGroup = normalizeCategoryGroup(
      req.query.category_group || req.query.categoryGroup || req.query.group
    );
    const pageNumber = parsePositiveIntStrict(page, DEFAULT_PAGE);
    const limitNumber = parsePositiveIntStrict(limit, DEFAULT_USER_POST_LIMIT, MAX_POST_LIMIT);
    const offset = (pageNumber - 1) * limitNumber;
    const normalizedStatus = parseOptionalStringScalar(status);
    const sortBy = parseUserPostSortBy(req.query.sortBy);
    const sortOrder = parseSortOrder(req.query.sortOrder);
    const orderClause = buildUserPostOrderClause(sortBy, sortOrder);

    let result;

    try {
      result = await runQuery(
        `
        WITH user_posts AS (
          -- User's own posts
          SELECT
            p.post_id,
            p.user_id,
            p.title,
            p.description,
            p.price,
            p.category_id,
            p.subcategory_id,
            p.location,
            p.created_at,
            p.updated_at,
            p.status,
            p.tier_priority,
            COALESCE(p.views_count, p.views, 0) AS views_count,
            COALESCE(p.likes, 0) AS likes,
            COALESCE(p.shares, 0) AS shares,
            p.images,
            'own' AS ownership
          FROM posts p
          WHERE p.user_id::text = $1::text
          UNION ALL
          -- Posts bought by this user (exclude posts owned by this same user)
          SELECT
            p.post_id,
            p.user_id,
            p.title,
            p.description,
            p.price,
            p.category_id,
            p.subcategory_id,
            p.location,
            p.created_at,
            p.updated_at,
            p.status,
            p.tier_priority,
            COALESCE(p.views_count, p.views, 0) AS views_count,
            COALESCE(p.likes, 0) AS likes,
            COALESCE(p.shares, 0) AS shares,
            p.images,
            'bought' AS ownership
          FROM posts p
          INNER JOIN transactions t ON p.post_id::text = t.post_id::text
          WHERE t.buyer_id::text = $1::text
            AND t.status = 'completed'
            AND p.user_id::text != $1::text
        ),
        filtered_posts AS (
          SELECT
            post_id,
            user_id,
            title,
            description,
            price,
            category_id,
            subcategory_id,
            location,
            created_at,
            updated_at,
            status,
            tier_priority,
            views_count,
            likes,
            shares,
            images,
            ownership
          FROM user_posts
          WHERE ($2::text IS NULL OR status = $2::text)
            AND ($3::text IS NULL OR category_id::text = $3::text)
        )
        SELECT
          fp.post_id,
          fp.user_id,
          fp.title,
          fp.description,
          fp.price,
          fp.category_id,
          fp.subcategory_id,
          fp.location,
          fp.created_at,
          fp.updated_at,
          fp.status,
          fp.tier_priority,
          fp.views_count,
          fp.likes,
          fp.shares,
          fp.images,
          fp.ownership,
          c.name AS category_name,
          sc.name AS subcategory_name,
          COUNT(*) OVER() AS total_count
        FROM filtered_posts fp
        LEFT JOIN categories c ON fp.category_id::text = c.category_id::text
        LEFT JOIN subcategories sc ON fp.subcategory_id::text = sc.subcategory_id::text
        WHERE (
          $4::text IS NULL OR
          ($4::text = 'others' AND ${CATEGORY_GROUP_SQL} NOT IN ('electronics', 'fashion', 'vehicles')) OR
          ($4::text <> 'others' AND ${CATEGORY_GROUP_SQL} = $4::text)
        )
        ORDER BY ${orderClause}
        LIMIT $5 OFFSET $6
        `,
        [String(userId), normalizedStatus, categoryId, categoryGroup, limitNumber, offset]
      );
    } catch (txErr) {
      /* Fallback: transactions table may not exist – return own posts only */
      logError(
        "[getUserPosts] Transactions join failed, falling back to own posts only:",
        txErr.message
      );
      result = await runQuery(
        `
        SELECT
          p.post_id,
          p.user_id,
          p.title,
          p.description,
          p.price,
          p.category_id,
          p.subcategory_id,
          p.location,
          p.created_at,
          p.updated_at,
          p.status,
          p.tier_priority,
          COALESCE(p.views_count, p.views, 0) AS views_count,
          COALESCE(p.likes, 0) AS likes,
          COALESCE(p.shares, 0) AS shares,
          p.images,
          'own' AS ownership,
          c.name AS category_name,
          sc.name AS subcategory_name,
          COUNT(*) OVER() AS total_count
        FROM posts p
        LEFT JOIN categories c ON p.category_id::text = c.category_id::text
        LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
        WHERE p.user_id::text = $1::text
          AND ($2::text IS NULL OR p.status = $2::text)
          AND ($3::text IS NULL OR p.category_id::text = $3::text)
          AND (
            $4::text IS NULL OR
            ($4::text = 'others' AND ${CATEGORY_GROUP_SQL} NOT IN ('electronics', 'fashion', 'vehicles')) OR
            ($4::text <> 'others' AND ${CATEGORY_GROUP_SQL} = $4::text)
          )
        ORDER BY ${orderClause}
        LIMIT $5 OFFSET $6
        `,
        [String(userId), normalizedStatus, categoryId, categoryGroup, limitNumber, offset]
      );
    }

    const total = result.rows.length
      ? Number.parseInt(result.rows[0].total_count, 10) || 0
      : 0;

    const posts = result.rows.map(({ total_count, ...post }) => {
      const normalizedImages = normalizeImagesPayload(post.images);
      return {
        ...post,
        images: normalizedImages,
        price: post.price !== undefined && post.price !== null ? Number(post.price) : null,
        discount_percentage: post.discount_percentage !== undefined && post.discount_percentage !== null ? Number(post.discount_percentage) : 0,
        image_url:
          normalizeUploadsPath(post.image_url) ||
          normalizedImages[0] ||
          "/placeholder.svg",
      };
    });
    const enrichedPosts = await attachTrustToPosts(posts);

    res.json({ posts: enrichedPosts, total, page: pageNumber, limit: limitNumber });
  } catch (err) {
    logError("[getUserPosts] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/posts/mine/totals
 * Retrieve aggregate counts for the current user's posts.
 */
exports.getUserPostTotals = async (req, res) => {
  try {
    const requestedUserId = req.query.userId;
    if (!requestedUserId) return res.status(400).json({ error: "userId required" });

    // Security: only allow viewing own totals
    const authenticatedUserId = req.user?.id || req.user?.userId || req.user?.user_id;
    if (String(requestedUserId) !== String(authenticatedUserId)) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const userId = requestedUserId;

    const categoryId = parseOptionalStringScalar(
      req.query.category || req.query.category_id || req.query.categoryId
    );
    const categoryGroup = normalizeCategoryGroup(
      req.query.category_group || req.query.categoryGroup || req.query.group
    );

    const params = [String(userId), categoryId || null, categoryGroup || null];
    let result;

    try {
      result = await runQuery(
        `
        WITH user_posts AS (
          SELECT
            p.post_id,
            p.status,
            p.category_id,
            'own' AS ownership
          FROM posts p
          WHERE p.user_id::text = $1::text
          UNION ALL
          SELECT
            p.post_id,
            p.status,
            p.category_id,
            'bought' AS ownership
          FROM posts p
          INNER JOIN transactions t ON p.post_id::text = t.post_id::text
          WHERE t.buyer_id::text = $1::text
            AND t.status = 'completed'
            AND p.user_id::text != $1::text
        ),
        filtered_posts AS (
          SELECT up.post_id, up.status, up.ownership, up.category_id
          FROM user_posts up
          LEFT JOIN categories c ON up.category_id::text = c.category_id::text
          WHERE ($2::text IS NULL OR up.category_id::text = $2::text)
            AND (
              $3::text IS NULL OR
              ($3::text = 'others' AND ${CATEGORY_GROUP_SQL} NOT IN ('electronics', 'fashion', 'vehicles')) OR
              ($3::text <> 'others' AND ${CATEGORY_GROUP_SQL} = $3::text)
            )
        )
        SELECT
          COUNT(*) FILTER (WHERE ownership = 'own')::int AS total_own,
          COUNT(*) FILTER (WHERE ownership = 'bought')::int AS total_bought,
          COUNT(*) FILTER (WHERE ownership = 'own' AND status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE ownership = 'own' AND status = 'sold')::int AS sold,
          COUNT(*)::int AS total
        FROM filtered_posts
        `,
        params
      );
    } catch (txErr) {
      logError(
        "[getUserPostTotals] Transactions join failed, falling back to own posts only:",
        txErr.message
      );
      result = await runQuery(
        `
        SELECT
          COUNT(*)::int AS total_own,
          0::int AS total_bought,
          COUNT(*) FILTER (WHERE p.status = 'active')::int AS active,
          COUNT(*) FILTER (WHERE p.status = 'sold')::int AS sold,
          COUNT(*)::int AS total
        FROM posts p
        LEFT JOIN categories c ON p.category_id::text = c.category_id::text
        WHERE p.user_id::text = $1::text
          AND ($2::text IS NULL OR p.category_id::text = $2::text)
          AND (
            $3::text IS NULL OR
            ($3::text = 'others' AND ${CATEGORY_GROUP_SQL} NOT IN ('electronics', 'fashion', 'vehicles')) OR
            ($3::text <> 'others' AND ${CATEGORY_GROUP_SQL} = $3::text)
          )
        `,
        params
      );
    }

    const row = result.rows?.[0] || {};
    const totals = {
      total: Number(row.total || 0),
      active: Number(row.active || 0),
      sold: Number(row.sold || 0),
      bought: Number(row.total_bought || 0),
      own: Number(row.total_own || 0),
    };

    res.json({ totals });
  } catch (err) {
    logError("[getUserPostTotals] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/posts
 * Retrieve all active posts with filtering, sorting, and shuffle support.
 */
exports.getAllPosts = async (req, res) => {
  try {
    setNoStoreHeaders(res);
    const {
      page: pageNumber,
      limit: limitNumber,
      sortBy,
      sortOrder,
      shuffleSeed,
      filters,
    } = normalizePostListQuery(req.query);

    const userId = getAuthUserId(req);
    const hasFullAccess = await checkUserAccessFull(userId);
    const restrictedMode = !hasFullAccess;

    const offset = (pageNumber - 1) * limitNumber;
    let finalLimit = limitNumber;
    let finalOffset = offset;
    if (restrictedMode) {
      finalLimit = 5;
      finalOffset = 0;
    }

    const { clause: whereClause, params: whereParams, categoryResolution } =
      buildPostWhereClause(filters);

    if (filters.category || filters.subcategory || filters.categoryGroup) {
      logCategoryDebug("getAllPosts", {
        query: req.query,
        filters,
        categoryResolution,
        page: pageNumber,
        limit: finalLimit,
        sortBy,
        sortOrder,
        shuffleSeed,
      });
    }

    let query = `
      SELECT
        ${sortBy === "shuffle" ? "" : "COUNT(*) OVER() AS total_count,"}
        p.*,
        COALESCE(p.tier_priority, 1) as tier_priority,
        COALESCE(p.views_count, p.views, 0) as views,
        COALESCE(p.views_count, 0) as views_count,
        COALESCE(p.shares, 0) as shares,
        COALESCE(p.likes, 0) as likes,
        u.username,
        u.rating as seller_rating,
        COALESCE(pr.full_name, u.username) as user_name,
        pr.reward_badge,
        c.name as category_name,
        sc.name as subcategory_name,
        p.subcategory_id,
        COALESCE(u.isaadhaarverified, false) as aadhaar_verified,
        COALESCE(u.kyc_verified, false) as pan_verified,
        NULL as verification_date
      FROM posts p
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id::text = c.category_id::text
      LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
      ${whereClause}
    `;

    const params = [...whereParams];

    /* ── Shuffle mode ── */
    if (sortBy === "shuffle") {
      query += ` ORDER BY p.created_at DESC LIMIT ${SHUFFLE_POOL_LIMIT}`;
      const result = await runQuery(query, params);
      const shuffled = shuffleRowsWithSeed(result.rows, shuffleSeed);
      const paginatedRows = shuffled.slice(finalOffset, finalOffset + finalLimit);
      const posts = paginatedRows.map(mapPostForResponse);
      const enrichedPosts = await attachTrustToPosts(posts);

      return res.json({
        posts: enrichedPosts,
        total: restrictedMode ? 5 : result.rows.length,
        page: pageNumber,
        limit: finalLimit,
        shuffled: true,
        shuffleSeed,
        is_restricted: restrictedMode,
      });
    }

    /* ── Normal sorted mode ── */
    const safeSortBy = `p.${sortBy}`;
    const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
    const freshnessOrder =
      sortBy === "created_at"
        ? "CASE WHEN p.created_at >= NOW() - INTERVAL '12 hours' THEN 1 ELSE 0 END DESC, "
        : "";
    const rankScore =
      "(COALESCE(p.boost_level, 0) * 100 + COALESCE(p.tier_priority, 0) * 10)";
    const sortClause = `ORDER BY ${rankScore} DESC, ${freshnessOrder}${safeSortBy} ${safeSortOrder}, p.created_at DESC`;

    query += ` ${sortClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(finalLimit, finalOffset);

    const result = await runQuery(query, params);
    const posts = result.rows.map(({ total_count, ...post }) =>
      mapPostForResponse(post)
    );
    const enrichedPosts = await attachTrustToPosts(posts);
    const total = restrictedMode
      ? 5
      : (result.rows.length ? Number.parseInt(result.rows[0].total_count, 10) || 0 : 0);

    res.json({
      posts: enrichedPosts,
      total,
      page: pageNumber,
      limit: finalLimit,
      is_restricted: restrictedMode,
    });
  } catch (err) {
    logError("Error fetching posts:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/posts
 * Create a new marketplace post (with tier-based limits, credits, and rewards).
 */
exports.createPost = async (req, res) => {
  const client = await pool.connect();
  let postStreakOutcome = null;
  let firstPostEligible = false;
  let firstPostRewardChange = null;

  try {
    await ensureUserTierColumns();
    await client.query("BEGIN");

    const user_id =
      getAuthenticatedUserId(req) || parseOptionalStringScalar(req.body.user_id);
    let {
      title,
      description,
      price,
      type,
      location,
      is_flash_sale,
    } = req.body;
    const rawCategoryId =
      req.body?.category_id ?? req.body?.categoryId ?? req.body?.categoryID ?? null;
    const rawCategoryName =
      req.body?.category ??
      req.body?.category_name ??
      req.body?.categoryName ??
      req.body?.categoryTitle ??
      null;
    const rawSubcategoryId =
      req.body?.subcategory_id ?? req.body?.subcategoryId ?? req.body?.subcategoryID ?? null;
    const rawBrand =
      req.body?.brand ??
      req.body?.brand_name ??
      req.body?.brandName ??
      null;
    const rawModel =
      req.body?.model ??
      req.body?.model_name ??
      req.body?.modelName ??
      null;
    const rawCondition =
      req.body?.condition ??
      req.body?.item_condition ??
      null;
    /* Normalize to filter format (e.g. "Like New" -> "like_new") so search filters match. */
    const normalizedCondition = rawCondition
      ? String(rawCondition).trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
      : null;
    const rawContactNumber =
      req.body?.contact_number ??
      req.body?.contactNumber ??
      req.body?.phone ??
      null;
    const rawAgeMonths = parseOptionalStringScalar(
      req.body?.age_months ?? req.body?.ageMonths ?? null
    );
    const rawIsNegotiable =
      req.body?.is_negotiable ?? req.body?.isNegotiable ?? req.body?.negotiable ?? false;
    const images = req.files?.images || [];
    const audioFile = req.files?.audio?.[0] || req.file;

    if (!user_id) throw new Error("User ID required");

    // Duplicate listing detection: check for similar title from same user within 24hrs
    const dupCheck = await client.query(
      `SELECT post_id FROM posts
       WHERE user_id = $1 AND status = 'active'
         AND created_at > NOW() - INTERVAL '24 hours'
         AND similarity(title, $2) > 0.7
       LIMIT 1`,
      [user_id, title || '']
    );
    if (dupCheck.rows.length > 0) {
      throw new Error("A similar listing already exists. Please edit the existing listing instead.");
    }

    let category_id = await resolveCategoryIdForPost(
      client,
      rawCategoryId,
      rawCategoryName
    );
    const subcategory_id = parseOptionalStringScalar(rawSubcategoryId);

    if (subcategory_id) {
      const validated = await validateSubcategoryForCategory(
        client,
        category_id,
        subcategory_id
      );
      category_id = validated.categoryId;
    }
    if (!category_id) {
      throw new Error("Category is required");
    }
    category_id = await ensureActiveCategoryId(client, category_id);

    const { getTierRules } = require("../config/tierRules");
    const { stripReferralCodes } = require("../utils/referralCodeFilter");

    // Strip referral codes from post content to prevent public spamming
    const sanitizedTitle = stripReferralCodes(title);
    const sanitizedDescription = stripReferralCodes(description);

    const userResult = await client.query(
      `SELECT COALESCE(NULLIF(current_plan, ''), NULLIF(tier, ''), 'basic') AS plan,
              subscription_expiry,
              post_credits
         FROM users WHERE user_id = $1 FOR UPDATE`,
      [user_id]
    );
    const user = userResult.rows[0];
    if (!user) throw new Error("User not found");

    const priorPostResult = await client.query(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'active')::int AS active
       FROM posts WHERE user_id = $1`,
      [user_id]
    );
    const totalPosts = Number(priorPostResult.rows[0]?.total || 0);
    const activePosts = Number(priorPostResult.rows[0]?.active || 0);
    firstPostEligible = totalPosts === 0;

    const plan = user.plan || "basic";
    const rules = getTierRules(plan);

    /* Subscription expiry check */
    if (plan !== "basic") {
      const expiry = user.subscription_expiry
        ? new Date(user.subscription_expiry)
        : null;
      if (!expiry || Number.isNaN(expiry.getTime()) || expiry < new Date()) {
        throw new Error("Subscription expired. Please renew.");
      }
    }

    /* Max active listings for paid tiers */
    if (plan !== "basic" && Number.isFinite(rules.maxListings)) {
      if (activePosts >= rules.maxListings) {
        throw new Error(
          `Listing limit reached (${rules.maxListings} active listings). Upgrade your plan to post more.`,
        );
      }
    }

    /* Daily posting limit for paid tiers */
    if (plan !== "basic" && Number.isFinite(rules.dailyLimit) && rules.dailyLimit > 0) {
      const today = new Date().toISOString().split("T")[0];
      const dailyCountResult = await client.query(
        `SELECT COUNT(*) as count FROM posts
         WHERE user_id = $1 AND created_at::date = $2::date`,
        [user_id, today]
      );
      const todayCount = parseInt(dailyCountResult.rows[0]?.count || 0, 10);
      if (todayCount >= rules.dailyLimit) {
        throw new Error(
          `Daily limit reached (${rules.dailyLimit} per day). Upgrade your plan to post more.`,
        );
      }
    }

    /* Basic-tier credit check */
    if (plan === "basic") {
      const credits = user.post_credits || 0;
      if (credits < 1) {
        throw new Error("No post credits remaining. Buy more credits or upgrade.");
      }
    }

    /* Expiry */
    let expiresAt;
    if (is_flash_sale === "true" || is_flash_sale === true) {
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    } else {
      expiresAt = rules.getExpiry();
    }

    /* Normalise uploaded images (multipart files) */
    const uploadedImages = images
      .map(
        (img) =>
          normalizeUploadsPath(`/uploads/${img.filename}`) ||
          normalizeUploadsPath(img.path) ||
          normalizeUploadsPath(img.filename) ||
          parseOptionalStringScalar(img.filename)
      )
      .filter(Boolean);
    /* Also accept pre-uploaded image URLs sent in the JSON body
       (used by the Android client's two-stage upload flow). */
    const bodyImages = normalizeImagesPayload(req.body?.images);
    const normalizedImages = Array.from(
      new Set([...uploadedImages, ...bodyImages])
    ).filter(Boolean);
    const imagesJson = JSON.stringify(normalizedImages);

    /* Audio file (multipart) or pre-uploaded audio URL (JSON create — Android voice note) */
    const audioUrl = audioFile
      ? normalizeUploadsPath(`/uploads/${audioFile.filename}`) ||
        normalizeUploadsPath(audioFile.path) ||
        normalizeUploadsPath(audioFile.filename) ||
        null
      : typeof req.body?.audio_url === "string" && req.body.audio_url.trim()
        ? req.body.audio_url.trim()
        : null;

    /* Insert the post */
    const insertResult = await client.query(
      `INSERT INTO posts (
        user_id, category_id, subcategory_id, title, description, price, location,
        post_type, images, status, created_at, views_count, likes, shares,
        is_flash_sale, expires_at, tier_priority, brand, model, condition,
        contact_number, age_months, is_negotiable
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
              $9::JSONB, 'active', NOW(), 0, 0, 0, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING post_id`,
      [
        user_id,
        category_id,
        subcategory_id || null,
        sanitizedTitle || "Update",
        sanitizedDescription || "",
        price || 0,
        location || null,
        type || "sale",
        imagesJson,
        is_flash_sale === "true" || is_flash_sale === true,
        expiresAt,
        rules.priority,
        rawBrand || null,
        rawModel || null,
        normalizedCondition,
        rawContactNumber || null,
        rawAgeMonths != null ? (parseInt(rawAgeMonths, 10) || 0) : null,
        rawIsNegotiable === true || rawIsNegotiable === "true" || rawIsNegotiable === "1",
      ]
    );
    const post_id = insertResult.rows[0]?.post_id;

    /* Audio URL (column may not exist) */
    if (audioUrl) {
      try {
        await client.query(
          `UPDATE posts SET audio_url = $1 WHERE post_id = $2`,
          [audioUrl, post_id]
        );
      } catch (audioErr) {
        if (audioErr?.code !== "42703") throw audioErr;
      }
    }

    /* Deduct credit for basic tier */
    if (plan === "basic") {
      await client.query(
        `UPDATE users SET post_credits = post_credits - 1 WHERE user_id = $1`,
        [user_id]
      );
    }

    /* Queue translation */
    if (title || description) {
      const textToTranslate = `${title || ""}\n\n${description || ""}`.trim();
      await client.query(
        `INSERT INTO translation_queue (post_id, source_text, source_lang, target_lang, status)
         VALUES ($1, $2, 'en', 'hi', 'pending')
         ON CONFLICT DO NOTHING`,
        [post_id, textToTranslate]
      );
    }

    /* First-post bonus */
    if (firstPostEligible) {
      try {
        firstPostRewardChange = await applyRewardDeltaInTransaction({
          client,
          userId: user_id,
          pointsDelta: 25,
          action: "first_post_bonus",
          description: "Bonus for creating your first post",
          idempotencyKey: `post:first:${user_id}`,
        });
      } catch (firstPostErr) {
        logInfo(
          "[Post] First post bonus skipped",
          firstPostErr?.message || firstPostErr
        );
      }
    }

    /* Streak tracking */
    try {
      postStreakOutcome = await recordPost(String(user_id), client);
    } catch (streakError) {
      logInfo(
        "[Post] Streak update skipped",
        streakError?.message || streakError
      );
    }

    await client.query("COMMIT");

    /* After-commit reward hooks */
    if (postStreakOutcome?.rewardChanges?.length) {
      postStreakOutcome.rewardChanges.forEach((change) => {
        if (change?.applied) afterCommitRewardMutation(change);
      });
    }
    if (firstPostRewardChange?.applied) {
      afterCommitRewardMutation(firstPostRewardChange);
    }

    /* Re-fetch the created post for the response */
    const postRes = await runQuery(
      `
      SELECT
        post_id,
        user_id,
        category_id,
        title,
        description,
        price,
        location,
        post_type,
        images,
        status,
        views_count,
        likes,
        shares,
        COALESCE(to_jsonb(p)->>'audio_url', NULL) AS audio_url,
        is_flash_sale,
        expires_at,
        tier_priority,
        created_at,
        updated_at
      FROM posts p
      WHERE post_id = $1
      LIMIT 1
      `,
      [post_id]
    );

    logInfo("Post created successfully", { post_id, user_id, tier: plan });

    const createdPost = postRes.rows[0] || {};
    createdPost.images = normalizeImagesPayload(createdPost.images);
    createdPost.image_url =
      normalizeUploadsPath(createdPost.image_url) ||
      createdPost.images[0] ||
      "/placeholder.svg";

    res.status(201).json({
      post: createdPost,
      images: createdPost.images,
      tier: plan,
      expiresAt,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logError("Error creating post (Transaction Rolled Back):", err);
    // Surface actionable limit/validation messages (daily limit, listing limit,
    // expired subscription, KYC/plan) instead of a generic 500-style blob.
    const msg = (err && (err.message || err.error)) || "Internal server error";
    const isClientError =
      /daily limit|listing limit|subscription expired|no post credits|kyc|plan required|required|invalid|must|cannot|already/i.test(msg);
    res.status(isClientError ? 400 : 500).json({ error: msg });
  } finally {
    client.release();
  }
};

/**
 * GET /api/posts/:postId
 * Retrieve a single post by ID and increment its view count.
 */
exports.getPostById = async (req, res) => {
  try {
    const postId = req.params.postId || req.params.id;

    // Validate UUID format to avoid Postgres cast errors on invalid IDs
    if (!postId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return res.status(404).json({ error: "Post not found" });
    }

    const userId = getAuthUserId(req);
    const hasFullAccess = await checkUserAccessFull(userId);
    if (!hasFullAccess) {
      return res.status(403).json({
        error: "KYC_PLAN_REQUIRED",
        message: "Complete subscription plan purchase and KYC verification to unlock full access."
      });
    }

    const postRes = await runQuery(
      `
      WITH updated_post AS (
        UPDATE posts
        SET views_count = COALESCE(views_count, 0) + 1
        WHERE post_id = $1
        RETURNING *
      )
      SELECT
        up.post_id,
        up.post_id AS id,
        up.user_id,
        up.category_id,
        up.subcategory_id,
        up.title,
        up.description,
        up.price,
        up.location,
        up.latitude,
        up.longitude,
        up.post_type,
        up.images,
        up.status,
        up.views_count,
        up.likes,
        up.shares,
        up.boost_level,
        up.sold_at,
        COALESCE(to_jsonb(up)->>'audio_url', NULL) AS audio_url,
        up.is_flash_sale,
        up.expires_at,
        up.tier_priority,
        up.condition,
        up.brand,
        up.model,
        up.contact_number,
        up.age_months,
        up.is_negotiable,
        up.created_at,
        up.updated_at,
        COALESCE(u.username, 'Unknown') AS author,
        u.username,
        COALESCE(pr.full_name, u.username) AS user_name,
        COALESCE(c.name, 'Unknown') AS category,
        c.name AS category_name,
        sc.name AS subcategory_name,
        sc.name AS subcategory,
        u.rating AS seller_rating,
        jsonb_build_object(
          'user_id', u.user_id,
          'username', u.username,
          'name', COALESCE(pr.full_name, u.username),
          'avatar_url', pr.avatar_url,
          'verified', COALESCE(pr.verified, false),
          'rating', COALESCE(CAST(u.rating AS numeric(3,2)), 0),
          'rewardBadge', pr.reward_badge
        ) AS "user"
      FROM updated_post up
      LEFT JOIN users u ON up.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON u.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON up.category_id::text = c.category_id::text
      LEFT JOIN subcategories sc ON up.subcategory_id::text = sc.subcategory_id::text
      `,
      [postId]
    );

    if (!postRes.rows.length) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postRes.rows[0];
    post.images = normalizeImagesPayload(post.images);
    post.image_url =
      normalizeUploadsPath(post.image_url) || post.images[0] || "/placeholder.svg";
    post.views = post.views_count;
    if (post.price !== undefined && post.price !== null) {
      post.price = Number(post.price);
    }
    if (post.discount_percentage !== undefined && post.discount_percentage !== null) {
      post.discount_percentage = Number(post.discount_percentage);
    }

    const catName = String(post.category_name || post.category || "").toLowerCase();
    const isElectronics = catName.includes("electron") || catName.includes("mobile") || catName.includes("phone") || catName.includes("gadget");
    post.is_escrow_eligible = isElectronics;
    post.escrow_fee_pct = isElectronics ? 2.5 : 0.0;

    const [enrichedPost] = await attachTrustToPosts([post]);
    res.json({ post: enrichedPost || post });
  } catch (err) {
    logError("Error fetching post by ID:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/posts/nearby
 * Retrieve posts near a geographic coordinate.
 */
exports.getNearbyPosts = async (req, res) => {
  try {
    const { lat, long, radius = 10 } = req.query;
    const categoryId =
      parseOptionalStringScalar(req.query.category_id || req.query.category) || null;
    const subcategoryId =
      parseOptionalStringScalar(
        req.query.subcategory_id || req.query.subcategory
      ) || null;

    if (!lat || !long) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    const searchRadius = parseFloat(radius);

    const result = await runQuery(
      `
      WITH base AS (
        SELECT * FROM get_nearby_posts($1, $2, $3)
      )
      SELECT
        base.*,
        p.category_id,
        p.subcategory_id,
        c.name AS category_name,
        sc.name AS subcategory_name
      FROM base
      LEFT JOIN posts p ON base.post_id = p.post_id
      LEFT JOIN categories c ON p.category_id::text = c.category_id::text
      LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
      WHERE ($4::text IS NULL OR p.category_id::text = $4::text)
        AND ($5::text IS NULL OR p.subcategory_id::text = $5::text)
      `,
      [latitude, longitude, searchRadius, categoryId, subcategoryId]
    );

    logInfo(
      `[getNearbyPosts] Found ${result.rows.length} posts within ${searchRadius}km of (${latitude}, ${longitude})`
    );

    const enrichedPosts = await attachTrustToPosts(result.rows);

    res.json({
      posts: enrichedPosts,
      total: result.rows.length,
      searchParams: {
        lat: latitude,
        long: longitude,
        radius: searchRadius,
        category_id: categoryId,
        subcategory_id: subcategoryId,
      },
    });
  } catch (err) {
    logError("[getNearbyPosts] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/posts/trust-score/:userId
 * Retrieve the trust score for a user.
 */
exports.getUserTrustScore = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID required" });
    }

    const trustScore = await computeTrustScore(userId);
    if (!trustScore) {
      return res.status(404).json({ error: "User not found" });
    }

    const riskState = await getUserRiskState(userId);
    const payload = { ...trustScore };
    if (riskState) {
      payload.risk_state = riskState;
      payload.is_frozen = riskState.status === "frozen";
      payload.under_review = isComplaintRiskState(riskState);
    }

    res.json(payload);
  } catch (err) {
    logError("[getUserTrustScore] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * GET /api/posts/cache-stats
 * Delegate to guaranteed-reach controller.
 */
exports.getCacheStats = guaranteedReachController.getCacheStats;

/**
 * GET /api/posts/guaranteed-reach
 * Delegate to guaranteed-reach controller.
 */
exports.getGuaranteedReachPosts = guaranteedReachController.getGuaranteedReachPosts;

/**
 * GET /api/posts/:postId/similar
 * Retrieve posts similar in category and price to a given post.
 */
exports.getSimilarPosts = async (req, res) => {
  try {
    const { postId } = req.params;
    const limit = parsePositiveIntStrict(req.query.limit, 5, 20);

    if (!postId) {
      return res.status(400).json({ error: "Post ID required" });
    }

    const refPost = await runQuery(
      "SELECT category_id, price FROM posts WHERE post_id = $1",
      [postId]
    );

    if (refPost.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const { category_id, price } = refPost.rows[0];
    const priceMin = price * 0.8;
    const priceMax = price * 1.2;

    const result = await runQuery(
      `
      SELECT
        p.post_id, p.user_id, p.title, p.price, p.images, p.location, p.created_at,
        p.subcategory_id,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(pr.full_name, u.username) as seller_name,
        pr.avatar_url
      FROM posts p
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id::text = c.category_id::text
      LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
      WHERE p.category_id = $1
        AND p.price BETWEEN $2 AND $3
        AND p.post_id != $4
        AND p.status = 'active'
      ${TEST_USER_EXCLUSION}
      ORDER BY
        ABS(p.price - $5) ASC,  -- Closest price first
        p.created_at DESC
      LIMIT $6
      `,
      [category_id, priceMin, priceMax, postId, price, limit]
    );

    logInfo(
      `[SimilarPosts] Found ${result.rows.length} similar to post ${postId}`
    );

    const enrichedSimilar = await attachTrustToPosts(result.rows);
    res.json({
      similar: enrichedSimilar,
      referencePost: { post_id: postId, category_id, price },
    });
  } catch (err) {
    logError("[SimilarPosts] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * PATCH /api/posts/:postId/sold
 * Mark a post as sold, optionally recording a transaction and rewards.
 */
exports.markAsSold = async (req, res) => {
  const client = await pool.connect();
  const rewardChanges = [];

  try {
    const id = req.params.postId || req.params.id;
    const userId = getAuthenticatedUserId(req);
    const { buyer_id, sale_price } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    await client.query("BEGIN");

    const postCheck = await client.query(
      "SELECT post_id, user_id, title, status, price FROM posts WHERE post_id = $1 FOR UPDATE",
      [id]
    );

    if (postCheck.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postCheck.rows[0];

    if (String(post.user_id) !== String(userId)) {
      await client.query("ROLLBACK");
      return res
        .status(403)
        .json({ error: "You can only mark your own posts as sold" });
    }

    if (post.status === "sold") {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Post is already marked as sold" });
    }

    await client.query(
      `UPDATE posts SET status = 'sold', sold_at = NOW(), updated_at = NOW()
       WHERE post_id = $1`,
      [id]
    );

    let transactionId = null;
    let txBuyerId = buyer_id || null;
    let txSellerId = userId;
    let txAmount = sale_price || post.price || 0;

    if (txBuyerId) {
      const txResult = await client.query(
        `INSERT INTO transactions (seller_id, buyer_id, post_id, amount, status, completed_at)
         VALUES ($1, $2, $3, $4, 'completed', NOW())
         RETURNING transaction_id`,
        [txSellerId, txBuyerId, id, txAmount]
      );
      transactionId = txResult.rows[0]?.transaction_id;
    }

    /* Manual rewards enabled — both seller and buyer earn coins on sale confirmation */
    const allowManualRewards = true;

    if (transactionId && allowManualRewards) {
      const rewardReferenceId = String(transactionId);
      const rewardPoints = calculateSaleRewardPoints(txAmount);

      /* Seller reward */
      if (rewardPoints.sellerPoints > 0) {
        const sellerChange = await applyRewardDeltaInTransaction({
          client,
          userId: txSellerId,
          pointsDelta: rewardPoints.sellerPoints,
          action: "sale_completed",
          description: `Sale completion reward for transaction ${rewardReferenceId}`,
          idempotencyKey: `sale:${rewardReferenceId}:seller`,
        });
        if (sellerChange?.applied) rewardChanges.push(sellerChange);
      }

      /* Buyer reward */
      if (txBuyerId && rewardPoints.buyerPoints > 0) {
        const buyerChange = await applyRewardDeltaInTransaction({
          client,
          userId: txBuyerId,
          pointsDelta: rewardPoints.buyerPoints,
          action: "purchase_completed",
          description: `Purchase verification reward for transaction ${rewardReferenceId}`,
          idempotencyKey: `sale:${rewardReferenceId}:buyer`,
        });
        if (buyerChange?.applied) rewardChanges.push(buyerChange);
      }

      /* First-sale / first-purchase bonuses */
      const [sellerHasPrior, buyerHasPrior] = await Promise.all([
        hasPriorCompletedTransactions(client, "seller_id", txSellerId, rewardReferenceId),
        txBuyerId
          ? hasPriorCompletedTransactions(client, "buyer_id", txBuyerId, rewardReferenceId)
          : Promise.resolve(true),
      ]);

      if (!sellerHasPrior && FIRST_SALE_BONUS_POINTS > 0) {
        const firstSaleBonus = await applyRewardDeltaInTransaction({
          client,
          userId: txSellerId,
          pointsDelta: FIRST_SALE_BONUS_POINTS,
          action: "first_sale_bonus",
          description: "Bonus for completing your first sale",
          idempotencyKey: `sale:first:${txSellerId}`,
        });
        if (firstSaleBonus?.applied) rewardChanges.push(firstSaleBonus);
      }

      if (txBuyerId && !buyerHasPrior && FIRST_PURCHASE_BONUS_POINTS > 0) {
        const firstPurchaseBonus = await applyRewardDeltaInTransaction({
          client,
          userId: txBuyerId,
          pointsDelta: FIRST_PURCHASE_BONUS_POINTS,
          action: "first_purchase_bonus",
          description: "Bonus for completing your first purchase",
          idempotencyKey: `purchase:first:${txBuyerId}`,
        });
        if (firstPurchaseBonus?.applied) rewardChanges.push(firstPurchaseBonus);
      }

      /* Referral chain rewards */
      if (!sellerHasPrior) {
        const chainChanges = await applyReferralChainRewards({
          client,
          subjectUserId: txSellerId,
          referenceId: rewardReferenceId,
          eventKey: "sale_completed",
          maxDepth: CHAIN_MAX_DEPTH,
        });
        rewardChanges.push(...chainChanges);
      }

      if (txBuyerId && !buyerHasPrior) {
        const chainChanges = await applyReferralChainRewards({
          client,
          subjectUserId: txBuyerId,
          referenceId: rewardReferenceId,
          eventKey: "purchase_completed",
          maxDepth: CHAIN_MAX_DEPTH,
        });
        rewardChanges.push(...chainChanges);
      }
    }

    await client.query("COMMIT");

    /* After-commit reward hooks */
    rewardChanges.forEach((change) => {
      if (change?.applied) afterCommitRewardMutation(change);
    });

    logInfo(`[MarkAsSold] Post ${id} marked as sold by user ${userId}`);

    res.json({
      success: true,
      message: "Post marked as sold",
      post_id: id,
      status: "sold",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logError("[MarkAsSold] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
};

/**
 * PATCH /api/posts/:postId/reactivate
 * Reactivate a sold or expired post.
 */
exports.reactivatePost = async (req, res) => {
  try {
    const id = req.params.postId || req.params.id;
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postCheck = await runQuery(
      "SELECT post_id, user_id, status, created_at, expires_at, COALESCE(to_jsonb(posts)->>'repost_count', '0')::int AS repost_count FROM posts WHERE post_id = $1",
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    const post = postCheck.rows[0];

    if (String(post.user_id) !== String(userId)) {
      return res
        .status(403)
        .json({ error: "You can only reactivate your own posts" });
    }

    const { getTierRules } = require("../config/tierRules");
    const userResult = await runQuery(
      "SELECT COALESCE(NULLIF(current_plan, ''), NULLIF(tier, ''), 'basic') AS plan, subscription_expiry FROM users WHERE user_id = $1",
      [userId]
    );
    const plan = userResult.rows[0]?.plan || "basic";
    const rules = getTierRules(plan);
    const minAgeDays = plan === "premium" ? 45 : plan === "standard" ? 30 : 15;

    // Check anti-abuse condition: Only allow repost if sold, expired, or older than plan threshold (15/30/45 days)
    const isExpired = post.expires_at ? new Date(post.expires_at) <= new Date() : false;
    const postAgeDays = Math.floor((Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    if (post.status === "active" && !isExpired && postAgeDays < minAgeDays) {
      return res.status(400).json({
        error: `Recently active posts cannot be redundantly reposted. Reposting is permitted for sold or expired listings after ${minAgeDays} days (based on your ${plan} plan).`
      });
    }

    if (Number(post.repost_count || 0) >= 1 && post.status === "active") {
      return res.status(400).json({
        error: "This post has already been reactivated once. Re-posting is allowed only 1 time per active listing."
      });
    }
    if (plan !== "basic") {
      const expiry = userResult.rows[0]?.subscription_expiry
        ? new Date(userResult.rows[0].subscription_expiry)
        : null;
      if (!expiry || Number.isNaN(expiry.getTime()) || expiry < new Date()) {
        return res.status(403).json({ error: "Subscription expired. Please renew." });
      }
    }
    const newExpiresAt = rules.getExpiry();

    try {
      await runQuery(
        `UPDATE posts
         SET status = 'active', sold_at = NULL, expires_at = $2, repost_count = COALESCE(repost_count, 0) + 1, updated_at = NOW()
         WHERE post_id = $1`,
        [id, newExpiresAt]
      );
    } catch {
      await runQuery(
        `UPDATE posts
         SET status = 'active', sold_at = NULL, expires_at = $2, updated_at = NOW()
         WHERE post_id = $1`,
        [id, newExpiresAt]
      );
    }

    logInfo(`[Reactivate] Post ${id} reactivated by user ${userId}`);

    res.json({
      success: true,
      message: "Post reactivated",
      post_id: id,
      status: "active",
      expires_at: newExpiresAt,
    });
  } catch (err) {
    logError("[Reactivate] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * DELETE /api/posts/:postId
 * Soft-delete a post (sets status to 'deleted').
 */
exports.deletePost = async (req, res) => {
  try {
    const id = req.params.postId || req.params.id;
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const postCheck = await runQuery(
      "SELECT post_id, user_id, images FROM posts WHERE post_id = $1",
      [id]
    );

    if (postCheck.rows.length === 0) {
      return res.status(404).json({ error: "Post not found" });
    }

    if (String(postCheck.rows[0].user_id) !== String(userId)) {
      return res
        .status(403)
        .json({ error: "You can only delete your own posts" });
    }

    // Block deletion if post has pending/active transactions
    try {
      const txCheck = await runQuery(
        `SELECT transaction_id FROM transactions
         WHERE post_id::text = $1 AND status IN ('pending', 'in_progress', 'processing')
         LIMIT 1`,
        [String(id)]
      );
      if (txCheck.rows.length > 0) {
        return res.status(409).json({
          error: "Cannot delete a post with an active transaction. Please resolve the transaction first.",
        });
      }
    } catch (_txErr) {
      // transactions table may not exist — allow deletion
    }

    await runQuery(
      `UPDATE posts SET status = 'deleted', updated_at = NOW() WHERE post_id = $1`,
      [id]
    );

    // Async file cleanup — fire-and-forget to avoid blocking the response
    const postImages = postCheck.rows[0].images;
    if (postImages) {
      const { resolveUploadsFilePath } = require("../utils/uploads");
      const fs = require("fs").promises;
      const imageList = Array.isArray(postImages) ? postImages : [];
      for (const imgPath of imageList) {
        const filePath = resolveUploadsFilePath(imgPath);
        if (filePath) {
          fs.unlink(filePath).catch(() => {});
        }
      }
    }

    logInfo(`[DeletePost] Post ${id} deleted by user ${userId}`);

    res.json({ success: true, message: "Post deleted", post_id: id });
  } catch (err) {
    logError("[DeletePost] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * POST /api/posts/:postId/report
 * Report a listing for violating ToS.
 */
exports.reportPost = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const postId = parseOptionalStringScalar(req.params.postId);
  const reason = parseOptionalStringScalar(req.body.reason) || "other";
  const details = parseOptionalStringScalar(req.body.details) || "";
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (!postId) return res.status(400).json({ error: "Post ID required" });
  try {
    await runQuery(
      `INSERT INTO post_reports (post_id, reporter_id, reason, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (post_id, reporter_id) DO UPDATE SET reason = $3, details = $4, created_at = NOW()`,
      [postId, userId, reason.slice(0, 100), details.slice(0, 500)]
    );
    return res.json({ success: true, message: "Report submitted" });
  } catch (err) {
    logError("[ReportPost] Error:", err.message);
    return res.status(500).json({ error: "Failed to submit report" });
  }
};

/**
 * POST /api/posts/:postId/renew
 * Renew an expired listing back to active status.
 */
exports.renewPost = async (req, res) => {
  const userId = getAuthenticatedUserId(req);
  const postId = parseOptionalStringScalar(req.params.postId);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  if (!postId) return res.status(400).json({ error: "Post ID required" });
  try {
    const ownerCheck = await runQuery(
      "SELECT status FROM posts WHERE post_id = $1 AND user_id = $2",
      [postId, userId]
    );
    if (ownerCheck.rows.length === 0) {
      return res.status(403).json({ error: "Post not found or access denied" });
    }
    if (ownerCheck.rows[0].status === "active") {
      return res.status(400).json({ error: "Post is already active" });
    }
    await runQuery(
      `UPDATE posts SET status = 'active', updated_at = NOW(), created_at = NOW()
       WHERE post_id = $1 AND user_id = $2`,
      [postId, userId]
    );
    logInfo(`[RenewPost] Post ${postId} renewed by user ${userId}`);
    return res.json({ success: true, message: "Post renewed successfully" });
  } catch (err) {
    logError("[RenewPost] Error:", err.message);
    return res.status(500).json({ error: "Failed to renew post" });
  }
};

/**
 * GET /api/posts/user/:userId/sold
 * Retrieve a user's sold posts with aggregate ratings per post.
 */
exports.getUserSoldPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "User ID required" });

    const category = parseOptionalStringScalar(req.query.category);
    const page = parsePositiveIntStrict(req.query.page, 1);
    const limit = parsePositiveIntStrict(req.query.limit, 20, 100);
    const offset = (page - 1) * limit;

    const params = [String(userId)];
    let categoryClause = "";
    if (category) {
      categoryClause = ` AND (p.category_id::text = $${params.length + 1} OR c.name ILIKE $${params.length + 1})`;
      params.push(category);
    }
    params.push(limit, offset);

    const result = await runQuery(
      `
      SELECT
        p.post_id,
        p.post_id AS id,
        p.user_id,
        p.title,
        p.description,
        p.price,
        p.images,
        p.location,
        p.status,
        p.created_at,
        p.updated_at,
        p.sold_at,
        c.name AS category_name,
        sc.name AS subcategory_name,
        COALESCE(pr.full_name, u.username) AS sellerName,
        u.username AS userName,
        u.rating AS seller_rating,
        COALESCE(p.views_count, p.views, 0) AS views_count,
        COALESCE(p.likes, 0) AS likes,
        COALESCE(p.shares, 0) AS shares,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS avg_rating,
        COUNT(r.review_id) AS review_count
      FROM posts p
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id::text = c.category_id::text
      LEFT JOIN subcategories sc ON p.subcategory_id::text = sc.subcategory_id::text
      LEFT JOIN reviews r ON p.post_id::text = r.post_id::text AND r.verified_purchase = true
      WHERE p.user_id::text = $1::text
        AND p.status = 'sold'
        ${categoryClause}
      GROUP BY
        p.post_id, p.user_id, p.title, p.description, p.price, p.images,
        p.location, p.status, p.created_at, p.updated_at, p.sold_at,
        c.name, sc.name, pr.full_name, u.username, u.rating,
        p.views_count, p.views, p.likes, p.shares
      ORDER BY p.sold_at DESC NULLS LAST, p.updated_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    const posts = result.rows.map((row) => ({
      ...row,
      price: row.price !== null && row.price !== undefined ? Number(row.price) : null,
      images: normalizeImagesPayload(row.images),
      image_url:
        normalizeUploadsPath(row.image_url) ||
        (normalizeImagesPayload(row.images)[0]) ||
        "/placeholder.svg",
      avg_rating: Number(row.avg_rating) || 0,
      review_count: Number(row.review_count) || 0,
    }));

    res.json({ posts, total: result.rows.length, page, limit });
  } catch (err) {
    logError("[getUserSoldPosts] Error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
