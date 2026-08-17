-- =============================================================
-- 051_uuid_core_tables_fix.sql
-- Creates the missing core feature tables that migrations 014/017/018
-- declared with INTEGER ids but never applied to this UUID-based DB.
-- Safe to run multiple times (all CREATE IF NOT EXISTS).
-- =============================================================

BEGIN;

-- -------------------------------
-- Cart items
-- -------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
  cart_item_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(post_id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_add NUMERIC(12,2),
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'saved')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id, status)
);

CREATE INDEX IF NOT EXISTS idx_cart_items_user
  ON cart_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_user_status
  ON cart_items(user_id, status, created_at DESC);

-- -------------------------------
-- Cart promotions
-- -------------------------------
CREATE TABLE IF NOT EXISTS cart_promotions (
  promo_id BIGSERIAL PRIMARY KEY,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cart_promotions_active
  ON cart_promotions(is_active);

-- -------------------------------
-- Wishlist
-- -------------------------------
CREATE TABLE IF NOT EXISTS wishlists (
  wishlist_id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_created
  ON wishlists(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlists_post
  ON wishlists(post_id);

-- -------------------------------
-- Saved searches
-- -------------------------------
CREATE TABLE IF NOT EXISTS saved_searches (
  search_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  search_name TEXT,
  search_query TEXT,
  category_id TEXT,
  location TEXT,
  min_price NUMERIC(12,2),
  max_price NUMERIC(12,2),
  keywords JSONB,
  filters JSONB,
  notification_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_created
  ON saved_searches(user_id, created_at DESC);

-- -------------------------------
-- Buyer inquiries
-- -------------------------------
CREATE TABLE IF NOT EXISTS buyer_inquiries (
  inquiry_id BIGSERIAL PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  buyer_name TEXT,
  phone TEXT,
  address TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  is_spam BOOLEAN DEFAULT false,
  seller_reply TEXT,
  reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_post
  ON buyer_inquiries(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_inquiries_buyer
  ON buyer_inquiries(buyer_id, created_at DESC);

-- -------------------------------
-- Chat messages
-- -------------------------------
CREATE TABLE IF NOT EXISTS messages (
  message_id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(post_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_read BOOLEAN NOT NULL DEFAULT false,
  delivered_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON messages(receiver_id, is_read, created_at DESC);

-- -------------------------------
-- Recently viewed
-- -------------------------------
CREATE TABLE IF NOT EXISTS recently_viewed (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  view_count INTEGER DEFAULT 1,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT DEFAULT 'allposts',
  price_at_view NUMERIC(12,2),
  last_viewed_price NUMERIC(12,2),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_viewed
  ON recently_viewed(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_post
  ON recently_viewed(post_id);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_user_expires
  ON recently_viewed(user_id, expires_at);

-- -------------------------------
-- Post drafts (autosave)
-- -------------------------------
CREATE TABLE IF NOT EXISTS post_drafts (
  user_id UUID PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  draft_data JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------
-- Brands lookup
-- -------------------------------
CREATE TABLE IF NOT EXISTS brands (
  brand_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------
-- Channel admins (owner/admin roles)
-- -------------------------------
CREATE TABLE IF NOT EXISTS channel_admins (
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_channel_admins_user
  ON channel_admins(user_id);

-- -------------------------------
-- Channel followers
-- -------------------------------
CREATE TABLE IF NOT EXISTS channel_followers (
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_channel_followers_user
  ON channel_followers(user_id);

-- -------------------------------
-- Channel posts
-- -------------------------------
CREATE TABLE IF NOT EXISTS channel_posts (
  post_id BIGSERIAL PRIMARY KEY,
  channel_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  image_urls JSONB,
  is_pinned BOOLEAN DEFAULT FALSE,
  post_type VARCHAR(20) DEFAULT 'text',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_created
  ON channel_posts(channel_id, created_at DESC);

-- -------------------------------
-- Post likes
-- -------------------------------
CREATE TABLE IF NOT EXISTS post_likes (
  user_id TEXT NOT NULL,
  post_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_post
  ON post_likes(user_id, post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post
  ON post_likes(post_id);

-- -------------------------------
-- Complaints (SLA + evidence fields included)
-- -------------------------------
CREATE TABLE IF NOT EXISTS complaints (
  complaint_id BIGSERIAL PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  seller_id TEXT,
  post_id TEXT,
  complaint_type TEXT NOT NULL,
  description TEXT NOT NULL,
  secret_code TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  severity VARCHAR(20) NOT NULL DEFAULT 'medium',
  evidence_metadata JSONB DEFAULT '{}'::jsonb,
  sla_due_at TIMESTAMPTZ,
  sla_breached_at TIMESTAMPTZ,
  status_history JSONB DEFAULT '[]'::jsonb,
  admin_response TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  last_status_change_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_complaints_sla_due_open
  ON complaints(sla_due_at)
  WHERE status IN ('open', 'triage', 'investigating');
CREATE INDEX IF NOT EXISTS idx_complaints_severity_status
  ON complaints(severity, status);

-- -------------------------------
-- Aadhaar verification logs
-- -------------------------------
CREATE TABLE IF NOT EXISTS aadhaar_verification_logs (
  log_id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  request_id TEXT,
  request_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aadhaar_verification_user
  ON aadhaar_verification_logs(user_id);

-- -------------------------------
-- Legacy "inquiries" alias for analytics parity
-- -------------------------------
DO $$
BEGIN
  IF to_regclass('public.inquiries') IS NULL
     AND to_regclass('public.buyer_inquiries') IS NOT NULL THEN
    EXECUTE 'CREATE VIEW inquiries AS SELECT * FROM buyer_inquiries';
  END IF;
END
$$;

COMMIT;
