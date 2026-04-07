-- =====================================================
-- Migration: Production Readiness - Add updated_at Columns
-- Date: 2026-04-07
-- Purpose: Add updated_at timestamps to tables missing them
-- =====================================================

-- Helper function: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at to each table and attach trigger

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE subcategories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_subcategories_updated_at BEFORE UPDATE ON subcategories
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE tiers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_tiers_updated_at BEFORE UPDATE ON tiers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE referrals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_referrals_updated_at BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_rewards_updated_at BEFORE UPDATE ON rewards
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE reward_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_reward_log_updated_at BEFORE UPDATE ON reward_log
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE feedback ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_feedback_updated_at BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE channels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_channels_updated_at BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE buyer_inquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_buyer_inquiries_updated_at BEFORE UPDATE ON buyer_inquiries
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE wishlists ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_wishlists_updated_at BEFORE UPDATE ON wishlists
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE recently_viewed ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_recently_viewed_updated_at BEFORE UPDATE ON recently_viewed
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

ALTER TABLE price_history ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE OR REPLACE TRIGGER trg_price_history_updated_at BEFORE UPDATE ON price_history
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
