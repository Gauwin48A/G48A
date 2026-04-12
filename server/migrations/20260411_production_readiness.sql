-- Migration: Add user_blocks table for chat/messaging safety (Issue #10)
-- Add refund_status to payments table (Issue #1)
-- Add delivered_at and seen_at to messages table (Issue #17)

-- User blocks for preventing contact from blocked users
CREATE TABLE IF NOT EXISTS user_blocks (
  id SERIAL PRIMARY KEY,
  blocker_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  blocked_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- Refund tracking columns on payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'refund_status'
  ) THEN
    ALTER TABLE payments ADD COLUMN refund_status VARCHAR(20) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE payments ADD COLUMN refund_amount NUMERIC(12,2) DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'refunded_at'
  ) THEN
    ALTER TABLE payments ADD COLUMN refunded_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'refund_reason'
  ) THEN
    ALTER TABLE payments ADD COLUMN refund_reason TEXT DEFAULT NULL;
  END IF;
END $$;

-- Message delivery tracking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'seen_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN seen_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
  END IF;
END $$;

-- Post drafts table for autosave (Issue #19)
CREATE TABLE IF NOT EXISTS post_drafts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  draft_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Audit logs: ensure details column exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_logs' AND column_name = 'details'
  ) THEN
    ALTER TABLE audit_logs ADD COLUMN details TEXT DEFAULT NULL;
  END IF;
END $$;

-- Post reports table (Issue #94)
CREATE TABLE IF NOT EXISTS post_reports (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(post_id) ON DELETE CASCADE,
  reporter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL DEFAULT 'other',
  details TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(post_id, reporter_id)
);
CREATE INDEX IF NOT EXISTS idx_post_reports_status ON post_reports(status);

-- Notification preferences table (Issue #33)
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  sound_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  marketing_enabled BOOLEAN DEFAULT true,
  order_updates_enabled BOOLEAN DEFAULT true,
  price_drop_enabled BOOLEAN DEFAULT true,
  message_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Search history table (Issue #74)
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  query VARCHAR(200) NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, query)
);
CREATE INDEX IF NOT EXISTS idx_search_history_user ON search_history(user_id, searched_at DESC);

-- User sessions table for session management (Issue #43)
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  device_id VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent TEXT,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Enable pg_trgm extension for fuzzy search (Issue #26)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Trigram indexes for fuzzy search
CREATE INDEX IF NOT EXISTS idx_posts_title_trgm ON posts USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_posts_description_trgm ON posts USING GIN(description gin_trgm_ops);

-- Google OAuth support (Issue #11)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'google_id'
  ) THEN
    ALTER TABLE users ADD COLUMN google_id VARCHAR(100) UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'search_radius'
  ) THEN
    ALTER TABLE users ADD COLUMN search_radius INTEGER DEFAULT 50;
  END IF;
END $$;

-- Followers table for social features (Issue #83 cleanup)
CREATE TABLE IF NOT EXISTS followers (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  followed_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, followed_id)
);
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_followed ON followers(followed_id);
