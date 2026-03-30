-- Missing core tables referenced by API routes/controllers.
-- Safe to run multiple times.

-- Brands lookup
CREATE TABLE IF NOT EXISTS brands (
  brand_id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Channel admins (owner/admin roles)
CREATE TABLE IF NOT EXISTS channel_admins (
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_channel_admins_user
  ON channel_admins(user_id);

-- Channel followers
CREATE TABLE IF NOT EXISTS channel_followers (
  channel_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_channel_followers_user
  ON channel_followers(user_id);

-- Channel posts
CREATE TABLE IF NOT EXISTS channel_posts (
  post_id BIGSERIAL PRIMARY KEY,
  channel_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_channel_posts_channel_created
  ON channel_posts(channel_id, created_at DESC);

-- Complaints (SLA + evidence fields included)
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

-- Chat messages
CREATE TABLE IF NOT EXISTS messages (
  message_id BIGSERIAL PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  receiver_id TEXT NOT NULL,
  post_id TEXT,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON messages(receiver_id, is_read, created_at DESC);

-- Post likes
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

-- Aadhaar verification logs
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

-- Provide an "inquiries" alias for legacy analytics if buyer_inquiries exists.
DO $$
BEGIN
  IF to_regclass('public.inquiries') IS NULL
     AND to_regclass('public.buyer_inquiries') IS NOT NULL THEN
    EXECUTE 'CREATE VIEW inquiries AS SELECT * FROM buyer_inquiries';
  END IF;
END
$$;
