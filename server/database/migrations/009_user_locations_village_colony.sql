-- Migration 009: Add village/colony location columns for rural India support

ALTER TABLE user_locations
  ADD COLUMN IF NOT EXISTS village TEXT,
  ADD COLUMN IF NOT EXISTS colony TEXT;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS current_village TEXT,
  ADD COLUMN IF NOT EXISTS current_colony TEXT;
