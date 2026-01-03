-- Add source column to recently_viewed table
-- This tracks where the view came from: 'allposts' or 'feed'

ALTER TABLE recently_viewed 
ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'allposts';

-- Add index for faster filtering by source
CREATE INDEX IF NOT EXISTS idx_recently_viewed_source ON recently_viewed(user_id, source);
