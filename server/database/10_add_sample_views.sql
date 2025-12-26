-- Add varied view counts to sample posts for testing the low-view rotation feature
-- Run this script to update existing posts with different view counts

-- Update posts with varied view counts (random-like distribution)
UPDATE posts SET views_count = 15 WHERE post_id = 1;
UPDATE posts SET views_count = 245 WHERE post_id = 2;
UPDATE posts SET views_count = 3 WHERE post_id = 3;
UPDATE posts SET views_count = 89 WHERE post_id = 4;
UPDATE posts SET views_count = 7 WHERE post_id = 5;
UPDATE posts SET views_count = 156 WHERE post_id = 6;
UPDATE posts SET views_count = 2 WHERE post_id = 7;
UPDATE posts SET views_count = 312 WHERE post_id = 8;
UPDATE posts SET views_count = 45 WHERE post_id = 9;
UPDATE posts SET views_count = 1 WHERE post_id = 10;
UPDATE posts SET views_count = 178 WHERE post_id = 11;
UPDATE posts SET views_count = 5 WHERE post_id = 12;
UPDATE posts SET views_count = 98 WHERE post_id = 13;
UPDATE posts SET views_count = 12 WHERE post_id = 14;
UPDATE posts SET views_count = 267 WHERE post_id = 15;
UPDATE posts SET views_count = 8 WHERE post_id = 16;
UPDATE posts SET views_count = 134 WHERE post_id = 17;
UPDATE posts SET views_count = 4 WHERE post_id = 18;
UPDATE posts SET views_count = 201 WHERE post_id = 19;
UPDATE posts SET views_count = 23 WHERE post_id = 20;

-- Also update any remaining posts with random views
UPDATE posts 
SET views_count = FLOOR(RANDOM() * 300) + 1
WHERE views_count = 0 OR views_count IS NULL;

-- Verify the update
SELECT post_id, title, views_count 
FROM posts 
ORDER BY views_count ASC 
LIMIT 20;
