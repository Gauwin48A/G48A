-- Migration: Add views, shares, likes columns to posts table
-- Run this script in your PostgreSQL database (pgAdmin, DBeaver, or psql)

-- Add views column if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- Add shares column if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;

-- Add likes column if not exists
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;

-- Update existing posts to have 0 instead of NULL
UPDATE posts SET views = 0 WHERE views IS NULL;
UPDATE posts SET shares = 0 WHERE shares IS NULL;
UPDATE posts SET likes = 0 WHERE likes IS NULL;

-- Verify the columns exist
SELECT 'Migration complete! Columns added:' as status;
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name IN ('views', 'shares', 'likes');
