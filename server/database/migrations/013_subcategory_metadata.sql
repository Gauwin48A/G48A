-- ============================================================
-- Migration: Subcategory metadata + ranking fields
-- Description: Adds SEO/search/trending metadata to subcategories
-- ============================================================

ALTER TABLE subcategories
  ADD COLUMN IF NOT EXISTS seo_slug TEXT,
  ADD COLUMN IF NOT EXISTS search_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_subcategories_seo_slug
  ON subcategories(seo_slug);

CREATE INDEX IF NOT EXISTS idx_subcategories_featured_popularity
  ON subcategories(featured DESC, popularity_score DESC, display_order ASC);

UPDATE subcategories
SET seo_slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(TRIM(COALESCE(name, '')), '[^a-zA-Z0-9]+', '-', 'g'),
    '(^-|-$)',
    '',
    'g'
  )
)
WHERE (seo_slug IS NULL OR TRIM(seo_slug) = '')
  AND COALESCE(TRIM(name), '') <> '';

UPDATE subcategories s
SET popularity_score = COALESCE(active_posts.post_count, 0)
FROM (
  SELECT subcategory_id, COUNT(*)::int AS post_count
  FROM posts
  WHERE status = 'active'
    AND subcategory_id IS NOT NULL
  GROUP BY subcategory_id
) AS active_posts
WHERE active_posts.subcategory_id = s.subcategory_id
  AND COALESCE(s.popularity_score, 0) = 0;

UPDATE subcategories
SET search_keywords = ARRAY[
  LOWER(TRIM(name)),
  LOWER(TRIM(COALESCE(description, '')))
]
WHERE (search_keywords IS NULL OR array_length(search_keywords, 1) IS NULL)
  AND COALESCE(TRIM(name), '') <> '';
