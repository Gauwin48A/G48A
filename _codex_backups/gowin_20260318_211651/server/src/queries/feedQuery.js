/**
 * Stratified feed query.
 *
 * Builds a scored, diversified feed of active posts using tier priority,
 * freshness, engagement, and time-seeded randomisation.
 *
 * Parameters: $1 = uid (text), $2 = limit (int), $3 = client refresh seed (bigint).
 * @type {string}
 */
const STRATIFIED_FEED_QUERY = `
WITH config AS (
    SELECT
        $1::text AS uid,
        EXTRACT(EPOCH FROM NOW())::bigint / 30
          + COALESCE(($3::bigint % 2147483646), 0) AS time_seed
),
-- Get ALL active posts with random scoring
all_active_posts AS (
    SELECT
        p.post_id,
        p.user_id AS author_id,
        p.category_id,
        p.subcategory_id,
        p.title,
        p.description,
        p.price,
        p.images,
        p.location,
        p.created_at,
        COALESCE(p.tier_priority, 1) AS tier_priority,
        COALESCE(p.views_count, 0) AS views_count,
        COALESCE(p.likes, 0) AS likes_count,
        -- Determine feed phase based on age and tier
        CASE
            WHEN COALESCE(p.tier_priority, 1) = 3 THEN 'premium'
            WHEN p.created_at > NOW() - INTERVAL '12 hours' THEN 'fresh'
            WHEN p.created_at > NOW() - INTERVAL '48 hours' THEN 'exploration'
            ELSE 'exploitation'
        END AS feed_phase,
        -- TIER PRIORITY BOOST (Protocol: Value Hierarchy)
        CASE
            WHEN COALESCE(p.tier_priority, 1) = 3 THEN 15000  -- Premium: TOP priority
            WHEN COALESCE(p.tier_priority, 1) = 2 THEN 5000   -- Silver: Medium priority
            ELSE 0                                             -- Basic: Standard
        END AS tier_boost,
        -- TIME-SEEDED RANDOM SCORE
        -- Different every 30 seconds, different per user, different per post
        ABS(HASHTEXT(
            p.post_id::text ||
            (SELECT time_seed FROM config)::text ||
            COALESCE((SELECT uid FROM config), '')::text
        )) % 10000 AS random_score,
        -- ENGAGEMENT BOOST for proven posts
        CASE
            WHEN COALESCE(p.likes, 0) > 0 OR COALESCE(p.views_count, 0) > 5
            THEN 5000  -- Boost proven posts
            ELSE 0
        END AS engagement_boost,
        -- FRESHNESS BOOST for new posts (sellers get visibility!)
        CASE
            WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 8000
            WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 5000
            WHEN p.created_at > NOW() - INTERVAL '48 hours' THEN 2000
            ELSE 0
        END AS freshness_boost
    FROM posts p
    WHERE p.status = 'active'
      AND (p.expires_at IS NULL OR p.expires_at > NOW())  -- Filter expired posts
      AND ((SELECT uid FROM config) IS NULL OR (SELECT uid FROM config) = '' OR p.user_id::text != (SELECT uid FROM config))  -- Exclude own posts
),
-- Apply diversity constraints
ranked_posts AS (
    SELECT
        a.*,
        -- Total score = tier_boost + random + engagement + freshness
        (a.tier_boost + a.random_score + a.engagement_boost + a.freshness_boost) AS total_score,
        -- Author diversity: Only 1 post per author
        ROW_NUMBER() OVER (PARTITION BY a.author_id::text ORDER BY a.tier_boost DESC, a.freshness_boost DESC, a.random_score DESC) AS author_rank,
        -- Category diversity: Priority within category
        ROW_NUMBER() OVER (PARTITION BY a.category_id::text ORDER BY a.tier_boost DESC, a.freshness_boost DESC, a.random_score DESC) AS category_rank
    FROM all_active_posts a
)
SELECT
    r.post_id,
    r.author_id,
    r.category_id,
    r.subcategory_id,
    r.title,
    r.description,
    r.price,
    r.images,
    r.location,
    r.created_at,
    r.tier_priority,
    r.views_count,
    r.likes_count,
    r.feed_phase,
    c.name AS category_name,
    sc.name AS subcategory_name,
    COALESCE(pr.full_name, 'Seller') AS author_name
FROM ranked_posts r
LEFT JOIN profiles pr ON r.author_id::text = pr.user_id::text
LEFT JOIN categories c ON r.category_id = c.category_id
LEFT JOIN subcategories sc ON r.subcategory_id = sc.subcategory_id
WHERE r.author_rank = 1        -- Max 1 post per author
  AND r.category_rank <= 4     -- Max 4 posts per category
ORDER BY
    -- TIER PRIORITY FIRST (Protocol: Value Hierarchy)
    r.tier_priority DESC,
    -- Fresh posts (sellers happy!)
    r.freshness_boost DESC,
    -- Then by total score (tier + random + engagement)
    r.total_score DESC
LIMIT $2;
`;

/**
 * Build a stratified feed query optionally filtered by category_group.
 *
 * Parameters when no group filter: $1=uid, $2=limit, $3=seed
 * Parameters when group filter:    $1=uid, $2=limit, $3=seed, $4=category_group
 *
 * @param {boolean} withGroupFilter - whether to add a $4 category_group WHERE clause
 * @returns {string} SQL query text
 */
function buildStratifiedFeedQuery(withGroupFilter = false) {
  const groupFilter = withGroupFilter
    ? `AND LOWER(COALESCE(NULLIF(to_jsonb(c_grp)->>'category_group',''),
          CASE
            WHEN LOWER(c_grp.name) LIKE '%electronics%' OR LOWER(c_grp.name) IN ('mobiles','mobile') THEN 'electronics'
            WHEN LOWER(c_grp.name) LIKE '%fashion%' THEN 'fashion'
            WHEN LOWER(c_grp.name) LIKE '%vehicle%' THEN 'vehicles'
            ELSE 'others'
          END)) = LOWER($4::text)`
    : "";

  return `
WITH config AS (
    SELECT
        $1::text AS uid,
        EXTRACT(EPOCH FROM NOW())::bigint / 30
          + COALESCE(($3::bigint % 2147483646), 0) AS time_seed
),
all_active_posts AS (
    SELECT
        p.post_id,
        p.user_id AS author_id,
        p.category_id,
        p.subcategory_id,
        p.title,
        p.description,
        p.price,
        p.images,
        p.location,
        p.created_at,
        COALESCE(p.tier_priority, 1) AS tier_priority,
        COALESCE(p.views_count, 0) AS views_count,
        COALESCE(p.likes, 0) AS likes_count,
        CASE
            WHEN COALESCE(p.tier_priority, 1) = 3 THEN 'premium'
            WHEN p.created_at > NOW() - INTERVAL '12 hours' THEN 'fresh'
            WHEN p.created_at > NOW() - INTERVAL '48 hours' THEN 'exploration'
            ELSE 'exploitation'
        END AS feed_phase,
        CASE
            WHEN COALESCE(p.tier_priority, 1) = 3 THEN 15000
            WHEN COALESCE(p.tier_priority, 1) = 2 THEN 5000
            ELSE 0
        END AS tier_boost,
        ABS(HASHTEXT(
            p.post_id::text ||
            (SELECT time_seed FROM config)::text ||
            COALESCE((SELECT uid FROM config), '')::text
        )) % 10000 AS random_score,
        CASE
            WHEN COALESCE(p.likes, 0) > 0 OR COALESCE(p.views_count, 0) > 5
            THEN 5000
            ELSE 0
        END AS engagement_boost,
        CASE
            WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 8000
            WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 5000
            WHEN p.created_at > NOW() - INTERVAL '48 hours' THEN 2000
            ELSE 0
        END AS freshness_boost
    FROM posts p
    ${withGroupFilter ? "JOIN categories c_grp ON p.category_id = c_grp.category_id" : ""}
    WHERE p.status = 'active'
      AND (p.expires_at IS NULL OR p.expires_at > NOW())
      AND ((SELECT uid FROM config) IS NULL OR (SELECT uid FROM config) = '' OR p.user_id::text != (SELECT uid FROM config))
      ${groupFilter}
),
ranked_posts AS (
    SELECT
        a.*,
        (a.tier_boost + a.random_score + a.engagement_boost + a.freshness_boost) AS total_score,
        ROW_NUMBER() OVER (PARTITION BY a.author_id::text ORDER BY a.tier_boost DESC, a.freshness_boost DESC, a.random_score DESC) AS author_rank,
        ROW_NUMBER() OVER (PARTITION BY a.category_id::text ORDER BY a.tier_boost DESC, a.freshness_boost DESC, a.random_score DESC) AS category_rank
    FROM all_active_posts a
)
SELECT
    r.post_id,
    r.author_id,
    r.category_id,
    r.subcategory_id,
    r.title,
    r.description,
    r.price,
    r.images,
    r.location,
    r.created_at,
    r.tier_priority,
    r.views_count,
    r.likes_count,
    r.feed_phase,
    c.name AS category_name,
    sc.name AS subcategory_name,
    COALESCE(pr.full_name, 'Seller') AS author_name
FROM ranked_posts r
LEFT JOIN profiles pr ON r.author_id::text = pr.user_id::text
LEFT JOIN categories c ON r.category_id = c.category_id
LEFT JOIN subcategories sc ON r.subcategory_id = sc.subcategory_id
WHERE r.author_rank = 1
  AND r.category_rank <= 4
ORDER BY
    r.tier_priority DESC,
    r.freshness_boost DESC,
    r.total_score DESC
LIMIT $2;
`;
}

const STRATIFIED_FEED_QUERY_GROUPED = buildStratifiedFeedQuery(true);

/**
 * Fallback feed query used when the stratified query fails.
 *
 * Returns active posts ordered by tier priority and creation date.
 *
 * Parameters: $1 = limit (int).
 * @type {string}
 */
const FALLBACK_FEED_QUERY = `
SELECT
    p.post_id,
    p.user_id AS author_id,
    p.category_id,
    p.subcategory_id,
    p.title,
    p.description,
    p.price,
    p.images,
    p.location,
    p.created_at,
    COALESCE(p.tier_priority, 1) AS tier_priority,
    COALESCE(p.views_count, 0) AS views_count,
    COALESCE(p.likes, 0) AS likes_count,
    'exploitation' AS feed_phase,
    c.name AS category_name,
    sc.name AS subcategory_name,
    COALESCE(pr.full_name, 'Seller') AS author_name
FROM posts p
LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
LEFT JOIN categories c ON p.category_id = c.category_id
LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
WHERE p.status = 'active'
  AND (p.expires_at IS NULL OR p.expires_at > NOW())
ORDER BY
    COALESCE(p.tier_priority, 1) DESC,
    p.created_at DESC
LIMIT $1;
`;

/**
 * Trending posts query.
 *
 * Returns the top 5 posts from the last 7 days ranked by an engagement score
 * that combines views, likes, and tier priority.
 * @type {string}
 */
const TRENDING_POSTS_QUERY = `
SELECT
    p.post_id,
    p.title,
    p.price,
    p.images,
    COALESCE(p.tier_priority, 1) AS tier_priority,
    COALESCE(p.views_count, 0)::bigint + (COALESCE(p.likes, 0)::bigint * 10) + (COALESCE(p.tier_priority, 1)::bigint * 1000) AS engagement_score,
    c.name AS category_name,
    p.subcategory_id,
    sc.name AS subcategory_name
FROM posts p
LEFT JOIN categories c ON p.category_id::text = c.category_id::text
LEFT JOIN subcategories sc ON p.subcategory_id = sc.subcategory_id
WHERE p.status = 'active'
  AND p.created_at > NOW() - INTERVAL '7 days'
  AND (p.expires_at IS NULL OR p.expires_at > NOW())
ORDER BY engagement_score DESC
LIMIT 5;
`;

module.exports = {
  STRATIFIED_FEED_QUERY,
  STRATIFIED_FEED_QUERY_GROUPED,
  FALLBACK_FEED_QUERY,
  TRENDING_POSTS_QUERY,
  buildStratifiedFeedQuery,
};
