-- Migration 092: Buyer Search & Discovery Consolidation
-- Adds full-text search indexing, price slider indexes, and search query analytics table.

DO $$
BEGIN
    -- Create search_queries table for trending search analytics
    CREATE TABLE IF NOT EXISTS search_queries (
        query_id SERIAL PRIMARY KEY,
        query TEXT NOT NULL,
        category_id INTEGER,
        user_id INTEGER,
        results_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_search_queries_query ON search_queries (lower(query));
    CREATE INDEX IF NOT EXISTS idx_search_queries_created_at ON search_queries (created_at DESC);

    -- Composite performance indexes for post discovery
    CREATE INDEX IF NOT EXISTS idx_posts_status_price ON posts (status, price);
    CREATE INDEX IF NOT EXISTS idx_posts_status_cat_created ON posts (status, category_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_status_subcat_created ON posts (status, subcategory_id, created_at DESC);

    -- Full-text GIN search index on post title and description
    CREATE INDEX IF NOT EXISTS idx_posts_fts ON posts USING gin (
        to_tsvector('english', title || ' ' || COALESCE(description, ''))
    );

END $$;
