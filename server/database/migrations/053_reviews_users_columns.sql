-- =============================================================
-- 053_reviews_users_columns.sql
-- Final drift columns referenced by reviewsController and auth.
-- =============================================================

BEGIN;

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_count INT DEFAULT 0;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS helpful_votes INT DEFAULT 0;
-- init.sql declares product_id NOT NULL, but the post-based reviews flow
-- (reviewsController) writes post_id instead; allow both.
ALTER TABLE reviews ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

COMMIT;
