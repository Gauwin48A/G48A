-- =============================================================
-- 019_user_rating_count_and_aadhaar_flag.sql
-- Adds user columns referenced by wishlist queries
-- =============================================================

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS isAadhaarVerified BOOLEAN DEFAULT false;

COMMIT;
