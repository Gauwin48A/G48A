-- =============================================================
-- 017_notifications_cart_recently_viewed.sql
-- Notifications enrichment, cart tables, recently_viewed extras
-- =============================================================

BEGIN;

-- -------------------------------
-- Notifications enhancements
-- -------------------------------
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS sender_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS action_path TEXT,
  ADD COLUMN IF NOT EXISTS group_key TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS snoozed_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_snoozed
  ON notifications(user_id, snoozed_until);

-- -------------------------------
-- Notification preferences
-- -------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  marketing_enabled BOOLEAN DEFAULT true,
  order_updates_enabled BOOLEAN DEFAULT true,
  price_drop_enabled BOOLEAN DEFAULT true,
  message_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------
-- Cart tables
-- -------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id INTEGER REFERENCES posts(post_id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_add NUMERIC(12,2),
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'saved')),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id, status)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user
  ON cart_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_status
  ON cart_items(user_id, status, created_at DESC);

-- Optional cart promotions table (for coupon validation)
CREATE TABLE IF NOT EXISTS cart_promotions (
  promo_id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
  min_subtotal NUMERIC(12,2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_promotions_active
  ON cart_promotions(is_active);

-- -------------------------------
-- Recently viewed enhancements
-- -------------------------------
ALTER TABLE recently_viewed
  ADD COLUMN IF NOT EXISTS price_at_view NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS last_viewed_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_expires
  ON recently_viewed(user_id, expires_at);

COMMIT;
