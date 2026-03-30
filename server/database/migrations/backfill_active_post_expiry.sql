-- ============================================================================
-- BACKFILL: ACTIVE POSTS WITH PAST EXPIRY
-- Extends expiry windows for posts still marked active but already expired.
-- This restores visibility when legacy seed data has crossed hardcoded dates.
-- ============================================================================

UPDATE posts
SET
    expires_at = CASE
        WHEN COALESCE(tier_priority, 1) >= 3 THEN NOW() + INTERVAL '45 days'
        WHEN COALESCE(tier_priority, 1) = 2 THEN NOW() + INTERVAL '25 days'
        ELSE NOW() + INTERVAL '15 days'
    END,
    updated_at = NOW()
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at <= NOW();
