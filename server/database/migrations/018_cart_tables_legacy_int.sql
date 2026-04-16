-- =============================================================
-- 018_cart_tables_legacy_int.sql
-- Cart tables for legacy integer-id schemas
-- =============================================================

BEGIN;

-- -------------------------------
-- Cart items (integer id schema)
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

-- -------------------------------
-- Cart promotions (optional)
-- -------------------------------
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

COMMIT;
