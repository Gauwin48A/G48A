-- =============================================
-- Full-Text Search Setup for MHub
-- PostgreSQL tsvector + tsquery (No Algolia needed!)
-- =============================================

-- 1. Add search vector column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_posts_search_vector ON posts USING GIN(search_vector);

-- 3. Function to generate search vector
CREATE OR REPLACE FUNCTION posts_search_vector_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger to auto-update search vector
DROP TRIGGER IF EXISTS trg_posts_search_vector ON posts;
CREATE TRIGGER trg_posts_search_vector
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION posts_search_vector_trigger();

-- 5. Backfill existing posts
UPDATE posts SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(location, '')), 'C')
WHERE search_vector IS NULL;

-- 6. Fuzzy search function with ranking
CREATE OR REPLACE FUNCTION search_posts(
  search_query TEXT,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE(
  post_id INTEGER,
  title VARCHAR,
  price DECIMAL,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.post_id,
    p.title,
    p.price,
    ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank
  FROM posts p
  WHERE p.status = 'active'
    AND p.search_vector @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- 7. Fuzzy search with typo tolerance (using trigram similarity)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_posts_title_trgm ON posts USING GIN(title gin_trgm_ops);

-- Function for fuzzy title search
CREATE OR REPLACE FUNCTION fuzzy_search_posts(
  search_query TEXT,
  similarity_threshold REAL DEFAULT 0.3,
  max_results INTEGER DEFAULT 50
)
RETURNS TABLE(
  post_id INTEGER,
  title VARCHAR,
  price DECIMAL,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.post_id,
    p.title,
    p.price,
    similarity(p.title, search_query) as similarity
  FROM posts p
  WHERE p.status = 'active'
    AND similarity(p.title, search_query) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Test queries:
-- SELECT * FROM search_posts('iPhone 14');
-- SELECT * FROM fuzzy_search_posts('Iphone14', 0.2);

SELECT 'Full-Text Search with fuzzy matching enabled!' as status;
