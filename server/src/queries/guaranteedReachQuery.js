/**
 * Guaranteed Reach Query - Marketplace Fairness Algorithm
 * 
 * GOALS:
 * 1. Every seller's post reaches ALL users within 48 hours
 * 2. Low-view posts get priority (seller fairness)
 * 3. Fresh posts get visibility boost
 * 4. Time-seeded randomization for variety
 * 5. Author diversity (max 1 post per seller per page)
 * 
 * PROTOCOL: VALUE HIERARCHY - Tier Priority
 * - Premium (tier 3): TOP of feed, highest priority (+25000)
 * - Silver (tier 2): Medium priority (+10000)
 * - Basic (tier 1): Standard priority
 */

const GUARANTEED_REACH_QUERY = `
WITH config AS (
    SELECT 
        $1::text AS uid,
        -- Time seed changes every 5 seconds for faster rotation
        -- Combined with client refresh seed ($3) for instant variety on every refresh
        EXTRACT(EPOCH FROM NOW())::bigint / 5 + COALESCE($3::bigint, 0) AS time_seed
),
-- Get ALL active posts with guaranteed reach scoring
all_posts_scored AS (
    SELECT 
        p.post_id,
        p.user_id AS author_id,
        p.category_id,
        p.title,
        p.description,
        p.price,
        p.images,
        p.location,
        p.created_at,
        COALESCE(p.tier_priority, 1) AS tier_priority,
        COALESCE(p.views_count, 0) AS views_count,
        COALESCE(p.likes, 0) AS likes_count,
        
        -- TIER PRIORITY BOOST (Protocol: Value Hierarchy)
        -- Premium posts get TOP placement (God Mode)
        CASE 
            WHEN COALESCE(p.tier_priority, 1) = 3 THEN 25000   -- Premium: TOP of feed
            WHEN COALESCE(p.tier_priority, 1) = 2 THEN 10000   -- Silver: Medium priority
            ELSE 0                                              -- Basic: Standard
        END AS tier_boost,
        
        -- LOW IMPRESSION BOOST (guarantees reach for new sellers)
        -- Posts with fewer views get HIGHEST priority
        CASE 
            WHEN COALESCE(p.views_count, 0) < 10 THEN 15000   -- Critical: barely seen
            WHEN COALESCE(p.views_count, 0) < 25 THEN 12000   -- Very low reach
            WHEN COALESCE(p.views_count, 0) < 50 THEN 9000    -- Low reach
            WHEN COALESCE(p.views_count, 0) < 100 THEN 6000   -- Medium reach
            WHEN COALESCE(p.views_count, 0) < 200 THEN 3000   -- Good reach
            ELSE 0  -- Already has good visibility
        END AS impression_boost,
        
        -- FRESHNESS BOOST (48-hour visibility window for sellers)
        CASE 
            WHEN p.created_at > NOW() - INTERVAL '6 hours' THEN 12000   -- Brand new
            WHEN p.created_at > NOW() - INTERVAL '12 hours' THEN 10000  -- Very fresh
            WHEN p.created_at > NOW() - INTERVAL '24 hours' THEN 8000   -- Fresh
            WHEN p.created_at > NOW() - INTERVAL '48 hours' THEN 5000   -- Recent
            WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 2000     -- This week
            ELSE 0
        END AS freshness_boost,
        
        -- TIME-SEEDED RANDOM with DOMINANT weight for visible shuffling
        -- This score MUST be large enough to completely override impression_boost
        -- so that EVERY refresh shows genuinely different posts on top
        -- Range: 0-50000 ensures it always dominates the 0-15000 impression boost
        ABS(HASHTEXT(
            p.post_id::text || 
            (SELECT time_seed FROM config)::text || 
            COALESCE((SELECT uid FROM config), '')::text ||
            RANDOM()::text  -- Extra randomness for guaranteed variety
        )) % 50000 AS random_score,
        
        -- FEED PHASE for debugging/analytics
        CASE 
            WHEN COALESCE(p.tier_priority, 1) = 3 THEN 'premium'
            WHEN COALESCE(p.views_count, 0) < 50 THEN 'low_reach'
            WHEN p.created_at > NOW() - INTERVAL '48 hours' THEN 'fresh'
            ELSE 'rotating'
        END AS feed_phase
        
    FROM posts p
    WHERE p.status = 'active'
      AND (p.expires_at IS NULL OR p.expires_at > NOW())  -- Filter expired posts
      AND (
          (SELECT uid FROM config) IS NULL 
          OR (SELECT uid FROM config) = ''
          OR (SELECT uid FROM config) = '0'
          OR (SELECT uid FROM config) = 'null'
          OR p.user_id::text != (SELECT uid FROM config)  -- Don't show own posts
      )
),
-- Apply author diversity constraints
ranked_posts AS (
    SELECT 
        a.*,
        -- Total score = TIER_BOOST + impression_boost + freshness_boost + random
        -- Tier boost DOMINATES to ensure Premium posts appear FIRST
        (a.tier_boost + a.impression_boost + a.freshness_boost + a.random_score) AS total_score,
        -- Author diversity: Only 1 post per author per page
        ROW_NUMBER() OVER (
            PARTITION BY a.author_id::text 
            ORDER BY a.tier_boost DESC, a.impression_boost DESC, a.freshness_boost DESC, a.random_score DESC
        ) AS author_rank,
        -- Category diversity: Max 3 posts per category
        ROW_NUMBER() OVER (
            PARTITION BY a.category_id::text 
            ORDER BY a.tier_boost DESC, a.impression_boost DESC, a.freshness_boost DESC, a.random_score DESC
        ) AS category_rank
    FROM all_posts_scored a
)
SELECT 
    r.post_id,
    r.author_id,
    r.category_id,
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
    r.total_score,
    c.name AS category_name,
    COALESCE(pr.full_name, 'Seller') AS author_name
FROM ranked_posts r
LEFT JOIN profiles pr ON r.author_id::text = pr.user_id::text
LEFT JOIN categories c ON r.category_id = c.category_id
WHERE r.author_rank = 1        -- Max 1 post per author
  AND r.category_rank <= 3     -- Max 3 posts per category  
ORDER BY 
    -- TIER PRIORITY FIRST (Protocol: Value Hierarchy)
    -- Premium (3) > Silver (2) > Basic (1)
    r.tier_priority DESC,
    -- Then by TOTAL SCORE which includes tier_boost + randomization
    r.total_score DESC,
    -- Tie-breaker: use random score
    r.random_score DESC
LIMIT $2;
`;

/**
 * Fallback query - Simple and fast
 * Used when main query times out
 * Still respects Protocol: Value Hierarchy (tier priority)
 */
const GUARANTEED_REACH_FALLBACK = `
SELECT 
    p.post_id,
    p.user_id AS author_id,
    p.category_id,
    p.title,
    p.description,
    p.price,
    p.images,
    p.location,
    p.created_at,
    COALESCE(p.tier_priority, 1) AS tier_priority,
    COALESCE(p.views_count, 0) AS views_count,
    COALESCE(p.likes, 0) AS likes_count,
    'fallback' AS feed_phase,
    c.name AS category_name,
    COALESCE(pr.full_name, 'Seller') AS author_name
FROM posts p
LEFT JOIN profiles pr ON p.user_id::text = pr.user_id::text
LEFT JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'active'
  AND (p.expires_at IS NULL OR p.expires_at > NOW())
  AND (
      $2::text IS NULL
      OR $2::text = ''
      OR $2::text = '0'
      OR $2::text = 'null'
      OR p.user_id::text != $2::text
  )
ORDER BY 
    -- Protocol: Value Hierarchy - Premium posts FIRST
    COALESCE(p.tier_priority, 1) DESC,
    -- Prioritize low-view posts even in fallback
    COALESCE(p.views_count, 0) ASC,
    p.created_at DESC
LIMIT $1;
`;


module.exports = {
    GUARANTEED_REACH_QUERY,
    GUARANTEED_REACH_FALLBACK
};
