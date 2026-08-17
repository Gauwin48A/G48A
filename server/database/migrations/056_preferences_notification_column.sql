-- 056_preferences_notification_column.sql
-- Reconciliation found via live APK testing:
--   profileController reads `notification_enabled` from `preferences`
--   but the live table lacked the column -> GET /preferences 500
--   ("Server error" banner on the Profile screen).
-- Also normalises `preferences` to the app-facing schema
-- (subcategories column the controller writes).
-- Idempotent: safe to re-run.

ALTER TABLE preferences
  ADD COLUMN IF NOT EXISTS notification_enabled BOOLEAN DEFAULT TRUE;

-- The controller writes the user's chosen subcategories into `categories`
-- and reads the same column back; ensure it exists for older schemas.
ALTER TABLE preferences
  ADD COLUMN IF NOT EXISTS subcategories JSONB DEFAULT '[]'::jsonb;

-- users.is_verified / users.verified_at: rbac.requireVerified and
-- adminDocController write/read these but the live users table only has
-- kyc_verified. Add compatibility columns so verification-gated routes and
-- document-approval flows don't 500.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
