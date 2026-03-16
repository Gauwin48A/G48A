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

let logger;
try {
  logger = require("../utils/logger");
} catch (e) {
  logger = null;
}
const logError = logger && logger.error ? logger.error : console.error;
const logInfo = logger && logger.info ? logger.info : console.log;

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
    return value
      .map((entry) => normalizeUploadsPath(entry) || parseOptionalStringScalar(entry))
      .filter(Boolean);
  }

  const normalized = parseOptionalStringScalar(value);
  if (!normalized) return [];

  try {
    const parsed = JSON.parse(normalized);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) => normalizeUploadsPath(entry) || parseOptionalStringScalar(entry))
        .filter(Boolean);
    }
  } catch {
    /* not JSON – fall through */
  }

  const fallback = normalizeUploadsPath(normalized) || normalized;
  return fallback ? [fallback] : [];
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
      location: parseOptionalStringScalar(query.location),
      minPrice,
      maxPrice,
      author: parseOptionalStringScalar(query.author),
      startDate,
      endDate,
    },
  };
}

/**
 * Build a WHERE clause (and parameter array) for the public post list.
 * @param {object} filters
 * @returns {{ params: any[], clause: string }}
 */
function buildPostWhereClause(filters) {
  const params = [];
  const conditions = [
    `p.status = 'active'`,
    `(p.expires_at IS NULL OR p.expires_at > NOW())`,
  ];

  const addParam = (value) => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.search) {
    const placeholder = addParam(`%${filters.search}%`);
    conditions.push(
      `(p.title ILIKE ${placeholder} OR p.description ILIKE ${placeholder} OR p.location ILIKE ${placeholder} OR c.name ILIKE ${placeholder})`
    );
  }
  if (filters.category) {
    conditions.push(`p.category_id::text = ${addParam(filters.category)}`);
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
    tier_priority: post.tier_priority || 1,
    category: post.category_name || "General",
    user: {
      name: post.user_name || post.username || "Unknown",
      username: post.username,
      email: post.email,
      rating: parseFloat(post.seller_rating) || 0,
      isVerified: post.aadhaar_verified || post.pan_verified,
      aadhaarVerified: post.aadhaar_verified,
      panVerified: post.pan_verified,
      verificationDate: post.verification_date,
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
    const {
      userId,
      status,
      page = DEFAULT_PAGE,
      limit = DEFAULT_USER_POST_LIMIT,
    } = req.query;

    if (!userId) return res.status(400).json({ error: "userId required" });

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
        )
        SELECT
          fp.post_id,
          fp.user_id,
          fp.title,
          fp.description,
          fp.price,
          fp.category_id,
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
          COUNT(*) OVER() AS total_count
        FROM filtered_posts fp
        ORDER BY ${orderClause}
        LIMIT $3 OFFSET $4
        `,
        [String(userId), normalizedStatus, limitNumber, offset]
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
          COUNT(*) OVER() AS total_count
        FROM posts p
        WHERE p.user_id::text = $1::text
          AND ($2::text IS NULL OR p.status = $2::text)
        ORDER BY ${orderClause}
        LIMIT $3 OFFSET $4
        `,
        [String(userId), normalizedStatus, limitNumber, offset]
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
        image_url:
          normalizeUploadsPath(post.image_url) ||
          normalizedImages[0] ||
          "/placeholder.svg",
      };
    });

    res.json({ posts, total, page: pageNumber, limit: limitNumber });
  } catch (err) {
    logError("[getUserPosts] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/posts
 * Retrieve all active posts with filtering, sorting, and shuffle support.
 */
exports.getAllPosts = async (req, res) => {
  try {
    const {
      page: pageNumber,
      limit: limitNumber,
      sortBy,
      sortOrder,
      shuffleSeed,
      filters,
    } = normalizePostListQuery(req.query);

    const offset = (pageNumber - 1) * limitNumber;
    const { clause: whereClause, params: whereParams } =
      buildPostWhereClause(filters);

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
        u.email,
        u.rating as seller_rating,
        COALESCE(pr.full_name, u.username) as user_name,
        c.name as category_name,
        -- Verification fields temporarily disabled due to UUID migration
        NULL as aadhaar_verified,
        NULL as pan_verified,
        NULL as verification_date
      FROM posts p
      LEFT JOIN users u ON p.user_id::text = u.user_id::text
      LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
      LEFT JOIN categories c ON p.category_id = c.category_id
      ${whereClause}
    `;

    const params = [...whereParams];

    /* ── Shuffle mode ── */
    if (sortBy === "shuffle") {
      query += ` ORDER BY p.created_at DESC LIMIT ${SHUFFLE_POOL_LIMIT}`;
      const result = await runQuery(query, params);
      const shuffled = shuffleRowsWithSeed(result.rows, shuffleSeed);
      const paginatedRows = shuffled.slice(offset, offset + limitNumber);
      const posts = paginatedRows.map(mapPostForResponse);

      return res.json({
        posts,
        total: result.rows.length,
        page: pageNumber,
        limit: limitNumber,
        shuffled: true,
        shuffleSeed,
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
      "(COALESCE(p.tier_priority, 0) * 10 + COALESCE(p.boost_level, 0))";
    const sortClause = `ORDER BY ${rankScore} DESC, ${freshnessOrder}${safeSortBy} ${safeSortOrder}, p.created_at DESC`;

    query += ` ${sortClause} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNumber, offset);

    const result = await runQuery(query, params);
    const posts = result.rows.map(({ total_count, ...post }) =>
      mapPostForResponse(post)
    );
    const total = result.rows.length
      ? Number.parseInt(result.rows[0].total_count, 10) || 0
      : 0;

    res.json({ posts, total, page: pageNumber, limit: limitNumber });
  } catch (err) {
    logError("Error fetching posts:", err);
    res.status(500).json({ error: err.message });
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
    const {
      category_id,
      title,
      description,
      price,
      type,
      location,
      is_flash_sale,
    } = req.body;
    const images = req.files?.images || [];
    const audioFile = req.files?.audio?.[0] || req.file;

    if (!user_id) throw new Error("User ID required");

    const { getTierRules } = require("../config/tierRules");
    const { stripReferralCodes } = require("../utils/referralCodeFilter");

    // Strip referral codes from post content to prevent public spamming
    const sanitizedTitle = stripReferralCodes(title);
    const sanitizedDescription = stripReferralCodes(description);

    const userResult = await client.query(
      `SELECT tier, subscription_expiry, post_credits
       FROM users WHERE user_id = $1 FOR UPDATE`,
      [user_id]
    );
    const user = userResult.rows[0];
    if (!user) throw new Error("User not found");

    const priorPostResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM posts WHERE user_id = $1`,
      [user_id]
    );
    firstPostEligible = Number(priorPostResult.rows[0]?.total || 0) === 0;

    const tier = user.tier || "basic";
    const rules = getTierRules(tier);

    /* Subscription expiry check */
    if (tier !== "basic" && user.subscription_expiry) {
      if (new Date(user.subscription_expiry) < new Date()) {
        throw new Error("Subscription expired. Please renew.");
      }
    }

    /* Silver-tier daily limit */
    if (tier === "silver") {
      const today = new Date().toISOString().split("T")[0];
      const dailyCountResult = await client.query(
        `SELECT COUNT(*) as count FROM posts
         WHERE user_id = $1 AND created_at::date = $2::date`,
        [user_id, today]
      );
      const todayCount = parseInt(dailyCountResult.rows[0]?.count || 0);
      if (todayCount >= rules.dailyLimit) {
        throw new Error(
          `Daily limit reached (${rules.dailyLimit} per day). Upgrade to Premium.`
        );
      }
    }

    /* Basic-tier credit check */
    if (tier === "basic") {
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

    /* Normalise uploaded images */
    const normalizedImages = images
      .map(
        (img) =>
          normalizeUploadsPath(`/uploads/${img.filename}`) ||
          normalizeUploadsPath(img.path) ||
          normalizeUploadsPath(img.filename) ||
          parseOptionalStringScalar(img.filename)
      )
      .filter(Boolean);
    const imagesJson = JSON.stringify(normalizedImages);

    /* Audio file */
    const audioUrl = audioFile
      ? normalizeUploadsPath(`/uploads/${audioFile.filename}`) ||
        normalizeUploadsPath(audioFile.path) ||
        normalizeUploadsPath(audioFile.filename) ||
        null
      : null;

    /* Insert the post */
    const insertResult = await client.query(
      `INSERT INTO posts (
        user_id, category_id, title, description, price, location,
        post_type, images, status, created_at, views_count, likes, shares,
        is_flash_sale, expires_at, tier_priority
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::JSONB,
              'active', NOW(), 0, 0, 0, $9, $10, $11)
      RETURNING post_id`,
      [
        user_id,
        category_id || 1,
        sanitizedTitle || "Update",
        sanitizedDescription || "",
        price || 0,
        location || null,
        type || "sale",
        imagesJson,
        is_flash_sale === "true" || is_flash_sale === true,
        expiresAt,
        rules.priority,
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
    if (tier === "basic") {
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

    logInfo("Post created successfully", { post_id, user_id, tier });

    const createdPost = postRes.rows[0] || {};
    createdPost.images = normalizeImagesPayload(createdPost.images);
    createdPost.image_url =
      normalizeUploadsPath(createdPost.image_url) ||
      createdPost.images[0] ||
      "/placeholder.svg";

    res.status(201).json({
      post: createdPost,
      images: createdPost.images,
      tier,
      expiresAt,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    logError("Error creating post (Transaction Rolled Back):", err);
    res.status(400).json({ error: err.message });
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

    const postRes = await runQuery(
      `
      WITH updated_post AS (
        UPDATE posts
        SET views_count = COALESCE(views_count, 0) + 1
        WHERE post_id = $1
        RETURNING
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
          is_flash_sale,
          expires_at,
          tier_priority,
          created_at,
          updated_at
      )
      SELECT
        up.post_id,
        up.user_id,
        up.category_id,
        up.title,
        up.description,
        up.price,
        up.location,
        up.post_type,
        up.images,
        up.status,
        up.views_count,
        up.likes,
        up.shares,
        COALESCE(to_jsonb(up)->>'audio_url', NULL) AS audio_url,
        up.is_flash_sale,
        up.expires_at,
        up.tier_priority,
        up.created_at,
        up.updated_at,
        COALESCE(u.username, 'Unknown') AS author,
        COALESCE(c.name, 'Unknown') AS category
      FROM updated_post up
      LEFT JOIN users u ON up.user_id::text = u.user_id::text
      LEFT JOIN categories c ON up.category_id = c.category_id
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

    res.json({ post });
  } catch (err) {
    logError("Error fetching post by ID:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/posts/nearby
 * Retrieve posts near a geographic coordinate.
 */
exports.getNearbyPosts = async (req, res) => {
  try {
    const { lat, long, radius = 10 } = req.query;

    if (!lat || !long) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(long);
    const searchRadius = parseFloat(radius);

    const result = await runQuery(
      "SELECT * FROM get_nearby_posts($1, $2, $3)",
      [latitude, longitude, searchRadius]
    );

    logInfo(
      `[getNearbyPosts] Found ${result.rows.length} posts within ${searchRadius}km of (${latitude}, ${longitude})`
    );

    res.json({
      posts: result.rows,
      total: result.rows.length,
      searchParams: { lat: latitude, long: longitude, radius: searchRadius },
    });
  } catch (err) {
    logError("[getNearbyPosts] Error:", err.message);
    res.status(500).json({ error: err.message });
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

    const result = await runQuery(
      "SELECT * FROM view_user_trust_score WHERE user_id = $1",
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    logError("[getUserTrustScore] Error:", err.message);
    res.status(500).json({ error: err.message });
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
        p.post_id, p.title, p.price, p.images, p.location, p.created_at,
        u.name as seller_name, u.avatar_url
      FROM posts p
      LEFT JOIN users u ON p.user_id = u.user_id
      WHERE p.category_id = $1
        AND p.price BETWEEN $2 AND $3
        AND p.post_id != $4
        AND p.status = 'active'
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

    res.json({
      similar: result.rows,
      referencePost: { post_id: postId, category_id, price },
    });
  } catch (err) {
    logError("[SimilarPosts] Error:", err.message);
    res.status(500).json({ error: err.message });
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

    /* Manual rewards are currently disabled */
    const allowManualRewards = false;

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
    res.status(500).json({ error: err.message });
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
      "SELECT post_id, user_id, status FROM posts WHERE post_id = $1",
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

    if (post.status === "active") {
      return res.status(400).json({ error: "Post is already active" });
    }

    const { getTierRules } = require("../config/tierRules");
    const userResult = await runQuery(
      "SELECT tier FROM users WHERE user_id = $1",
      [userId]
    );
    const tier = userResult.rows[0]?.tier || "basic";
    const rules = getTierRules(tier);
    const newExpiresAt = rules.getExpiry();

    await runQuery(
      `UPDATE posts
       SET status = 'active', sold_at = NULL, expires_at = $2, updated_at = NOW()
       WHERE post_id = $1`,
      [id, newExpiresAt]
    );

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
    res.status(500).json({ error: err.message });
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
      "SELECT post_id, user_id FROM posts WHERE post_id = $1",
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

    await runQuery(
      `UPDATE posts SET status = 'deleted', updated_at = NOW() WHERE post_id = $1`,
      [id]
    );

    logInfo(`[DeletePost] Post ${id} deleted by user ${userId}`);

    res.json({ success: true, message: "Post deleted", post_id: id });
  } catch (err) {
    logError("[DeletePost] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
