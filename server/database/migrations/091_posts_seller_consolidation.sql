-- Migration 091: Posts & Seller Engine Consolidation
-- Hardens posts schema, ensures expiry tracking, and adds composite query indexes.

DO $$
BEGIN
    -- Ensure columns exist on posts
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS repost_count INTEGER DEFAULT 0;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS condition VARCHAR(50);
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS brand VARCHAR(100);
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS model VARCHAR(100);
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS age_months INTEGER;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT FALSE;
    ALTER TABLE posts ADD COLUMN IF NOT EXISTS audio_url TEXT;

    -- Backfill expires_at for existing active posts that have NULL expires_at (default 30 days from creation)
    UPDATE posts
    SET expires_at = created_at + INTERVAL '30 days'
    WHERE expires_at IS NULL AND status = 'active';

    -- Performance indexes for seller listings and expiry workers
    CREATE INDEX IF NOT EXISTS idx_posts_user_status_created ON posts (user_id, status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_posts_status_expires ON posts (status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_posts_status_category ON posts (category_id, subcategory_id, status);

END $$;
