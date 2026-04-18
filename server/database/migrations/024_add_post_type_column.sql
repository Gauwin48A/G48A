-- Migration 024: Add missing post_type column to posts table
-- The feed controller filters by post_type = 'text' but the column doesn't exist.
-- Default to 'text' since all existing posts are text posts.

ALTER TABLE posts ADD COLUMN IF NOT EXISTS post_type VARCHAR(20) NOT NULL DEFAULT 'text';

-- Create an index for post_type filtering (used in feed queries)
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts (post_type);
